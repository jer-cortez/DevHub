"""Publishing is a controller capability, never a model tool."""
import os
import re
import httpx


def safe_text(value: str) -> str:
    # Avoid notifications and forged review markers originating in model/source text.
    return re.sub(r"<!--.*?-->", "", value, flags=re.S).replace("@", "@\u200b")


def literal(value: str, language: str = "text") -> str:
    value = safe_text(value)
    fence = chr(96) * max(3, max((len(s) + 1 for s in re.findall(chr(96) + "+", value)), default=3))
    return f"{fence}{language}\n{value}\n{fence}"


def review_payload(run, report):
    marker = f"<!-- devhub-audit:{run['id']} -->"
    eligible = [f for f in report.get("findings", []) if f["verification"] != "unverified"]
    parts = [marker, "## DevHub automated review",
             f"Analyzed commit {run['head_sha']}. {len(eligible)} evidence-backed finding(s)."]
    if not eligible:
        parts.append("No evidence-backed findings within the analyzed scope. This is not a security certification.")
    comments = []
    for finding in eligible:
        body = safe_text(f"**{finding['severity'].upper()}: {finding['title']}**\n\n"
                         f"{finding['explanation']}\n\nEvidence:\n") + literal(finding["evidence"])
        body += f"\n\nVerification: {finding['verification']}"
        if finding.get("patch"):
            body += "\n\nCandidate patch (passes configured checks; not a finding-specific proof):\n" + literal(finding["patch"], "diff")
        if finding.get("inline") and len(comments) < 10:
            comments.append({"path": finding["path"], "line": finding["line"], "side": "RIGHT", "body": body[:5000]})
        else:
            parts.append(f"### {safe_text(finding['path'])}:{finding['line']}\n{body[:5000]}")
    if report.get("limitations"):
        parts.append("### Coverage and verification limitations\n" + "\n".join(
            "- " + safe_text(s)[:500] for s in report["limitations"][:30]))
    checks = report.get("checks", [])
    parts.append(f"Configured check results: {sum(c['exit_code'] == 0 for c in checks)}/{len(checks)} succeeded. "
                 "Install steps are included; see DevHub for baseline/head results and logs.")
    return {"commit_id": run["head_sha"], "event": "COMMENT", "body": "\n\n".join(parts)[:60000], "comments": comments}


def publish(store, github, run, report):
    current = store.active(run)
    if not store.controls()["publish_enabled"]:
        return  # Dashboard-only mode, not an approval interruption.
    repo = f"{run['owner']}/{run['repo']}"
    pr = github.get(f"/repos/{repo}/pulls/{run['pr_number']}")
    if (pr["state"] != "open" or pr.get("draft") or
        pr["head"]["sha"] != run["head_sha"] or pr["base"]["sha"] != run["base_sha"] or
        pr["head"]["repo"]["id"] != pr["base"]["repo"]["id"]):
        raise InterruptedError("PR revisions or eligibility changed before publishing")
    marker = f"<!-- devhub-audit:{run['id']} -->"
    if current["publication_state"] in ("pending", "uncertain", "published"):
        existing = next((review for review in github.reviews(repo, run["pr_number"])
                         if marker in (review.get("body") or "") and
                         review.get("commit_id") == run["head_sha"] and review.get("user", {}).get("login") == github.bot_login), None)
        if existing:
            store.update(run, publication_state="published", github_review_id=existing["id"],
                         github_review_url=existing["html_url"])
            return
        # An ambiguous successful POST may not immediately be visible. Never blindly replay.
        raise RuntimeError("Publication outcome uncertain; reconcile in GitHub before an operator retries")
    store.update(run, stage="publishing", publication_state="pending")
    store.active(run)
    if not store.controls()["publish_enabled"]:
        store.update(run, publication_state="none")
        return
    try:
        review = github.post(f"/repos/{repo}/pulls/{run['pr_number']}/reviews", review_payload(run, report))
    except httpx.HTTPStatusError as exc:
        state = "none" if exc.response.status_code in (400, 401, 403, 404, 422) else "uncertain"
        store.update(run, publication_state=state)
        raise RuntimeError(f"GitHub review publication failed ({exc.response.status_code})") from exc
    except Exception:
        store.update(run, publication_state="uncertain")
        raise
    store.update(run, publication_state="published", github_review_id=review["id"], github_review_url=review["html_url"])
