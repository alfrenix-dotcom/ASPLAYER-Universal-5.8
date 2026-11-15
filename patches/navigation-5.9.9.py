from pathlib import Path
root = Path('app/src/main/assets')
p = root / 'navigation-5.9.8.js'
s = p.read_text()
old_scope = "document.querySelector('.login-page:not(.hidden)')||document.querySelector('main')||document.body;"
new_scope = "document.querySelector('.login-page:not(.hidden)')||document.querySelector('#app-shell:not(.hidden)')||document.body;"
assert s.count(old_scope) == 1
s = s.replace(old_scope, new_scope)
old = "const r=a.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;"
new = """const sidebar=[...document.querySelectorAll('#app-shell:not(.hidden) .sidebar button')].filter(visible);
 if(sidebar.includes(a)){
  if(key==='ArrowUp'||key==='ArrowDown'){
   const idx=sidebar.indexOf(a)+(key==='ArrowDown'?1:-1);
   if(idx<0||idx>=sidebar.length)return true;
   const el=sidebar[idx];el.focus({preventScroll:true});el.scrollIntoView({block:'nearest'});return true;
  }
  if(key==='ArrowLeft')return true;
 }else if(key==='ArrowLeft'&&sidebar.length&&document.querySelector('#app-shell:not(.hidden)')?.contains(a)){
  const active=sidebar.find(el=>el.classList.contains('active')||el.getAttribute('aria-current')==='page')||sidebar[0];
  active.focus({preventScroll:true});return true;
 }
 const r=a.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;"""
assert s.count(old)==1
s=s.replace(old,new)
# Never pass a boundary arrow to competing legacy handlers.
assert s.count('if(!best)return false;')==1
s=s.replace('if(!best)return false;','if(!best)return true;')
(root/'navigation-5.9.9.js').write_text(s.replace('ASPLAYER 5.9.8','ASPLAYER 5.9.9'))
html=root/'index.html'
h=html.read_text()
assert h.count('<script src="navigation-5.9.8.js"></script>')==1
html.write_text(h.replace('<script src="navigation-5.9.8.js"></script>','<script src="navigation-5.9.9.js"></script>').replace('5.9.8','5.9.9'))
gradle=Path('app/build.gradle')
g=gradle.read_text()
assert 'versionCode 5908' in g
gradle.write_text(g.replace('versionCode 5908','versionCode 5909').replace('5.9.8','5.9.9'))
p=root/'features-5.9.3.js'
p.write_text(p.read_text().replace('5.9.8','5.9.9'))
print('ASPLAYER 5.9.9 sidebar focus patch applied')
