/* One independent appearance preference: existing playback/session/cache settings untouched. */
(()=>{
  'use strict';
  const key='asplayer:appearance:glass:v1';
  const bridge=window.ASPLAYER||{};
  const modes=['adaptive','premium','light'];
  const css=document.createElement('link');css.rel='stylesheet';css.href='liquid-glass.css';document.head.appendChild(css);
  const translate=(es,en)=>document.documentElement.lang==='es'?es:en;
  let mode='adaptive';
  try{const saved=localStorage.getItem(key);if(modes.includes(saved))mode=saved;}catch(_){}
  const box=document.createElement('section');box.className='box setting';box.id='glass-settings';
  box.innerHTML='<h3 id="glass-heading"></h3><label for="glass-appearance" id="glass-label"></label><select id="glass-appearance"><option value="adaptive"></option><option value="premium"></option><option value="light"></option></select><p id="glass-description" role="status"></p>';
  document.querySelector('#view-settings .settings-grid').prepend(box);
  const select=box.querySelector('select');
  function supportsGlass(){return !!(window.CSS && (CSS.supports('backdrop-filter','blur(2px)')||CSS.supports('-webkit-backdrop-filter','blur(2px)')));}
  function adaptivePremium(){
    if(document.body.classList.contains('asplayer-tv-dpad'))return false;
    try{if(typeof bridge.supportsPremiumGlass==='function')return bridge.supportsPremiumGlass();}catch(_) {return false;}
    return !matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function localize(){
    box.querySelector('#glass-heading').textContent=translate('Apariencia Liquid Glass','Liquid Glass appearance');
    box.querySelector('#glass-label').textContent=translate('Efectos de cristal','Glass effects');
    select.options[0].textContent=translate('Adaptativo (recomendado)','Adaptive (recommended)');
    select.options[1].textContent='Glass Premium';
    select.options[2].textContent=translate('Ligero','Lightweight');
    const premium=document.body.dataset.glassEffective==='premium';
    box.querySelector('#glass-description').textContent=premium?translate('Desenfoque real en menús flotantes. Reproducción sin filtros extra.','Real blur on floating menus. No additional video filters.'):translate('Cristal translúcido sin desenfoque intensivo, ideal para Android TV.','Translucent glass without expensive blur, ideal for Android TV.');
  }
  function apply(){
    const premium=supportsGlass() && (mode==='premium'||(mode==='adaptive'&&adaptivePremium()));
    document.body.dataset.glassMode=mode;
    document.body.dataset.glassEffective=premium?'premium':'light';
    select.value=mode;
    localize();
    try{if(typeof bridge.setGlassAppearance==='function')bridge.setGlassAppearance(mode);}catch(_){}
  }
  select.addEventListener('change',()=>{mode=modes.includes(select.value)?select.value:'adaptive';try{localStorage.setItem(key,mode);}catch(_){}apply();});
  const previousLanguage=languageUI;languageUI=function(){previousLanguage.apply(this,arguments);localize();};
  let wasRemote=document.body.classList.contains('asplayer-tv-dpad');
  new MutationObserver(()=>{const remote=document.body.classList.contains('asplayer-tv-dpad');if(remote!==wasRemote){wasRemote=remote;apply();}}).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode==='adaptive')apply();});
  apply();
})();
