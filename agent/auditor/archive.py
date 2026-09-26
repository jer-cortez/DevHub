"""Source transport. Archives are data, never extraction instructions."""
import base64
import io
import os
import tarfile
from pathlib import Path, PurePosixPath

MAX_SOURCE = 32 * 1024 * 1024
MAX_FILES = 10000
MAX_ARCHIVE = 35 * 1024 * 1024
EXCLUDED = {".git", "node_modules"}


def unpack(data: bytes, target: Path, strip_root: bool = False) -> list[str]:
    omitted = []
    total = 0
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as archive:
        for i, member in enumerate(archive):
            if i >= MAX_FILES:
                raise ValueError("Repository exceeds 10,000 archive entries")
            parts = PurePosixPath(member.name).parts
            if member.name.startswith("/") or ".." in parts or "\\" in member.name:
                raise ValueError("Unsafe archive path")
            if strip_root:
                parts = parts[1:]
            if not parts:
                continue
            if any(p in EXCLUDED for p in parts):
                omitted.append("/".join(parts))
                continue
            if member.isdir():
                continue
            if not member.isfile():
                omitted.append("/".join(parts))
                continue
            total += member.size
            if total > MAX_SOURCE:
                raise ValueError("Source exceeds 32 MiB uncompressed limit")
            path = target.joinpath(*parts)
            path.parent.mkdir(parents=True, exist_ok=True)
            stream = archive.extractfile(member)
            if stream is None:
                continue
            path.write_bytes(stream.read())
            path.chmod(0o755 if member.mode & 0o111 else 0o644)
    return omitted


def pack(root: Path) -> str:
    root = root.resolve(strict=True)
    output = io.BytesIO()
    total = 0
    count = 0
    with tarfile.open(fileobj=output, mode="w:gz") as archive:
        for directory, names, filenames in os.walk(root, topdown=True, followlinks=False):
            base = Path(directory)
            kept = []
            for name in sorted(names):
                candidate = base / name
                if name in EXCLUDED:
                    continue
                if candidate.is_symlink():
                    raise ValueError("Symlinks are unsupported")
                kept.append(name)
            names[:] = kept
            for name in sorted(filenames):
                path = base / name
                if path.is_symlink():
                    raise ValueError("Symlinks are unsupported")
                if not path.is_file():
                    continue
                count += 1
                if count > MAX_FILES:
                    raise ValueError("Repository exceeds 10,000 files")
                total += path.stat().st_size
                if total > MAX_SOURCE:
                    raise ValueError("Source exceeds 32 MiB uncompressed limit")
                archive.add(path, arcname=path.relative_to(root).as_posix(), recursive=False)
    if output.getbuffer().nbytes > MAX_ARCHIVE:
        raise ValueError("Compressed source archive exceeds 35 MiB limit")
    return base64.b64encode(output.getvalue()).decode()
