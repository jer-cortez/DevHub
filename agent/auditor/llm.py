"""Provider adapters preserving one checkpoint format and enforced tool surface."""
import json
from types import SimpleNamespace


class Block:
    def __init__(self, **values):
        self.__dict__.update(values)

    def model_dump(self, **_kwargs):
        return self.__dict__.copy()


def response_input(messages):
    items = []
    known_calls = set()
    for message in messages:
        content = message["content"]
        if isinstance(content, str):
            items.append({"role": message["role"], "content": content})
            continue
        for block in content:
            if block["type"] == "openai_item":
                # Includes encrypted reasoning items. Never discard these when
                # continuing a stateless reasoning-model tool conversation.
                items.append(block["item"])
                if block["item"].get("type") == "function_call" and block["item"].get("call_id"):
                    known_calls.add(block["item"]["call_id"])
            elif block["type"] == "tool_result":
                if block["tool_use_id"] not in known_calls:
                    raise ValueError("Cannot resume an Anthropic checkpoint with OpenAI; bump profile version")
                items.append({"type": "function_call_output", "call_id": block["tool_use_id"],
                              "output": block["content"]})
            elif block["type"] == "text":
                items.append({"role": message["role"], "content": block["text"]})
            elif block["type"] == "tool_use":
                # Tool calls also have their exact Responses API item above.
                if block["id"] not in known_calls:
                    raise ValueError("Cannot resume an Anthropic checkpoint with OpenAI; bump profile version")
    return items


def response_tools(tools):
    return [{"type": "function", "name": tool["name"], "description": tool.get("description", ""),
             "parameters": tool["input_schema"], "strict": False} for tool in tools]


class OpenAIMessages:
    def __init__(self, client, reasoning):
        self.client, self.reasoning = client, reasoning

    def count_tokens(self, *, model, system, tools, messages):
        return self.client.responses.input_tokens.count(
            model=model, instructions=system, tools=response_tools(tools), input=response_input(messages))

    def create(self, *, model, system, tools, messages, max_tokens, tool_choice=None):
        choice = ({"type": "function", "name": tool_choice["name"]}
                  if tool_choice and tool_choice.get("type") == "tool" else "auto")
        response = self.client.responses.create(
            model=model, instructions=system, input=response_input(messages), tools=response_tools(tools),
            tool_choice=choice, parallel_tool_calls=False, max_output_tokens=max_tokens,
            reasoning={"effort": self.reasoning}, store=False, include=["reasoning.encrypted_content"])
        blocks = []
        for item in response.output:
            blocks.append(Block(type="openai_item", item=item.model_dump(exclude_none=True)))
            if item.type == "function_call":
                try:
                    arguments = json.loads(item.arguments)
                except (json.JSONDecodeError, TypeError) as exc:
                    raise ValueError(f"OpenAI returned malformed arguments for tool {item.name}") from exc
                if not isinstance(arguments, dict):
                    raise ValueError(f"OpenAI returned non-object arguments for tool {item.name}")
                blocks.append(Block(type="tool_use", id=item.call_id, name=item.name, input=arguments))
        if response.usage is None:
            raise RuntimeError("OpenAI omitted usage; reserved budget retained")
        return SimpleNamespace(content=blocks, usage=response.usage)


def reject_openai_history(messages):
    for message in messages:
        content = message.get("content")
        if isinstance(content, list) and any(
            isinstance(block, dict) and block.get("type") == "openai_item" for block in content
        ):
            raise ValueError("Cannot resume an OpenAI checkpoint with Anthropic; bump profile version")


class AnthropicMessages:
    def __init__(self, messages):
        self.messages = messages

    def count_tokens(self, **kwargs):
        reject_openai_history(kwargs.get("messages", []))
        return self.messages.count_tokens(**kwargs)

    def create(self, **kwargs):
        reject_openai_history(kwargs.get("messages", []))
        return self.messages.create(**kwargs)


def make_client(provider="openai", reasoning="low"):
    if provider == "openai":
        from openai import OpenAI
        if reasoning not in ("none", "low", "medium", "high", "xhigh", "max"):
            raise ValueError("Unsupported AGENT_REASONING_EFFORT")
        client = OpenAI(timeout=120, max_retries=0)
        return SimpleNamespace(messages=OpenAIMessages(client, reasoning), models=client.models)
    if provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(timeout=120, max_retries=0)
        return SimpleNamespace(messages=AnthropicMessages(client.messages), models=client.models)
    raise ValueError("AGENT_PROVIDER must be openai or anthropic")
