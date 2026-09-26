from __future__ import annotations

import io
import json
from pathlib import Path
import tarfile
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from auditor import archive, container, runner, transport
from auditor.models import Profile, safe_path


def profile(**updates):
    value = {
        "version": "1",
        "node_image": "devhub-audit-node:22",
        "projects": [{"directory": ".", "checks": [{"name": "test", "argv": ["npm", "test"]}]}],
    }
    value.update(updates)
    return value


@pytest.mark.parametrize("value", ["file:/etc", "a//b", "./a", "a/./b", "../a", "/a", "a\\b"])
def test_safe_path_rejects_non_plain_relative_paths(value: str) -> None:
    with pytest.raises(ValueError):
        safe_path(value)


def test_profile_bounds_command_arguments_and_image_syntax() -> None:
    invalid_argv = profile(projects=[{"checks": [{"name": "x", "argv": ["x" * 1001]}]}])
    with pytest.raises(ValidationError):
        Profile.model_validate(invalid_argv)
    with pytest.raises(ValidationError):
        Profile.model_validate(profile(node_image="--privileged"))


def test_pack_excludes_dependency_and_git_directories(tmp_path: Path) -> None:
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "index.ts").write_text("export const ok = true")
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "config").write_text("secret")
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "large.js").write_text("ignored")

    encoded = archive.pack(tmp_path)
    destination = tmp_path / "unpacked"
    destination.mkdir()
    archive.unpack(__import__("base64").b64decode(encoded), destination)

    assert (destination / "src" / "index.ts").is_file()
    assert not (destination / ".git").exists()
    assert not (destination / "node_modules").exists()


def test_pack_enforces_source_budget_before_archiving(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / "source.ts").write_text("12345")
    monkeypatch.setattr(archive, "MAX_SOURCE", 4)
    with pytest.raises(ValueError, match="32 MiB"):
        archive.pack(tmp_path)


def test_unpack_rejects_path_traversal(tmp_path: Path) -> None:
    data = io.BytesIO()
    with tarfile.open(fileobj=data, mode="w") as bundle:
        item = tarfile.TarInfo("../escape.ts")
        payload = b"bad"
        item.size = len(payload)
        bundle.addfile(item, io.BytesIO(payload))
    with pytest.raises(ValueError, match="Unsafe archive path"):
        archive.unpack(data.getvalue(), tmp_path)


def write_lock(project: Path, packages: dict) -> None:
    (project / "package-lock.json").write_text(json.dumps({"lockfileVersion": 3, "packages": packages}))


def test_validate_dependencies_accepts_registry_and_contained_workspace_link(tmp_path: Path) -> None:
    project = tmp_path / "project"
    local = project / "packages" / "local"
    local.mkdir(parents=True)
    write_lock(project, {
        "": {},
        "node_modules/public": {
            "resolved": "https://registry.npmjs.org/public/-/public-1.0.0.tgz",
            "integrity": "sha512-AAAA",
        },
        "node_modules/local": {"resolved": "packages/local", "link": True},
    })
    container.validate_dependencies(project, tmp_path)


@pytest.mark.parametrize(
    "entry",
    [
        {"resolved": "file:/etc", "link": True},
        {"resolved": "https://evil.example/pkg.tgz", "integrity": "sha512-AAAA"},
        {"resolved": "https://registry.npmjs.org:444/pkg.tgz", "integrity": "sha512-AAAA"},
        {"resolved": "https://registry.npmjs.org/pkg.tgz", "integrity": "sha1-AAAA"},
    ],
)
def test_validate_dependencies_rejects_unsafe_resolutions(tmp_path: Path, entry: dict) -> None:
    project = tmp_path / "project"
    project.mkdir()
    write_lock(project, {"": {}, "node_modules/pkg": entry})
    with pytest.raises(ValueError):
        container.validate_dependencies(project, tmp_path)


def test_validate_dependencies_rejects_escaping_package_location(tmp_path: Path) -> None:
    project = tmp_path / "project"
    project.mkdir()
    write_lock(project, {
        "": {},
        "../../outside": {
            "resolved": "https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz",
            "integrity": "sha512-AAAA",
        },
    })
    with pytest.raises(ValueError):
        container.validate_dependencies(project, tmp_path)


def test_remove_npm_configuration_after_extraction(tmp_path: Path) -> None:
    nested = tmp_path / "packages" / "app"
    nested.mkdir(parents=True)
    (tmp_path / ".npmrc").write_text("registry=https://evil.example")
    (nested / ".npmrc").write_text("ignore-scripts=false")
    container.remove_npm_configuration(tmp_path)
    assert list(tmp_path.rglob(".npmrc")) == []


def test_emit_truncates_check_output_to_response_budget(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    monkeypatch.setattr(container, "MAX_RESPONSE", 250)
    payload = {"checks": [{"name": "one", "output": "x" * 500, "output_truncated": False}]}
    container.emit(payload)
    emitted = capsys.readouterr().out.encode()
    assert len(emitted) <= 251
    parsed = json.loads(emitted)
    assert parsed["checks"][0]["output"] == ""
    assert parsed["checks"][0]["output_truncated"] is True


def test_install_network_must_be_internal(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(runner, "docker", lambda *args, **kwargs: b"false\n")
    with pytest.raises(RuntimeError, match="must be internal"):
        runner.verify_install_network()

    monkeypatch.setattr(runner, "docker", lambda *args, **kwargs: b"true\n")
    runner.verify_install_network()


def test_execute_rejects_image_outside_exact_allowlist(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUDIT_RUNNER_IMAGES", "devhub-audit-node:22")
    called = False

    def unexpected(*args, **kwargs):
        nonlocal called
        called = True
        raise AssertionError("Docker must not be called")

    monkeypatch.setattr(runner, "docker", unexpected)
    with pytest.raises(ValueError, match="not approved"):
        runner.execute({
            "profile": profile(node_image="registry.example/devhub-audit-node:22"),
            "operation": "analyze",
            "archive": "",
            "changed_files": [],
        })
    assert called is False


def test_decode_response_rejects_oversized_or_non_object(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(runner, "MAX_RESPONSE", 5)
    with pytest.raises(ValueError, match="3 MiB"):
        runner.decode_response(b"123456")
    monkeypatch.setattr(runner, "MAX_RESPONSE", 100)
    with pytest.raises(ValueError, match="JSON object"):
        runner.decode_response(b"[]")


def test_transport_rejects_response_over_four_mib(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(transport, "pack", lambda root: "archive")
    monkeypatch.setattr(transport, "MAX_RUNNER_RESPONSE", 20)

    class Process:
        def __init__(self, argv, stdin, stdout, **kwargs):
            stdout.write(b"{" + b"x" * 30 + b"}")
            stdout.flush()

        def poll(self):
            return 0

    monkeypatch.setattr(transport.subprocess, "Popen", Process)
    client = transport.Runner(SimpleNamespace(runner_host=""), lambda: None)
    with pytest.raises(ValueError, match="4 MiB"):
        client.call("analyze", tmp_path, profile(), [])
