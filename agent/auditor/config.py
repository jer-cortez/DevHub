import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    model: str
    runner_host: str = ""
    max_seconds: int = 1200
    max_calls: int = 12
    max_input: int = 120000
    max_output: int = 16000
    provider: str = "openai"
    reasoning: str = "low"

    @classmethod
    def load(cls):
        return cls(
            database_url=os.environ["DATABASE_URL"], model=os.getenv("AGENT_MODEL", "gpt-5.6-sol"),
            runner_host=os.getenv("AUDIT_RUNNER_HOST", ""),
            max_seconds=int(os.getenv("AUDIT_MAX_SECONDS", "1200")),
            max_calls=int(os.getenv("AUDIT_MAX_CALLS", "12")),
            max_input=int(os.getenv("AUDIT_MAX_INPUT_TOKENS", "120000")),
            max_output=int(os.getenv("AUDIT_MAX_OUTPUT_TOKENS", "16000")),
            provider=os.getenv("AGENT_PROVIDER", "openai"),
            reasoning=os.getenv("AGENT_REASONING_EFFORT", "low"),
        )
