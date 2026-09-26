from pathlib import PurePosixPath
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator


def safe_path(value: str) -> str:
    p = PurePosixPath(value)
    if (not value or len(value) > 500 or p.is_absolute() or ".." in p.parts or
            "\\" in value or "\x00" in value or ":" in value or
            p.as_posix() != value):
        raise ValueError("Expected a relative repository path")
    if ".git" in p.parts or "node_modules" in p.parts:
        raise ValueError("Reserved repository path")
    return value


class Check(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    argv: list[str] = Field(min_length=1, max_length=32)

    @field_validator("argv")
    @classmethod
    def bounded_argv(cls, value: list[str]) -> list[str]:
        if any(not item or len(item) > 1000 or "\x00" in item for item in value):
            raise ValueError("Command arguments must be 1-1000 characters without NUL bytes")
        return value


class Project(BaseModel):
    directory: str = Field(default=".", max_length=500)
    checks: list[Check] = Field(min_length=1, max_length=10)
    rebuild: list[Check] = Field(default_factory=list, max_length=5)
    _directory = field_validator("directory")(safe_path)


class Profile(BaseModel):
    version: str = Field(min_length=1, max_length=80)
    enabled: bool = True
    node_image: str = Field(default="devhub-audit-node:22", min_length=1, max_length=200,
                            pattern=r"^[A-Za-z0-9][A-Za-z0-9._/@:-]*$")
    projects: list[Project] = Field(min_length=1, max_length=5)


class Finding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,80}$")
    title: str = Field(min_length=5, max_length=200)
    severity: Literal["low", "medium", "high", "critical"]
    category: str = Field(min_length=1, max_length=80)
    path: str
    line: int = Field(ge=1)
    explanation: str = Field(min_length=20, max_length=4000)
    evidence: str = Field(min_length=10, max_length=4000)
    verification: Literal["static", "reproduced", "unverified"] = "static"
    patch: str | None = Field(default=None, max_length=30000)
    _path = field_validator("path")(safe_path)

    @field_validator("evidence")
    @classmethod
    def concrete_evidence(cls, value: str) -> str:
        if len(value.strip()) < 10:
            raise ValueError("Evidence must contain at least ten non-padding characters")
        return value.strip()


class Report(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(min_length=1, max_length=4000)
    findings: list[Finding] = Field(max_length=30)
    limitations: list[str] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def unique_findings(self):
        if len({f.id for f in self.findings}) != len(self.findings):
            raise ValueError("Finding IDs must be unique")
        return self
