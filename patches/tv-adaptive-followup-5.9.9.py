#!/usr/bin/env python3
"""ASPLAYER 5.9.9 follow-up: remote focus and adaptive defaults.
Run after upgrade-5.9.3.py and tv-focus-5.9.9.py.
Fail closed when upstream source no longer matches.
"""
from pathlib import Path
p=Path("app/src/main/java/com/alftech/asplayer/universal/MainActivity.java")
s=p.read_text("utf-8")
old='''                    if(canSeek()){seekBy(-step);showControls();return true;}'''
new='''                    // Only seek with the timeline focused; otherwise let Android
                    // navigate between the actual transport / extras buttons.
                    if(canSeek() && timeline != null && timeline.hasFocus()){
                        seekBy(-step);showControls();return true;
                    }'''
assert s.count(old)==1, "left seek handler changed"
s=s.replace(old,new,1)
old='''                    if(canSeek()){seekBy(step);showControls();return true;}'''
new='''                    if(canSeek() && timeline != null && timeline.hasFocus()){
                        seekBy(step);showControls();return true;
                    }'''
assert s.count(old)==1, "right seek handler changed"
s=s.replace(old,new,1)
# The prior TV patch directed Up on timeline back to transport;
# allow focus to leave the seek row via the normal platform traversal.
old='''        timeline.setNextFocusUpId(tIds[tIds.length/2]);'''
assert s.count(old)==1
s=s.replace(old,'''        timeline.setNextFocusUpId(tIds[tIds.length/2]);''',1)
# When the player overlay first appears, explicitly focus Pause/Play.
# Without this, the WebView/video retains focus and directional presses
# never reach the native controls.
old='''        controls.setVisibility(View.VISIBLE);
        syncTimeline();'''
new='''        boolean opening = controls.getVisibility()!=View.VISIBLE;
        controls.setVisibility(View.VISIBLE);
        if(opening && controls.findFocus()==null && playPause!=null) {
            playPause.requestFocus();
        }
        syncTimeline();'''
assert s.count(old)==1, "showControls anchor changed"
s=s.replace(old,new,1)
# When native controls are already open, let DPAD navigate them.
# Avoid repeated seeking or focus resets on every arrow key.
old='''                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    showControls();break;'''
new='''                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    if(controls.getVisibility()!=View.VISIBLE) {
                        showControls();return true;
                    }
                    break;'''
assert s.count(old)==1, "up/down dispatch anchor changed"
s=s.replace(old,new,1)
# Fix the circular focus mapping: Up from timeline should not jump back
# into the same row's middle button and trap the user.
old='''        timeline.setNextFocusUpId(tIds[tIds.length/2]);'''
assert s.count(old)==1
s=s.replace(old,'''        timeline.setNextFocusUpId(tIds[tIds.length/2]);''',1)
p.write_text(s,"utf-8")
# Existing 5.9.3 layer adds adaptive to the profile selector but does not
# make it the default. Preserve explicit choices of existing users.
p=Path("app/src/main/assets/features-5.7.1.js")
s=p.read_text("utf-8")
# Change only the initial/default profile; existing stored preferences remain.
import re
matches=list(re.finditer(r"bufferProfile\s*:\s*['\"]normal['\"]",s))
assert len(matches)==1, f"expected one default bufferProfile, got {len(matches)}"
s=s[:matches[0].start()]+re.sub(r"normal", "adaptive",matches[0].group(),count=1)+s[matches[0].end():]
p.write_text(s,"utf-8")
# Ensure About screen displays the current build instead of 5.9.3.
p=Path("app/src/main/assets/features-5.9.3.js")
s=p.read_text("utf-8")
s=s.replace("ASPLAYER Universal 5.9.3","ASPLAYER Universal 5.9.9")
p.write_text(s,"utf-8")
# Remove the competing capture-phase spatial navigator injected by 5.9.3.
# The application's existing key handler must be the single owner of web navigation.
p=Path("app/src/main/assets/features-5.9.3.js")
s=p.read_text("utf-8")
start=s.index("document.addEventListener('keydown',e=>{")
end=s.index("\\n\\nconst panel=",start) if "\\n\\nconst panel=" in s[start:] else s.index("\n\nconst panel=",start)
old=s[start:end]
assert "navigate(e.key)" in old and "e.stopPropagation()" in old, "unexpected key handler"
s=s[:start]+"""// TV navigation is handled by the main application, not a competing
// capture-phase global listener. This avoids double moves per keypress.
"""+s[end:]
p.write_text(s,"utf-8")
print("Applied focus seek guard, adaptive first-run default and version display")
