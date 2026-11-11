#!/usr/bin/env python3
"""Apply after upgrade-5.9.3.py. Keep the permanent application ID and min SDK."""
from pathlib import Path
import re

build = Path('app/build.gradle')
s = build.read_text()
assert "applicationId 'com.alftech.asplayer.universal.vlc.final.v592'" in s
assert 'minSdk 21' in s and 'versionCode 5903' in s
s, count = re.subn(r'compileSdk \d+', 'compileSdk 36', s)
assert count == 1
s, count = re.subn(r'targetSdk \d+', 'targetSdk 36', s)
assert count == 1
s = s.replace('versionCode 5903', 'versionCode 5904').replace("versionName '5.9.3-LibVLC'", "versionName '5.9.4-LibVLC'")
build.write_text(s)
plugin = Path('build.gradle')
s = plugin.read_text()
assert "version '8.9.2'" in s
plugin.write_text(s.replace("version '8.9.2'", "version '8.10.1'"))

java = Path('app/src/main/java/com/alftech/asplayer/universal/MainActivity.java')
s = java.read_text()
anchor = '        setContentView(root);'
assert s.count(anchor) == 1
s = s.replace(anchor, '''        // Android 15/16 enforce edge-to-edge. Keep menus, video controls and
        // login fields clear of system bars, display cutouts and the keyboard.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(
                    android.view.WindowInsets.Type.systemBars()
                    | android.view.WindowInsets.Type.displayCutout()
                    | android.view.WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(),
                    insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(),
                    insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        setContentView(root);
        root.requestApplyInsets();
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::handleAppBack);
        }''')
anchor = '    @Override public void onBackPressed() {\n'
assert s.count(anchor) == 1
s = s.replace(anchor, '''    @Override public void onBackPressed() { handleAppBack(); }
    private void handleAppBack() {
''')
s = s.replace('getDecorView().setSystemUiVisibility(IMMERSIVE);',
              'getDecorView().setSystemUiVisibility(IMMERSIVE);\n            root.requestApplyInsets();')
s = s.replace('getDecorView().setSystemUiVisibility(0);',
              'getDecorView().setSystemUiVisibility(0);\n        root.requestApplyInsets();')
s = s.replace('if(focus && playerVisible)getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE);\n            root.requestApplyInsets();',
              'if(focus && playerVisible) {\n            getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE);\n            root.requestApplyInsets();\n        }')
s = s.replace('feedbackTitle.setTypeface(null,1);',
              'feedbackTitle.setTypeface(null,android.graphics.Typeface.BOLD);')
s = s.replace('return "5.9.3";', 'return "5.9.4";')
java.write_text(s)
manifest = Path('app/src/main/AndroidManifest.xml')
s = manifest.read_text()
assert s.count('android:allowBackup="false"') == 1
manifest.write_text(s.replace('android:allowBackup="false"',
    'android:allowBackup="false" android:enableOnBackInvokedCallback="true"'))
for p in Path('app/src/main/assets').glob('*'):
    if p.suffix in ('.js', '.html'):
        s = p.read_text()
        p.write_text(s.replace('ASPLAYER Universal 5.9.3', 'ASPLAYER Universal 5.9.4')
                     .replace('ASPLAYER 5.9.3', 'ASPLAYER 5.9.4'))
print('API 36 compatibility applied: versionCode 5904, minSdk 21, AGP 8.10.1')
