#!/usr/bin/env python3
"""Stamp version/build and the real update URL into Windows and Flutter release sources."""
from __future__ import annotations
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION_RE = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$")

def replace_one(path: Path, pattern: str, replacement: str, label: str) -> None:
    original = path.read_text(encoding="utf-8")
    changed, count = re.subn(pattern, replacement, original, count=1, flags=re.MULTILINE)
    if count != 1:
        raise SystemExit(f"Could not stamp {label}: expected exactly one matching line in {path}")
    path.write_text(changed, encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--build", required=True, type=int)
    parser.add_argument("--update-url", required=True)
    parser.add_argument("--python-file", type=Path, default=ROOT / "hendy_tools_pro.py")
    parser.add_argument("--installer-file", type=Path, default=ROOT / "installer" / "HendyTools.iss")
    parser.add_argument("--pubspec-file", type=Path)
    args = parser.parse_args()
    if not VERSION_RE.fullmatch(args.version):
        parser.error("--version phải theo dạng x.y.z")
    if args.build < 1: parser.error("--build phải lớn hơn 0")
    if not args.update_url.startswith("https://") or "example.workers.dev" in args.update_url:
        parser.error("--update-url cần là URL HTTPS thật của Worker đã triển khai")
    url = args.update_url.rstrip("/")
    if args.python_file.exists():
        replace_one(args.python_file, r'^APP_VERSION = ".*"$', f'APP_VERSION = "{args.version}"', "APP_VERSION")
        replace_one(args.python_file, r"^APP_BUILD = \d+$", f"APP_BUILD = {args.build}", "APP_BUILD")
        replace_one(args.python_file, r'^UPDATE_SERVER_BASE_URL = .*$',
                    f'UPDATE_SERVER_BASE_URL = os.environ.get("HENDY_UPDATE_BASE_URL", "{url}").rstrip("/")', "UPDATE_SERVER_BASE_URL")
    if args.installer_file.exists():
        replace_one(args.installer_file, r'^#define MyAppVersion ".*"$', f'#define MyAppVersion "{args.version}"', "Inno Setup version")
    if args.pubspec_file:
        replace_one(args.pubspec_file, r'^version: .*$', f'version: {args.version}+{args.build}', "Flutter version")
    print(f"Stamped Hendy version {args.version} build {args.build}; updater={url}")
    return 0
if __name__ == "__main__": raise SystemExit(main())
