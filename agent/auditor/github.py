import os
import time
from pathlib import Path
import httpx
import jwt

from .archive import MAX_SOURCE


class GitHub:
    def __init__(self):
        self.client = httpx.Client(base_url="https://api.github.com", timeout=45,
                                   headers={"Accept": "application/vnd.github+json"})
        self.token = ""
        self.expires = 0.0
        self.bot_login = ""

    def headers(self):
        if time.time() >= self.expires:
            now = int(time.time())
            signed = jwt.encode({"iat": now - 30, "exp": now + 540,
                                 "iss": os.environ["AUDIT_GITHUB_APP_ID"]},
                                Path(os.environ["AUDIT_GITHUB_PRIVATE_KEY_PATH"]).read_text(),
                                algorithm="RS256")
            identity = self.client.get("/app", headers={"Authorization": f"Bearer {signed}"})
            identity.raise_for_status()
            self.bot_login = identity.json()["slug"] + "[bot]"
            r = self.client.post(
                f"/app/installations/{os.environ['AUDIT_GITHUB_INSTALLATION_ID']}/access_tokens",
                headers={"Authorization": f"Bearer {signed}"},
                json={"permissions": {"contents": "read", "pull_requests": "write"}})
            r.raise_for_status()
            self.token = r.json()["token"]
            self.expires = time.time() + 3000
        return {"Authorization": f"Bearer {self.token}"}

    def get(self, path, **params):
        r = self.client.get(path, headers=self.headers(), params=params)
        r.raise_for_status()
        return r.json()

    def post(self, path, body):
        r = self.client.post(path, headers=self.headers(), json=body)
        r.raise_for_status()
        return r.json()

    def archive(self, repo: str, sha: str) -> bytes:
        # Follow only GitHub's archive redirect; never forward API credentials.
        r = self.client.get(f"/repos/{repo}/tarball/{sha}", headers=self.headers())
        if r.status_code != 302:
            r.raise_for_status()
            raise ValueError("GitHub did not provide an archive redirect")
        url = httpx.URL(r.headers["location"])
        if url.scheme != "https" or url.host != "codeload.github.com":
            raise ValueError("Unexpected archive host")
        chunks = bytearray()
        with httpx.stream("GET", str(url), timeout=90) as stream:
            stream.raise_for_status()
            for chunk in stream.iter_bytes():
                chunks.extend(chunk)
                if len(chunks) > MAX_SOURCE:
                    raise ValueError("Compressed source exceeds 32 MiB")
        return bytes(chunks)

    def reviews(self, repo: str, number: int):
        for page in range(1, 101):
            rows = self.get(f"/repos/{repo}/pulls/{number}/reviews", per_page=100, page=page)
            yield from rows
            if len(rows) < 100:
                return
        raise RuntimeError("Review pagination limit exceeded; publishing blocked")
