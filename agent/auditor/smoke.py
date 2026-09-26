"""Exercise the real Docker/SSH boundary with synthetic source and no API keys."""
import argparse
import json
import tempfile
from pathlib import Path
from .config import Settings
from .transport import Runner

CHECK = """
const assert = require('node:assert/strict');
const fs = require('node:fs');
assert.equal(process.getuid(), 1000);
for (const key of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','DATABASE_URL','AUDIT_GITHUB_PRIVATE_KEY_PATH'])
  assert.equal(process.env[key], undefined);
assert.equal(fs.existsSync('/var/run/docker.sock'), false);
assert.throws(() => fs.writeFileSync('/opt/audit/escape', 'no'));
assert.equal(require('./source.js').add(2, 3), 5);
assert.equal(require('is-number')(123), true);
const socket = require('node:net').createConnection({host:'1.1.1.1', port:443});
socket.on('connect', () => { console.error('Unexpected network access'); process.exit(1); });
socket.on('error', () => { console.log('isolation checks passed'); process.exit(0); });
socket.setTimeout(2500, () => { socket.destroy(); console.log('isolation checks passed'); process.exit(0); });
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="", help="Optional forced-command SSH host")
    args = parser.parse_args()
    profile = {"version": "smoke-1", "enabled": True, "node_image": "devhub-audit-node:22",
               "projects": [{"directory": ".", "checks": [{"name": "isolation", "argv": ["node", "-e", CHECK]}]}]}
    runner = Runner(Settings(database_url="", model="", runner_host=args.host), lambda: None)
    with tempfile.TemporaryDirectory(prefix="devhub-smoke-") as temp:
        root = Path(temp)
        (root / "source.js").write_text("exports.add = (a, b) => a + b;\n")
        package = {"name": "audit-smoke", "version": "1.0.0", "dependencies": {"is-number": "7.0.0"}}
        (root / "package.json").write_text(json.dumps(package))
        (root / "package-lock.json").write_text(json.dumps({
            "name": "audit-smoke", "version": "1.0.0", "lockfileVersion": 3, "requires": True,
            "packages": {"": package, "node_modules/is-number": {
                "version": "7.0.0", "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
                "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng=="}}}))
        analysis = runner.call("analyze", root, profile, ["source.js"])
        checks = runner.call("check", root, profile)
        ok = (not analysis.get("error") and bool(analysis.get("files")) and not checks.get("error")
              and len(checks.get("checks", [])) == 2
              and all(c["exit_code"] == 0 and not c.get("timed_out") for c in checks["checks"]))
        print(json.dumps({"passed": ok, "analysis_coverage": analysis.get("coverage"),
                          "analysis_error": analysis.get("error"), "execution": checks}, indent=2))
        raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
