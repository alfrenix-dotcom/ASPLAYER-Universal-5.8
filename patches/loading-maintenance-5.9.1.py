#!/usr/bin/env python3
"""Add localized loading, rebuffer and maintenance overlays to ASPLAYER 5.9 LibVLC.
Run after the 5.9 seek-controls patch (on source with native SeekBar).
"""
from pathlib import Path
import re
p=Path('app/src/main/java/com/alftech/asplayer/universal/MainActivity.java')
s=p.read_text(encoding='utf-8')
def one(old,new,name):
 global s
 count=s.count(old)
 if count!=1: raise RuntimeError(f'{name}: expected 1 source anchor, found {count}')
 s=s.replace(old,new,1)

one('import android.graphics.Color;', 'import android.graphics.Color;\nimport android.content.res.ColorStateList;\nimport android.graphics.drawable.GradientDrawable;', 'overlay imports')
one('import android.widget.LinearLayout;', 'import android.widget.LinearLayout;\nimport android.widget.ProgressBar;', 'progress bar import')
one('    private Button playPause;','''    private Button playPause;
    private LinearLayout playbackFeedback;
    private ProgressBar loadingWheel;
    private TextView feedbackTitle, feedbackDetail;
    private Button feedbackRetry, feedbackClose;
    private String uiLanguage = "en";
    private boolean playbackStarted, playbackFailed, rebufferWaiting;
    private long playbackAttempt, retryPosition;
    private Runnable playbackDeadline;''','overlay fields')
one('    private boolean playerVisible;', '''    private boolean playerVisible;
    private final Runnable showRebuffer = () -> {
        if(playerVisible && playbackStarted && rebufferWaiting && !playbackFailed) showLoadingFeedback();
    };''','rebuffer callback after player-visible fields')
one('        createControls();\n        setContentView(root);','        createControls();\n        createPlaybackFeedback();\n        setContentView(root);','create overlay')
old='''                case MediaPlayer.Event.Playing:
                    syncTimeline();
                    if(playPause!=null)playPause.setText("Pause");
                    sendEvent("ready");
                    handler.postDelayed(this::refreshTrackMetadata,1000);
                    break;
                case MediaPlayer.Event.Buffering: sendEvent("buffering"); break;
                case MediaPlayer.Event.EndReached: sendPosition(true); sendEvent("ended"); break;
                case MediaPlayer.Event.EncounteredError:
                    if(!triedLiveFallback && isLive && playingUrl.toLowerCase(Locale.ROOT).endsWith(".m3u8")) {
                        triedLiveFallback = true;
                        startMediaInternal(playingUrl.substring(0,playingUrl.length()-5)+".ts",0);
                    } else sendEvent("error");
                    break;'''
new='''                case MediaPlayer.Event.Playing:
                    if(playbackFailed)break;
                    playbackStarted=true;
                    rebufferWaiting=false;
                    cancelPlaybackDeadline();
                    handler.removeCallbacks(showRebuffer);
                    hidePlaybackFeedback();
                    syncTimeline();
                    if(playPause!=null)playPause.setText("Pause");
                    sendEvent("ready");
                    handler.postDelayed(this::refreshTrackMetadata,1000);
                    break;
                case MediaPlayer.Event.Buffering:
                    if(playbackFailed)break;
                    if(e.getBuffering() >= 99.5f) {
                        rebufferWaiting=false;
                        handler.removeCallbacks(showRebuffer);
                        if(playbackStarted){cancelPlaybackDeadline();hidePlaybackFeedback();}
                    } else if(playbackStarted && !rebufferWaiting) {
                        rebufferWaiting=true;
                        handler.removeCallbacks(showRebuffer);
                        handler.postDelayed(showRebuffer,650);
                        schedulePlaybackDeadline(25000);
                    }
                    sendEvent("buffering");
                    break;
                case MediaPlayer.Event.Paused:
                    if(playbackStarted){rebufferWaiting=false;cancelPlaybackDeadline();handler.removeCallbacks(showRebuffer);hidePlaybackFeedback();}
                    break;
                case MediaPlayer.Event.EndReached:
                    cancelPlaybackDeadline();hidePlaybackFeedback();
                    sendPosition(true);sendEvent("ended");break;
                case MediaPlayer.Event.EncounteredError:
                    handlePlaybackFailure();break;'''
one(old,new,'libvlc events')
ui='''    private String localized(String spanish,String english) {
        return "es".equals(uiLanguage) ? spanish : english;
    }
    private void createPlaybackFeedback() {
        playbackFeedback=new LinearLayout(this);
        playbackFeedback.setOrientation(LinearLayout.VERTICAL);
        playbackFeedback.setGravity(Gravity.CENTER);
        playbackFeedback.setPadding(dp(20),dp(23),dp(20),dp(22));
        GradientDrawable background=new GradientDrawable();
        background.setColor(0xF0081128);
        background.setCornerRadius(dp(20));
        background.setStroke(dp(1),0xFF328CA7);
        playbackFeedback.setBackground(background);
        loadingWheel=new ProgressBar(this,null,android.R.attr.progressBarStyleLarge);
        loadingWheel.setIndeterminate(true);
        loadingWheel.setIndeterminateTintList(ColorStateList.valueOf(0xFF66E8F6));
        LinearLayout.LayoutParams spinnerParams=new LinearLayout.LayoutParams(dp(48),dp(48));
        spinnerParams.bottomMargin=dp(15);
        playbackFeedback.addView(loadingWheel,spinnerParams);
        feedbackTitle=new TextView(this);
        feedbackTitle.setTextColor(Color.WHITE);
        feedbackTitle.setTextSize(16);
        feedbackTitle.setGravity(Gravity.CENTER);
        feedbackTitle.setTypeface(null,1);
        feedbackTitle.setMaxLines(4);
        playbackFeedback.addView(feedbackTitle,new LinearLayout.LayoutParams(-1,-2));
        feedbackDetail=new TextView(this);
        feedbackDetail.setTextColor(0xFFBED3E9);
        feedbackDetail.setTextSize(12);
        feedbackDetail.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams detailParams=new LinearLayout.LayoutParams(-1,-2);
        detailParams.topMargin=dp(10);
        playbackFeedback.addView(feedbackDetail,detailParams);
        LinearLayout actions=new LinearLayout(this);
        actions.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams actionParams=new LinearLayout.LayoutParams(-1,dp(46));
        actionParams.topMargin=dp(16);
        feedbackRetry=button("Retry",()->{});
        feedbackRetry.setOnClickListener(v->retryPlayback());
        feedbackRetry.setVisibility(View.GONE);
        actions.addView(feedbackRetry,new LinearLayout.LayoutParams(0,-1,1));
        feedbackClose=button("Close",()->{});
        feedbackClose.setOnClickListener(v->closePlayer(true));
        actions.addView(feedbackClose,new LinearLayout.LayoutParams(0,-1,1));
        playbackFeedback.addView(actions,actionParams);
        FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(dp(310),-2,Gravity.CENTER);
        root.addView(playbackFeedback,lp);
        playbackFeedback.setVisibility(View.GONE);
    }
    private void updateFeedbackText() {
        if(feedbackTitle==null)return;
        if(playbackFailed) {
            feedbackTitle.setText(localized(
                "CONTENIDO EN MANTENIMIENTO, ESPERE A FUTURAS ACTUALIZACIONES",
                "CONTENT UNDER MAINTENANCE. PLEASE WAIT FOR FUTURE UPDATES."));
            feedbackDetail.setText(localized(
                "No se pudo reproducir este contenido en este momento.",
                "This content could not be played at this time."));
        } else {
            String title=isLive ? localized("CARGANDO CANAL…","LOADING CHANNEL…")
                : playingUrl.contains("/series/") ? localized("CARGANDO EPISODIO…","LOADING EPISODE…")
                : localized("CARGANDO PELÍCULA…","LOADING MOVIE…");
            feedbackTitle.setText(title);
            feedbackDetail.setText(localized(
                "Espere mientras se prepara la reproducción.",
                "Please wait while playback is being prepared."));
        }
        loadingWheel.setVisibility(playbackFailed?View.GONE:View.VISIBLE);
        feedbackRetry.setVisibility(playbackFailed?View.VISIBLE:View.GONE);
        feedbackRetry.setText(localized("Reintentar","Retry"));
        feedbackClose.setText(localized("Cerrar","Close"));
        playbackFeedback.setContentDescription(feedbackTitle.getText()+". "+feedbackDetail.getText());
    }
    private void showLoadingFeedback() {
        if(!playerVisible || playbackFailed || playbackFeedback==null)return;
        updateFeedbackText();
        playbackFeedback.setVisibility(View.VISIBLE);
    }
    private void hidePlaybackFeedback() {
        if(playbackFeedback!=null)playbackFeedback.setVisibility(View.GONE);
    }
    private void cancelPlaybackDeadline() {
        if(playbackDeadline!=null)handler.removeCallbacks(playbackDeadline);
        playbackDeadline=null;
    }
    private void schedulePlaybackDeadline(long milliseconds) {
        cancelPlaybackDeadline();
        final long attempt=playbackAttempt;
        playbackDeadline=()->{
            if(playerVisible && !playbackFailed && playbackAttempt==attempt)
                handlePlaybackFailure();
        };
        handler.postDelayed(playbackDeadline,milliseconds);
    }
    private void handlePlaybackFailure() {
        if(!playerVisible || playbackFailed)return;
        if(!triedLiveFallback && isLive && playingUrl.toLowerCase(Locale.ROOT).endsWith(".m3u8")) {
            triedLiveFallback=true;
            startMediaInternal(playingUrl.substring(0,playingUrl.length()-5)+".ts",0);
            return;
        }
        retryPosition=player!=null && !isLive?Math.max(0,player.getTime()):0;
        playbackFailed=true;
        rebufferWaiting=false;
        cancelPlaybackDeadline();
        handler.removeCallbacks(showRebuffer);
        if(player!=null)player.stop();
        updateFeedbackText();
        if(playbackFeedback!=null){playbackFeedback.setVisibility(View.VISIBLE);playbackFeedback.requestFocus();}
        sendEvent("error");
    }
    private void retryPlayback() {
        if(playingUrl.isEmpty())return;
        triedLiveFallback=false;
        startMediaInternal(playingUrl,retryPosition);
    }
'''
one('    private void createControls() {',ui+'    private void createControls() {','feedback methods')
one('''            playerVisible=true;
            video.setVisibility(View.VISIBLE);''','''            playerVisible=true;
            playbackAttempt++;
            playbackStarted=false;
            playbackFailed=false;
            rebufferWaiting=false;
            cancelPlaybackDeadline();
            handler.removeCallbacks(showRebuffer);
            video.setVisibility(View.VISIBLE);
            showLoadingFeedback();
            schedulePlaybackDeadline(30000);''','start loading')
one('''        } catch(Exception error) { sendEvent("error"); }
    }
    private void sendEvent(String name)''','''        } catch(Exception error) {
            playerVisible=true;
            video.setVisibility(View.VISIBLE);
            handlePlaybackFailure();
        }
    }
    private void sendEvent(String name)''','catch display maintenance')
one('''        playerVisible=false;
        handler.removeCallbacks(hideControls);''','''        playerVisible=false;
        playbackAttempt++;
        playbackFailed=false;
        playbackStarted=false;
        rebufferWaiting=false;
        cancelPlaybackDeadline();
        handler.removeCallbacks(showRebuffer);
        hidePlaybackFeedback();
        handler.removeCallbacks(hideControls);''','close cleanup')
one('''        @JavascriptInterface public void play(String url) {''','''        @JavascriptInterface public void setUiLanguage(String code) {
            runOnUiThread(()->{
                uiLanguage="es".equals(code)?"es":"en";
                if(playbackFeedback!=null && playbackFeedback.getVisibility()==View.VISIBLE)updateFeedbackText();
            });
        }
        @JavascriptInterface public void play(String url) {''','bridge set language')
one('''        if(playerVisible&&player!=null){sendPosition(false);player.pause();}
        super.onStop();''','''        if(playerVisible&&player!=null){sendPosition(false);player.pause();}
        cancelPlaybackDeadline();
        handler.removeCallbacks(showRebuffer);
        super.onStop();''','onStop cleanup')
p.write_text(s,encoding='utf-8')
asset=Path('app/src/main/assets/features-5.8.js')
a=asset.read_text(encoding='utf-8')
def jsone(old,new,label):
 global a
 if a.count(old)!=1:raise RuntimeError(f'{label}: expected 1 anchor, found {a.count(old)}')
 a=a.replace(old,new,1)
jsone('const get=id=>document.getElementById(id);','''const get=id=>document.getElementById(id);
function syncNativeLanguage(){try{bridge.setUiLanguage(lang)}catch(_){}}
syncNativeLanguage();''','initial language')
jsone('''  try{bridge.setPlaybackOptions(settings.bufferProfile||'normal',playAspect,audioPref,subsPref)}catch(_){ }''','''  syncNativeLanguage();
  try{bridge.setPlaybackOptions(settings.bufferProfile||'normal',playAspect,audioPref,subsPref)}catch(_){ }''','language before playback')
jsone('''  }else if(event.type==='error'){
    toast(tr('playerFailure'));
  }''','''  }else if(event.type==='error'){
    // Native LibVLC displays a bilingual maintenance panel with Retry / Close.
    // Avoid replacing it with the old generic failure toast.
  }''','native error UI')
jsone('''languageUI=function(){
  refreshLanguage();''','''languageUI=function(){
  refreshLanguage();
  syncNativeLanguage();''','language changed')
a=a.replace('ASPLAYER Universal 5.8.1 · LibVLC/VLC · Alftech Solutions','ASPLAYER Universal 5.9.1 · LibVLC/VLC · Alftech Solutions')
a=a.replace('ASPLAYER 5.8 usa LibVLC/VLC','ASPLAYER 5.9.1 usa LibVLC/VLC')
a=a.replace('ASPLAYER 5.8 uses LibVLC/VLC','ASPLAYER 5.9.1 uses LibVLC/VLC')
asset.write_text(a,encoding='utf-8')
gradle=Path('app/build.gradle')
g=gradle.read_text(encoding='utf-8')
assert g.count('versionCode 5900')==1 and g.count("versionName '5.9.0-LibVLC'")==1
assert g.count("applicationId 'com.alftech.asplayer.universal.vlc.final'")==1
g=g.replace("applicationId 'com.alftech.asplayer.universal.vlc.final'","applicationId 'com.alftech.asplayer.universal.vlc.final.v591'")
g=g.replace('versionCode 5900','versionCode 5901').replace("versionName '5.9.0-LibVLC'","versionName '5.9.1-LibVLC'")
gradle.write_text(g,encoding='utf-8')
html=Path('app/src/main/assets/index.html')
h=html.read_text(encoding='utf-8')
assert h.count('ASPLAYER Universal 5.7.1')>=1
h=h.replace('ASPLAYER Universal 5.7.1','ASPLAYER Universal 5.9.1')
html.write_text(h,encoding='utf-8')
print('ASPLAYER 5.9.1 bilingual loading + maintenance overlay applied. Java bytes:',len(s))