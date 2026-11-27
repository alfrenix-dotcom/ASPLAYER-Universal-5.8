package com.alftech.asplayer.universal;

public final class AdaptivePerformancePolicyTest {
    private static void expect(String expected,String actual,String label) {
        if (!expected.equals(actual)) throw new AssertionError(label + ": " + actual);
    }
    public static void main(String[] args) {
        expect("efficient",AdaptivePerformancePolicy.automaticTier(true,512,false,false),"low RAM flag");
        expect("efficient",AdaptivePerformancePolicy.automaticTier(false,512,false,true),"memory pressure");
        expect("efficient",AdaptivePerformancePolicy.automaticTier(false,128,false,false),"restricted heap");
        expect("balanced",AdaptivePerformancePolicy.automaticTier(false,256,false,false),"middle heap");
        expect("balanced",AdaptivePerformancePolicy.automaticTier(false,512,true,false),"power saving");
        expect("complete",AdaptivePerformancePolicy.automaticTier(false,512,false,false),"ample resources");
        System.out.println("PASS: safe automatic UI tier classification. Decoder and buffer unchanged.");
    }
}
