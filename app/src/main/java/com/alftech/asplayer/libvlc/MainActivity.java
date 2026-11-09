package com.alftech.asplayer.libvlc;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.text.Editable;
import android.text.TextWatcher;
import android.text.method.PasswordTransformationMethod;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.*;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;
import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

public class MainActivity extends Activity {
  private static final String[] SERVERS={"ANUBIS","DIAMOND","DIAMOND 2"};
  private static final String[] HOSTS={"http://kp-thebestiptv.com:8080","http://play.pelusa.online:8080","http://liontv.es:8080"};
  private static final int BG=0xff090f22, PANEL=0xff18223b, ACCENT=0xff58dcf0, PURPLE=0xffa783ef;
  private final Handler handler=new Handler(Looper.getMainLooper());
  private final ExecutorService workers=Executors.newFixedThreadPool(3);
  private SharedPreferences prefs;
  private FrameLayout root, playingOverlay;
  private LinearLayout page, list, controls;
  private EditText searchBox;
  private Spinner serverSelect;
  private LibVLC vlc;
  private MediaPlayer player;
  private VLCVideoLayout video;
  private int server=0;
  private String username="", password="", currentSection="live", category="all", currentUrl="";
  private JSONArray items=new JSONArray(), categories=new JSONArray();
  private boolean live=false, attached=false, showingControls=false;
  private String bufferProfile="normal", aspect="fit";
  private long resumeAt=0;
  private String historyName="", historyType="";
  private Runnable hideControls=()->{ if(controls!=null)controls.setVisibility(View.GONE);showingControls=false; };

  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    prefs=getSharedPreferences("asplayer_v58_secure",MODE_PRIVATE);
    root=new FrameLayout(this); setContentView(root);
    try { vlc=new LibVLC(this,new ArrayList<>());player=new MediaPlayer(vlc); }
    catch(Exception error){ Toast.makeText(this,"LibVLC error: "+error.getMessage(),Toast.LENGTH_LONG).show(); }
    bufferProfile=prefs.getString("buffer","normal");
    server=prefs.getInt("active_server",0);
    if(server<0||server>=SERVERS.length)server=0;
    username=prefs.getString("user_"+server,"");
    password=decrypt(prefs.getString("secret_"+server,""));
    if(!username.isEmpty()&&!password.isEmpty()) verify(true); else loginScreen();
  }
  private int dp(int v){return (int)(v*getResources().getDisplayMetrics().density+.5f);}
  private LinearLayout column(){ LinearLayout l=new LinearLayout(this);l.setOrientation(1);return l; }
  private LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(0);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
  private TextView text(String s,int sp,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(sp);t.setTextColor(color);t.setPadding(dp(9),dp(10),dp(9),dp(10));return t;}
  private Button btn(String s,Runnable onClick){Button b=new Button(this); b.setText(s);b.setTextColor(Color.WHITE);b.setAllCaps(false);b.setTextSize(13);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(PANEL));b.setOnClickListener(v->onClick.run());return b;}
  private void add(LinearLayout l,View v){l.addView(v,new LinearLayout.LayoutParams(-1,-2));}
  private void flex(LinearLayout l,View v){l.addView(v,new LinearLayout.LayoutParams(0,-2,1));}
  private void reset(String title){ root.removeAllViews();page=column();page.setBackgroundColor(BG);ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.addView(page);root.addView(scroll,new FrameLayout.LayoutParams(-1,-1));TextView brand=text(title,23,ACCENT);brand.setTypeface(null,Typeface.BOLD);add(page,brand); }
  private void note(String message){handler.post(()->Toast.makeText(this,message,Toast.LENGTH_LONG).show());}
  private void fail(String message){note(message.length()>140?message.substring(0,140):message);}
  private void busy(String message){ if(page!=null)add(page,text(message,13,PURPLE)); }
  private String encrypt(String plain){
    try{
      KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
      if(!store.containsAlias("ASPLAYER_CREDENTIALS")){
        KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        gen.init(new KeyGenParameterSpec.Builder("ASPLAYER_CREDENTIALS",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());gen.generateKey();
      }
      SecretKey key=((KeyStore.SecretKeyEntry)store.getEntry("ASPLAYER_CREDENTIALS",null)).getSecretKey();
      Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key);
      byte[] iv=cipher.getIV(),data=cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8)),out=new byte[iv.length+data.length];
      System.arraycopy(iv,0,out,0,iv.length);System.arraycopy(data,0,out,iv.length,data.length);
      return Base64.encodeToString(out,Base64.NO_WRAP);
    }catch(Exception e){return "";}
  }
  private String decrypt(String encoded){
    try{byte[] bytes=Base64.decode(encoded,Base64.DEFAULT);if(bytes.length<29)return "";
      byte[] iv=Arrays.copyOfRange(bytes,0,12),data=Arrays.copyOfRange(bytes,12,bytes.length);
      KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
      SecretKey key=((KeyStore.SecretKeyEntry)store.getEntry("ASPLAYER_CREDENTIALS",null)).getSecretKey();
      Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,iv));
      return new String(c.doFinal(data),StandardCharsets.UTF_8);
    }catch(Exception e){return "";}
  }
  private EditText input(String hint,boolean secret){
    EditText e=new EditText(this);e.setHint(hint);e.setHintTextColor(0xff859bb4);e.setTextColor(Color.WHITE);e.setSingleLine(true);e.setPadding(dp(14),dp(12),dp(14),dp(12));
    if(secret)e.setTransformationMethod(PasswordTransformationMethod.getInstance());
    return e;
  }
  private void loginScreen(){
    reset("ASPLAYER  ·  ALFTECH SOLUTIONS");
    add(page,text("Sign in / Iniciar sesión",21,Color.WHITE));
    serverSelect=new Spinner(this);ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,SERVERS);serverSelect.setAdapter(adapter);serverSelect.setSelection(server);add(page,serverSelect);
    EditText user=input("Username / Usuario",false), pass=input("Password / Contraseña",true);user.setText(username);pass.setText(password);add(page,user);
    LinearLayout passwordRow=row();passwordRow.addView(pass,new LinearLayout.LayoutParams(0,-2,1));
    flex(passwordRow,btn("👁",()->pass.setTransformationMethod(pass.getTransformationMethod()==null?PasswordTransformationMethod.getInstance():null)));add(page,passwordRow);
    add(page,btn("Connect / Conectar",()->{
      server=serverSelect.getSelectedItemPosition();username=user.getText().toString().trim();password=pass.getText().toString();
      if(username.isEmpty()||password.isEmpty()){note("Enter username and password");return;}verify(false);
    }));
    add(page,text("Contact / Contacto",17,ACCENT));
    add(page,btn("WhatsApp  +1 236-702-1555",()->openExternal("https://wa.me/12367021555")));
    add(page,btn("company@alftechsolutions.com",()->openExternal("mailto:company@alftechsolutions.com")));
    add(page,btn("www.alftechsolutions.com",()->openExternal("https://www.alftechsolutions.com/")));
  }
  private void openExternal(String url){try{startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,Uri.parse(url)));}catch(Exception e){note("No compatible application installed");}}
  private String api(String action,String extra)throws Exception{
    String u=HOSTS[server]+"/player_api.php?username="+URLEncoder.encode(username,"UTF-8")+"&password="+URLEncoder.encode(password,"UTF-8")+(action.isEmpty()?"":"&action="+action)+extra;
    HttpURLConnection c=(HttpURLConnection)new URL(u).openConnection();
    c.setConnectTimeout(9000);c.setReadTimeout(24000);c.setRequestProperty("Accept","application/json");c.setRequestProperty("User-Agent","ASPLAYER/5.8");
    try{int status=c.getResponseCode();if(status!=200)throw new IOException("Server status "+status);
      try(InputStream stream=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
        byte[] chunk=new byte[8192];int n,total=0;
        while((n=stream.read(chunk))!=-1){total+=n;if(total>30*1024*1024)throw new IOException("Catalog response too large");out.write(chunk,0,n);}
        return out.toString("UTF-8");
      }
    }finally{c.disconnect();}
  }
  private interface Result {void ok(String data);}
  private void fetch(String action,String extra,Result success){
    final int account=server;final String who=username;
    workers.execute(()->{try{String result=api(action,extra);handler.post(()->{if(account==server&&who.equals(username))success.ok(result);});}
    catch(Exception e){handler.post(()->fail("Connection: "+e.getMessage()));}});
  }
  private void verify(boolean returning){
    reset("ASPLAYER  ·  Connecting");busy("Authenticating / Autenticando…");
    fetch("","",data->{
      try{
        JSONObject info=new JSONObject(data).optJSONObject("user_info");
        if(info==null||info.optInt("auth",0)!=1){if(returning){password="";}loginScreen();note("Account or connection rejected");return;}
        prefs.edit().putInt("active_server",server).putString("user_"+server,username)
          .putString("secret_"+server,encrypt(password)).apply();
        home();
      }catch(Exception e){loginScreen();note("Invalid server response");}
    });
  }
  private void home(){
    reset("ASPLAYER  ·  "+SERVERS[server]);
    add(page,text("Connected: "+username,14,ACCENT));
    LinearLayout tabs=row();
    flex(tabs,btn("📺 TV",()->openSection("live")));
    flex(tabs,btn("🎬 Movies",()->openSection("vod")));
    flex(tabs,btn("🍿 Series",()->openSection("series")));
    add(page,tabs);
    add(page,btn("⭐ Favorites / Favoritos",()->favorites()));
    add(page,btn("▶ Continue Watching / Seguir viendo",()->recent()));
    add(page,btn("⚙ Settings / Ajustes",()->settings()));
    add(page,text("ASPLAYER by Alftech Solutions",15,PURPLE));
    add(page,btn("WhatsApp +1 236-702-1555",()->openExternal("https://wa.me/12367021555")));
    add(page,btn("company@alftechsolutions.com",()->openExternal("mailto:company@alftechsolutions.com")));
  }
  private void openSection(String type){
    currentSection=type;category="all";items=new JSONArray();
    reset(("live".equals(type)?"Live TV":"vod".equals(type)?"Movies":"Series")+"  ·  "+SERVERS[server]);
    add(page,btn("‹ Home",()->home()));
    LinearLayout controlsRow=row();
    flex(controlsRow,btn("All / Todos",()->loadItems("all")));
    flex(controlsRow,btn("Categories / Categorías",()->chooseCategory()));
    add(page,controlsRow);
    searchBox=input("Search titles / Buscar contenido",false);add(page,searchBox);
    searchBox.addTextChangedListener(new TextWatcher(){
      public void beforeTextChanged(CharSequence s,int st,int n,int a){}
      public void onTextChanged(CharSequence s,int st,int before,int count){renderItems(s.toString());}
      public void afterTextChanged(Editable e){}
    });
    list=column();add(page,list);
    busy("Loading categories…");
    String action=type.equals("live")?"get_live_categories":type.equals("vod")?"get_vod_categories":"get_series_categories";
    fetch(action,"",result->{ try{categories=new JSONArray(result);}catch(Exception e){categories=new JSONArray();}loadItems("all");});
  }
  private void chooseCategory(){
    ArrayList<String> names=new ArrayList<>();ArrayList<String> ids=new ArrayList<>();
    names.add("All / Todos");ids.add("all");
    for(int i=0;i<categories.length();i++){JSONObject o=categories.optJSONObject(i);if(o!=null){names.add(o.optString("category_name","Category"));ids.add(o.optString("category_id",""));}}
    new AlertDialog.Builder(this).setTitle("Categories ("+categories.length()+")")
      .setItems(names.toArray(new String[0]),(d,which)->loadItems(ids.get(which))).show();
  }
  private void loadItems(String cat){
    category=cat;if(list==null)return;list.removeAllViews();add(list,text("Loading / Cargando…",15,ACCENT));
    String action=currentSection.equals("live")?"get_live_streams":currentSection.equals("vod")?"get_vod_streams":"get_series";
    String extra="all".equals(cat)?"":"&category_id="+Uri.encode(cat);
    fetch(action,extra,data->{
      try{items=new JSONArray(data);}catch(Exception e){items=new JSONArray();}
      renderItems(searchBox==null?"":searchBox.getText().toString());
    });
  }
  private String title(JSONObject o){return o.optString("name",o.optString("title","Untitled"));}
  private void renderItems(String query){
    if(list==null)return;list.removeAllViews();
    String q=query.toLowerCase(Locale.ROOT).trim();int shown=0,matches=0;
    for(int i=0;i<items.length();i++){
      JSONObject obj=items.optJSONObject(i);if(obj==null)continue;
      if(!q.isEmpty()&&!title(obj).toLowerCase(Locale.ROOT).contains(q))continue;
      matches++;if(shown>=30)continue;shown++;
      final JSONObject item=obj;
      LinearLayout r=row();String name=title(item);
      Button play=btn(name,()->selectItem(item));
      r.addView(play,new LinearLayout.LayoutParams(0,-2,1));
      if(currentSection.equals("live")) r.addView(btn(isFav(item)?"★":"☆",()->{toggleFav(item);renderItems(searchBox.getText().toString());}),new LinearLayout.LayoutParams(dp(65),-2));
      add(list,r);
    }
    if(items.length()>shown)add(list,text("Showing "+shown+" of "+matches+" matches. Narrow your search to find more.",12,PURPLE));
    if(shown==0)add(list,text("No results / Sin resultados",15,ACCENT));
  }
  private String itemId(JSONObject item){return item.optString("stream_id",item.optString("series_id",""));}
  private String favKey(){return "favorites_"+server+"_"+username;}
  private boolean isFav(JSONObject o){return prefs.getStringSet(favKey(),Collections.emptySet()).contains(itemId(o));}
  private void toggleFav(JSONObject o){HashSet<String> ids=new HashSet<>(prefs.getStringSet(favKey(),Collections.emptySet()));if(!ids.add(itemId(o)))ids.remove(itemId(o));prefs.edit().putStringSet(favKey(),ids).apply();}
  private void favorites(){
    reset("⭐ Favorites / Favoritos");add(page,btn("‹ Home",()->home()));list=column();add(page,list);
    currentSection="live";String action="get_live_streams";fetch(action,"",result->{try{items=new JSONArray(result);}catch(Exception e){items=new JSONArray();}
      JSONArray filtered=new JSONArray();for(int i=0;i<items.length();i++){JSONObject o=items.optJSONObject(i);if(o!=null&&isFav(o))filtered.put(o);}items=filtered;
      searchBox=null;renderItems("");
    });
  }
  private void recent(){
    reset("▶ Continue Watching");add(page,btn("‹ Home",()->home()));
    String raw=prefs.getString("last_"+server+"_"+username,"");
    if(raw.isEmpty()){add(page,text("No viewing history yet",14,PURPLE));return;}
    try{JSONObject record=new JSONObject(raw);add(page,btn(record.optString("name"),()->play(record.optString("url"),false,record.optString("name"),record.optString("type"),record.optLong("position",0))));}
    catch(Exception e){add(page,text("No saved playback",14,PURPLE));}
  }
  private void selectItem(JSONObject o){
    if("series".equals(currentSection)){openEpisodes(o);return;}
    String id=itemId(o);String ext=currentSection.equals("live")?"ts":o.optString("container_extension","mp4");
    if(!ext.matches("[A-Za-z0-9]{2,5}"))ext="mp4";
    String path=currentSection.equals("live")?"live":"movie";
    String url=HOSTS[server]+"/"+path+"/"+Uri.encode(username)+"/"+Uri.encode(password)+"/"+id+"."+ext;
    play(url,currentSection.equals("live"),title(o),currentSection,0);
  }
  private void openEpisodes(JSONObject series){
    reset("Series: "+title(series));add(page,btn("‹ Back",()->openSection("series")));busy("Loading episodes…");
    fetch("get_series_info","&series_id="+Uri.encode(itemId(series)),data->{
      try{JSONObject episodes=new JSONObject(data).optJSONObject("episodes");if(episodes==null){note("No episodes available");return;}
        Iterator<String> seasons=episodes.keys();
        while(seasons.hasNext()){String season=seasons.next();add(page,text("Season "+season,19,ACCENT));JSONArray eps=episodes.optJSONArray(season);if(eps==null)continue;
          for(int i=0;i<eps.length();i++){JSONObject episode=eps.optJSONObject(i);if(episode==null)continue;
            String id=episode.optString("id",""),name=episode.optString("title","Episode "+(i+1));
            String ext=episode.optJSONObject("info")!=null?episode.optJSONObject("info").optString("container_extension","mp4"):"mp4";
            if(!ext.matches("[A-Za-z0-9]{2,5}"))ext="mp4";
            String url=HOSTS[server]+"/series/"+Uri.encode(username)+"/"+Uri.encode(password)+"/"+id+"."+ext;
            add(page,btn(name,()->play(url,false,name,"series",0)));
          }
        }
      }catch(Exception e){note("Episodes not available");}
    });
  }
  private void settings(){
    reset("⚙ Settings / Ajustes");add(page,btn("‹ Home",()->home()));add(page,text("Playback buffer / Búfer",18,ACCENT));
    final String[] options={"Fast — 1s / Rápido","Normal — 4s (default)","Ultra — 9s"};
    RadioGroup group=new RadioGroup(this);
    for(int i=0;i<3;i++){final int index=i;RadioButton radio=new RadioButton(this);radio.setText(options[i]);radio.setTextColor(Color.WHITE);radio.setChecked(bufferProfile.equals(new String[]{"fast","normal","ultra"}[i]));group.addView(radio);radio.setOnClickListener(v->{bufferProfile=new String[]{"fast","normal","ultra"}[index];prefs.edit().putString("buffer",bufferProfile).apply();});}
    add(page,group);
    add(page,text("Account / Cuenta",18,ACCENT));
    for(int i=0;i<SERVERS.length;i++){final int serverIndex=i;add(page,btn(SERVERS[i],()->{server=serverIndex;username=prefs.getString("user_"+server,"");password=decrypt(prefs.getString("secret_"+server,""));if(username.isEmpty()||password.isEmpty())loginScreen();else verify(true);}));}
    add(page,btn("Sign out / Cerrar sesión",()->{prefs.edit().remove("secret_"+server).apply();password="";loginScreen();}));
    add(page,text("Creator: ING. ALFREDO MARTINEZ DE ESCOBAR RUEDA",13,PURPLE));
  }
  private void play(String url,boolean isLive,String name,String type,long resume){
    if(player==null){note("VLC engine unavailable");return;}
    this.live=isLive;currentUrl=url;historyName=name;historyType=type;resumeAt=resume;
    if(playingOverlay!=null)root.removeView(playingOverlay);
    playingOverlay=new FrameLayout(this);playingOverlay.setBackgroundColor(Color.BLACK);
    root.addView(playingOverlay,new FrameLayout.LayoutParams(-1,-1));
    video=new VLCVideoLayout(this);playingOverlay.addView(video,new FrameLayout.LayoutParams(-1,-1));
    controls=row();controls.setBackgroundColor(0xcc111932);
    Button back=btn("✕",()->stop());controls.addView(back,new LinearLayout.LayoutParams(0,dp(54),.65f));
    controls.addView(btn("−10",()->seek(-10000)),new LinearLayout.LayoutParams(0,dp(54),.75f));
    controls.addView(btn("▶❚❚",()->{if(player.isPlaying())player.pause();else player.play();}),new LinearLayout.LayoutParams(0,dp(54),1));
    controls.addView(btn("+10",()->seek(10000)),new LinearLayout.LayoutParams(0,dp(54),.75f));
    controls.addView(btn("Audio",()->tracks(false)),new LinearLayout.LayoutParams(0,dp(54),1));
    controls.addView(btn("Subs",()->tracks(true)),new LinearLayout.LayoutParams(0,dp(54),1));
    controls.addView(btn("Fill",()->switchAspect()),new LinearLayout.LayoutParams(0,dp(54),.8f));
    playingOverlay.addView(controls,new FrameLayout.LayoutParams(-1,dp(56),Gravity.BOTTOM));
    video.setOnClickListener(v->showControls());
    try{
      player.stop();if(attached){player.detachViews();attached=false;}
      player.attachViews(video,null,true,false);attached=true;
      Media media=new Media(vlc,Uri.parse(url));media.setHWDecoderEnabled(true,false);
      int ms=bufferProfile.equals("fast")?1000:bufferProfile.equals("ultra")?9000:4000;
      media.addOption(":network-caching="+ms);media.addOption(":live-caching="+ms);media.addOption(":file-caching="+ms);
      player.setMedia(media);media.release();player.setEventListener(e->handler.post(()->{
        if(e.type==MediaPlayer.Event.Playing && resumeAt>0 && !live){long pos=resumeAt;resumeAt=0;player.setTime(pos);}
        if(e.type==MediaPlayer.Event.EncounteredError)note("Unable to play this stream");
        if(e.type==MediaPlayer.Event.EndReached){saveProgress();stop();}
      }));
      getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
      getWindow().getDecorView().setSystemUiVisibility(5894|1024|512);
      player.play();showControls();
    }catch(Exception e){note("Playback error: "+e.getMessage());stop();}
  }
  private void switchAspect(){aspect=aspect.equals("fit")?"fill":"fit";try{player.setAspectRatio(aspect.equals("fill")?"16:9":null);player.setScale(0);}catch(Exception ignored){}}
  private void showControls(){if(controls==null)return;controls.setVisibility(View.VISIBLE);showingControls=true;handler.removeCallbacks(hideControls);handler.postDelayed(hideControls,3000);}
  private void seek(long delta){if(player==null||live)return;long duration=player.getLength(),now=player.getTime();if(now<0)return;long to=Math.max(0,now+delta);player.setTime(duration>0?Math.min(duration,to):to);}
  private void tracks(boolean subtitles){
    if(player==null)return;
    Object result=null;try{result=player.getClass().getMethod(subtitles?"getSpuTracks":"getAudioTracks").invoke(player);}catch(Exception e){}
    ArrayList<String> labels=new ArrayList<>(),ids=new ArrayList<>();
    if(subtitles){labels.add("Off / Desactivados");ids.add("-1");}
    if(result instanceof Object[]){for(Object t:(Object[])result){try{
      java.lang.reflect.Field id=t.getClass().getField("id"),name=t.getClass().getField("name");
      ids.add(String.valueOf(id.get(t)));labels.add(String.valueOf(name.get(t)));
    }catch(Exception ignored){}}}
    if(labels.size()<(subtitles?2:1)){note("No other tracks reported for this stream");return;}
    new AlertDialog.Builder(this).setTitle(subtitles?"Subtitles / Subtítulos":"Audio / Idioma")
      .setItems(labels.toArray(new String[0]),(d,index)->{try{
        player.getClass().getMethod(subtitles?"setSpuTrack":"setAudioTrack",int.class).invoke(player,Integer.parseInt(ids.get(index)));
      }catch(Exception e){note("Track unavailable");}}).show();
  }
  private void saveProgress(){if(player==null||live||currentUrl.isEmpty())return;try{
    JSONObject obj=new JSONObject();obj.put("name",historyName);obj.put("url",currentUrl);obj.put("type",historyType);obj.put("position",Math.max(0,player.getTime()));
    prefs.edit().putString("last_"+server+"_"+username,obj.toString()).apply();
  }catch(Exception ignored){}}
  private void stop(){saveProgress();handler.removeCallbacks(hideControls);if(player!=null){player.stop();if(attached){player.detachViews();attached=false;}}
    if(playingOverlay!=null){root.removeView(playingOverlay);playingOverlay=null;}controls=null;video=null;
    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);getWindow().getDecorView().setSystemUiVisibility(0);
  }
  @Override public void onBackPressed(){if(playingOverlay!=null){stop();}else home();}
  @Override public void onConfigurationChanged(Configuration c){super.onConfigurationChanged(c);}
  @Override protected void onStop(){if(playingOverlay!=null){saveProgress();if(player!=null)player.pause();}super.onStop();}
  @Override protected void onDestroy(){if(playingOverlay!=null)stop();if(player!=null)player.release();if(vlc!=null)vlc.release();workers.shutdownNow();super.onDestroy();}
}
