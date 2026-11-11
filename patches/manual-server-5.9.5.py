from pathlib import Path
import re
root=Path('.')
p=root/'app/src/main/assets/app.js'; s=p.read_text()
s=re.sub(r'const SERVERS=\[.*?\];', "const SERVERS=[{key:'manual',name:'Server',base:'',color:'#3cddf2',glyph:'◇'}];\nlet loginPinAccepted=false;",s,count=1,flags=re.S)
s=s.replace("asplayer:sessions:v5.1", "asplayer:sessions:manual:v5.9.5")
s=s.replace("function restore(){", "function restore(){localStorage.removeItem('asplayer:sessions:v5.1');")
s=s.replace("function session(){return sessions[server().key]}","function session(){return loginPinAccepted ? sessions[server().key] : null}")
s=s.replace("function renderServers(){", "function renderServers(){ $('servers').innerHTML=''; $('resume-button').classList.add('hidden'); return; /* legacy renderer */")
s=s.replace("function displayAuth(){", "function displayAuth(){loginPinAccepted=false; $('access-pin').value=''; $('access-pin').type='password'; $('toggle-access-pin').textContent=tr('showPin'); $('toggle-access-pin').setAttribute('aria-pressed','false');")
s=s.replace("async function login(){", "async function login(){if(!prepareManualLogin())return;")
s=s.replace("restore();languageUI();if(session())displayApp();else displayAuth();", "restore();languageUI();displayAuth();")
s=s.replace("$('resume-button').addEventListener('click',displayApp)","$('resume-button').addEventListener('click',login)")
s=s.replace("$('change-server').addEventListener('click',()=>showTab('settings'))", "$('change-server').addEventListener('click',displayAuth)")
s=s.replace("async function switchAccount(){", "async function switchAccount(){displayAuth();return; /* legacy account switching */")
s=s.replace("function languageUI(){", "function languageUI(){server().name=lang==='es'?'Servidor':'Server';")
s=s.replace("$('password').value='';languageUI()", "$('password').value='';languageUI();updateHttpWarning()")
# Escape manually entered server names used by account options.
s=s.replace('${s.name}', '${esc(s.name)}')
insert="""
Object.assign(LABELS.en,{manualServer:'Server',accessPin:'PIN',showPin:'Show PIN',hidePin:'Hide PIN',manualInvalid:'Enter a valid http:// or https:// server address without credentials, query or fragment.',signInSub:'Enter your PIN, server address and account information.',httpWarning:'HTTP connection: your username, password and traffic are not encrypted and may be intercepted. Prefer HTTPS.',accountDesc:'To enter another server or account, return to sign in.',switchAccount:'Enter another server'});
Object.assign(LABELS.es,{manualServer:'Servidor',accessPin:'PIN',showPin:'Mostrar PIN',hidePin:'Ocultar PIN',manualInvalid:'Introduce una dirección http:// o https:// válida, sin credenciales, parámetros ni fragmentos.',signInSub:'Introduce tu PIN, servidor y los datos de tu cuenta.',httpWarning:'Conexión HTTP: tu usuario, contraseña y tráfico no están cifrados y pueden interceptarse. Prefiere HTTPS.',accountDesc:'Para ingresar otro servidor o cuenta, vuelve al inicio de sesión.',switchAccount:'Ingresar otro servidor'});
function normalizeManualServer(value){
 const raw=value.trim();
 if(!/^https?:\\/\\//i.test(raw))throw Error(tr('manualInvalid'));
 const u=new URL(raw);
 if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password||u.search||u.hash)throw Error(tr('manualInvalid'));
 return u.origin+u.pathname.replace(/\\/+$/,'');
}
function updateHttpWarning(){ $('manual-http-warning').classList.toggle('hidden',!/^http:\\/\\//i.test($('manual-server').value.trim())); }
function prepareManualLogin(){
 loginPinAccepted=false;
 if($('access-pin').value!=='4546'){$('login-status').textContent=tr('invalidPin');return false;}
 try{
 const base=normalizeManualServer($('manual-server').value);
 SERVERS[0]={key:'manual:'+base,name:new URL(base).host,base,color:'#3cddf2',glyph:'◇'};
 selected=0;settingsServerTarget=0;loginPinAccepted=true;updateHttpWarning();return true;
 }catch(e){$('login-status').textContent=e.message;return false;}
}
$('manual-server').addEventListener('input',updateHttpWarning);
$('toggle-access-pin').addEventListener('click',()=>{const n=$('access-pin'),visible=n.type==='password';n.type=visible?'text':'password';$('toggle-access-pin').textContent=tr(visible?'hidePin':'showPin');$('toggle-access-pin').setAttribute('aria-pressed',String(visible));});
"""
s=s.replace('restore();languageUI();displayAuth();',insert+'\nrestore();languageUI();displayAuth();')
# Manual login always requires all credentials; do not keep saved passwords on disk.
s=s.replace("function saveSessions(){store(SESSION_KEY,sessions);store(SELECT_KEY,server().key)}", "function saveSessions(){localStorage.removeItem(SESSION_KEY)}")
p.write_text(s)
p=root/'app/src/main/assets/index.html';s=p.read_text();needle='<div class="servers" id="servers"></div>'
fields='''<div class="servers hidden" id="servers"></div><div class="field"><label for="access-pin" data-i18n="accessPin">PIN</label><input id="access-pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="PIN"><button type="button" class="ghost" id="toggle-access-pin" aria-controls="access-pin" aria-pressed="false" data-i18n="showPin">Show PIN</button></div><div class="field"><label for="manual-server" data-i18n="manualServer">Server</label><input id="manual-server" type="url" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="https://server.example:8080"><p id="manual-http-warning" class="status hidden" data-i18n="httpWarning" role="status"></p></div>'''
assert needle in s;s=s.replace(needle,fields).replace('Choose your server and enter your account information.','Enter your PIN, server address and account information.')
s=s.replace('5.9.4','5.9.5');p.write_text(s)
p=root/'app/src/main/java/com/alftech/asplayer/universal/MainActivity.java';s=p.read_text()
s=re.sub(r'    private static final Set<String> PROVIDERS = new HashSet<>\(Arrays.asList\(.*?\)\);\n','',s,flags=re.S)
s=s.replace('host==null || !PROVIDERS.contains(host.toLowerCase(Locale.ROOT))','host==null || host.isEmpty() || u.getUserInfo()!=null || u.getFragment()!=null')
s=s.replace('"/player_api.php".equals(u.getPath())','u.getPath()!=null && u.getPath().endsWith("/player_api.php")')
s=s.replace('p.startsWith("/live/") || p.startsWith("/movie/") || p.startsWith("/series/")','p.contains("/live/") || p.contains("/movie/") || p.contains("/series/")')
p.write_text(s)
p=root/'app/build.gradle';s=p.read_text().replace('versionCode 5904','versionCode 5905').replace('5.9.4','5.9.5');p.write_text(s)
p=root/'app/src/main/assets/features-5.9.3.js';p.write_text(p.read_text().replace('5.9.4','5.9.5'))
print('Manual HTTP/HTTPS login with mandatory local PIN applied, 5.9.5')
