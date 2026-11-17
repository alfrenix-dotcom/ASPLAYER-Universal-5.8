from pathlib import Path
root = Path('.')
assets = root / 'app/src/main/assets'
url = 'https://www.alftechsolutions.com/about-us/privacy-policy'
link = f'<p><a class="ghost" style="display:inline-block;color:#b7e9f6" href="{url}" data-open-link="{url}" data-i18n="privacyPolicy">Privacy policy</a></p>'
p = assets / 'index.html'
s = p.read_text()
login = '<p class="tiny" data-i18n="legal"></p>'
about = '<h3 data-i18n="aboutHeading">About ASPLAYER</h3>'
assert s.count(login) == 1 and s.count(about) == 1
p.write_text(s.replace(login, login + link).replace(about, about + link))
p = assets / 'app.js'
s = p.read_text()
marker = 'restore();const restoredSession=restoreSecureSession();'
assert s.count(marker) == 1
p.write_text(s.replace(marker, "Object.assign(LABELS.en,{privacyPolicy:'Privacy policy'});\nObject.assign(LABELS.es,{privacyPolicy:'Política de privacidad'});\n" + marker))
for name in ['app/build.gradle', 'app/src/main/assets/index.html', 'app/src/main/assets/features-5.9.3.js']:
 p = root / name
 p.write_text(p.read_text().replace('5.9.6', '5.9.7').replace('versionCode 5906', 'versionCode 5907'))
print('Privacy policy linked from login and settings; 5.9.7')
