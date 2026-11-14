#!/usr/bin/env python3
"""ASPLAYER 6.0 Premium TV preview: additive UI layer over the verified 5.9.7 build."""
from pathlib import Path
root=Path('app/src/main/assets')
html=root/'index.html'
s=html.read_text(encoding='utf-8')
assert s.count('</body>')==1, 'Cannot locate HTML insertion point'
s=s.replace('</body>','<link rel="stylesheet" href="premium-tv-6.css"><script defer src="premium-tv-6.js"></script></body>')
html.write_text(s,encoding='utf-8')
for name in ('app/build.gradle','app/src/main/assets/features-5.9.3.js'):
 p=Path(name); v=p.read_text(encoding='utf-8')
 v=v.replace('versionCode 5907','versionCode 6000').replace('5.9.7','6.0.0')
 p.write_text(v,encoding='utf-8')
print('ASPLAYER 6.0 Premium TV UI layer installed')
