#!/usr/bin/env python3
"""Configure a stable Android release signing key from GitHub Actions secrets."""
from __future__ import annotations
import base64
import os
import re
from pathlib import Path


def main() -> int:
    project = Path(os.environ.get("FLUTTER_PROJECT_DIR", "build/mobile")).resolve()
    encoded = os.environ.get("ANDROID_KEYSTORE_BASE64", "").strip()
    alias = os.environ.get("ANDROID_KEY_ALIAS", "").strip()
    store_password = os.environ.get("ANDROID_STORE_PASSWORD", "")
    key_password = os.environ.get("ANDROID_KEY_PASSWORD", "")
    if not all((encoded, alias, store_password, key_password)):
        raise SystemExit("Missing Android signing secrets: ANDROID_KEYSTORE_BASE64, ANDROID_KEY_ALIAS, ANDROID_STORE_PASSWORD, ANDROID_KEY_PASSWORD")
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,100}", alias):
        raise SystemExit("ANDROID_KEY_ALIAS must contain only letters, digits, dot, underscore or dash")
    android_dir = project / "android"
    gradle_file = android_dir / "app" / "build.gradle.kts"
    if not gradle_file.is_file():
        raise SystemExit(f"Flutter Gradle Kotlin file not found: {gradle_file}")
    try:
        key_bytes = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise SystemExit("ANDROID_KEYSTORE_BASE64 is not valid base64") from exc
    if len(key_bytes) < 512:
        raise SystemExit("Decoded Android keystore looks too small; check the base64 GitHub secret")

    app_dir = android_dir / "app"
    app_dir.mkdir(parents=True, exist_ok=True)
    key_path = app_dir / "hendy-release-key.jks"
    key_path.write_bytes(key_bytes)
    try:
        key_path.chmod(0o600)
    except OSError:
        pass
    properties_file = android_dir / "key.properties"
    properties_file.write_text(
        f"storePassword={store_password}\n"
        f"keyPassword={key_password}\n"
        f"keyAlias={alias}\n"
        "storeFile=hendy-release-key.jks\n",
        encoding="utf-8",
    )
    try:
        properties_file.chmod(0o600)
    except OSError:
        pass

    source = gradle_file.read_text(encoding="utf-8")
    if "keystoreProperties" in source or 'create("release")' in source:
        raise SystemExit("Gradle file already appears configured for signing; inspect it rather than patching twice")
    imports = "import java.io.FileInputStream\nimport java.util.Properties\n\n"
    if not source.startswith("import java.io.FileInputStream"):
        source = imports + source
    properties_init = "\nval keystoreProperties = Properties()\nval keystorePropertiesFile = rootProject.file(\"key.properties\")\nif (keystorePropertiesFile.exists()) {\n    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }\n}\n"
    plugin_match = re.search(r"^plugins\s*\{.*?^\}\s*", source, flags=re.MULTILINE | re.DOTALL)
    if not plugin_match:
        raise SystemExit("Could not locate top-level plugins block in build.gradle.kts")
    source = source[:plugin_match.end()] + properties_init + source[plugin_match.end():]
    signing = '''android {
    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
'''
    source, count = re.subn(r"^android\s*\{\s*", signing, source, count=1, flags=re.MULTILINE)
    if count != 1:
        raise SystemExit("Could not locate the android { block in build.gradle.kts")
    source, count = re.subn(
        r'signingConfig\s*=\s*signingConfigs\.getByName\("debug"\)',
        'signingConfig = signingConfigs.getByName("release")',
        source,
        count=1,
    )
    if count != 1:
        raise SystemExit("Could not locate the generated debug signingConfig to replace")
    gradle_file.write_text(source, encoding="utf-8")
    print("Configured stable Android release signing. Key remains on the ephemeral build runner.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
