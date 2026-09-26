from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from langgraph.checkpoint.memory import InMemorySaver

from auditor.workflow import Workflow


class Block:
    def __init__(self, block_type: str, **values):
        self.type = block_type
        self.__dict__.update(values)

    def model_dump(self, exclude_none=True):
        result = {"type": self.type}
        result.update({key: value for key, value in self.__dict__.items() if key != "type"})
        return result


class Response:
    def __init__(self, *content):
        self.content = list(content)
        self.usage = SimpleNamespace(input_tokens=25, output_tokens=10)


class ScriptedMessages:
    def __init__(self, responses, counted_tokens=25):
        self.responses = list(responses)
        self.counted_tokens = counted_tokens
        self.calls = []
        self.count_calls = []

    def count_tokens(self, **kwargs):
        self.count_calls.append(deepcopy(kwargs))
        return SimpleNamespace(input_tokens=self.counted_tokens)

    def create(self, **kwargs):
        self.calls.append(deepcopy(kwargs))
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class MemoryStore:
    def __init__(self):
        self.result = None
        self.usage = None
        self.stages = []

    def active(self, run):
        return run

    def update(self, run, **values):
        if "result" in values:
            self.result = deepcopy(values["result"])
        if "usage" in values:
            self.usage = deepcopy(values["usage"])
        if "stage" in values:
            self.stages.append(values["stage"])


def report_input():
    return {
        "summary": "A command injection is present.",
        "findings": [{
            "id": "command-injection",
            "title": "User input reaches a shell",
            "severity": "critical",
            "category": "command-injection",
            "path": "main.ts",
            "line": 1,
            "explanation": "A crafted request can execute an attacker-controlled operating system command.",
            "evidence": "exec(input)",
            "verification": "static",
        }],
        "limitations": ["Configured checks were not available."],
    }


def make_workflow(tmp_path: Path, store: MemoryStore, client: ScriptedMessages, run_id="graph-run") -> Workflow:
    head = tmp_path / "head"
    head.mkdir(exist_ok=True)
    (head / "main.ts").write_text("exec(input);\n")
    workflow = Workflow.__new__(Workflow)
    workflow.settings = SimpleNamespace(
        model="claude-test", max_calls=12, max_input=120_000, max_output=16_000, max_seconds=1200
    )
    workflow.store = store
    workflow.github = None
    workflow.run = {
        "id": run_id,
        "started_at": datetime.now(timezone.utc),
        "profile": {"version": "1", "projects": []},
    }
    workflow.root = tmp_path
    workflow.result = deepcopy(store.result) if store.result is not None else {
        "analysis": {"symbols": [], "edges": []},
        "checks": [],
        "limitations": ["Configured checks were not available."],
    }
    workflow.usage = deepcopy(store.usage) if store.usage is not None else {
        "input_tokens": 0,
        "output_tokens": 0,
        "model_calls": 0,
    }
    workflow.client = SimpleNamespace(messages=client)
    workflow.changed = ["main.ts"]
    workflow.lines = {"main.ts": {1}}
    workflow.diff = "+exec(input);"
    return workflow


def test_graph_runs_tool_result_round_trip_then_submit_report(tmp_path: Path) -> None:
    first = Response(Block("tool_use", id="tool-read", name="read_file", input={
        "path": "main.ts", "revision": "head", "start": 1, "end": 1,
    }))
    second = Response(Block("tool_use", id="tool-submit", name="submit_report", input=report_input()))
    client = ScriptedMessages([first, second])
    store = MemoryStore()
    workflow = make_workflow(tmp_path, store, client)

    workflow.review(InMemorySaver())

    assert workflow.result["findings"][0]["verification"] == "static"
    assert workflow.result["findings"][0]["inline"] is True
    assert workflow.usage == {"input_tokens": 50, "output_tokens": 20, "model_calls": 2}
    assert len(client.calls) == 2
    second_messages = client.calls[1]["messages"]
    assert [message["role"] for message in second_messages] == ["user", "assistant", "user"]
    assert second_messages[1]["content"][0] == {
        "type": "tool_use",
        "id": "tool-read",
        "name": "read_file",
        "input": {"path": "main.ts", "revision": "head", "start": 1, "end": 1},
    }
    tool_result = second_messages[2]["content"][0]
    assert tool_result["type"] == "tool_result"
    assert tool_result["tool_use_id"] == "tool-read"
    assert '"content": "1: exec(input);"' in tool_result["content"]


def test_graph_resume_does_not_replay_checkpointed_tool_side_effect(tmp_path: Path) -> None:
    checkpointer = InMemorySaver()
    store = MemoryStore()
    first_client = ScriptedMessages([
        Response(Block("tool_use", id="tool-effect", name="try_patch", input={
            "finding_id": "command-injection",
            "edits": [{"path": "main.ts", "old": "exec(input)", "new": "safe(input)"}],
        })),
        RuntimeError("transient model failure"),
    ])
    first_workflow = make_workflow(tmp_path, store, first_client, run_id="resume-run")
    effects = []
    first_workflow.tool = lambda name, args: effects.append((name, deepcopy(args))) or {"verified": False}

    with pytest.raises(RuntimeError, match="transient model failure"):
        first_workflow.review(checkpointer)

    assert len(effects) == 1
    # Calls are reserved before the external model request, including the failed request.
    assert store.usage["model_calls"] == 2
    assert store.usage["input_tokens"] == 50
    assert store.usage["output_tokens"] == 2010

    resumed_client = ScriptedMessages([
        Response(Block("tool_use", id="tool-submit", name="submit_report", input=report_input()))
    ])
    resumed = make_workflow(tmp_path, store, resumed_client, run_id="resume-run")
    resumed.tool = lambda name, args: effects.append((name, deepcopy(args))) or {"verified": False}

    resumed.review(checkpointer)

    assert len(effects) == 1
    assert resumed.usage["model_calls"] == 3
    resumed_messages = resumed_client.calls[0]["messages"]
    assert [message["role"] for message in resumed_messages] == ["user", "assistant", "user"]
    assert resumed_messages[2]["content"][0]["tool_use_id"] == "tool-effect"
    assert resumed.result["findings"][0]["id"] == "command-injection"


def test_counted_input_budget_stops_before_message_creation(tmp_path: Path) -> None:
    client = ScriptedMessages([], counted_tokens=500)
    store = MemoryStore()
    workflow = make_workflow(tmp_path, store, client, run_id="budget-run")
    workflow.settings.max_input = 100

    result = workflow.model({"messages": [{"role": "user", "content": "review"}]})

    assert result["done"] is True
    assert result["report"]["limitations"] == ["Input token budget exhausted before a final report"]
    assert len(client.count_calls) == 1
    assert client.calls == []
    assert workflow.usage == {"input_tokens": 0, "output_tokens": 0, "model_calls": 1}


def test_submit_report_must_be_alone_in_tool_turn(tmp_path: Path) -> None:
    mixed = Response(
        Block("tool_use", id="tool-submit-mixed", name="submit_report", input=report_input()),
        Block("tool_use", id="tool-read", name="read_file", input={
            "path": "main.ts", "revision": "head", "start": 1, "end": 1,
        }),
    )
    final = Response(Block("tool_use", id="tool-submit-final", name="submit_report", input=report_input()))
    client = ScriptedMessages([mixed, final])
    workflow = make_workflow(tmp_path, MemoryStore(), client, run_id="mixed-submit-run")

    workflow.review(InMemorySaver())

    assert len(client.calls) == 2
    result_blocks = client.calls[1]["messages"][-1]["content"]
    rejected = next(block for block in result_blocks if block["tool_use_id"] == "tool-submit-mixed")
    assert rejected["is_error"] is True
    assert "final report alone" in rejected["content"]
    assert workflow.result["findings"][0]["id"] == "command-injection"
