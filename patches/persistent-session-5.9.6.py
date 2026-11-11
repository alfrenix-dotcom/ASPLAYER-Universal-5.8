from pathlib import Path
root=Path('.')
java=root/'app/src/main/java/com/alftech/asplayer/universal'
(java/'SessionVault.java').write_text('''package com.alftech.asplayer.universal;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.KeyPairGeneratorSpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.math.BigInteger;
import java.util.Calendar;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.spec.GCMParameterSpec;
import javax.security.auth.x500.X500Principal;
import org.json.JSONObject;

/** Device-bound session storage. No plaintext fallback; excluded from Android backup. */
final class SessionVault {
 private final Context context;
 private final SharedPreferences prefs;
 private static final String AES="asplayer.session.aes.v1", RSA="asplayer.session.rsa.v1";
 SessionVault(Context c){context=c.getApplicationContext();prefs=context.getSharedPreferences("asplayer_session_v1",Context.MODE_PRIVATE);}
 private static String enc(byte[] b){return Base64.encodeToString(b,Base64.NO_WRAP);}
 private static byte[] dec(String s){return Base64.decode(s,Base64.NO_WRAP);}
 private SecretKey key(boolean create)throws Exception{
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(Build.VERSION.SDK_INT>=23){
   if(!ks.containsAlias(AES)){
    if(!create)throw new IllegalStateException("Missing key");
    KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
    g.init(new KeyGenParameterSpec.Builder(AES,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());g.generateKey();
   }
   return (SecretKey)ks.getKey(AES,null);
  }
  // Android 5: wrap a random AES key with an AndroidKeyStore RSA key.
  if(!ks.containsAlias(RSA)){
   if(!create)throw new IllegalStateException("Missing key");
   Calendar start=Calendar.getInstance(),end=Calendar.getInstance();end.add(Calendar.YEAR,30);
   KeyPairGenerator g=KeyPairGenerator.getInstance("RSA","AndroidKeyStore");
   g.initialize(new KeyPairGeneratorSpec.Builder(context).setAlias(RSA).setSubject(new X500Principal("CN=ASPLAYER session")).setSerialNumber(BigInteger.ONE).setStartDate(start.getTime()).setEndDate(end.getTime()).setKeySize(2048).build());g.generateKeyPair();
  }
  String wrapped=prefs.getString("wrapped",null);Cipher rsa=Cipher.getInstance("RSA/ECB/PKCS1Padding");
  if(wrapped==null){
   if(!create)throw new IllegalStateException("Missing key");
   byte[] raw=new byte[32];new SecureRandom().nextBytes(raw);
   rsa.init(Cipher.ENCRYPT_MODE,ks.getCertificate(RSA).getPublicKey());
   if(!prefs.edit().putString("wrapped",enc(rsa.doFinal(raw))).commit())throw new IllegalStateException("Storage unavailable");
   return new SecretKeySpec(raw,"AES");
  }
  rsa.init(Cipher.DECRYPT_MODE,(PrivateKey)ks.getKey(RSA,null));return new SecretKeySpec(rsa.doFinal(dec(wrapped)),"AES");
 }
 synchronized boolean save(String value){
  try{
   if(value==null||value.length()>32768)return false;
   JSONObject session=new JSONObject(value);if(!session.has("base")||!session.has("user")||!session.has("pass"))return false;
   Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key(true));
   c.updateAAD("ASPLAYER-session-v1".getBytes("UTF-8"));
   String box=new JSONObject().put("iv",enc(c.getIV())).put("data",enc(c.doFinal(value.getBytes("UTF-8")))).toString();
   return prefs.edit().putString("session",box).commit();
  }catch(Exception ignored){return false;}
 }
 synchronized String load(){
  try{
   String box=prefs.getString("session",null);if(box==null)return "";
   JSONObject j=new JSONObject(box);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(false),new GCMParameterSpec(128,dec(j.getString("iv"))));
   c.updateAAD("ASPLAYER-session-v1".getBytes("UTF-8"));return new String(c.doFinal(dec(j.getString("data"))),"UTF-8");
  }catch(Exception ignored){return "";}
 }
 synchronized boolean clear(){return prefs.edit().remove("session").commit();}
}
''')
p=java/'MainActivity.java';s=p.read_text();s=s.replace('    private final class Bridge {','''    private final class Bridge {
        private final SessionVault sessionVault = new SessionVault(MainActivity.this);
        @JavascriptInterface public boolean saveSession(String value) { return sessionVault.save(value); }
        @JavascriptInterface public String loadSession() { return sessionVault.load(); }
        @JavascriptInterface public boolean clearSession() { return sessionVault.clear(); }
''');p.write_text(s)
p=root/'app/src/main/assets/app.js';s=p.read_text()
s=s.replace('function saveSessions(){localStorage.removeItem(SESSION_KEY)}','''function saveSessions(){
 localStorage.removeItem(SESSION_KEY);
 try{const sn=sessions[server().key];if(!sn)return ASPLAYER.clearSession();return ASPLAYER.saveSession(JSON.stringify({base:server().base,user:sn.user,pass:sn.pass,meta:sn.meta||{}}));}catch(_){return false;}
}''')
s=s.replace("saveSessions();displayApp();toast(tr('saved'))", "const persisted=saveSessions();displayApp();toast(tr(persisted?'saved':'sessionSaveFailed'))")
s=s.replace("function logout(){if(!session())return displayAuth();", "function logout(){try{if(!ASPLAYER.clearSession()){toast(tr('sessionClearFailed'));return;}}catch(_){toast(tr('sessionClearFailed'));return;}if(!session())return displayAuth();")
s=s.replace("restore();languageUI();displayAuth();",'''Object.assign(LABELS.en,{saved:'Session saved on this device.',sessionSaveFailed:'Connected, but secure session storage failed. Sign in again after reopening.',sessionClearFailed:'Unable to remove saved session. Try again or clear app storage in Android settings.'});
Object.assign(LABELS.es,{saved:'Sesión guardada en este dispositivo.',sessionSaveFailed:'Conectado, pero no se pudo guardar la sesión cifrada. Deberás iniciar sesión al reabrir.',sessionClearFailed:'No se pudo borrar la sesión guardada. Reintenta o borra los datos de la app en los ajustes de Android.'});
function restoreSecureSession(){
 try{
  if(!window.ASPLAYER||typeof ASPLAYER.loadSession!=='function')return false;
  const raw=ASPLAYER.loadSession();if(!raw)return false;const sn=JSON.parse(raw);
  const base=normalizeManualServer(sn.base);
  if(typeof sn.user!=='string'||!sn.user||typeof sn.pass!=='string'||!sn.pass)return false;
  SERVERS[0]={key:'manual:'+base,name:new URL(base).host,base,color:'#3cddf2',glyph:'◇'};
  selected=0;settingsServerTarget=0;sessions[SERVERS[0].key]={user:sn.user,pass:sn.pass,meta:sn.meta||{}};
  loginPinAccepted=true;return true;
 }catch(_){return false;}
}
restore();const restoredSession=restoreSecureSession();languageUI();if(restoredSession)displayApp();else displayAuth();''')
p.write_text(s)
for name in ['app/build.gradle','app/src/main/assets/index.html','app/src/main/assets/features-5.9.3.js']:
 p=root/name;s=p.read_text().replace('5.9.5','5.9.6').replace('versionCode 5905','versionCode 5906');p.write_text(s)
print('Persistent encrypted session applied; 5.9.6')
