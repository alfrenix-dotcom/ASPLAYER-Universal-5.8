#!/usr/bin/env python3
"""Prepare ASPLAYER 6.0.0 from the reconstructed 5.9.7 project.

Run only AFTER all 5.9.7 patches. This does not implement the Sunset UI.
"""
from pathlib import Path
import re

gradle = Path("app/build.gradle")
source = gradle.read_text(encoding="utf-8")
expected = {
    "applicationId": "com.alftech.asplayer.universal.vlc.final.v592",
    "versionCode": "5907",
}
for key, value in expected.items():
    if not any(f"{key} {q}{value}{q}" in source for q in ("\'", "\"", "")):
        raise SystemExit(f"Refusing to patch: expected 5.9.7 {key}={value} not found")
source, n = re.subn(r"\bversionCode\s+5907\b", "versionCode 6000", source)
assert n == 1, "Expected exactly one versionCode"
source, n = re.subn(r'\bversionName\s+["\']5\.9\.7(?:-LibVLC)?["\']', 'versionName "6.0.0"', source)
if n != 1:
    raise SystemExit("Expected exactly one 5.9.7 versionName; no files written")
gradle.write_text(source, encoding="utf-8")
print("ASPLAYER 6.0.0 version metadata prepared; UI and D-pad redesign still pending")
