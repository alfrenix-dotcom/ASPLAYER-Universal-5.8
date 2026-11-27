package com.alftech.asplayer.universal;

/**
 * Conservative UI-only performance policy.
 * Does not select video decoders, change streaming buffers or alter navigation.
 */
public final class AdaptivePerformancePolicy {
    private AdaptivePerformancePolicy() {}

    public static String automaticTier(boolean lowRam, int memoryClassMb,
                                       boolean powerSaving, boolean memoryPressure) {
        if (lowRam || memoryPressure || (memoryClassMb > 0 && memoryClassMb <= 128))
            return "efficient";
        if (powerSaving || memoryClassMb <= 256)
            return "balanced";
        return "complete";
    }

    public static String effectiveTier(String preference, String automaticTier) {
        if ("efficient".equals(preference) || "balanced".equals(preference)
                || "complete".equals(preference))
            return preference;
        return "efficient".equals(automaticTier) || "complete".equals(automaticTier)
                ? automaticTier : "balanced";
    }
}
