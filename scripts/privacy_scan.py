#!/usr/bin/env python3
"""Fail CI if ATHLTH_HA contains likely private project data.

The scan covers both the current checkout and every reachable Git commit so a
secret cannot be hidden by deleting it in a later commit before publication.
"""

from __future__ import annotations

from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "__pycache__", ".pytest_cache"}
SKIP_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".db"}
SKIP_FILES = {Path("scripts/privacy_scan.py")}

RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "private ATHLTH application repository",
        re.compile(r"github\.com/Wesc-9/ATHLTH(?!_HA)", re.IGNORECASE),
    ),
    (
        "Supabase project endpoint",
        re.compile(r"[a-z0-9]{15,}\.supabase\.co", re.IGNORECASE),
    ),
    (
        "JWT-like credential",
        re.compile(
            r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b"
        ),
    ),
    (
        "Bearer credential",
        re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]{20,}", re.IGNORECASE),
    ),
    (
        "private IPv4 address",
        re.compile(
            r"\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|"
            r"192\.168\.(?:\d{1,3}\.)\d{1,3}|"
            r"172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b"
        ),
    ),
    (
        "personal local Home Assistant hostname",
        re.compile(r"\bhomeassistant\.local(?::\d+)?\b", re.IGNORECASE),
    ),
    (
        "local developer filesystem path",
        re.compile(r"(?:/Users/|C:\\Users\\|/home/[^/\s]+/)", re.IGNORECASE),
    ),
)

TRACKED_PRIVATE_NAMES = {
    ".env",
    "secrets.yaml",
    "home-assistant_v2.db",
}


def should_skip(relative: Path) -> bool:
    if any(part in SKIP_DIRS for part in relative.parts):
        return True
    if relative in SKIP_FILES:
        return True
    if relative.suffix.lower() in SKIP_SUFFIXES:
        return True
    return False


def scan_text(content: str, label_prefix: str) -> list[str]:
    findings: list[str] = []
    for label, pattern in RULES:
        if pattern.search(content):
            findings.append(f"{label_prefix}: {label}")
    return findings


def scan_current_checkout() -> list[str]:
    findings: list[str] = []

    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue

        relative = path.relative_to(ROOT)
        if should_skip(relative):
            continue

        if path.name in TRACKED_PRIVATE_NAMES:
            findings.append(f"{relative}: private config filename")
            continue

        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        findings.extend(scan_text(content, str(relative)))

    return findings


def git(*args: str) -> bytes:
    return subprocess.check_output(
        ["git", "-C", str(ROOT), *args],
        stderr=subprocess.DEVNULL,
    )


def scan_git_history() -> list[str]:
    findings: list[str] = []

    try:
        commits = git("rev-list", "--all").decode().splitlines()
    except (subprocess.CalledProcessError, UnicodeDecodeError):
        return ["git-history: could not enumerate commits"]

    seen_blobs: set[str] = set()

    for commit in commits:
        try:
            entries = git(
                "ls-tree",
                "-r",
                "-z",
                commit,
            ).split(b"\0")
        except subprocess.CalledProcessError:
            findings.append(f"{commit[:12]}: could not inspect Git tree")
            continue

        for entry in entries:
            if not entry:
                continue

            try:
                metadata, raw_path = entry.split(b"\t", 1)
                mode, object_type, blob_sha = metadata.decode().split()
                relative = Path(raw_path.decode())
            except (ValueError, UnicodeDecodeError):
                continue

            if object_type != "blob" or should_skip(relative):
                continue

            if relative.name in TRACKED_PRIVATE_NAMES:
                findings.append(
                    f"{commit[:12]}:{relative}: private config filename"
                )
                continue

            if blob_sha in seen_blobs:
                continue
            seen_blobs.add(blob_sha)

            try:
                raw = git("cat-file", "-p", blob_sha)
                content = raw.decode("utf-8")
            except (subprocess.CalledProcessError, UnicodeDecodeError):
                continue

            findings.extend(
                scan_text(
                    content,
                    f"{commit[:12]}:{relative}",
                )
            )

    return findings


def main() -> int:
    findings = scan_current_checkout()
    findings.extend(scan_git_history())

    if findings:
        print("Public-release privacy scan failed:")
        for finding in sorted(set(findings)):
            print(f" - {finding}")
        return 1

    print("Public-release privacy scan passed, including Git history.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
