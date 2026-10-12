#!/usr/bin/env python3
"""Build a validated Hendy manifest and optionally publish it to the configured R2 bucket."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
VERSION_RE = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$")
THUMB_RE = re.compile(r"^[A-Fa-f0-9]{40,64}$")
BUCKET = "hendy-tool-releases"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_command(command: list[str]) -> None:
    if os.name == "nt" and command and command[0] in {"npx", "npm"}:
        subprocess.run(subprocess.list2cmdline(command), cwd=ROOT, check=True, shell=True)
    else:
        subprocess.run(command, cwd=ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Tạo manifest phát hành Hendy và tải lên R2.")
    parser.add_argument("--platform", required=True, choices=["windows", "android", "ios"])
    parser.add_argument("--version", required=True, help="Ví dụ 3.2.0")
    parser.add_argument("--build", required=True, type=int)
    parser.add_argument("--channel", choices=["stable", "beta"], default="stable")
    parser.add_argument("--min-supported-version", default="1.0.0")
    parser.add_argument("--mandatory", action="store_true")
    parser.add_argument("--notes", action="append", default=[])
    parser.add_argument("--file", type=Path, help="Windows EXE/MSI hoặc Android APK")
    parser.add_argument("--store-url", help="URL HTTPS phân phối iOS được phép; không dùng cho APK")
    parser.add_argument("--signer-thumbprint", help="Thumbprint Authenticode của bộ cài Windows")
    parser.add_argument("--upload", action="store_true", help="Upload lên R2 từ runner đã được cấp quyền Wrangler")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "dist")
    args = parser.parse_args()

    if not VERSION_RE.fullmatch(args.version) or not VERSION_RE.fullmatch(args.min_supported_version):
        parser.error("--version và --min-supported-version phải có dạng x.y.z")
    if args.build < 1:
        parser.error("--build phải là số nguyên dương")
    if args.signer_thumbprint and not THUMB_RE.fullmatch(args.signer_thumbprint.replace(" ", "")):
        parser.error("--signer-thumbprint phải gồm 40–64 ký tự hex")

    out = args.output_dir.resolve()
    manifests = out / "manifests"
    manifests.mkdir(parents=True, exist_ok=True)
    manifest: dict = {
        "schemaVersion": 1,
        "appId": "hendy-tools-pro" if args.platform == "windows" else "hendy-tools-mobile",
        "platform": args.platform,
        "channel": args.channel,
        "version": args.version,
        "build": args.build,
        "publishedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "mandatory": bool(args.mandatory),
        "minSupportedVersion": args.min_supported_version,
        "releaseNotes": [line.strip() for item in args.notes for line in item.splitlines() if line.strip()] or ["Cập nhật và cải thiện độ ổn định."],
    }
    jobs: list[list[str]] = []
    if args.platform in {"windows", "android"}:
        if not args.file:
            parser.error(f"{args.platform} yêu cầu --file")
        source = args.file.resolve()
        if not source.is_file():
            parser.error(f"Không tìm thấy tệp phát hành: {source}")
        suffix = source.suffix.lower()
        allowed = {"windows": {".exe", ".msi"}, "android": {".apk"}}[args.platform]
        if suffix not in allowed:
            parser.error(f"Định dạng tệp không hợp lệ cho {args.platform}: {suffix}")
        if args.platform == "windows" and args.signer_thumbprint:
            args.signer_thumbprint = args.signer_thumbprint.replace(" ", "").upper()
        file_name = f"HendyToolsPro-{args.version}-Setup{suffix}" if args.platform == "windows" else f"HendyToolsMobile-{args.version}.apk"
        artifact_path = out / "packages" / args.platform / file_name
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, artifact_path)
        key = f"packages/{args.platform}/{file_name}"
        mime = (
            "application/vnd.microsoft.portable-executable" if suffix == ".exe" else
            "application/x-msi" if suffix == ".msi" else
            "application/vnd.android.package-archive"
        )
        artifact = {
            "key": key,
            "fileName": file_name,
            "sha256": sha256_file(artifact_path),
            "size": artifact_path.stat().st_size,
            "contentType": mime,
        }
        if args.platform == "windows" and args.signer_thumbprint:
            artifact["signerThumbprint"] = args.signer_thumbprint
        manifest["artifact"] = artifact
        jobs.append([
            "npx", "wrangler", "r2", "object", "put", f"{BUCKET}/{key}",
            "--file", str(artifact_path), "--remote", "--force",
            "--content-type", mime,
            "--content-disposition", f"attachment; filename={file_name}",
            "--cache-control", "public, max-age=300",
        ])
    else:
        if args.file:
            parser.error("Không tải IPA trực tiếp qua luồng APK/Windows. Bỏ --file và cấu hình URL iOS đã được Apple cho phép.")
        if not args.store_url:
            parser.error("iOS cần --store-url với liên kết phân phối HTTPS được phép")
        parsed = urlparse(args.store_url)
        if parsed.scheme != "https" or not parsed.netloc:
            parser.error("--store-url phải là URL HTTPS hợp lệ")
        manifest["storeUrl"] = args.store_url
        manifest["artifact"] = None

    manifest_path = manifests / f"{args.platform}-{args.channel}.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Keep immutable manifest snapshots so the website's release console can show changelog history.
    history_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    history_dir = out / "history" / args.platform / args.channel
    history_dir.mkdir(parents=True, exist_ok=True)
    history_name = f"{history_stamp}-{args.version}-build{args.build}.json"
    history_path = history_dir / history_name
    history_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    jobs.append([
        "npx", "wrangler", "r2", "object", "put", f"{BUCKET}/history/{args.platform}/{args.channel}/{history_name}",
        "--file", str(history_path), "--remote", "--force",
        "--content-type", "application/json; charset=utf-8",
        "--cache-control", "public, max-age=31536000, immutable",
    ])
    # Publish current/latest manifest last, only after package and immutable history snapshot are uploaded.
    jobs.append([
        "npx", "wrangler", "r2", "object", "put", f"{BUCKET}/manifests/{args.platform}-{args.channel}.json",
        "--file", str(manifest_path), "--remote", "--force",
        "--content-type", "application/json; charset=utf-8",
        "--cache-control", "public, max-age=30, must-revalidate",
    ])
    print(f"Manifest created: {manifest_path}")
    if args.upload:
        print("Publishing artifact first, then manifest to R2…")
        for index, command in enumerate(jobs, 1):
            print(f"[{index}/{len(jobs)}] Uploading…")
            run_command(command)
        print("Published. Verify /api/v1/releases/latest from the Worker URL.")
    else:
        print("Dry run: no network upload was performed. Set --upload to publish to R2.")
        for command in jobs:
            print(" ".join(f'"{x}"' if " " in x else x for x in command))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
