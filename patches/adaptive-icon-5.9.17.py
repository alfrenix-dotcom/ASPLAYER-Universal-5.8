#!/usr/bin/env python3
"""Install a full-bleed adaptive launcher icon and density-aware legacy fallbacks."""
from pathlib import Path
from shutil import copyfile
from xml.etree import ElementTree as ET

root = Path("app/src/main")
res = root / "res"
art = Path("branding/5.9.17")
for density in ("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"):
    folder = res / ("mipmap-" + density)
    folder.mkdir(exist_ok=True)
    copyfile(art / ("ic_launcher_" + density + ".jpg"), folder / "ic_launcher.jpg")

foreground = res / "drawable-nodpi"
foreground.mkdir(exist_ok=True)
# This is an unmasked 432x432 layer: the visible 288x288 centre is the
# complete artwork and the extended outer 72 px are reserved for OS masking.
copyfile(art / "adaptive-art.jpg", foreground / "asplayer_icon_art.jpg")

values = res / "values"
values.mkdir(exist_ok=True)
(values / "asplayer_icon_colors.xml").write_text("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="asplayer_icon_background">#050914</color>
</resources>
""")

adaptive = res / "mipmap-anydpi-v26"
adaptive.mkdir(exist_ok=True)
(adaptive / "ic_launcher.xml").write_text("""<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/asplayer_icon_background" />
    <foreground android:drawable="@drawable/asplayer_icon_art" />
</adaptive-icon>
""")

manifest = root / "AndroidManifest.xml"
s = manifest.read_text()
assert s.count('android:icon="@drawable/ic_launcher"') == 1
assert s.count('android:roundIcon="@drawable/ic_launcher"') == 1
s = s.replace('android:icon="@drawable/ic_launcher"', 'android:icon="@mipmap/ic_launcher"')
s = s.replace('android:roundIcon="@drawable/ic_launcher"', 'android:roundIcon="@mipmap/ic_launcher"')
manifest.write_text(s)
(res / "drawable/ic_launcher.png").unlink()
ns = "{http://schemas.android.com/apk/res/android}"
app = ET.parse(manifest).getroot().find("application")
assert app.attrib[ns+"icon"] == app.attrib[ns+"roundIcon"] == "@mipmap/ic_launcher"
layers = ET.parse(adaptive / "ic_launcher.xml").getroot()
assert layers.tag == "adaptive-icon" and len(layers) == 2
print("Native adaptive icon and five opaque legacy launcher sizes installed")
