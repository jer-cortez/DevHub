#!/usr/bin/env python3
"""Bounded, read-only JavaScript/TypeScript source analysis.

The helper is designed to run inside the audit container with the checkout at
``/workspace``. It accepts one JSON object on stdin and emits one JSON object
on stdout. Diagnostics are represented in ``limitations``; malformed top-level
requests are the only errors returned through the ``error`` field.
"""

from __future__ import annotations

import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
from typing import Any


WORKSPACE = Path(os.environ.get("AUDIT_WORKSPACE", "/workspace")).resolve()
NODE_HELPER = Path(os.environ.get("AUDIT_SYMBOL_HELPER", "/opt/audit/symbols.cjs"))
DEFAULT_MAX_FILES = 100
DEFAULT_MAX_CHARS = 100_000
MAX_REQUEST_FILES = 1_000
NODE_TIMEOUT_SECONDS = 20

LANGUAGES = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".mts": "typescript",
    ".cts": "typescript",
}
IGNORED_PARTS = {
    ".git",
    ".hg",
    ".svn",
    ".next",
    ".nuxt",
    ".output",
    ".turbo",
    ".cache",
    "node_modules",
    "bower_components",
    "coverage",
    "dist",
    "build",
    "generated",
    "vendor",
}


def _lim(code: str, message: str, path: str | None = None) -> dict[str, str]:
    item = {"code": code, "message": message}
    if path is not None:
        item["path"] = path
    return item


def _bounded_int(value: Any, default: int, ceiling: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        return default
    return max(1, min(value, ceiling))


def _safe_relative(raw: Any) -> tuple[str | None, str | None]:
    if not isinstance(raw, str) or not raw or "\x00" in raw:
        return None, "path must be a non-empty string"
    normalized = raw.replace("\\", "/")
    pure = PurePosixPath(normalized)
    if pure.is_absolute() or pure.as_posix() != normalized or any(part in ("", ".", "..") for part in pure.parts):
        return None, "path must be normalized and relative to /workspace"
    if any(part.lower() in IGNORED_PARTS for part in pure.parts):
        return None, "path is in an excluded directory"
    return pure.as_posix(), None


def _regular_source(relative: str) -> tuple[Path | None, str | None]:
    candidate = WORKSPACE.joinpath(*PurePosixPath(relative).parts)
    current = WORKSPACE
    for part in PurePosixPath(relative).parts:
        current = current / part
        try:
            component = current.lstat()
        except OSError as exc:
            return None, f"cannot inspect file: {exc.strerror or type(exc).__name__}"
        if stat.S_ISLNK(component.st_mode):
            return None, "symbolic links are not followed"
    try:
        info = candidate.lstat()
    except OSError as exc:
        return None, f"cannot inspect file: {exc.strerror or type(exc).__name__}"
    if stat.S_ISLNK(info.st_mode):
        return None, "symbolic links are not followed"
    if not stat.S_ISREG(info.st_mode):
        return None, "path is not a regular file"
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(WORKSPACE)
    except (OSError, ValueError):
        return None, "path resolves outside /workspace"
    if candidate.suffix.lower() not in LANGUAGES:
        return None, "unsupported source type"
    return candidate, None


def _parser(language: str):
    from tree_sitter import Language, Parser

    if language == "javascript":
        import tree_sitter_javascript

        grammar = tree_sitter_javascript.language()
    else:
        import tree_sitter_typescript

        grammar = (
            tree_sitter_typescript.language_tsx()
            if language == "tsx"
            else tree_sitter_typescript.language_typescript()
        )
    return Parser(Language(grammar))


FUNCTION_TYPES = {
    "function_declaration": "function",
    "method_definition": "method",
    "arrow_function": "function",
    "function_expression": "function",
    "generator_function_declaration": "function",
}
DECLARATION_TYPES = {
    "class_declaration": "class",
    "interface_declaration": "interface",
    "type_alias_declaration": "type",
    "enum_declaration": "enum",
}


def _node_text(source: bytes, node: Any) -> str:
    return source[node.start_byte : node.end_byte].decode("utf-8", "replace")


def _name_for_node(node: Any, source: bytes) -> str | None:
    name = node.child_by_field_name("name")
    if name is not None:
        return _node_text(source, name)
    parent = node.parent
    if parent is not None and parent.type == "variable_declarator":
        name = parent.child_by_field_name("name")
        if name is not None:
            return _node_text(source, name)
    return None


def _syntax_symbols(path: str, content: str, language: str) -> tuple[list[dict[str, Any]], bool]:
    source = content.encode("utf-8")
    tree = _parser(language).parse(source)
    symbols: list[dict[str, Any]] = []
    stack = [tree.root_node]
    while stack:
        node = stack.pop()
        kind = FUNCTION_TYPES.get(node.type) or DECLARATION_TYPES.get(node.type)
        if kind:
            name = _name_for_node(node, source)
            if name:
                symbols.append(
                    {
                        "id": f"syntax:{path}:{node.start_point.row + 1}:{node.start_point.column + 1}:{name}",
                        "name": name,
                        "kind": kind,
                        "path": path,
                        "start_line": node.start_point.row + 1,
                        "end_line": node.end_point.row + 1,
                        "source": "tree-sitter",
                    }
                )
        stack.extend(reversed(node.children))
    return symbols, bool(tree.root_node.has_error)


def _semantic_analysis(paths: list[str], max_files: int) -> tuple[dict[str, Any], list[dict[str, str]]]:
    limitations: list[dict[str, str]] = []
    request = {"workspace": str(WORKSPACE), "changed_files": paths, "max_files": max_files}
    helper = NODE_HELPER
    if not helper.is_file():
        local = Path(__file__).with_name("symbols.cjs")
        helper = local if local.is_file() else helper
    if not helper.is_file():
        return {}, [_lim("semantic-helper-unavailable", "Node semantic helper is unavailable")]
    try:
        result = subprocess.run(
            ["node", str(helper)],
            input=json.dumps(request),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=NODE_TIMEOUT_SECONDS,
            check=False,
            cwd=WORKSPACE,
            env={"PATH": os.environ.get("PATH", "/usr/bin:/bin")},
        )
    except subprocess.TimeoutExpired:
        return {}, [_lim("semantic-timeout", f"semantic analysis exceeded {NODE_TIMEOUT_SECONDS}s")]
    except OSError as exc:
        return {}, [_lim("semantic-helper-error", f"cannot run semantic helper: {exc}")]
    if result.returncode != 0:
        detail = (result.stderr or "semantic helper failed").strip()[:500]
        return {}, [_lim("semantic-helper-error", detail)]
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}, [_lim("semantic-helper-error", "semantic helper emitted invalid JSON")]
    if not isinstance(payload, dict):
        return {}, [_lim("semantic-helper-error", "semantic helper emitted an invalid result")]
    for item in payload.get("limitations", []):
        if isinstance(item, dict) and isinstance(item.get("code"), str):
            limitations.append(item)
    return payload, limitations


def analyze(request: Any) -> dict[str, Any]:
    if not isinstance(request, dict):
        return {"error": "request must be a JSON object", "files": [], "symbols": [], "edges": [], "limitations": [], "coverage": {}}
    raw_changed = request.get("changed_files")
    if not isinstance(raw_changed, list):
        return {"error": "changed_files must be an array", "files": [], "symbols": [], "edges": [], "limitations": [], "coverage": {}}

    max_files = _bounded_int(request.get("max_files"), DEFAULT_MAX_FILES, DEFAULT_MAX_FILES)
    max_chars = _bounded_int(request.get("max_chars"), DEFAULT_MAX_CHARS, 1_000_000)
    limitations: list[dict[str, str]] = []
    if isinstance(request.get("max_files"), int) and not isinstance(request.get("max_files"), bool) and request["max_files"] > DEFAULT_MAX_FILES:
        limitations.append(_lim("request-limit-clamped", f"max_files is capped at {DEFAULT_MAX_FILES}"))
    if isinstance(request.get("max_chars"), int) and not isinstance(request.get("max_chars"), bool) and request["max_chars"] > 1_000_000:
        limitations.append(_lim("request-limit-clamped", "max_chars is capped at 1000000"))
    changed: list[str] = []
    seen: set[str] = set()
    for raw in raw_changed[:MAX_REQUEST_FILES]:
        path, reason = _safe_relative(raw)
        if reason:
            limitations.append(_lim("invalid-or-excluded-path", reason, str(raw)[:200]))
            continue
        assert path is not None
        if path in seen:
            continue
        seen.add(path)
        _, reason = _regular_source(path)
        if reason:
            limitations.append(_lim("unsupported-or-unreadable", reason, path))
            continue
        changed.append(path)
    if len(raw_changed) > MAX_REQUEST_FILES:
        limitations.append(_lim("request-truncated", f"only the first {MAX_REQUEST_FILES} changed paths were inspected"))

    semantic, semantic_limitations = _semantic_analysis(changed, max_files)
    limitations.extend(semantic_limitations)
    if changed:
        limitations.append(
            _lim(
                "changed-line-data-unavailable",
                "the request identifies changed files but not diff hunks; semantic symbols in those files are conservatively marked changed",
            )
        )
    suggested = semantic.get("files", []) if isinstance(semantic.get("files"), list) else []
    ordered = changed + [item for item in suggested if isinstance(item, str) and item not in seen]
    files: list[dict[str, Any]] = []
    syntax_symbols: list[dict[str, Any]] = []
    chars_used = 0
    included: set[str] = set()
    parse_errors = 0
    for raw in ordered:
        if len(files) >= max_files:
            limitations.append(_lim("file-budget-exceeded", f"analysis is limited to {max_files} files"))
            break
        path, reason = _safe_relative(raw)
        if reason:
            limitations.append(_lim("invalid-or-excluded-path", reason, str(raw)[:200]))
            continue
        if path is None or path in included:
            continue
        candidate, reason = _regular_source(path)
        if reason or candidate is None:
            limitations.append(_lim("unsupported-or-unreadable", reason or "unreadable", path))
            continue
        remaining = max_chars - chars_used
        if remaining <= 0:
            limitations.append(_lim("character-budget-exceeded", f"content is limited to {max_chars} characters"))
            break
        # Four bytes cover the longest valid UTF-8 scalar. Reading only the
        # budgeted prefix prevents a single hostile file from exhausting RAM.
        byte_limit = remaining * 4 + 4
        try:
            with candidate.open("rb") as source:
                data = source.read(byte_limit + 1)
        except OSError as exc:
            limitations.append(_lim("read-error", str(exc), path))
            continue
        if b"\x00" in data:
            limitations.append(_lim("binary-file", "file contains NUL bytes", path))
            continue
        content = data[:byte_limit].decode("utf-8", "replace")
        truncated = len(data) > byte_limit or len(content) > remaining
        if truncated:
            content = content[:remaining]
            limitations.append(_lim("content-truncated", "file content was truncated by the character budget", path))
        language = LANGUAGES[candidate.suffix.lower()]
        local_symbols: list[dict[str, Any]] = []
        try:
            local_symbols, has_error = _syntax_symbols(path, content, language)
            if has_error:
                parse_errors += 1
                limitations.append(_lim("parser-error", "Tree-sitter recovered from a syntax error", path))
        except Exception as exc:
            parse_errors += 1
            limitations.append(_lim("parser-unavailable", f"Tree-sitter parse failed: {type(exc).__name__}: {exc}", path))
        files.append({"path": path, "content": content, "language": language, "symbols": local_symbols, "changed": path in changed, "truncated": truncated})
        syntax_symbols.extend(local_symbols)
        chars_used += len(content)
        included.add(path)
        if truncated:
            break

    semantic_symbols = [s for s in semantic.get("symbols", []) if isinstance(s, dict) and s.get("path") in included]
    semantic_edges = [
        e for e in semantic.get("edges", [])
        if isinstance(e, dict) and (e.get("path") in included or e.get("from_path") in included)
    ]
    symbols = semantic_symbols or syntax_symbols
    coverage = {
        "requested_changed_files": len(raw_changed),
        "eligible_changed_files": len(changed),
        "included_files": len(files),
        "changed_files_included": sum(1 for item in files if item["changed"]),
        "relevant_unchanged_files_included": sum(1 for item in files if not item["changed"]),
        "characters_included": chars_used,
        "max_files": max_files,
        "max_chars": max_chars,
        "semantic_available": bool(semantic),
        "parse_error_files": parse_errors,
    }
    return {"files": files, "symbols": symbols, "edges": semantic_edges, "limitations": limitations, "coverage": coverage}


def main() -> int:
    try:
        request = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        json.dump({"error": f"invalid JSON request: {exc}", "files": [], "symbols": [], "edges": [], "limitations": [], "coverage": {}}, sys.stdout)
        sys.stdout.write("\n")
        return 2
    result = analyze(request)
    json.dump(result, sys.stdout, separators=(",", ":"), ensure_ascii=False)
    sys.stdout.write("\n")
    return 0 if "error" not in result else 2


if __name__ == "__main__":
    raise SystemExit(main())
