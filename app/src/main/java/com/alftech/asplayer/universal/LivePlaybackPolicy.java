package com.alftech.asplayer.universal;

import java.util.Locale;

/** Native live startup policy; no networking or device-specific dependencies. */
final class LivePlaybackPolicy {
    private LivePlaybackPolicy() {}

    static int adaptiveCache(boolean live, int stalls) {
        return Math.min(8500, (live ? 1000 : 2400) + Math.max(0, stalls) * 1200);
    }

    static String alternate(String url) {
        if (url == null) return "";
        String lower = url.toLowerCase(Locale.ROOT);
        if (!lower.contains("/live/")) return "";
        if (lower.endsWith(".m3u8")) return url.substring(0, url.length() - 5) + ".ts";
        if (lower.endsWith(".ts")) return url.substring(0, url.length() - 3) + ".m3u8";
        return "";
    }

    static long startupTimeout(boolean live, String profile, boolean triedAlternate, String url) {
        boolean quick = "adaptive".equals(profile) || "fast".equals(profile);
        if (live && !triedAlternate && quick && !alternate(url).isEmpty()) return 7000L;
        if ("ultra".equals(profile)) return 25000L;
        if (!quick) return 18000L;
        return live ? 12000L : 16000L;
    }
    static long videoOutputTimeout(String profile) { return "ultra".equals(profile) ? 12000L : 7000L; }
}
