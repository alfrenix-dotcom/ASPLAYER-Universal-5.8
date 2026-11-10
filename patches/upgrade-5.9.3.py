#!/usr/bin/env python3
"""ASPLAYER 5.9.3: TV focus, WARP guidance, video tuning, version and upgrade identity.
Must run after patches/seek-controls-5.9.py, loading-maintenance-5.9.1.py,
video-recovery-5.9.2.py. Does NOT create an embedded VPN tunnel.
"""
from pathlib import Path
import re
base=Path('app/src/main')
java=base/'java/com/alftech/asplayer/universal/MainActivity.java'
s=java.read_text('utf-8')
def one(old,new,reason):
    global s
    n=s.count(old)
    if n!=1:raise ValueError(f'{reason} Java anchor found {n} times')
    s=s.replace(old,new,1)

one('import android.content.Intent;',
    'import android.content.Intent;\nimport android.content.ActivityNotFoundException;', 'VPN intent') if 'import android.content.ActivityNotFoundException;' not in s else None
one('    private boolean usingSoftwareFallback, videoOutputSeen;', '''    private boolean usingSoftwareFallback, videoOutputSeen;
    // Video filters can be costly on inexpensive TV boxes. Disabled by default.
    private String enhancement="off";
    private int rebufferCount=0;''','video settings')
one('''        decoderMode=getSharedPreferences("asplayer_decoder",MODE_PRIVATE).getString("mode","auto");''', '''        enhancement=getSharedPreferences("asplayer_picture",MODE_PRIVATE).getString("enhancement","off");
        decoderMode=getSharedPreferences("asplayer_decoder",MODE_PRIVATE).getString("mode","auto");''','restore picture setting')

one('''        vlc = new LibVLC(this, new ArrayList<>());''', '''        ArrayList<String> vlcOptions=new ArrayList<>();
        // Prefer smooth A/V synchronization to showing late pictures.
        vlcOptions.add("--drop-late-frames");
        vlcOptions.add("--skip-frames");
        vlc = new LibVLC(this,vlcOptions);''','smooth playback flags')
one('''        if("ultra".equals(profile))return 9000;
        return 4000;''', '''        if("ultra".equals(profile))return 9000;
        if("adaptive".equals(profile))return Math.min(9500,3000+(rebufferCount*1500));
        return 4000;''','adaptive cache')
one('''        this.profile="fast".equals(newProfile)||"ultra".equals(newProfile)?newProfile:"normal";''', '''        this.profile="fast".equals(newProfile)||"ultra".equals(newProfile)
            ||"adaptive".equals(newProfile)?newProfile:"normal";''','adaptive profile bridge')
one('''        this.playingUrl=url; this.triedLiveFallback=false;''', '''        // Prior stream jitter influences the next stream's prebuffer (no forced restart).
        this.playingUrl=url; this.triedLiveFallback=false;''','cache comment')
one('''            media.setHWDecoderEnabled(!useSoftwareDecoder(),false);''', '''            media.setHWDecoderEnabled(!useSoftwareDecoder(),false);
            if("sharp".equals(enhancement)) {
                // Native VLC sharpen; this is NOT AI super-resolution, and some
                // hardware video pipelines may ignore the filter.
                media.addOption(":video-filter=sharpen");
                media.addOption(":sharpen-sigma=0.05");
            }''','optional sharpen filter')
# Count stalls only when already playing; do not restart a live TV channel.
one('''                        rebufferWaiting=true;
                        handler.removeCallbacks(showRebuffer);''', '''                        rebufferWaiting=true;
                        rebufferCount=Math.min(5,rebufferCount+1);
                        handler.removeCallbacks(showRebuffer);''','remember network stalls')
# Set proper accessible native TV control dimensions
one('''        b.setOnClickListener(v -> { callback.run(); showControls(); });''', '''        b.setFocusable(true);
        b.setFocusableInTouchMode(false);
        b.setOnFocusChangeListener((v,focused)->{
            v.setBackgroundColor(focused?0xFF156B91:0xB523174A);
            v.setScaleX(focused?1.045f:1f);
            v.setScaleY(focused?1.045f:1f);
        });
        b.setOnClickListener(v -> { callback.run(); showControls(); });''','TV native control focus')

# Put bridge methods ahead of existing setDecoderMode method.
bridge='''        @JavascriptInterface public String getAppVersion() { return "5.9.3"; }
        @JavascriptInterface public void setImageEnhancement(String mode) {
            runOnUiThread(()->{
                enhancement="sharp".equals(mode)?"sharp":"off";
                getSharedPreferences("asplayer_picture",MODE_PRIVATE)
                  .edit().putString("enhancement",enhancement).apply();
            });
        }
        @JavascriptInterface public void openWarpVpn() {
            runOnUiThread(()->{
                // We cannot turn on another VPN without that client's consent.
                // Launch Cloudflare's official client. It manages its own tunnel.
                try {
                    Intent intent=getPackageManager().getLaunchIntentForPackage(
                        "com.cloudflare.onedotonedotonedotone");
                    if(intent!=null){startActivity(intent);return;}
                }catch(Exception ignored){}
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://one.one.one.one/")));
                }catch(ActivityNotFoundException error){
                    Toast.makeText(MainActivity.this,
                      "Open https://one.one.one.one/ to install WARP",Toast.LENGTH_LONG).show();
                }
            });
        }
'''
one('''        @JavascriptInterface public void setDecoderMode(String value) {''',
    bridge+'        @JavascriptInterface public void setDecoderMode(String value) {','native feature bridge')
java.write_text(s,'utf-8')

# Native open client discovery for Android 11 package-visibility rules.
manifest=base/'AndroidManifest.xml'
m=manifest.read_text('utf-8')
needle='    <application android:label=' 
assert m.count(needle)==1
m=m.replace(needle,'''    <queries><package android:name="com.cloudflare.onedotonedotonedotone" /></queries>
    <application android:label=''',1)
manifest.write_text(m,'utf-8')

# User-visible settings, persistent per app, bilingual, TV spatial navigation.
js=base/'assets/features-5.9.3.js'
js.write_text(r'''/* ASPLAYER 5.9.3: independent UI update layer, no credentials. */
(function(){
'use strict';
const bridge=window.ASPLAYER||{};
const t=(es,en)=>(typeof lang!=='undefined' && lang==='es')?es:en;
const storeKey='asplayer:video:enhancement:593';
const vpnKey='asplayer:vpn:warp-enabled:v593';
const focusable='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const css=document.createElement('style');
css.textContent=`
  .asplayer-593-focus:focus-visible, .asplayer-593-focus:focus {
    outline:4px solid #f8d873 !important; outline-offset:3px !important;
    box-shadow:0 0 0 3px #14364b,0 0 25px #26dcf9aa !important;
    position:relative; z-index:5;
  }
  @media (min-width:800px) {
    .asplayer-593-focus {scroll-margin:40px;}
    button,select{min-height:52px;}
  }
  #asplayer-593-options {margin:18px 0 8px;padding:17px;border:1px solid #425d78;
    border-radius:14px;background:#0c192f;}
  #asplayer-593-options label{margin-top:10px;}
  #asplayer-593-options select{width:100%;max-width:560px;}
  #asplayer-593-options p{font-size:12px;color:#adc9da;line-height:1.55;}
  .asplayer-593-button {display:block;margin-top:10px;max-width:440px;}
`;
document.head.appendChild(css);
function visible(el){
  if(!el || !el.isConnected || el.closest('.hidden,[aria-hidden="true"]'))return false;
  const st=getComputedStyle(el);if(st.visibility==='hidden'||st.display==='none')return false;
  const r=el.getBoundingClientRect();return r.width>=3&&r.height>=3;
}
function getFocusable(){
  return Array.from(document.querySelectorAll(focusable)).filter(visible);
}
function highlight(el){
  if(!el)return;
  el.classList.add('asplayer-593-focus');
  try{el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}catch(_){el.scrollIntoView({block:'nearest'});}
}
function activeView(){
  return Array.from(document.querySelectorAll('.modal:not(.hidden),.playeroverlay:not(.hidden)')).slice(-1)[0]
      ||document.querySelector('.login-page:not(.hidden)')||document.querySelector('main');
}
function navigate(direction){
  const section=activeView();
  let choices=getFocusable().filter(el=>section && section.contains(el));
  if(!choices.length)choices=getFocusable();
  if(!choices.length)return false;
  const current=document.activeElement;
  if(!choices.includes(current)){highlight(choices[0]);choices[0].focus();return true;}
  const rect=current.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const toDir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[direction];
  if(!toDir)return false;
  let best=null,score=Infinity;
  for(const el of choices){
    if(el===current)continue;
    const r=el.getBoundingClientRect(),dx=r.left+r.width/2-cx,dy=r.top+r.height/2-cy;
    const forward=dx*toDir[0]+dy*toDir[1],side=Math.abs(dx*toDir[1]-dy*toDir[0]);
    if(forward<=5)continue;
    // Penalize distant/off-axis candidates to reduce jumpy Android-TV traversal.
    const s=forward+side*2.6;
    if(s<score){score=s;best=el;}
  }
  if(!best)return false;
  best.focus();highlight(best);return true;
}
document.addEventListener('focusin',e=>{if(e.target.matches?.(focusable))highlight(e.target);});
document.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  const a=document.activeElement,tag=a?.tagName;
  if(tag==='SELECT'||tag==='TEXTAREA'||(tag==='INPUT'&&a.type!=='button') || a?.isContentEditable)return;
  if(navigate(e.key)){e.preventDefault();e.stopPropagation();}
},true);

const panel=document.createElement('div');panel.id='asplayer-593-options';
const heading=document.createElement('h3');panel.appendChild(heading);
const version=document.createElement('p');version.id='asplayer-593-version';panel.appendChild(version);
const sharpLabel=document.createElement('label');sharpLabel.htmlFor='asplayer-593-picture';panel.appendChild(sharpLabel);
const sharp=document.createElement('select');sharp.id='asplayer-593-picture';
[['off','off'],['sharp','sharp']].forEach(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;sharp.appendChild(o);});
sharp.value=localStorage.getItem(storeKey)==='sharp'?'sharp':'off';panel.appendChild(sharp);
const pictureHelp=document.createElement('p');panel.appendChild(pictureHelp);
sharp.addEventListener('change',()=>{
  localStorage.setItem(storeKey,sharp.value);
  try{bridge.setImageEnhancement(sharp.value);}catch(_){}
});
try{bridge.setImageEnhancement(sharp.value);}catch(_){}
const netLabel=document.createElement('label');panel.appendChild(netLabel);
const netHelp=document.createElement('p');panel.appendChild(netHelp);
const vpnLabel=document.createElement('label');vpnLabel.htmlFor='asplayer-593-vpn';panel.appendChild(vpnLabel);
const vpnCheck=document.createElement('input');vpnCheck.type='checkbox';vpnCheck.id='asplayer-593-vpn';vpnCheck.style.width='auto';vpnCheck.style.minHeight='auto';
// 'Enabled' is a user preference to launch the separate WARP client,
// not a claim that a VPN tunnel is connected.
vpnCheck.checked=localStorage.getItem(vpnKey)==='true';vpnLabel.prepend(vpnCheck);
const vpnHelp=document.createElement('p');panel.appendChild(vpnHelp);
const warpButton=document.createElement('button');warpButton.className='ghost asplayer-593-button';panel.appendChild(warpButton);
warpButton.addEventListener('click',()=>{try{bridge.openWarpVpn();}catch(_){window.open('https://one.one.one.one/','_blank');}});
vpnCheck.addEventListener('change',()=>{
  localStorage.setItem(vpnKey,String(vpnCheck.checked));
  if(vpnCheck.checked)warpButton.click();
});
function localize(){
  version.textContent='ASPLAYER Universal 5.9.3 · LibVLC 3.7.7 · Alftech Solutions';
  heading.textContent=t('Imagen, rendimiento y conexión','Picture, performance and connection');
  sharpLabel.textContent=t('Mejora de nitidez (experimental)','Sharpness enhancement (experimental)');
  sharp.options[0].textContent=t('Normal (recomendado)','Normal (recommended)');
  sharp.options[1].textContent=t('Nitidez suave (requiere compatibilidad de LibVLC)','Gentle sharpening (requires LibVLC support)');
  pictureHelp.textContent=t('Filtro de nitidez de VLC para señales de baja calidad. No es escalado 4K por IA y puede no funcionar con algunas salidas por hardware. Se aplica al siguiente vídeo.','VLC sharpening for low-quality streams. Not AI 4K upscaling; may be unsupported by some hardware output paths. Applies on the next video.');
  netLabel.textContent=t('Búfer adaptativo y fotogramas tardíos','Adaptive buffer and late frames');
  netHelp.textContent=t('En Rendimiento/Búfer selecciona Adaptativo: aumenta el prebúfer en reproducciones posteriores cuando se detectan interrupciones. LibVLC prioriza sincronía de audio/vídeo y descarta fotogramas atrasados.','Choose Adaptive under Performance/Buffer: raises prebuffer on subsequent playback after interruptions. LibVLC prioritizes audio/video sync and drops late frames.');
  // textContent would detach checkbox, keep it in the label.
  for(const n of Array.from(vpnLabel.childNodes))if(n!==vpnCheck)vpnLabel.removeChild(n);
  vpnLabel.appendChild(document.createTextNode(' '+t('Asistente VPN gratuita Cloudflare WARP (desactivado por defecto)','Free Cloudflare WARP VPN helper (off by default)')));
  vpnHelp.textContent=t('Requiere instalar la app independiente 1.1.1.1 / WARP y autorizar manualmente su conexión. ASPLAYER no puede saber si el túnel está conectado ni garantiza anonimato o acceso a todos los servicios.','Requires the separate 1.1.1.1 / WARP app and your approval. ASPLAYER cannot confirm that its tunnel is connected or guarantee anonymity or access to every service.');
  warpButton.textContent=t('Abrir / instalar Cloudflare WARP','Open / install Cloudflare WARP');
}
localize();
const place=document.querySelector('#preferred-player')?.closest('.setting')||document.querySelector('#view-settings');
if(place)place.appendChild(panel);
// Make the actual version visible on the existing About text as well.
for(const el of document.querySelectorAll('#view-settings p')){
  if(el===version)continue;
  if(/ASPLAYER Universal 5\.\d/.test(el.textContent||''))el.textContent='ASPLAYER Universal 5.9.3 · LibVLC/VLC · Alftech Solutions';
}
if(typeof languageUI==='function'){
 const prior=languageUI;languageUI=function(){prior.apply(this,arguments);localize();};
}
// Add an adaptive choice to existing buffer profile controls where available.
for(const element of document.querySelectorAll('select')){
  if(!/buffer|cache/i.test(element.id||''))continue;
  if(element.querySelector('option[value="adaptive"]'))continue;
  const o=document.createElement('option');o.value='adaptive';o.textContent=t('Adaptativo (recomendado)','Adaptive (recommended)');element.appendChild(o);
}
})();
''','utf-8')

html=base/'assets/index.html'
h=html.read_text('utf-8')
assert h.count('<script src="features-5.8.js"></script>')==1
h=h.replace('<script src="features-5.8.js"></script>','<script src="features-5.8.js"></script><script src="features-5.9.3.js"></script>')
h=h.replace('ASPLAYER Universal 5.9.2','ASPLAYER Universal 5.9.3')
html.write_text(h,'utf-8')

feature=base/'assets/features-5.8.js'
a=feature.read_text('utf-8')
a=a.replace('ASPLAYER Universal 5.9.2','ASPLAYER Universal 5.9.3').replace('ASPLAYER 5.9.2','ASPLAYER 5.9.3')
feature.write_text(a,'utf-8')

# Actual prebuffer UI comes from features-5.7.1.js radio buttons.
profileJs=base/'assets/features-5.7.1.js'
f=profileJs.read_text('utf-8')
assert f.count("['fast','normal','ultra'].includes(settings.bufferProfile)")==1
assert f.count("['fast','normal','ultra'].map((type)")==1
f=f.replace("['fast','normal','ultra'].includes(settings.bufferProfile)",
            "['fast','normal','ultra','adaptive'].includes(settings.bufferProfile)")
f=f.replace("['fast','normal','ultra'].map((type)",
            "['fast','normal','ultra','adaptive'].map((type)")
# Unknown i18n keys would cause a broken label. Add language keys instead.
assert f.count("fastProfile:'FAST · lower latency'")==1
assert f.count("fastProfile:'RÁPIDO · baja latencia'")==1
f=f.replace("fastProfile:'FAST · lower latency'", "adaptiveProfile:'ADAPTIVE · auto stability',adaptiveInfo:'Gradually increases buffer on subsequent streams after playback interruptions.',fastProfile:'FAST · lower latency'")
f=f.replace("fastProfile:'RÁPIDO · baja latencia'", "adaptiveProfile:'ADAPTATIVO · estabilidad automática',adaptiveInfo:'Aumenta el búfer en las siguientes reproducciones si aparecen interrupciones.',fastProfile:'RÁPIDO · baja latencia'")
profileJs.write_text(f,'utf-8')

build=Path('app/build.gradle')
g=build.read_text('utf-8')
assert "applicationId 'com.alftech.asplayer.universal.vlc.final.v592'" in g
assert 'versionCode 5902' in g
# PERMANENT ID, identical to 5.9.2, but only an equal-signature update can install in place.
g=g.replace('versionCode 5902','versionCode 5903').replace("versionName '5.9.2-LibVLC'","versionName '5.9.3-LibVLC'")
build.write_text(g,'utf-8')
assert 'vpnCheck.checked=localStorage' in js.read_text('utf-8')
assert 'MediaPlayer.Event.Vout' in s
assert 'versionCode 5903' in g
print('ASPLAYER 5.9.3 UI / VLC / VPN helper patch applied',len(s),'java chars')