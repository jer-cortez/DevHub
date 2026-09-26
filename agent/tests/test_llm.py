from __future__ import annotations

from types import SimpleNamespace

import pytest

from auditor.llm import AnthropicMessages, OpenAIMessages, response_input, response_tools


TOOLS = [{
    "name": "read_file",
    "description": "Read a source file",
    "input_schema": {
        "type": "object",
        "properties": {"path": {"type": "string"}},
        "required": ["path"],
    },
}]


class Item:
    def __init__(self, item_type: str, **values):
        self.type = item_type
        self.__dict__.update(values)

    def model_dump(self, exclude_none=True):
        result = {"type": self.type}
        result.update({key: value for key, value in self.__dict__.items() if key != "type"})
        return result


class TokenCounter:
    def __init__(self):
        self.calls = []

    def count(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(input_tokens=37)


class Responses:
    def __init__(self, output):
        self.output = output
        self.calls = []
        self.input_tokens = TokenCounter()

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            output=self.output,
            usage=SimpleNamespace(input_tokens=41, output_tokens=12),
        )


def client_with(*items):
    responses = Responses(list(items))
    return SimpleNamespace(responses=responses), responses


def test_function_tools_are_converted_with_non_strict_schema() -> None:
    converted = response_tools(TOOLS)

    assert converted == [{
        "type": "function",
        "name": "read_file",
        "description": "Read a source file",
        "parameters": TOOLS[0]["input_schema"],
        "strict": False,
    }]


def test_reasoning_and_function_call_are_replayed_before_tool_output_without_duplicate() -> None:
    reasoning = Item("reasoning", id="rs_1", encrypted_content="encrypted-reasoning", summary=[])
    function = Item(
        "function_call", id="fc_1", call_id="call_1", name="read_file",
        arguments='{"path":"src/main.ts"}', status="completed",
    )
    client, responses = client_with(reasoning, function)
    adapter = OpenAIMessages(client, "low")

    response = adapter.create(
        model="gpt-5.6-sol", system="review safely", tools=TOOLS,
        messages=[{"role": "user", "content": "inspect the change"}], max_tokens=2000,
    )
    assistant = [block.model_dump(exclude_none=True) for block in response.content]
    followup = response_input([
        {"role": "user", "content": "inspect the change"},
        {"role": "assistant", "content": assistant},
        {"role": "user", "content": [{
            "type": "tool_result", "tool_use_id": "call_1",
            "content": '{"path":"src/main.ts","content":"source"}',
        }]},
    ])

    assert [item.get("type") for item in followup[1:]] == [
        "reasoning", "function_call", "function_call_output",
    ]
    assert followup[1]["encrypted_content"] == "encrypted-reasoning"
    assert followup[2]["call_id"] == followup[3]["call_id"] == "call_1"
    assert sum(item.get("type") == "function_call" for item in followup) == 1
    normalized = [block for block in assistant if block["type"] == "tool_use"]
    assert normalized == [{
        "type": "tool_use", "id": "call_1", "name": "read_file",
        "input": {"path": "src/main.ts"},
    }]

    request = responses.calls[0]
    assert request["store"] is False
    assert request["reasoning"] == {"effort": "low"}
    assert request["include"] == ["reasoning.encrypted_content"]
    assert request["parallel_tool_calls"] is False
    assert request["max_output_tokens"] == 2000


@pytest.mark.parametrize("arguments", ["{not-json", "[]", '"string"'])
def test_malformed_or_non_object_function_arguments_fail_locally(arguments: str) -> None:
    function = Item(
        "function_call", id="fc_bad", call_id="call_bad", name="read_file",
        arguments=arguments, status="completed",
    )
    client, _ = client_with(function)

    with pytest.raises(ValueError, match="arguments for tool read_file"):
        OpenAIMessages(client, "low").create(
            model="gpt-5.6-sol", system="system", tools=TOOLS,
            messages=[{"role": "user", "content": "inspect"}], max_tokens=100,
        )


def test_count_tokens_uses_responses_input_token_endpoint_and_same_conversion() -> None:
    client, responses = client_with()
    adapter = OpenAIMessages(client, "low")

    counted = adapter.count_tokens(
        model="gpt-5.6-sol", system="system", tools=TOOLS,
        messages=[{"role": "user", "content": "inspect"}],
    )

    assert counted.input_tokens == 37
    assert responses.input_tokens.calls == [{
        "model": "gpt-5.6-sol",
        "instructions": "system",
        "tools": response_tools(TOOLS),
        "input": [{"role": "user", "content": "inspect"}],
    }]


def test_anthropic_tool_history_cannot_be_resumed_as_openai() -> None:
    messages = [
        {"role": "user", "content": "inspect"},
        {"role": "assistant", "content": [{
            "type": "tool_use", "id": "anthropic-tool-id", "name": "read_file",
            "input": {"path": "main.ts"},
        }]},
        {"role": "user", "content": [{
            "type": "tool_result", "tool_use_id": "anthropic-tool-id", "content": "result",
        }]},
    ]

    with pytest.raises(ValueError, match="Cannot resume an Anthropic checkpoint"):
        response_input(messages)


def test_unrelated_openai_item_cannot_disguise_anthropic_tool_history() -> None:
    messages = [{"role": "assistant", "content": [
        {"type": "openai_item", "item": {
            "type": "reasoning", "id": "rs_1", "encrypted_content": "encrypted",
        }},
        {"type": "tool_use", "id": "anthropic-call", "name": "read_file", "input": {"path": "main.ts"}},
    ]}]
    with pytest.raises(ValueError, match="Cannot resume an Anthropic checkpoint"):
        response_input(messages)


def test_unmatched_tool_result_is_rejected_for_openai_resume() -> None:
    messages = [{"role": "user", "content": [{
        "type": "tool_result", "tool_use_id": "missing-call", "content": "result",
    }]}]
    with pytest.raises(ValueError, match="Cannot resume an Anthropic checkpoint"):
        response_input(messages)


class DelegatedAnthropicMessages:
    def __init__(self):
        self.count_calls = []
        self.create_calls = []

    def count_tokens(self, **kwargs):
        self.count_calls.append(kwargs)
        return SimpleNamespace(input_tokens=1)

    def create(self, **kwargs):
        self.create_calls.append(kwargs)
        return SimpleNamespace(content=[], usage=SimpleNamespace(input_tokens=1, output_tokens=1))


@pytest.mark.parametrize("method", ["count_tokens", "create"])
def test_openai_checkpoint_cannot_be_resumed_as_anthropic(method: str) -> None:
    delegated = DelegatedAnthropicMessages()
    adapter = AnthropicMessages(delegated)
    kwargs = {
        "model": "claude-test", "system": "system", "tools": TOOLS,
        "messages": [{"role": "assistant", "content": [{
            "type": "openai_item", "item": {"type": "reasoning", "id": "rs_1"},
        }]}],
    }
    if method == "create":
        kwargs["max_tokens"] = 100

    with pytest.raises(ValueError, match="Cannot resume an OpenAI checkpoint"):
        getattr(adapter, method)(**kwargs)
    assert delegated.count_calls == []
    assert delegated.create_calls == []
