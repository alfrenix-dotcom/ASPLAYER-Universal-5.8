#!/usr/bin/env python3
"""ASPLAYER LibVLC native timeline and Android TV remote seeking patch."""
from pathlib import Path
p = Path("app/src/main/java/com/alftech/asplayer/universal/MainActivity.java")
s = p.read_text(encoding="utf-8")

def one(old,new,label):
    global s
    if s.count(old)!=1:
        raise RuntimeError(f"Cannot apply {label}: found {s.count(old)} anchors")
    s=s.replace(old,new,1)

one("import android.view.Gravity;", "import android.view.Gravity;\nimport android.view.KeyEvent;\nimport android.widget.SeekBar;\nimport android.widget.TextView;", "imports")
one("    private Button playPause;", """    private Button playPause;
    private LinearLayout seekRow;
    private SeekBar timeline;
    private TextView elapsedText, durationText;
    private boolean timelineDragging;
    private final Runnable timelineTicker = new Runnable() {
        @Override public void run() {
            if(playerVisible && player != null) {
                syncTimeline();
                handler.postDelayed(this,350);
            }
        }
    };""", "fields")
one("    private final Runnable hideControls = () -> { if(controls != null && playerVisible) controls.setVisibility(View.GONE); };",
"""    private final Runnable hideControls = () -> {
        if(controls != null && playerVisible && !timelineDragging) controls.setVisibility(View.GONE);
    };""","autohide")
a=s.index("    private void createControls() {")
b=s.index("    private boolean allowedProviderUrl(",a)
s=s[:a]+"""    private TextView timeText(String value) {
        TextView t=new TextView(this);
        t.setText(value);
        t.setTextSize(12);
        t.setTextColor(Color.WHITE);
        t.setGravity(Gravity.CENTER);
        t.setMinWidth(dp(48));
        return t;
    }
    private LinearLayout row() {
        LinearLayout r=new LinearLayout(this);
        r.setGravity(Gravity.CENTER_VERTICAL);
        r.setOrientation(LinearLayout.HORIZONTAL);
        return r;
    }
    private static String clock(long ms) {
        if(ms<0)return "--:--";
        long sec=ms/1000;
        return sec>=3600?String.format(Locale.US,"%d:%02d:%02d",sec/3600,(sec/60)%60,sec%60):
            String.format(Locale.US,"%02d:%02d",sec/60,sec%60);
    }
    private boolean canSeek() { return player != null && !isLive && player.getLength()>0; }
    private void syncTimeline() {
        if(timeline==null || elapsedText==null || durationText==null || player==null || !playerVisible)return;
        boolean available=canSeek();
        if(seekRow!=null)seekRow.setVisibility(available?View.VISIBLE:View.GONE);
        if(!available)return;
        long length=player.getLength(),at=Math.max(0,player.getTime());
        if(!timelineDragging) {
            timeline.setProgress((int)Math.min(10000L,(at*10000L)/Math.max(1L,length)));
            elapsedText.setText(clock(at));
        }
        durationText.setText(clock(length));
    }
    private void createControls() {
        controls=new LinearLayout(this);
        controls.setOrientation(LinearLayout.VERTICAL);
        controls.setPadding(dp(6),dp(8),dp(6),dp(8));
        controls.setBackgroundColor(0xBB050B1C);
        seekRow=row();
        elapsedText=timeText("00:00");
        durationText=timeText("--:--");
        timeline=new SeekBar(this);
        timeline.setMax(10000);
        timeline.setProgress(0);
        timeline.setContentDescription("Posición de reproducción / Seek playback position");
        timeline.setFocusable(true);
        timeline.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onStartTrackingTouch(SeekBar bar) {
                timelineDragging=true;
                handler.removeCallbacks(hideControls);
            }
            @Override public void onProgressChanged(SeekBar bar,int progress,boolean fromUser) {
                if(fromUser && canSeek()) {
                    elapsedText.setText(clock((player.getLength()*progress)/10000L));
                    showControls();
                }
            }
            @Override public void onStopTrackingTouch(SeekBar bar) {
                if(canSeek())seekTo((player.getLength()*bar.getProgress())/10000L);
                timelineDragging=false;
                showControls();
            }
        });
        seekRow.addView(elapsedText,new LinearLayout.LayoutParams(dp(52),dp(46)));
        seekRow.addView(timeline,new LinearLayout.LayoutParams(0,dp(46),1));
        seekRow.addView(durationText,new LinearLayout.LayoutParams(dp(58),dp(46)));
        controls.addView(seekRow);

        LinearLayout transport=row();
        transport.addView(button("−30s",()->seekBy(-30000)),new LinearLayout.LayoutParams(0,dp(47),1));
        transport.addView(button("−10s",()->seekBy(-10000)),new LinearLayout.LayoutParams(0,dp(47),1));
        playPause=button("Pause",this::togglePause);
        transport.addView(playPause,new LinearLayout.LayoutParams(0,dp(47),1.25f));
        transport.addView(button("+10s",()->seekBy(10000)),new LinearLayout.LayoutParams(0,dp(47),1));
        transport.addView(button("+30s",()->seekBy(30000)),new LinearLayout.LayoutParams(0,dp(47),1));
        controls.addView(transport);

        LinearLayout extras=row();
        extras.addView(button("−5m",()->seekBy(-300000)),new LinearLayout.LayoutParams(0,dp(43),1));
        extras.addView(button("+5m",()->seekBy(300000)),new LinearLayout.LayoutParams(0,dp(43),1));
        extras.addView(button("Audio",()->chooseTrack(false)),new LinearLayout.LayoutParams(0,dp(43),1));
        extras.addView(button("Subs",()->chooseTrack(true)),new LinearLayout.LayoutParams(0,dp(43),1));
        extras.addView(button("Fit/Fill",this::toggleAspect),new LinearLayout.LayoutParams(0,dp(43),1.2f));
        extras.addView(button("✕",()->closePlayer(true)),new LinearLayout.LayoutParams(0,dp(43),.55f));
        controls.addView(extras);

        root.addView(controls,new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM));
        controls.setVisibility(View.GONE);
    }
    private void togglePause() {
        if(player==null)return;
        if(player.isPlaying())player.pause();else player.play();
        if(playPause!=null)playPause.setText(player.isPlaying()?"Pause":"Play");
    }
    private void showControls() {
        if(!playerVisible)return;
        controls.setVisibility(View.VISIBLE);
        syncTimeline();
        handler.removeCallbacks(hideControls);
        if(!timelineDragging)handler.postDelayed(hideControls,3000);
    }
    private void seekTo(long at) {
        if(!canSeek())return;
        long target=Math.max(0,Math.min(player.getLength()-1,at));
        try {player.setTime(target);sendPosition(false);syncTimeline();}
        catch(Exception ignored){}
    }
    private void seekBy(long delta) {
        if(!canSeek())return;
        seekTo(Math.max(0,player.getTime())+delta);
    }
    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if(playerVisible && event.getAction()==KeyEvent.ACTION_DOWN) {
            switch(event.getKeyCode()) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_MEDIA_REWIND: {
                    long step=event.getRepeatCount()>5?60000:event.getRepeatCount()>1?30000:10000;
                    if(canSeek()){seekBy(-step);showControls();return true;}
                    break;
                }
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD: {
                    long step=event.getRepeatCount()>5?60000:event.getRepeatCount()>1?30000:10000;
                    if(canSeek()){seekBy(step);showControls();return true;}
                    break;
                }
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                case KeyEvent.KEYCODE_MEDIA_PLAY:
                case KeyEvent.KEYCODE_MEDIA_PAUSE:
                    togglePause();showControls();return true;
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                    if(controls.getVisibility()!=View.VISIBLE){showControls();return true;}
                    break;
                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    showControls();break;
                default:break;
            }
        }
        return super.dispatchKeyEvent(event);
    }
""" + s[b:]
one("        video.setOnClickListener(v -> showControls());",
    "        video.setOnClickListener(v -> showControls());\n        video.setFocusableInTouchMode(true);","focus")
one('                case MediaPlayer.Event.Playing:\n                    sendEvent("ready");',
    '                case MediaPlayer.Event.Playing:\n                    syncTimeline();\n                    if(playPause!=null)playPause.setText("Pause");\n                    sendEvent("ready");',"play event")
one('            video.setVisibility(View.VISIBLE);\n            getWindow().addFlags',
    '            video.setVisibility(View.VISIBLE);\n            video.requestFocus();\n            getWindow().addFlags',"focus on play")
one('            handler.removeCallbacks(progressTicker);\n            handler.postDelayed(progressTicker,5000);',
    '            handler.removeCallbacks(progressTicker);\n            handler.removeCallbacks(timelineTicker);\n            timelineDragging=false;\n            if(seekRow!=null)seekRow.setVisibility(View.GONE);\n            if(timeline!=null)timeline.setProgress(0);\n            handler.postDelayed(progressTicker,5000);\n            handler.postDelayed(timelineTicker,350);',"start timeline")
one('        handler.removeCallbacks(progressTicker);\n        if(player!=null)player.stop();',
    '        handler.removeCallbacks(progressTicker);\n        handler.removeCallbacks(timelineTicker);\n        timelineDragging=false;\n        if(player!=null)player.stop();',"close timeline")
p.write_text(s,encoding="utf-8")
gradle=Path("app/build.gradle")
g=gradle.read_text()
import re
assert "applicationId" in g and "versionCode" in g and "versionName" in g
g=re.sub(r"applicationId\\s+'[^']+'", "applicationId 'com.alftech.asplayer.universal.vlc.final'",g,count=1)
g=re.sub(r"versionCode\\s+\\d+", "versionCode 5900",g,count=1)
g=re.sub(r"versionName\\s+'[^']+'", "versionName '5.9.0-LibVLC'",g,count=1)
gradle.write_text(g)
assert "dispatchKeyEvent" in s and "setOnSeekBarChangeListener" in s
print("ASPLAYER 5.9 timeline patch applied",len(s))
