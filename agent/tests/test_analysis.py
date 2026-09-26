from __future__ import annotations

import json
from pathlib import Path

import pytest

from analysis import analyze as helper


FIXTURES = Path(__file__).parent / "fixtures"


def test_fixture_manifest_is_balanced_and_points_to_exact_lines() -> None:
    manifest = json.loads((FIXTURES / "expected.json").read_text())
    samples = manifest["samples"]
    assert manifest["version"] == 1
    assert len(samples) == 20
    assert sum(sample["label"] == "bad" for sample in samples) == 10
    assert sum(sample["label"] == "clean" for sample in samples) == 10
    assert len({sample["path"] for sample in samples}) == len(samples)

    valid_severities = {"low", "medium", "high", "critical"}
    for sample in samples:
        source = FIXTURES / sample["path"]
        lines = source.read_text().splitlines()
        assert source.is_file()
        assert bool(sample["expected"]) == (sample["label"] == "bad")
        for finding in sample["expected"]:
            assert finding["severity"] in valid_severities
            assert finding["category"]
            assert 1 <= finding["line"] <= len(lines)


@pytest.mark.parametrize(
    "raw",
    ["../secret.ts", "/etc/passwd", "src/../secret.ts", "src//file.ts", "src/./file.ts", "node_modules/x.ts", ".git/config", ""],
)
def test_safe_relative_rejects_escape_and_excluded_paths(raw: str) -> None:
    path, reason = helper._safe_relative(raw)
    assert path is None
    assert reason


def test_regular_source_rejects_symlink_components(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "code.ts").write_text("export const value = 1")
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    (workspace / "linked").symlink_to(outside, target_is_directory=True)
    monkeypatch.setattr(helper, "WORKSPACE", workspace.resolve())

    candidate, reason = helper._regular_source("linked/code.ts")

    assert candidate is None
    assert reason == "symbolic links are not followed"


def test_analyze_applies_file_and_character_budgets(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / "changed.ts").write_text("export function changed() { return 1; }\n")
    (tmp_path / "caller.ts").write_text("export function caller() { return changed(); }\n")
    monkeypatch.setattr(helper, "WORKSPACE", tmp_path.resolve())
    monkeypatch.setattr(
        helper,
        "_semantic_analysis",
        lambda paths, max_files: ({"files": ["changed.ts", "caller.ts"], "symbols": [], "edges": [], "limitations": []}, []),
    )
    monkeypatch.setattr(helper, "_syntax_symbols", lambda path, content, language: ([], False))

    result = helper.analyze({"changed_files": ["changed.ts"], "max_files": 2, "max_chars": 50})

    assert [item["path"] for item in result["files"]] == ["changed.ts", "caller.ts"]
    assert result["coverage"]["characters_included"] == 50
    assert result["files"][1]["truncated"] is True
    assert any(item["code"] == "content-truncated" for item in result["limitations"])


def test_analyze_reports_unsupported_inputs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / "notes.txt").write_text("not source")
    monkeypatch.setattr(helper, "WORKSPACE", tmp_path.resolve())
    monkeypatch.setattr(helper, "_semantic_analysis", lambda paths, max_files: ({}, []))

    result = helper.analyze({"changed_files": ["notes.txt", "missing.ts", "../escape.ts"]})

    assert result["files"] == []
    assert result["coverage"]["eligible_changed_files"] == 0
    assert {item["code"] for item in result["limitations"]} == {
        "invalid-or-excluded-path",
        "unsupported-or-unreadable",
    }


def test_tree_sitter_extracts_tsx_symbols_when_installed() -> None:
    pytest.importorskip("tree_sitter")
    pytest.importorskip("tree_sitter_typescript")
    source = "export function View() { return <div /> }\nconst click = () => 1\n"

    symbols, has_error = helper._syntax_symbols("view.tsx", source, "tsx")

    assert has_error is False
    assert {(symbol["name"], symbol["kind"]) for symbol in symbols} == {("View", "function"), ("click", "function")}


def test_parser_errors_are_recoverable_when_installed() -> None:
    pytest.importorskip("tree_sitter")
    pytest.importorskip("tree_sitter_javascript")

    symbols, has_error = helper._syntax_symbols("broken.js", "function broken( {", "javascript")

    assert isinstance(symbols, list)
    assert has_error is True
