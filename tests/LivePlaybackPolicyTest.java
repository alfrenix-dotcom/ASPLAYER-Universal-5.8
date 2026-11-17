package com.alftech.asplayer.universal;

public final class LivePlaybackPolicyTest {
    public static void main(String[] args) {
        String hls="https://example.invalid/live/u/p/9.m3u8";
        String ts="https://example.invalid/live/u/p/9.ts";
        if(!LivePlaybackPolicy.alternate(hls).equals(ts))throw new AssertionError("HLS -> TS");
        if(!LivePlaybackPolicy.alternate(ts).equals(hls))throw new AssertionError("TS -> HLS");
        if(!LivePlaybackPolicy.alternate("https://example.invalid/movie/u/p/9.mp4").isEmpty())throw new AssertionError("VOD modified");
        if(LivePlaybackPolicy.adaptiveCache(true,0)!=1000)throw new AssertionError("Live initial buffer");
        if(LivePlaybackPolicy.adaptiveCache(true,2)!=3400)throw new AssertionError("Live adaptive growth");
        if(LivePlaybackPolicy.adaptiveCache(false,0)!=2400)throw new AssertionError("VOD initial buffer");
        if(LivePlaybackPolicy.startupTimeout(true,"adaptive",false,ts)!=9000)throw new AssertionError("Live fallback deadline");
        if(LivePlaybackPolicy.startupTimeout(true,"adaptive",true,hls)!=30000)throw new AssertionError("Alternate gets full deadline");
        if(LivePlaybackPolicy.startupTimeout(true,"ultra",false,hls)!=30000)throw new AssertionError("Ultra profile unchanged");
        if(LivePlaybackPolicy.startupTimeout(false,"adaptive",false,hls)!=30000)throw new AssertionError("VOD deadline unchanged");
        System.out.println("PASS: live cache and single alternate-transport policy");
    }
}
