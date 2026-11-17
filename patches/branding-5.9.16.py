#!/usr/bin/env python3
"""Install the user-supplied ASPLAYER artwork in all app branding surfaces."""
from pathlib import Path
from shutil import copyfile

root = Path("app/src/main")
art = Path("branding/5.9.15")
assets = root / "assets"
drawables = root / "res/drawable"
copyfile(art / "brand-logo.jpg", assets / "brand-logo.jpg")
copyfile(art / "ic_launcher.png", drawables / "ic_launcher.png")
copyfile(art / "tv_banner.jpg", drawables / "tv_banner.jpg")
(assets / "brand-logo.png").unlink()
(drawables / "tv_banner.png").unlink()

html = assets / "index.html"
s = html.read_text()
assert s.count('src="brand-logo.png"') == 3
s = s.replace('src="brand-logo.png"', 'src="brand-logo.jpg"')
s = s.replace('alt="Alftech Solutions · Anubis · Diamond"', 'alt="ASPLAYER by Alftech Solutions"')
s = s.replace(".logo-image img{", ".logo-image img{border-radius:20%;")
s = s.replace(".hero-logo{width:min", ".hero-logo{border-radius:16%;width:min")
html.write_text(s)

manifest = root / "AndroidManifest.xml"
m = manifest.read_text()
assert m.count('android:icon="@drawable/ic_launcher"') == 1
m = m.replace('android:icon="@drawable/ic_launcher"', 'android:icon="@drawable/ic_launcher" android:roundIcon="@drawable/ic_launcher"')
manifest.write_text(m)
print("New ASPLAYER logo installed on launcher, Android TV banner, login, sidebar and Home")
