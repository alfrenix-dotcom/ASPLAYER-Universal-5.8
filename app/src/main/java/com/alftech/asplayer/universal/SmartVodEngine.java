package com.alftech.asplayer.universal;

import android.content.Context;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.Tracks;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.PlayerView;
import java.util.ArrayList;
import java.util.List;

/** Lazy, single-stream Media3 recovery for VOD. Live TV stays on LibVLC. */
@UnstableApi
final class SmartVodEngine {
    interface Events { void state(int state); void firstFrame(); void error(); void tracks(); }
    static final class Track { final String id,label; final boolean selected; final Tracks.Group group; final int index;
        Track(String id,String label,boolean selected,Tracks.Group group,int index){this.id=id;this.label=label;this.selected=selected;this.group=group;this.index=index;}}
    final PlayerView view;
    final ExoPlayer player;
    SmartVodEngine(Context context,int startupMs,Events events){
        DefaultLoadControl load=new DefaultLoadControl.Builder().setBufferDurationsMs(15000,50000,startupMs,Math.max(1500,startupMs)).build();
        player=new ExoPlayer.Builder(context).setLoadControl(load).build();
        view=new PlayerView(context);view.setUseController(false);view.setPlayer(player);view.setFocusableInTouchMode(true);
        player.addListener(new Player.Listener(){
            @Override public void onPlaybackStateChanged(int state){events.state(state);}
            @Override public void onRenderedFirstFrame(){events.firstFrame();}
            @Override public void onPlayerError(PlaybackException error){events.error();}
            @Override public void onTracksChanged(Tracks tracks){events.tracks();}
        });
    }
    void start(String url,long resume,String audio,String subs){
        var builder=player.getTrackSelectionParameters().buildUpon();
        if(audio!=null&&!"auto".equals(audio))builder.setPreferredAudioLanguage(audio);
        if(subs!=null&&"off".equals(subs))builder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT,true);
        else if(subs!=null&&!"auto".equals(subs))builder.setPreferredTextLanguage(subs);
        player.setTrackSelectionParameters(builder.build());
        player.setMediaItem(MediaItem.fromUri(url),Math.max(0,resume));player.prepare();player.play();
    }
    void aspect(String mode){view.setResizeMode("fill".equals(mode)?AspectRatioFrameLayout.RESIZE_MODE_FILL:"cover".equals(mode)?AspectRatioFrameLayout.RESIZE_MODE_ZOOM:AspectRatioFrameLayout.RESIZE_MODE_FIT);}
    void release(){view.setPlayer(null);player.release();}
    long duration(){long d=player.getDuration();return d==C.TIME_UNSET?0:Math.max(0,d);}
    List<Track> tracks(boolean subs){
        List<Track> out=new ArrayList<>();int groupIndex=0,type=subs?C.TRACK_TYPE_TEXT:C.TRACK_TYPE_AUDIO;
        for(Tracks.Group group:player.getCurrentTracks().getGroups()){
            int g=groupIndex++;if(group.getType()!=type)continue;
            for(int i=0;i<group.length;i++)if(group.isTrackSupported(i)){
                Format f=group.getTrackFormat(i);String label=f.label!=null?f.label:f.language!=null?f.language:"Track "+(out.size()+1);
                out.add(new Track(g+":"+i,label,group.isTrackSelected(i),group,i));
            }
        }return out;
    }
    void select(boolean subs,String id){
        int type=subs?C.TRACK_TYPE_TEXT:C.TRACK_TYPE_AUDIO;
        var builder=player.getTrackSelectionParameters().buildUpon().clearOverridesOfType(type);
        if(subs&&"-1".equals(id)){player.setTrackSelectionParameters(builder.setTrackTypeDisabled(type,true).build());return;}
        for(Track t:tracks(subs))if(t.id.equals(id)){player.setTrackSelectionParameters(builder.setTrackTypeDisabled(type,false).setOverrideForType(new TrackSelectionOverride(t.group.getMediaTrackGroup(),t.index)).build());return;}
    }
}
