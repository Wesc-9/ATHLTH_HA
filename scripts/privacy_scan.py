#!/usr/bin/env python3
"""Fail CI if public ATHLTH_HA files contain likely private project data."""

from __future__ import annotations

from pathlib import Path
import re
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


def text_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in relative.parts):
            continue
        if relative in SKIP_FILES or path.suffix.lower() in SKIP_SUFFIXES:
            continue
        files.append(path)
    return files


def main() -> int:
    findings: list[str] = []

    for path in text_files():
        relative = path.relative_to(ROOT)
        if path.name in TRACKED_PRIVATE_NAMES:
            findings.append(f"{relative}: private config filename")
            continue

        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for label, pattern in RULES:
            if pattern.search(content):
                findings.append(f"{relative}: {label}")

    if findings:
        print("Public-release privacy scan failed:")
        for finding in sorted(findings):
            print(f" - {finding}")
        return 1

    print("Public-release privacy scan passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
