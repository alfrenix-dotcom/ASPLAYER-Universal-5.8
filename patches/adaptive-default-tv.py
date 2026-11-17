#!/usr/bin/env python3
"""Set Adaptive as the default buffer profile without overwriting saved choices.
Run after upgrade-5.9.3.py on the restored ASPLAYER source.
Fail closed when the historical source layout differs.
"""
from pathlib import Path
import re

p = Path("app/src/main/assets/features-5.7.1.js")
s = p.read_text(encoding="utf-8")
# The original UI initializes settings.bufferProfile to normal if unset.
# Replace only fallback/default expressions, never unconditional assignments:
patterns = [
    (r"(bufferProfile\s*:\s*['\"])normal(['\"])", r"\1adaptive\2"),
    (r"(bufferProfile\s*\|\|\s*['\"])normal(['\"])", r"\1adaptive\2"),
    (r"(bufferProfile\s*\?\?\s*['\"])normal(['\"])", r"\1adaptive\2"),
]
changed = 0
for pattern, replacement in patterns:
    s, n = re.subn(pattern, replacement, s)
    changed += n
if changed == 0:
    raise SystemExit("No recognized default buffer profile: inspect source before editing")
if "['fast','normal','ultra','adaptive']" not in s:
    raise SystemExit("Adaptive profile choices missing; apply 5.9.3 patch first")
p.write_text(s, encoding="utf-8")
print(f"Adaptive default configured in {changed} fallback(s); stored preferences unchanged")
