package com.alftech.asplayer.vlc;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
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
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;
import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Array;
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

public class MainActivity extends Activity {
    private static final Set<String> HOSTS = new HashSet<>(Arrays.asList(
        "kp-thebestiptv.com", "play.pelusa.online", "liontv.es"
    ));
    private static final int IMMERSIVE = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN |
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newFixedThreadPool(3);
    private FrameLayout root;
    private WebView web;
    private VLCVideoLayout video;
    private LinearLayout controls;
    private MediaPlayer player;
    private LibVLC engine;
    private boolean attached = false, showing = false, live = false;
    private String cacheMode = "normal", aspect = "fill";
    private long resumePoint = 0;
    private String activeUrl = "";
    private final Runnable hideControls = () -> { if (showing && controls != null) controls.setVisibility(View.GONE); };
    private final Runnable updatePosition = new Runnable() {
        @Override public void run() {
            if (showing && player != null) {
                try { JSONObject obj = new JSONObject().put("type", "position")
                    .put("time", Math.max(0, player.getTime()))
                    .put("duration", Math.max(0, player.getLength()));
                    event(obj); } catch (Exception ignored) {}
                ui.postDelayed(this, 4000);
            }
        }
    };
    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private Button action(String text, Runnable run) {
        Button b = new Button(this);
        b.setText(text); b.setTextColor(Color.WHITE); b.setAllCaps(false); b.setTextSize(12);
        b.setBackgroundColor(0xB9202B4F);
        b.setOnClickListener(v -> { run.run(); reveal(); });
        return b;
    }
    private void setupControls() {
        controls = new LinearLayout(this); controls.setGravity(Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        controls.setOrientation(LinearLayout.HORIZONTAL); controls.setBackgroundColor(0xBB050D1E);
        controls.addView(action("−10s", () -> seek(-10000)), new LinearLayout.LayoutParams(0, dp(52), 1));
        controls.addView(action("Play/Pause", () -> {
            if (player != null) { if (player.isPlaying()) player.pause(); else player.play(); }
        }), new LinearLayout.LayoutParams(0, dp(52), 1.5f));
        controls.addView(action("+10s", () -> seek(10000)), new LinearLayout.LayoutParams(0, dp(52), 1));
        controls.addView(action("Audio", () -> chooseTrack(false)), new LinearLayout.LayoutParams(0, dp(52), 1));
        controls.addView(action("Sub", () -> chooseTrack(true)), new LinearLayout.LayoutParams(0, dp(52), 1));
        controls.addView(action("Fit/Fill", () -> { aspect = "fill".equals(aspect) ? "fit" : "fill"; adaptAspect(); }),
            new LinearLayout.LayoutParams(0, dp(52), 1));
        controls.addView(action("✕", () -> stopPlayer(true)), new LinearLayout.LayoutParams(0, dp(52), .7f));
        root.addView(controls, new FrameLayout.LayoutParams(-1, dp(54), Gravity.BOTTOM));
        controls.setVisibility(View.GONE);
    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        web = new WebView(this);
        web.setBackgroundColor(0xFF07101E);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) { return true; }
        });
        web.addJavascriptInterface(new Bridge(), "ASPLAYER");
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        video = new VLCVideoLayout(this);
        root.addView(video, new FrameLayout.LayoutParams(-1, -1)); video.setVisibility(View.GONE);
        video.setOnClickListener(v -> reveal());
        setupControls();
        setContentView(root);
        engine = new LibVLC(this, new ArrayList<String>());
        player = new MediaPlayer(engine);
        player.setEventListener(evt -> ui.post(() -> {
            if (!showing) return;
            if (evt.type == MediaPlayer.Event.Playing) { send("ready"); reveal(); }
            else if (evt.type == MediaPlayer.Event.EncounteredError) send("error");
            else if (evt.type == MediaPlayer.Event.EndReached) { send("ended"); stopPlayer(false); }
        }));
        web.loadUrl("file:///android_asset/index.html");
    }
    private void evaluate(String js) { ui.post(() -> { if (web != null) web.evaluateJavascript(js, null); }); }
    private void event(JSONObject x) { evaluate("window.onPlayerEvent&&window.onPlayerEvent(" + x.toString() + ");"); }
    private void send(String type) {
        try { event(new JSONObject().put("type", type)); } catch (Exception ignored) {}
    }
    private boolean allowed(String raw, boolean playback) {
        try {
            Uri u = Uri.parse(raw);
            if (u.getHost() == null || !HOSTS.contains(u.getHost().toLowerCase(Locale.ROOT))) return false;
            if (!"http".equalsIgnoreCase(u.getScheme()) && !"https".equalsIgnoreCase(u.getScheme())) return false;
            String path = u.getPath();
            if (path == null) return false;
            return playback ? (path.startsWith("/live/") || path.startsWith("/movie/") || path.startsWith("/series/"))
                    : "/player_api.php".equals(path);
        } catch (Exception ex) { return false; }
    }
    private void seek(long delta) {
        if (!showing || player == null || live) return;
        long t = player.getTime(), l = player.getLength();
        if (t < 0) return;
        player.setTime(l > 0 ? Math.min(l, Math.max(0, t + delta)) : Math.max(0, t + delta));
    }
    private int cacheMs() {
        if ("fast".equals(cacheMode)) return 1000;
        if ("ultra".equals(cacheMode)) return 9000;
        return 4000;
    }
    private void adaptAspect() {
        if (player == null) return;
        boolean portrait = getResources().getConfiguration().orientation == Configuration.ORIENTATION_PORTRAIT;
        try {
            Class<?> type = Class.forName("org.videolan.libvlc.MediaPlayer$ScaleType");
            String wanted = portrait || "fit".equals(aspect) ? "SURFACE_BEST_FIT" : "SURFACE_FILL";
            Object value = Enum.valueOf((Class)type, wanted);
            player.getClass().getMethod("setVideoScale", type).invoke(player, value);
        } catch (Exception ignored) {}
    }
    private void reveal() {
        if (!showing) return;
        controls.setVisibility(View.VISIBLE);
        ui.removeCallbacks(hideControls);
        ui.postDelayed(hideControls, 3000);
    }
    private void play(String url, String type, long position) {
        if (!allowed(url, true)) { send("error"); return; }
        live = "live".equals(type); activeUrl = url; resumePoint = position;
        try {
            if (player == null) return;
            player.stop();
            if (!attached) { player.attachViews(video, null, true, false); attached = true; }
            Media media = new Media(engine, Uri.parse(url));
            media.setHWDecoderEnabled(true, false);
            media.addOption(":network-caching=" + cacheMs());
            media.addOption(":live-caching=" + cacheMs());
            media.addOption(":file-caching=" + cacheMs());
            player.setMedia(media); media.release();
            showing = true;
            video.setVisibility(View.VISIBLE);
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE);
            adaptAspect(); player.play();
            ui.removeCallbacks(updatePosition);
            ui.postDelayed(updatePosition, 4000);
            if (!live && resumePoint > 0) ui.postDelayed(() -> {
                if (showing && player != null) player.setTime(resumePoint);
            }, 1700);
            reveal();
        } catch (Exception ex) { send("error"); stopPlayer(false); }
    }
    private void stopPlayer(boolean notify) {
        if (showing && player != null) {
            try { JSONObject x = new JSONObject().put("type", "position")
                .put("time", Math.max(0, player.getTime())).put("duration", Math.max(0, player.getLength()));
                event(x); } catch (Exception ignored) {}
        }
        showing = false;
        ui.removeCallbacks(hideControls); ui.removeCallbacks(updatePosition);
        if (player != null) player.stop();
        if (video != null) video.setVisibility(View.GONE);
        if (controls != null) controls.setVisibility(View.GONE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(0);
        if (notify) send("closed");
    }
    private static Object getter(Object obj, String method) {
        try { return obj.getClass().getMethod(method).invoke(obj); }
        catch (Exception ignored) { return null; }
    }
    private String trackName(Object item, String fallback) {
        Object n = getter(item, "getName");
        if (n == null) n = getter(item, "getDescription");
        if (n == null) {
            try { Field f = item.getClass().getField("name"); n = f.get(item); }
            catch (Exception ignored) {}
        }
        return n == null ? fallback : String.valueOf(n);
    }
    private String trackId(Object item) {
        Object id = getter(item, "getId");
        if (id == null) {
            try { Field f = item.getClass().getField("id"); id = f.get(item); }
            catch (Exception ignored) {}
        }
        return id == null ? null : String.valueOf(id);
    }
    private void chooseTrack(boolean subtitles) {
        if (player == null) return;
        String method = subtitles ? "getSpuTracks" : "getAudioTracks";
        Object array = getter(player, subtitles ? "getAllSpuTracks" : "getAllAudioTracks");
        if (array == null) array = getter(player, method);
        ArrayList<String> labels = new ArrayList<>(), ids = new ArrayList<>();
        if (subtitles) { labels.add("Off / Desactivados"); ids.add("-1"); }
        if (array != null && array.getClass().isArray()) {
            int n = Array.getLength(array);
            for (int i = 0; i < n; i++) {
                Object track = Array.get(array, i); if (track == null) continue;
                String id = trackId(track);
                if (id == null) continue;
                labels.add(trackName(track, "Track " + id)); ids.add(id);
            }
        }
        if (labels.size() <= (subtitles ? 1 : 0)) {
            Toast.makeText(this, subtitles ? "No subtitle tracks" : "No audio tracks", Toast.LENGTH_SHORT).show();
            return;
        }
        new AlertDialog.Builder(this).setTitle(subtitles ? "Subtitles" : "Audio")
            .setItems(labels.toArray(new String[0]), (dialog, which) -> {
                try {
                    String name = subtitles ? "setSpuTrack" : "setAudioTrack";
                    try { player.getClass().getMethod(name, String.class).invoke(player, ids.get(which)); }
                    catch (NoSuchMethodException old) { player.getClass().getMethod(name, int.class)
                        .invoke(player, Integer.parseInt(ids.get(which))); }
                } catch (Exception e) { Toast.makeText(this, "Track not available", Toast.LENGTH_SHORT).show(); }
            }).show();
    }
    private final class Bridge {
        @JavascriptInterface public void requestAsync(String raw, String id) {
            executor.execute(() -> {
                String payload = "{}";
                HttpURLConnection c = null;
                try {
                    if (!allowed(raw, false)) throw new SecurityException("Invalid provider");
                    c = (HttpURLConnection) new URL(raw).openConnection();
                    c.setConnectTimeout(9000); c.setReadTimeout(26000);
                    c.setRequestProperty("Accept", "application/json");
                    c.setRequestProperty("Accept-Encoding", "gzip");
                    c.setInstanceFollowRedirects(false);
                    int status = c.getResponseCode();
                    if (status < 200 || status >= 300) throw new Exception("HTTP " + status);
                    InputStream stream = c.getInputStream();
                    if ("gzip".equalsIgnoreCase(c.getContentEncoding())) stream = new GZIPInputStream(stream);
                    try (InputStream in = stream; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        byte[] buf = new byte[8192];
                        int n; int total = 0;
                        while ((n = in.read(buf)) != -1) {
                            total += n;
                            if (total > 20 * 1024 * 1024) throw new Exception("Catalog too large");
                            out.write(buf, 0, n);
                        }
                        payload = out.toString("UTF-8");
                    }
                } catch (Exception e) {
                    try { payload = new JSONObject().put("error",
                        e.getMessage() == null ? "Connection error" : e.getMessage()).toString(); }
                    catch (Exception ignored) { payload = "{\"error\":\"Network error\"}"; }
                } finally { if (c != null) c.disconnect(); }
                evaluate("window.onReply&&window.onReply(" + JSONObject.quote(id) + ","
                    + JSONObject.quote(payload) + ");");
            });
        }
        @JavascriptInterface public void play(String url, String type, long position) {
            ui.post(() -> MainActivity.this.play(url, type, position));
        }
        @JavascriptInterface public void stop() { ui.post(() -> stopPlayer(true)); }
        @JavascriptInterface public void setProfile(String p) { ui.post(() -> cacheMode = "fast".equals(p) || "ultra".equals(p) ? p : "normal"); }
        @JavascriptInterface public void setAspect(String a) { ui.post(() -> {
            aspect = "fit".equals(a) ? "fit" : "fill"; adaptAspect();
        }); }
        @JavascriptInterface public void openLink(String url) {
            if (!url.startsWith("https://www.alftechsolutions.com")
                && !url.startsWith("https://wa.me/12367021555")
                && !url.startsWith("mailto:company@alftechsolutions.com")) return;
            ui.post(() -> {
                try { startActivity(new Intent(url.startsWith("mailto:") ? Intent.ACTION_SENDTO :
                    Intent.ACTION_VIEW, Uri.parse(url))); }
                catch (ActivityNotFoundException ignored) {}
            });
        }
    }
    @Override public void onConfigurationChanged(Configuration c) { super.onConfigurationChanged(c); adaptAspect(); }
    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus && showing) getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE);
    }
    @Override public void onBackPressed() {
        if (showing) stopPlayer(true);
        else evaluate("window.backToHome&&window.backToHome();");
    }
    @Override protected void onStop() {
        if (showing && player != null) player.pause();
        super.onStop();
    }
    @Override protected void onDestroy() {
        stopPlayer(false);
        if (player != null) { if (attached) player.detachViews(); player.release(); player = null; }
        if (engine != null) { engine.release(); engine = null; }
        executor.shutdownNow();
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}