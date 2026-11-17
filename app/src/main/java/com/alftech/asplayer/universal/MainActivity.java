package com.alftech.asplayer.universal;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.content.res.ColorStateList;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.widget.SeekBar;
import android.widget.TextView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import org.json.JSONObject;
import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.GZIPInputStream;

/**
 * LibVLC-based experimental ASPLAYER 5.8 variant.
 * No IPTV Smarters Pro proprietary code or assets are used.
 * The APK must be compiled and field-tested before distribution.
 */
public final class MainActivity extends Activity {
    private static final int IMMERSIVE = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
    private FrameLayout root;
    private WebView web;
    private VLCVideoLayout video;
    private LinearLayout controls;
    private Button playPause, repairVideoButton, audioButton, subtitlesButton, aspectButton;
    private final ArrayList<List<View>> navigationRows=new ArrayList<>();
    private final ArrayList<Button> seekButtons=new ArrayList<>();
    private boolean remotePlayerMode, trackDialogOpen;
    private AlertDialog trackDialog;
    private long lastSeekAt, stableSince, pendingResumeMs;
    private boolean isTvDevice() {
        return (getResources().getConfiguration().uiMode
              & Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION
            || getPackageManager().hasSystemFeature("android.software.leanback");
    }
    private boolean remotePlayer(){return remotePlayerMode||isTvDevice();}
    private void focusRemote(View v){
        if(v!=null&&!v.requestFocus()&&remotePlayer())v.requestFocusFromTouch();
    }
    private LinearLayout playbackFeedback;
    private ProgressBar loadingWheel;
    private TextView feedbackTitle, feedbackDetail;
    private Button feedbackRetry, feedbackClose;
    private String uiLanguage = "en";
    private boolean playbackStarted, playbackFailed, rebufferWaiting;
    private String decoderMode="auto", activeMediaUrl="";
    private boolean usingSoftwareFallback, videoOutputSeen;
    // Video filters can be costly on inexpensive TV boxes. Disabled by default.
    private String enhancement="off";
    private int rebufferCount=0, liveRebufferCount=0;
    private Runnable videoWatchdog;

    private volatile long playbackAttempt;
    private long retryPosition;
    private Runnable playbackDeadline;
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
    };
    private LibVLC vlc;
    private MediaPlayer player;
    private boolean attached;
    private boolean playerVisible;
    private boolean isLive;
    private final Runnable showRebuffer = () -> {
        if(playerVisible && playbackStarted && rebufferWaiting && !playbackFailed) {
            if(android.os.SystemClock.elapsedRealtime()-lastSeekAt>3500){
                if(isLive)liveRebufferCount=Math.min(5,liveRebufferCount+1);
                else rebufferCount=Math.min(5,rebufferCount+1);
                stableSince=0;
            }
            showLoadingFeedback();
        }
    };
    private boolean triedLiveFallback;
    private String playingUrl="";
    private String profile="adaptive", pictureMode="cover", audioLanguage="auto", subtitleLanguage="off";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService requests = Executors.newFixedThreadPool(3);
    private final Runnable hideControls = () -> {
        if(controls != null && playerVisible && !timelineDragging && !trackDialogOpen) {
            controls.setVisibility(View.GONE);
            if(remotePlayer()&&!feedbackBlocking())video.requestFocus();
        }
    };
    private final Runnable progressTicker = new Runnable() {
        @Override public void run() {
            if(playerVisible && player != null) { sendPosition(false); handler.postDelayed(this,5000); }
        }
    };

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        enhancement=getSharedPreferences("asplayer_picture",MODE_PRIVATE).getString("enhancement","off");
        decoderMode=getSharedPreferences("asplayer_decoder",MODE_PRIVATE).getString("mode","auto");
        if(!"auto".equals(decoderMode) && !"hardware".equals(decoderMode)
             && !"software".equals(decoderMode)) decoderMode="auto";
        root = new FrameLayout(this);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(8,15,34));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !"file".equalsIgnoreCase(r.getUrl().getScheme());
            }
        });
        web.addJavascriptInterface(new Bridge(), "ASPLAYER");
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        video = new VLCVideoLayout(this);
        video.setVisibility(View.GONE);
        root.addView(video,new FrameLayout.LayoutParams(-1,-1));
        video.setOnClickListener(v -> showControls());
        video.setFocusableInTouchMode(true);
        createControls();
        createPlaybackFeedback();
        // Android 15/16 enforce edge-to-edge. Keep menus, video controls and
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
        }
        web.loadUrl("file:///android_asset/index.html");
        // Use a maintained stable LibVLC dependency, without shipping codecs separately.
        ArrayList<String> vlcOptions=new ArrayList<>();
        // Prefer smooth A/V synchronization to showing late pictures.
        vlcOptions.add("--drop-late-frames");
        vlcOptions.add("--skip-frames");
        vlc = new LibVLC(this,vlcOptions);
        player = new MediaPlayer(vlc);
        player.setEventListener(e -> {
            final long eventAttempt=playbackAttempt;
            handler.post(() -> {
            if(!playerVisible || eventAttempt!=playbackAttempt) return;
            switch(e.type) {
                case MediaPlayer.Event.Vout:
                    if(playbackFailed)break;
                    if(e.getVoutCount()>0) {
                        videoOutputSeen=true;
                        cancelVideoWatchdog();
                        if(playbackStarted && !rebufferWaiting){
                            boolean opening=controls.getVisibility()!=View.VISIBLE&&playbackFeedback.getVisibility()==View.VISIBLE;
                            hidePlaybackFeedback();
                            if(opening)showControls();
                        }
                    } else if(videoOutputSeen && playbackStarted && !rebufferWaiting) {
                        videoOutputSeen=false;
                        scheduleVideoWatchdog(8500);
                    }
                    break;
                case MediaPlayer.Event.Playing:
                    if(playbackFailed)break;
                    boolean firstStart=!playbackStarted;
                    playbackStarted=true;
                    stableSince=android.os.SystemClock.elapsedRealtime();
                    rebufferWaiting=false;
                    cancelPlaybackDeadline();
                    handler.removeCallbacks(showRebuffer);
                    if(videoOutputSeen) {
                        cancelVideoWatchdog();
                        hidePlaybackFeedback();
                    } else {
                        showLoadingFeedback();
                        scheduleVideoWatchdog(12000);
                    }
                    syncTimeline();
                    updatePlayerLabels();
                    if(firstStart&&videoOutputSeen)showControls();
                    if(firstStart&&pendingResumeMs>0&&!isLive){
                        final long attempt=playbackAttempt,position=pendingResumeMs;pendingResumeMs=0;
                        handler.postDelayed(()->{if(playerVisible&&playbackAttempt==attempt)seekTo(position);},400);
                    }
                    sendEvent("ready");
                    // Live audio/subtitle tracks are enumerated on demand.
                    if(firstStart&&!isLive)handler.postDelayed(this::refreshTrackMetadata,1000);
                    break;
                case MediaPlayer.Event.Buffering:
                    if(playbackFailed)break;
                    if(e.getBuffering() >= 99.5f) {
                        rebufferWaiting=false;
                        handler.removeCallbacks(showRebuffer);
                        if(playbackStarted){
                            cancelPlaybackDeadline();
                            if(videoOutputSeen)hidePlaybackFeedback();
                            else scheduleVideoWatchdog(12000);
                        }
                    } else if(playbackStarted && !rebufferWaiting) {
                        rebufferWaiting=true;
                        handler.removeCallbacks(showRebuffer);
                        handler.postDelayed(showRebuffer,1400);
                        schedulePlaybackDeadline(25000);
                    }
                    if(!isLive)sendEvent("buffering");
                    break;
                case MediaPlayer.Event.Paused:
                    if(playbackStarted){rebufferWaiting=false;cancelPlaybackDeadline();handler.removeCallbacks(showRebuffer);hidePlaybackFeedback();}
                    updatePlayerLabels();
                    break;
                case MediaPlayer.Event.EndReached:
                    cancelVideoWatchdog();cancelPlaybackDeadline();hidePlaybackFeedback();
                    sendPosition(true);sendEvent("ended");break;
                case MediaPlayer.Event.EncounteredError:
                    handlePlaybackFailure();break;
                default: break;
            }
            });
        });
    }

    private int dp(float value) { return Math.round(value*getResources().getDisplayMetrics().density); }
    private Button button(String title, Runnable callback) {
        Button b=new Button(this);
        b.setText(title);
        b.setTextColor(Color.WHITE);
        b.setTextSize(isTvDevice()?16:13);
        b.setMinWidth(0); b.setMinimumWidth(0);
        b.setAllCaps(false);
        b.setBackground(controlBackground(false));
        b.setFocusable(true);
        b.setFocusableInTouchMode(isTvDevice());
        b.setOnFocusChangeListener((v,focused)->{
            v.setBackground(controlBackground(focused));
            v.setElevation(focused?dp(4):0);
            if(focused&&playerVisible&&remotePlayer()&&!trackDialogOpen)resetControlsTimer();
        });
        b.setOnClickListener(v -> { callback.run(); showControls(); });
        return b;
    }
    private GradientDrawable controlBackground(boolean focused) {
        GradientDrawable bg=new GradientDrawable();
        bg.setColor(focused?0xFF176B91:0xC223174A);
        bg.setCornerRadius(dp(8));
        bg.setStroke(dp(focused?3:1),focused?0xFFFFDF79:0xFF53638B);
        return bg;
    }
    private void addControl(LinearLayout row,Button b,float weight,boolean seek) {
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(isTvDevice()?54:44),weight);
        lp.setMargins(dp(3),dp(3),dp(3),dp(3));row.addView(b,lp);
        if(seek)seekButtons.add(b);
    }
    private void addNavigationRow(LinearLayout row) {
        ArrayList<View> views=new ArrayList<>();
        for(int i=0;i<row.getChildCount();i++){
            View v=row.getChildAt(i);if(v.isFocusable())views.add(v);
        }
        navigationRows.add(views);
    }
    private TextView timeText(String value) {
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
        for(Button b:seekButtons)b.setEnabled(available);
        if(!available)return;
        long length=player.getLength(),at=Math.max(0,player.getTime());
        if(!timelineDragging) {
            timeline.setProgress((int)Math.min(10000L,(at*10000L)/Math.max(1L,length)));
            elapsedText.setText(clock(at));
        }
        durationText.setText(clock(length));
    }
    private void cancelVideoWatchdog() {
        if(videoWatchdog!=null)handler.removeCallbacks(videoWatchdog);
        videoWatchdog=null;
    }
    private void scheduleVideoWatchdog(long milliseconds) {
        cancelVideoWatchdog();
        final long attempt=playbackAttempt;
        videoWatchdog=()->{
            if(playerVisible && !playbackFailed && playbackAttempt==attempt
                    && playbackStarted && !videoOutputSeen) {
                // Audio may already be playing: try software decode only once.
                if(!trySoftwareRecovery())handlePlaybackFailure();
            }
        };
        handler.postDelayed(videoWatchdog,milliseconds);
    }
    private boolean useSoftwareDecoder() {
        return "software".equals(decoderMode) || usingSoftwareFallback;
    }
    private boolean trySoftwareRecovery() {
        if(!playerVisible || playingUrl.isEmpty() || usingSoftwareFallback
                || !"auto".equals(decoderMode))return false;
        usingSoftwareFallback=true;
        long resume=(!isLive && player!=null)?Math.max(0,player.getTime()):0;
        startMediaInternal(activeMediaUrl.isEmpty()?playingUrl:activeMediaUrl,resume);
        return true;
    }
    private void manualRepairVideo() {
        if(!playerVisible || playingUrl.isEmpty())return;
        // Manual recovery also works when a decoder reports Vout but draws black frames.
        usingSoftwareFallback=true;
        long resume=(!isLive && player!=null)?Math.max(0,player.getTime()):0;
        startMediaInternal(activeMediaUrl.isEmpty()?playingUrl:activeMediaUrl,resume);
    }
    private String localized(String spanish,String english) {
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
        feedbackTitle.setTypeface(null,android.graphics.Typeface.BOLD);
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
        } else if(playbackStarted&&rebufferWaiting) {
            feedbackTitle.setText(localized("RECUPERANDO SEÑAL…","BUFFERING…"));
            feedbackDetail.setText(localized("La reproducción continuará al recuperar la señal.","Playback will continue when the signal recovers."));
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
        if(remotePlayer()&&!playbackStarted){
            controls.setVisibility(View.GONE);focusRemote(feedbackClose);
        }
    }
    private void hidePlaybackFeedback() {
        if(playbackFeedback!=null){
            boolean focusWasFeedback=getCurrentFocus()==feedbackClose||getCurrentFocus()==feedbackRetry;
            playbackFeedback.setVisibility(View.GONE);
            if(focusWasFeedback&&playerVisible&&playbackStarted&&remotePlayer())showControls();
        }
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
        cancelVideoWatchdog();
        // Try the provider's alternate live transport before software decoding.
        String alternate=isLive?LivePlaybackPolicy.alternate(activeMediaUrl):"";
        if(!triedLiveFallback && !alternate.isEmpty() && allowedProviderUrl(alternate,true)) {
            triedLiveFallback=true;
            startMediaInternal(alternate,0);
            return;
        }
        if((!playbackStarted||!videoOutputSeen)&&trySoftwareRecovery())return;
        retryPosition=player!=null && !isLive?Math.max(0,player.getTime()):0;
        playbackFailed=true;
        rebufferWaiting=false;
        cancelPlaybackDeadline();
        handler.removeCallbacks(showRebuffer);
        if(player!=null)player.stop();
        updateFeedbackText();
        if(playbackFeedback!=null){
            playbackFeedback.setVisibility(View.VISIBLE);
            if(remotePlayer()){controls.setVisibility(View.GONE);focusRemote(feedbackRetry);}
        }
        sendEvent("error");
    }
    private void retryPlayback() {
        if(playingUrl.isEmpty())return;
        triedLiveFallback=false;
        startMediaInternal(playingUrl,retryPosition);
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
        timeline.setFocusableInTouchMode(isTvDevice());
        timeline.setOnFocusChangeListener((v,f)->{
            v.setBackground(f?controlBackground(true):null);
            if(f&&playerVisible)resetControlsTimer();
        });
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

        addNavigationRow(seekRow);
        LinearLayout transport=row();
        addControl(transport,button("−30s",()->seekBy(-30000)),1,true);
        addControl(transport,button("−10s",()->seekBy(-10000)),1,true);
        playPause=button("Pause",this::togglePause);
        addControl(transport,playPause,1.5f,false);
        addControl(transport,button("+10s",()->seekBy(10000)),1,true);
        addControl(transport,button("+30s",()->seekBy(30000)),1,true);
        controls.addView(transport);addNavigationRow(transport);

        LinearLayout extras=row();
        addControl(extras,button("−5m",()->seekBy(-300000)),1,true);
        addControl(extras,button("+5m",()->seekBy(300000)),1,true);
        audioButton=button("Audio",()->chooseTrack(false));
        subtitlesButton=button("Subtitles",()->chooseTrack(true));
        aspectButton=button("Fit / Fill",this::toggleAspect);
        addControl(extras,audioButton,1.3f,false);
        addControl(extras,subtitlesButton,1.5f,false);
        addControl(extras,aspectButton,1.5f,false);
        addControl(extras,button("✕",()->closePlayer(true)),.7f,false);
        controls.addView(extras);addNavigationRow(extras);
        LinearLayout repair=row();
        repairVideoButton=button(localized("Recuperar imagen","Recover video"),this::manualRepairVideo);
        addControl(repair,repairVideoButton,1,false);
        controls.addView(repair);addNavigationRow(repair);

        root.addView(controls,new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM));
        controls.setVisibility(View.GONE);
    }
    private void togglePause() {
        if(player==null)return;
        if(player.isPlaying())player.pause();else player.play();
        updatePlayerLabels();
    }
    private boolean feedbackBlocking(){
        return playbackFeedback!=null&&playbackFeedback.getVisibility()==View.VISIBLE
            &&(!playbackStarted||playbackFailed);
    }
    private boolean isInControls(View view) {
        for(View v=view;v!=null;){
            if(v==controls)return true;
            if(!(v.getParent() instanceof View))break;v=(View)v.getParent();
        }
        return false;
    }
    private void resetControlsTimer() {
        handler.removeCallbacks(hideControls);
        if(!timelineDragging&&!trackDialogOpen&&!feedbackBlocking())
            handler.postDelayed(hideControls,remotePlayer()?6500:3000);
    }
    private void updatePlayerLabels(){
        if(playPause!=null)playPause.setText(player!=null&&player.isPlaying()?localized("Pausar","Pause"):localized("Reproducir","Play"));
        if(subtitlesButton!=null)subtitlesButton.setText(localized("Subtítulos","Subtitles"));
        if(aspectButton!=null)aspectButton.setText("contain".equals(pictureMode)?localized("Ampliar","Fill screen"):localized("Ajustar","Fit screen"));
        if(repairVideoButton!=null)repairVideoButton.setText(localized("Recuperar imagen","Recover video"));
    }
    private void showControls() {
        if(!playerVisible||feedbackBlocking())return;
        controls.setVisibility(View.VISIBLE);
        syncTimeline();updatePlayerLabels();
        if(remotePlayer()&&!trackDialogOpen&&!isInControls(getCurrentFocus())&&playPause!=null)
            focusRemote(playPause);
        resetControlsTimer();
    }
    private boolean selectable(View v){return v!=null&&v.isShown()&&v.isEnabled()&&v.isFocusable();}
    private float centerX(View v){int[] xy=new int[2];v.getLocationOnScreen(xy);return xy[0]+v.getWidth()/2f;}
    private void movePlayerFocus(int key){
        View current=getCurrentFocus();
        for(int r=0;r<navigationRows.size();r++){
            List<View> row=navigationRows.get(r);int index=row.indexOf(current);
            if(index<0)continue;
            if(key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT){
                int step=key==KeyEvent.KEYCODE_DPAD_LEFT?-1:1;
                for(int i=index+step;i>=0&&i<row.size();i+=step)
                    if(selectable(row.get(i))){focusRemote(row.get(i));return;}
            }else{
                int step=key==KeyEvent.KEYCODE_DPAD_UP?-1:1;
                float x=centerX(current);
                for(int i=r+step;i>=0&&i<navigationRows.size();i+=step){
                    View best=null;float distance=Float.MAX_VALUE;
                    for(View v:navigationRows.get(i))if(selectable(v)){
                        float d=Math.abs(centerX(v)-x);
                        if(d<distance){best=v;distance=d;}
                    }
                    if(best!=null){focusRemote(best);return;}
                }
            }
            return;
        }
        if(playPause!=null)focusRemote(playPause);
    }
    private void seekTo(long at) {
        if(!canSeek())return;
        long target=Math.max(0,Math.min(player.getLength()-1,at));
        lastSeekAt=android.os.SystemClock.elapsedRealtime();
        try {player.setTime(target);sendPosition(false);syncTimeline();}
        catch(Exception ignored){}
    }
    private void seekBy(long delta) {
        if(!canSeek())return;
        seekTo(Math.max(0,player.getTime())+delta);
    }
    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if(!playerVisible||trackDialogOpen)return super.dispatchKeyEvent(event);
        int key=event.getKeyCode();
        boolean arrow=key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT
            ||key==KeyEvent.KEYCODE_DPAD_UP||key==KeyEvent.KEYCODE_DPAD_DOWN;
        boolean ok=key==KeyEvent.KEYCODE_DPAD_CENTER||key==KeyEvent.KEYCODE_ENTER
            ||key==KeyEvent.KEYCODE_NUMPAD_ENTER;
        boolean transport=key==KeyEvent.KEYCODE_MEDIA_REWIND||key==KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
            ||key==KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE||key==KeyEvent.KEYCODE_MEDIA_PLAY||key==KeyEvent.KEYCODE_MEDIA_PAUSE;
        if(!arrow&&!ok&&!transport)return super.dispatchKeyEvent(event);
        if(event.getAction()!=KeyEvent.ACTION_DOWN)return true; // prevent a second activation on key-up
        if(arrow||ok)remotePlayerMode=true;
        if(feedbackBlocking()){
            if(playbackFailed&&(key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT)){
                focusRemote(getCurrentFocus()==feedbackRetry?feedbackClose:feedbackRetry);
            }else if(ok&&event.getRepeatCount()==0){
                View selected=getCurrentFocus();
                if(selected==feedbackRetry||selected==feedbackClose)selected.performClick();
                else focusRemote(feedbackClose);
            }else if(!playbackFailed)focusRemote(feedbackClose);
            return true;
        }
        if(transport){
            if(key==KeyEvent.KEYCODE_MEDIA_REWIND)seekBy(-10000);
            else if(key==KeyEvent.KEYCODE_MEDIA_FAST_FORWARD)seekBy(10000);
            else if(event.getRepeatCount()==0&&player!=null){
                if(key==KeyEvent.KEYCODE_MEDIA_PLAY){if(!player.isPlaying())player.play();}
                else if(key==KeyEvent.KEYCODE_MEDIA_PAUSE){if(player.isPlaying())player.pause();}
                else togglePause();
            }
            showControls();return true;
        }
        if(controls.getVisibility()!=View.VISIBLE||!isInControls(getCurrentFocus())){
            showControls();return true;
        }
        resetControlsTimer();
        View selected=getCurrentFocus();
        if(ok){
            if(event.getRepeatCount()==0){
                if(selected instanceof Button)selected.performClick();
                else if(selected==timeline&&playPause!=null)focusRemote(playPause);
            }
        }else if(selected==timeline&&(key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT)){
            long step=event.getRepeatCount()>5?30000:10000;
            seekBy(key==KeyEvent.KEYCODE_DPAD_LEFT?-step:step);
        }else movePlayerFocus(key);
        return true;
    }
    private boolean allowedProviderUrl(String raw, boolean media) {
        try {
            Uri u=Uri.parse(raw);
            String host=u.getHost();
            if(host==null || host.isEmpty() || u.getUserInfo()!=null || u.getFragment()!=null)return false;
            if(!"http".equalsIgnoreCase(u.getScheme()) && !"https".equalsIgnoreCase(u.getScheme()))return false;
            if(!media)return u.getPath()!=null && u.getPath().endsWith("/player_api.php");
            String p=u.getPath();
            return p!=null && (p.contains("/live/") || p.contains("/movie/") || p.contains("/series/"));
        } catch(Exception ignored) { return false; }
    }
    private int networkCache() {
        if("fast".equals(profile))return 1000;
        if("ultra".equals(profile))return 9000;
        if("adaptive".equals(profile)){
            long now=android.os.SystemClock.elapsedRealtime();
            if(stableSince>0&&now-stableSince>90000){
                if(isLive)liveRebufferCount=Math.max(0,liveRebufferCount-1);
                else rebufferCount=Math.max(0,rebufferCount-1);
            }
            // Live adapts independently from VOD, so a movie stall cannot slow the first channel.
            return LivePlaybackPolicy.adaptiveCache(isLive,isLive?liveRebufferCount:rebufferCount);
        }
        return 4000;
    }
    private void updateAspect() {
        if(player==null)return;
        boolean portrait=getResources().getConfiguration().orientation==Configuration.ORIENTATION_PORTRAIT;
        // The supported LibVLC ScaleType names vary; use reflection for graceful fallback.
        String requested = portrait || "contain".equals(pictureMode)?"SURFACE_BEST_FIT"
                : "fill".equals(pictureMode)?"SURFACE_FILL":"SURFACE_FIT_SCREEN";
        try {
            Class<?> type=Class.forName("org.videolan.libvlc.MediaPlayer$ScaleType");
            Object enumValue;
            try { enumValue=Enum.valueOf((Class)type,requested); }
            catch(Exception missing) { enumValue=Enum.valueOf((Class)type,"SURFACE_BEST_FIT"); }
            player.getClass().getMethod("setVideoScale",type).invoke(player,enumValue);
        } catch(Exception ignored) { /* default fit if this LibVLC release differs */ }
    }
    private void toggleAspect() { pictureMode="contain".equals(pictureMode)?"fill":"contain"; updateAspect();updatePlayerLabels(); }
    private void startMedia(String url,String newProfile,String aspect,String audio,String subs,long resumeMs) {
        if(!allowedProviderUrl(url,true)) { sendEvent("error"); return; }
        this.profile="fast".equals(newProfile)||"ultra".equals(newProfile)||"normal".equals(newProfile)
            ?newProfile:"adaptive";
        this.pictureMode=aspect; this.audioLanguage=audio; this.subtitleLanguage=subs;
        // Prior stream jitter influences the next stream's prebuffer (no forced restart).
        this.playingUrl=url; this.triedLiveFallback=false;
        this.usingSoftwareFallback=false;
        startMediaInternal(url,resumeMs);
    }
    private void startMediaInternal(String url,long resumeMs) {
        if(player==null)return;
        isLive=url.contains("/live/");
        try {
            cancelVideoWatchdog();
            videoOutputSeen=false;
            activeMediaUrl=url;
            if(playerVisible)player.stop();
            if(attached && (!playerVisible || !isLive || usingSoftwareFallback)) {
                player.detachViews();
                attached=false;
            }
            // A visible surface must be ready BEFORE attaching LibVLC's video output.
            video.setVisibility(View.VISIBLE);
            video.requestLayout();
            if(!attached){
                player.attachViews(video,null,true,false);
                attached=true;
            }
            Media media=new Media(vlc,Uri.parse(url));
            media.setHWDecoderEnabled(!useSoftwareDecoder(),false);
            if(!isLive&&"sharp".equals(enhancement)) {
                // Native VLC sharpen; this is NOT AI super-resolution, and some
                // hardware video pipelines may ignore the filter.
                media.addOption(":video-filter=sharpen");
                media.addOption(":sharpen-sigma=0.05");
            }
            int cache=networkCache();
            media.addOption(":network-caching="+cache);
            media.addOption(":live-caching="+cache);
            media.addOption(":file-caching="+cache);
            player.setMedia(media);
            media.release();
            playerVisible=true;
            playbackAttempt++;
            videoOutputSeen=false;
            playbackStarted=false;
            pendingResumeMs=resumeMs;
            lastSeekAt=0;stableSince=0;
            playbackFailed=false;
            rebufferWaiting=false;
            cancelPlaybackDeadline();
            handler.removeCallbacks(showRebuffer);
            video.setVisibility(View.VISIBLE);
            showLoadingFeedback();
            schedulePlaybackDeadline(LivePlaybackPolicy.startupTimeout(isLive,profile,triedLiveFallback,url));
            if(remotePlayer())focusRemote(feedbackClose);else video.requestFocus();
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE);
            root.requestApplyInsets();
            updateAspect();
            handler.removeCallbacks(progressTicker);
            handler.removeCallbacks(timelineTicker);
            timelineDragging=false;
            if(seekRow!=null)seekRow.setVisibility(View.GONE);
            if(timeline!=null)timeline.setProgress(0);
            // No seek/progress polling is needed for a live channel.
            if(!isLive){
                handler.postDelayed(progressTicker,5000);
                handler.postDelayed(timelineTicker,350);
            }
            if(web!=null)web.setVisibility(isLive?View.INVISIBLE:View.VISIBLE);
            player.play();
            if(!remotePlayer())showControls();
        } catch(Exception error) {
            playerVisible=true;
            video.setVisibility(View.VISIBLE);
            handlePlaybackFailure();
        }
    }
    private void sendEvent(String name) {
        try { JSONObject x=new JSONObject(); x.put("type",name); sendEvent(x); } catch(Exception ignored) { }
    }
    private void sendEvent(JSONObject obj) { evaluate("window.ASPLAYER58_EVENT&&window.ASPLAYER58_EVENT("+obj+");"); }
    private void sendPosition(boolean ended) {
        if(!playerVisible || player==null || isLive)return;
        try {
            JSONObject e=new JSONObject();
            e.put("type","position");e.put("position",Math.max(0,player.getTime()));
            e.put("duration",Math.max(0,player.getLength()));e.put("ended",ended);
            sendEvent(e);
        } catch(Exception ignored) { }
    }
    private void evaluate(String js) { runOnUiThread(()->{if(web!=null)web.evaluateJavascript(js,null);}); }
    private void closePlayer(boolean notifyWeb) {
        if(!playerVisible)return;
        sendPosition(false);
        playerVisible=false;
        if(trackDialog!=null)trackDialog.dismiss();
        trackDialogOpen=false;pendingResumeMs=0;
        cancelVideoWatchdog();
        videoOutputSeen=false;
        playbackAttempt++;
        playbackFailed=false;
        playbackStarted=false;
        rebufferWaiting=false;
        cancelPlaybackDeadline();
        handler.removeCallbacks(showRebuffer);
        hidePlaybackFeedback();
        handler.removeCallbacks(hideControls);
        handler.removeCallbacks(progressTicker);
        handler.removeCallbacks(timelineTicker);
        timelineDragging=false;
        if(player!=null){
            player.stop();
            if(attached){player.detachViews();attached=false;}
        }
        if(controls!=null)controls.setVisibility(View.GONE);
        if(video!=null)video.setVisibility(View.GONE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(0);
        root.requestApplyInsets();
        if(web!=null)web.setVisibility(View.VISIBLE);
        if(notifyWeb){web.requestFocus();sendEvent("closed");}
    }
    private static Object invokeNoArgs(Object o,String name) {
        try { return o.getClass().getMethod(name).invoke(o); }catch(Exception ignored){return null;}
    }
    private static String trackProp(Object t,String getter,String field) {
        Object v=invokeNoArgs(t,getter);
        if(v!=null)return String.valueOf(v);
        try {Field f=t.getClass().getField(field);Object x=f.get(t);return x==null?"":String.valueOf(x);}
        catch(Exception ignored){return "";}
    }
    private static final class TrackOption { final String id; final String label;
        TrackOption(String i,String l){id=i;label=l;}}
    private List<TrackOption> tracks(boolean subtitles) {
        ArrayList<TrackOption> out=new ArrayList<>();
        if(subtitles)out.add(new TrackOption("-1","Off / Desactivados"));
        if(player==null)return out;
        Object all=invokeNoArgs(player,subtitles?"getAllSpuTracks":"getAllAudioTracks");
        if(all==null)all=invokeNoArgs(player,subtitles?"getSpuTracks":"getAudioTracks");
        if(all instanceof Object[]) {
            for(Object t:(Object[])all) {
                String id=trackProp(t,"getId","id");
                String name=trackProp(t,"getName","name");
                if(name.isEmpty())name=trackProp(t,"getDescription","description");
                if(id.isEmpty()||(subtitles&&"-1".equals(id)))continue;
                out.add(new TrackOption(id,name.isEmpty()?"Track "+id:name));
            }
        }
        return out;
    }
    private void chooseTrack(boolean subtitles) {
        List<TrackOption> options=tracks(subtitles);
        if(options.isEmpty() || (subtitles && options.size()==1)) {
            Toast.makeText(this,subtitles?"No subtitles available":"No alternate audio available",Toast.LENGTH_SHORT).show();
            return;
        }
        String[] labels=new String[options.size()];
        for(int i=0;i<options.size();i++)labels[i]=options.get(i).label;
        Object current=invokeNoArgs(player,subtitles?"getSpuTrack":"getAudioTrack");
        int chosen=-1;
        if(current!=null)for(int i=0;i<options.size();i++)if(options.get(i).id.equals(String.valueOf(current)))chosen=i;
        final Button origin=subtitles?subtitlesButton:audioButton;
        trackDialogOpen=true;handler.removeCallbacks(hideControls);
        trackDialog=new AlertDialog.Builder(this)
                .setTitle(subtitles?localized("Subtítulos","Subtitles"):localized("Idioma de audio","Audio language"))
                .setSingleChoiceItems(labels,chosen,(d,which)->{
                    selectTrack(subtitles,options.get(which).id);d.dismiss();
                })
                .setNegativeButton(localized("Cancelar","Cancel"),null).create();
        trackDialog.setOnDismissListener(d->{
            trackDialogOpen=false;trackDialog=null;
            if(playerVisible){showControls();if(origin!=null&&remotePlayer())focusRemote(origin);}
        });
        trackDialog.show();
        if(remotePlayer()){
            trackDialog.getListView().requestFocus();
            trackDialog.getListView().setSelection(Math.max(0,chosen));
        }
    }
    private void selectTrack(boolean subtitles,String id) {
        if(player==null)return;
        try {
            String method=subtitles?"setSpuTrack":"setAudioTrack";
            try { player.getClass().getMethod(method,String.class).invoke(player,id); }
            catch(NoSuchMethodException old) { player.getClass().getMethod(method,int.class).invoke(player,Integer.parseInt(id)); }
        } catch(Exception error) {
            Toast.makeText(this,"Track not supported by this stream",Toast.LENGTH_SHORT).show();
        }
    }
    private void refreshTrackMetadata() {
        if(!playerVisible)return;
        try {
            JSONObject e=new JSONObject().put("type","tracks");
            e.put("audioCount",tracks(false).size());
            e.put("subtitleCount",Math.max(0,tracks(true).size()-1));
            sendEvent(e);
        }catch(Exception ignored){}
    }
    private final class Bridge {
        @JavascriptInterface public boolean isAndroidTv() {
            return isTvDevice();
        }

        private final SessionVault sessionVault = new SessionVault(MainActivity.this);
        @JavascriptInterface public boolean saveSession(String value) { return sessionVault.save(value); }
        @JavascriptInterface public String loadSession() { return sessionVault.load(); }
        @JavascriptInterface public boolean clearSession() { return sessionVault.clear(); }

        @JavascriptInterface public void setUiLanguage(String code) {
            runOnUiThread(()->{
                uiLanguage="es".equals(code)?"es":"en";
                if(repairVideoButton!=null) {
                    repairVideoButton.setText(localized("Recuperar imagen","Recover video"));
                    repairVideoButton.setContentDescription(localized(
                        "Reintentar vídeo con decodificación por software",
                        "Retry video with software decoding"));
                }
                if(playbackFeedback!=null && playbackFeedback.getVisibility()==View.VISIBLE)updateFeedbackText();
            });
        }
        @JavascriptInterface public String getAppVersion() { return "5.9.17"; }
        @JavascriptInterface public void setImageEnhancement(String mode) {
            runOnUiThread(()->{
                enhancement="sharp".equals(mode)?"sharp":"off";
                getSharedPreferences("asplayer_picture",MODE_PRIVATE)
                  .edit().putString("enhancement",enhancement).apply();
            });
        }
        @JavascriptInterface public void openWarpVpn() {
            runOnUiThread(()->{
                // We cannot turn on another VPN without that client's consent.
                // Launch Cloudflare's official client. It manages its own tunnel.
                try {
                    Intent intent=getPackageManager().getLaunchIntentForPackage(
                        "com.cloudflare.onedotonedotonedotone");
                    if(intent!=null){startActivity(intent);return;}
                }catch(Exception ignored){}
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://one.one.one.one/")));
                }catch(ActivityNotFoundException error){
                    Toast.makeText(MainActivity.this,
                      "Open https://one.one.one.one/ to install WARP",Toast.LENGTH_LONG).show();
                }
            });
        }
        @JavascriptInterface public void setDecoderMode(String value) {
            runOnUiThread(()->{
                String next="hardware".equals(value)||"software".equals(value)?value:"auto";
                decoderMode=next;
                getSharedPreferences("asplayer_decoder",MODE_PRIVATE)
                    .edit().putString("mode",next).apply();
                // The selected decoder takes effect on the next playback.
            });
        }
        @JavascriptInterface public void play(String url) {
            runOnUiThread(()->startMedia(url,profile,pictureMode,audioLanguage,subtitleLanguage,0));
        }
        @JavascriptInterface public void setPlaybackOptions(String p,String a,String audio,String subs) {
            runOnUiThread(()->{profile=p;pictureMode=a;audioLanguage=audio;subtitleLanguage=subs;updateAspect();});
        }
        @JavascriptInterface public void playMini(String url) {play(url);}
        @JavascriptInterface public void resizeMini(boolean full) { }
        @JavascriptInterface public void stopMini() {stopMedia();}
        @JavascriptInterface public void stopMedia() {runOnUiThread(()->closePlayer(false));}
        @JavascriptInterface public void playMedia(String url,String p,String a,String audio,String subs,long pos) {
            runOnUiThread(()->startMedia(url,p,a,audio,subs,pos));
        }
        @JavascriptInterface public void playExternal(String url) {
            if (!allowedProviderUrl(url, true)) return;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(Uri.parse(url), "video/*");
                try { startActivity(intent); }
                catch (ActivityNotFoundException ex) {
                    Toast.makeText(MainActivity.this, "No compatible player installed", Toast.LENGTH_SHORT).show();
                }
            });
        }
        @JavascriptInterface public void openLink(String raw) {
            if (!raw.startsWith("https://www.alftechsolutions.com/")
                    && !raw.startsWith("https://wa.me/12367021555")
                    && !raw.startsWith("mailto:company@alftechsolutions.com")
                    && !raw.startsWith("tel:+12367021555")) return;
            runOnUiThread(() -> {
                Intent i = new Intent(raw.startsWith("mailto:") ? Intent.ACTION_SENDTO
                        : raw.startsWith("tel:") ? Intent.ACTION_DIAL : Intent.ACTION_VIEW, Uri.parse(raw));
                try { startActivity(i); } catch (ActivityNotFoundException ignored) { }
            });
        }
        @JavascriptInterface public void requestAsync(String raw, String id) {
            requests.execute(() -> {
                String response = "{}";
                HttpURLConnection connection = null;
                try {
                    Uri uri = Uri.parse(raw);
                    boolean provider = allowedProviderUrl(raw, false);
                    boolean secureBackend = "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null;
                    if (!provider && !secureBackend) throw new SecurityException("Request not allowed");
                    connection = (HttpURLConnection) new URL(raw).openConnection();
                    connection.setConnectTimeout(9000);
                    connection.setReadTimeout(28000);
                    connection.setRequestProperty("Accept", "application/json");
                    connection.setRequestProperty("Accept-Encoding", "gzip");
                    connection.setInstanceFollowRedirects(false);
                    int status = connection.getResponseCode();
                    if (status < 200 || status >= 300) throw new Exception("Server HTTP " + status);
                    InputStream rawStream = connection.getInputStream();
                    InputStream decoded = "gzip".equalsIgnoreCase(connection.getContentEncoding())
                            ? new GZIPInputStream(rawStream) : rawStream;
                    try (InputStream in = decoded; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                        byte[] bytes = new byte[8192];
                        int count, total = 0;
                        while ((count = in.read(bytes)) != -1) {
                            total += count;
                            if (total > 40 * 1024 * 1024) throw new Exception("Server response too large");
                            output.write(bytes, 0, count);
                        }
                        response = output.toString("UTF-8");
                    }
                } catch (Exception error) {
                    try { response = new JSONObject().put("error", error.getMessage() == null ? "Connection error" : error.getMessage()).toString(); }
                    catch (Exception ignored) { response = "{\"error\":\"Connection error\"}"; }
                } finally { if (connection != null) connection.disconnect(); }
                evaluate("window.ASPLAYER_REPLY(" + JSONObject.quote(id) + "," + JSONObject.quote(response) + ");");
            });
        }
    }


    @Override public void onConfigurationChanged(Configuration c) {super.onConfigurationChanged(c);updateAspect();}
    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if(focus && playerVisible) {
            getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE);
            root.requestApplyInsets();
        }
    }
    @Override public void onBackPressed() { handleAppBack(); }
    private void handleAppBack() {
        if(playerVisible){
            if(trackDialog!=null){trackDialog.dismiss();return;}
            if(remotePlayer()&&!feedbackBlocking()&&controls.getVisibility()==View.VISIBLE){
                handler.removeCallbacks(hideControls);controls.setVisibility(View.GONE);video.requestFocus();return;
            }
            closePlayer(true);
        }
        else evaluate("window.ASPLAYER_BACK&&window.ASPLAYER_BACK();");
    }
    @Override protected void onStop() {
        if(playerVisible&&player!=null){sendPosition(false);player.pause();}
        cancelPlaybackDeadline();
        cancelVideoWatchdog();
        handler.removeCallbacks(showRebuffer);
        super.onStop();
    }
    @Override protected void onDestroy() {
        closePlayer(false);
        if(player!=null) {
            if(attached)player.detachViews();
            player.release();player=null;
        }
        if(vlc!=null){vlc.release();vlc=null;}
        requests.shutdownNow();
        if(web!=null)web.destroy();
        super.onDestroy();
    }
}
