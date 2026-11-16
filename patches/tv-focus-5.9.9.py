#!/usr/bin/env python3
"""TV D-pad focus fix. Run after patches/seek-controls-5.9.py; fail if anchors differ."""
from pathlib import Path
p = Path("app/src/main/java/com/alftech/asplayer/universal/MainActivity.java")
s = p.read_text(encoding="utf-8")
anchor = "        controls.addView(extras);\n"
assert s.count(anchor) == 1, "Player controls anchor missing or ambiguous"
addition = """        controls.addView(extras);
        // Explicit TV remote focus navigation; left/right on timeline still seek.
        timeline.setId(View.generateViewId());
        final int[] tIds = new int[transport.getChildCount()];
        final int[] eIds = new int[extras.getChildCount()];
        for (int i=0; i<tIds.length; i++) {
            View v=transport.getChildAt(i);
            v.setId(View.generateViewId()); v.setFocusable(true); tIds[i]=v.getId();
        }
        for (int i=0; i<eIds.length; i++) {
            View v=extras.getChildAt(i);
            v.setId(View.generateViewId()); v.setFocusable(true); eIds[i]=v.getId();
        }
        for (int i=0; i<tIds.length; i++) {
            View v=transport.getChildAt(i);
            v.setNextFocusLeftId(tIds[Math.max(0,i-1)]);
            v.setNextFocusRightId(tIds[Math.min(tIds.length-1,i+1)]);
            v.setNextFocusUpId(timeline.getId());
            v.setNextFocusDownId(eIds[Math.min(eIds.length-1,
                (int)Math.round((double)i*(eIds.length-1)/Math.max(1,tIds.length-1)))]);
        }
        for (int i=0; i<eIds.length; i++) {
            View v=extras.getChildAt(i);
            v.setNextFocusLeftId(eIds[Math.max(0,i-1)]);
            v.setNextFocusRightId(eIds[Math.min(eIds.length-1,i+1)]);
            v.setNextFocusUpId(tIds[Math.min(tIds.length-1,
                (int)Math.round((double)i*(tIds.length-1)/Math.max(1,eIds.length-1)))]);
        }
        timeline.setNextFocusDownId(tIds[tIds.length/2]);
        timeline.setNextFocusUpId(tIds[tIds.length/2]);
"""
s = s.replace(anchor, addition, 1)
old = "if(controls != null && playerVisible && !timelineDragging) controls.setVisibility(View.GONE);"
new = "if(controls != null && playerVisible && !timelineDragging && controls.findFocus()==null) controls.setVisibility(View.GONE);"
assert s.count(old) == 1, "Autohide anchor missing"
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")
print("ASPLAYER 5.9.9 TV focus patch applied")
