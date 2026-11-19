package com.alftech.asplayer.universal;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.UpdateAvailability;

/** Read-only Play eligibility check. No update is installed by this class. */
final class PlayUpdateNotice {
    static final int PERMISSION_REQUEST=5921;
    private static final int NOTIFICATION_ID=5921;
    private static final String CHANNEL="asplayer_app_updates";
    interface Listener { void result(String state,int version); }
    private final Activity activity;
    private final SharedPreferences prefs;
    private long lastCheck=-1;
    private boolean busy=false;
    private int available=0;
    PlayUpdateNotice(Activity activity){
        this.activity=activity;
        prefs=activity.getSharedPreferences("asplayer_play_updates",Activity.MODE_PRIVATE);
    }
    void check(boolean force,boolean tv,Listener listener){
        if(tv){listener.result("unsupported",0);return;}
        long now=SystemClock.elapsedRealtime();
        if(busy)return;
        if(!force&&lastCheck>=0&&now-lastCheck<15*60*1000L){
            if(available>0)listener.result("available",available);
            return;
        }
        lastCheck=now;busy=true;
        try {
            AppUpdateManagerFactory.create(activity).getAppUpdateInfo()
                .addOnSuccessListener(info->{
                    busy=false;if(activity.isFinishing()||activity.isDestroyed())return;
                    int version=info.availableVersionCode();
                    if(info.updateAvailability()==UpdateAvailability.UPDATE_AVAILABLE&&version>installedVersion()){
                        available=version;listener.result("available",available);
                    } else if(info.updateAvailability()==UpdateAvailability.UPDATE_NOT_AVAILABLE){
                        available=0;manager().cancel(NOTIFICATION_ID);listener.result("current",0);
                    } else {listener.result("unknown",0);}
                }).addOnFailureListener(error->{busy=false;if(!activity.isDestroyed())listener.result("unknown",0);});
        }catch(RuntimeException ignored){busy=false;listener.result("unknown",0);}
    }
    @SuppressWarnings("deprecation") private long installedVersion(){
        try{
            android.content.pm.PackageInfo info=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);
            return Build.VERSION.SDK_INT>=28?info.getLongVersionCode():info.versionCode;
        }catch(PackageManager.NameNotFoundException ignored){return Long.MAX_VALUE;}
    }
    private NotificationManager manager(){return (NotificationManager)activity.getSystemService(Activity.NOTIFICATION_SERVICE);}
    boolean hasPermission(){return Build.VERSION.SDK_INT<33||activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;}
    void notifyAvailable(boolean spanish,boolean mayAsk){
        if(available<=0||prefs.getInt("notified_version",0)>=available)return;
        if(!hasPermission()){
            if(mayAsk&&Build.VERSION.SDK_INT>=33&&!prefs.getBoolean("permission_requested",false)){
                prefs.edit().putBoolean("permission_requested",true).apply();
                activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION_REQUEST);
            }return;
        }
        NotificationManager nm=manager();
        if(Build.VERSION.SDK_INT>=24&&!nm.areNotificationsEnabled())return;
        if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(new NotificationChannel(CHANNEL,spanish?"Actualizaciones de ASPLAYER":"ASPLAYER updates",NotificationManager.IMPORTANCE_DEFAULT));
        Intent intent=storeIntent();
        PendingIntent click=PendingIntent.getActivity(activity,NOTIFICATION_ID,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(activity,CHANNEL):new Notification.Builder(activity);
        builder.setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle(spanish?"Nueva versión de ASPLAYER":"New ASPLAYER version")
            .setContentText(spanish?"Actualización disponible en Google Play. Toca para actualizar.":"Update available on Google Play. Tap to update.")
            .setContentIntent(click).setAutoCancel(true).setOnlyAlertOnce(true);
        try{nm.notify(NOTIFICATION_ID,builder.build());prefs.edit().putInt("notified_version",available).apply();}catch(SecurityException ignored){}
    }
    private Intent storeIntent(){return new Intent(Intent.ACTION_VIEW,Uri.parse("market://details?id="+activity.getPackageName())).setPackage("com.android.vending");}
    void openStore(){
        try{activity.startActivity(storeIntent());}
        catch(android.content.ActivityNotFoundException e){
            try{activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/apps/details?id="+activity.getPackageName())));}
            catch(android.content.ActivityNotFoundException ignored){}
        }
    }
}
