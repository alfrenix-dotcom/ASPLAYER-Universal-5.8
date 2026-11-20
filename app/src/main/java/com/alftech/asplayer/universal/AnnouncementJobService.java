package com.alftech.asplayer.universal;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Locale;
import java.util.TimeZone;
import java.util.HashSet;
import java.util.Set;

/** OS-scheduled polling; no foreground service, credentials, device ID or push token. */
public final class AnnouncementJobService extends JobService {
    static final int PERMISSION_REQUEST=5927;
    private static final int JOB_ID=59270, NOTICE_ID=59271;
    private static final String CHANNEL="asplayer_official_notices";
    private static final String ENDPOINT="https://asplayer-ai.alfrenix.workers.dev/api/announcements?app=asplayer&lang=";
    private static volatile boolean foreground;
    private final Handler main=new Handler(Looper.getMainLooper());
    private volatile int generation;
    private Thread thread;
    private static SharedPreferences prefs(Context c){return c.getSharedPreferences("asplayer_background_notices",Context.MODE_PRIVATE);}
    static void setForeground(boolean value){foreground=value;}
    static boolean enabled(Context c){return prefs(c).getBoolean("enabled",false);}
    static boolean hasPermission(Context c){return Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;}
    static void configure(Context c,boolean enabled,String lang){
        prefs(c).edit().putBoolean("enabled",enabled).putString("lang","es".equals(lang)?"es":"en").apply();
        JobScheduler scheduler=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if(scheduler==null)return;
        if(!enabled){scheduler.cancel(JOB_ID);manager(c).cancel(NOTICE_ID);return;}
        try{
            for(JobInfo job:scheduler.getAllPendingJobs())if(job.getId()==JOB_ID)return;
            scheduler.schedule(new JobInfo.Builder(JOB_ID,new ComponentName(c,AnnouncementJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L).setPersisted(true).build());
        }catch(RuntimeException ignored){ /* OS will permit a future attempt from Settings. */ }
    }
    static void markSeen(Context c,String id){
        if(id==null||id.isEmpty()||id.length()>100)return;
        SharedPreferences p=prefs(c);remember(p,id);
        if(id.equals(p.getString("notified","")))manager(c).cancel(NOTICE_ID);
    }
    private static void remember(SharedPreferences p,String id){
        Set<String> ids=new HashSet<>(p.getStringSet("handled",java.util.Collections.emptySet()));
        if(ids.size()>=64&&!ids.contains(id))ids.remove(ids.iterator().next());
        ids.add(id);p.edit().putStringSet("handled",ids).apply();
    }
    private static NotificationManager manager(Context c){return (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);}
    @Override public boolean onStartJob(JobParameters params){
        if(!enabled(this)||foreground||!hasPermission(this))return false;
        final int attempt=++generation;
        final String language=prefs(this).getString("lang","en");
        thread=new Thread(()->{
            JSONObject result=null;HttpURLConnection conn=null;
            try{
                conn=(HttpURLConnection)new URL(ENDPOINT+("es".equals(language)?"es":"en")).openConnection();
                conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(8000);conn.setReadTimeout(8000);
                conn.setRequestProperty("Accept","application/json");
                if(conn.getResponseCode()==200){
                    try(InputStream in=conn.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                        byte[] bytes=new byte[2048];int n,total=0;
                        while((n=in.read(bytes))!=-1){if((total+=n)>32768)throw new java.io.IOException("Response limit");out.write(bytes,0,n);}
                        result=new JSONObject(out.toString("UTF-8"));
                    }
                }
            }catch(Exception ignored){}finally{if(conn!=null)conn.disconnect();}
            final JSONObject response=result;
            main.post(()->{
                if(generation!=attempt)return;
                try{if(response!=null&&enabled(this)&&!foreground&&hasPermission(this)&&language.equals(prefs(this).getString("lang","en")))showNotice(response,language);}finally{thread=null;jobFinished(params,false);}
            });
        },"ASPLAYER notices");
        thread.start();return true;
    }
    @Override public boolean onStopJob(JobParameters params){
        generation++;if(thread!=null)thread.interrupt();thread=null;
        // Timeouts bound the in-flight request; never block JobService callbacks.
        return false;
    }
    static long expiry(String value){
        if(value==null||value.isEmpty())return Long.MAX_VALUE;
        for(String pattern:new String[]{"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'","yyyy-MM-dd'T'HH:mm:ss'Z'"})try{
            SimpleDateFormat format=new SimpleDateFormat(pattern,Locale.US);format.setLenient(false);format.setTimeZone(TimeZone.getTimeZone("UTC"));
            java.text.ParsePosition pos=new java.text.ParsePosition(0);java.util.Date date=format.parse(value,pos);
            if(date!=null&&pos.getIndex()==value.length())return date.getTime();
        }catch(RuntimeException ignored){}
        return 0L;
    }
    private void showNotice(JSONObject response,String language){
        SharedPreferences p=prefs(this);NotificationManager nm=manager(this);
        JSONObject notice=response.optJSONObject("announcement");
        if(notice==null){if(response.has("announcement"))nm.cancel(NOTICE_ID);return;}
        String id=notice.optString("id","").trim(),message=notice.optString("message","").trim();
        long expires=expiry(notice.optString("expires_at",""));
        if(!notice.optBoolean("active",true)||expires<=System.currentTimeMillis()||id.isEmpty()||id.length()>100||message.isEmpty()||message.length()>400){nm.cancel(NOTICE_ID);return;}
        if(p.getStringSet("handled",java.util.Collections.emptySet()).contains(id)||id.equals(p.getString("notified","")))return;
        if(Build.VERSION.SDK_INT>=24&&!nm.areNotificationsEnabled())return;
        boolean es="es".equals(language);
        if(Build.VERSION.SDK_INT>=26){
            nm.createNotificationChannel(new NotificationChannel(CHANNEL,es?"Avisos de ASPLAYER":"ASPLAYER notices",NotificationManager.IMPORTANCE_DEFAULT));
            if(nm.getNotificationChannel(CHANNEL).getImportance()==NotificationManager.IMPORTANCE_NONE)return;
        }
        Intent intent=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent click=PendingIntent.getActivity(this,NOTICE_ID,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(es?"Aviso de ASPLAYER":"ASPLAYER notice")
            .setContentText(message).setStyle(new Notification.BigTextStyle().bigText(message)).setContentIntent(click)
            .setAutoCancel(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_MESSAGE).setVisibility(Notification.VISIBILITY_PUBLIC);
        if(Build.VERSION.SDK_INT>=26&&expires!=Long.MAX_VALUE)b.setTimeoutAfter(Math.max(1,expires-System.currentTimeMillis()));
        try{nm.notify(NOTICE_ID,b.build());p.edit().putString("notified",id).apply();remember(p,id);}catch(SecurityException ignored){}
    }
}
