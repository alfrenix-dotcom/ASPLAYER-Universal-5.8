#!/usr/bin/env python3
"""Validate Play-ready AAB metadata and 16 KiB native ELF segment alignment."""
import argparse
import re
import struct
import subprocess
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument("bundle", type=Path)
parser.add_argument("bundletool", type=Path)
args = parser.parse_args()

def tool(*params):
    return subprocess.check_output(
        ["java", "-jar", str(args.bundletool), *params, "--bundle=" + str(args.bundle)],
        text=True,
    )

print(tool("validate").strip())
manifest = ET.fromstring(tool("dump", "manifest", "--module=base"))
ns = "{http://schemas.android.com/apk/res/android}"
assert manifest.attrib["package"] == "com.alftech.asplayer.universal.vlc.final.v592"
gradle = Path("app/build.gradle").read_text()
expected_code = re.search(r"versionCode\s+(\d+)", gradle)[1]
expected_name = re.search(r"versionName\s+'([^']+)'", gradle)[1]
assert manifest.attrib[ns + "versionCode"] == expected_code
assert manifest.attrib[ns + "versionName"] == expected_name
assert re.fullmatch(r"\d+\.\d+\.\d+", expected_name)
assert int(expected_code) > 5907
sdk = manifest.find("uses-sdk")
assert int(sdk.attrib[ns + "targetSdkVersion"]) >= 36
assert int(sdk.attrib[ns + "minSdkVersion"]) == 21
app = manifest.find("application")
assert app.attrib.get(ns + "debuggable", "false") == "false"
assert app.attrib.get(ns + "testOnly", "false") == "false"
assert app.attrib.get(ns + "icon")
categories = {x.attrib.get(ns + "name") for x in app.findall(".//category")}
assert "android.intent.category.LEANBACK_LAUNCHER" in categories
assert "android.intent.category.LAUNCHER" in categories
print(f"Manifest verified: {expected_name} ({expected_code}), target SDK {sdk.attrib[ns + 'targetSdkVersion']}, non-debuggable, TV/mobile")

configuration = tool("dump", "config")
assert "PAGE_ALIGNMENT_16K" in configuration, "AAB does not request 16 KiB ZIP alignment"
print("Bundle configuration: PAGE_ALIGNMENT_16K")

def load_segments_64(data):
    assert data[:4] == b"\x7fELF" and data[4] == 2, "Expected ELF64"
    endian = "<" if data[5] == 1 else ">"
    header = struct.unpack_from(endian + "HHIQQQIHHHHHH", data, 16)
    phoff, phentsize, phnum = header[4], header[8], header[9]
    assert phentsize >= 56
    for i in range(phnum):
        kind, flags, offset, vaddr, paddr, filesz, memsz, align = struct.unpack_from(
            endian + "IIQQQQQQ", data, phoff + i * phentsize
        )
        if kind == 1:
            yield offset, vaddr, align

with zipfile.ZipFile(args.bundle) as z:
    libs = [n for n in z.namelist() if re.search(r"/lib/(arm64-v8a|x86_64)/[^/]+\.so$", n)]
    assert any("/arm64-v8a/" in n for n in libs), "No arm64 libraries in bundle"
    failures = []
    for name in sorted(libs):
        segments = list(load_segments_64(z.read(name)))
        assert segments, f"No loadable segments in {name}"
        if any(a < 16384 or (v - o) % 16384 for o, v, a in segments):
            failures.append(name)
        print(f"{name}: minimum PT_LOAD alignment={min(a for _, _, a in segments)}")
    assert not failures, f"Native libraries with insufficient ELF alignment: {failures}"
    print(f"Verified {len(libs)} 64-bit native libraries for 16 KiB alignment")
    signatures = [n for n in z.namelist() if re.fullmatch(r"META-INF/[^/]+\.(RSA|DSA|EC)", n, re.I)]
    assert not signatures, "This build is expected to be unsigned; validate signing separately"
print("AAB structurally validated. Upload key and on-device 16 KiB behavior remain unverified.")
