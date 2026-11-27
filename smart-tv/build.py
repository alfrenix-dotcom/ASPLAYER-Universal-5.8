#!/usr/bin/env python3
"""Generate separate Smart TV projects from the same source; no signing keys."""
import json, pathlib, shutil, subprocess
root=pathlib.Path(__file__).resolve().parent
repo=root.parent
src=root/'src'
out=root/'dist'
logo=repo/'app/src/main/assets/brand-logo.jpg'
if not logo.is_file():
    raise SystemExit('Original brand logo missing; restore it before building.')
try:
    from PIL import Image, ImageOps
except ImportError:
    raise SystemExit('Install Pillow: python3 -m pip install Pillow')
for target in ('tizen','webos','vidaa'):
    dest=out/target
    if dest.exists(): shutil.rmtree(dest)
    shutil.copytree(src,dest)
    shutil.copy2(logo,dest/'brand-logo.jpg')
    with Image.open(logo) as source:
        icon=ImageOps.contain(source.convert('RGBA'), (115,115))
        canvas=Image.new('RGBA',(117,117),(7,13,29,255))
        canvas.paste(icon,((117-icon.width)//2,(117-icon.height)//2),icon)
        canvas.save(dest/'icon.png')
        canvas.resize((80,80),Image.Resampling.LANCZOS).save(dest/'icon80.png')
    html=(dest/'index.html').read_text()
    if target=='tizen':
        html=html.replace('<script src="platform.js">','<script src="$WEBAPIS/webapis/webapis.js"></script><script src="platform.js">')
        (dest/'config.xml').write_text("""<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets" id="https://alftechsolutions.com/asplayer" version="1.0.0" viewmodes="maximized">
  <tizen:application id="ASPLAYERTV.ASPlayer" package="ASPLAYERTV" required_version="5.0"/>
  <content src="index.html"/><icon src="icon.png"/><name>ASPLAYER</name>
  <access origin="*" subdomains="true"/>
  <tizen:profile name="tv-samsung"/>
  <tizen:privilege name="http://tizen.org/privilege/internet"/>
  <tizen:privilege name="http://developer.samsung.com/privilege/avplay"/>
  <tizen:setting screen-orientation="landscape" context-menu="disable" background-support="disable" encryption="disable" install-location="auto" hwkey-event="enable"/>
</widget>
""")
    elif target=='webos':
        (dest/'appinfo.json').write_text(json.dumps({"id":"com.alftech.asplayer.smarttv","version":"1.0.0","vendor":"Alftech Solutions","type":"web","main":"index.html","title":"ASPLAYER","icon":"icon80.png","largeIcon":"icon.png","resolution":"1920x1080"},indent=2))
    (dest/'index.html').write_text(html)
    print('Generated',dest)
print('Source projects only. Sign/package with vendor SDK; VIDAA requires hosted deployment and partner approval.')
