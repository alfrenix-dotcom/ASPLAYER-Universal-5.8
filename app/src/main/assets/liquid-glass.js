/* One independent appearance preference: existing playback/session/cache settings untouched. */
(()=>{
  'use strict';
  const key='asplayer:appearance:glass:v1';
  const bridge=window.ASPLAYER||{};
  // Scale v2: the former 100% is now 50%. Start the expanded scale at 50%
  // even after upgrading; preserve the selected glass mode and other settings.
  const transparencyKey='asplayer:appearance:glass-transparency:v2';
  const modes=['adaptive','premium','light','off'];
  const css=document.createElement('link');css.rel='stylesheet';css.href='liquid-glass.css';document.head.appendChild(css);
  const translate=(es,en)=>document.documentElement.lang==='es'?es:en;
  let mode='adaptive',transparency=50;
  try{
    const saved=localStorage.getItem(key);
    if(modes.includes(saved))mode=saved;
    const value=localStorage.getItem(transparencyKey);
    if(value!==null&&Number.isFinite(Number(value)))transparency=Math.max(0,Math.min(100,Math.round(Number(value))));
  }catch(_){}
  const box=document.createElement('section');box.className='box setting';box.id='glass-settings';
  box.innerHTML='<h3 id="glass-heading"></h3><label for="glass-appearance" id="glass-label"></label><select id="glass-appearance"><option value="adaptive"></option><option value="premium"></option><option value="light"></option><option value="off"></option></select><div class="glass-slider-label"><label for="glass-transparency" id="glass-transparency-label"></label><output id="glass-transparency-value" for="glass-transparency"></output></div><input type="range" id="glass-transparency" min="0" max="100" step="5"><div class="glass-preview-stage" aria-hidden="true"><div class="glass-preview-surface"><span>✦</span><strong id="glass-preview-label"></strong><span>▶</span></div></div><button type="button" class="ghost" id="glass-reset"></button><p id="glass-description" role="status"></p>';
  document.querySelector('#view-settings .settings-grid').prepend(box);
  const select=box.querySelector('select');
  const slider=box.querySelector('#glass-transparency');
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
    select.options[3].textContent=translate('Desactivado','Off');
    box.querySelector('#glass-transparency-label').textContent=translate('Transparencia','Transparency');
    box.querySelector('#glass-preview-label').textContent=translate('Vista previa','Preview');
    box.querySelector('#glass-reset').textContent=translate('Restablecer apariencia','Reset appearance');
    const premium=document.body.dataset.glassEffective==='premium';
    box.querySelector('#glass-description').textContent=mode==='off'?translate('Efectos de cristal desactivados. Interfaz sólida y sin desenfoque.','Glass effects off. Solid interface without blur.'):premium?translate('Cristal con desenfoque y reflejos. El ajuste cambia las superficies, no el vídeo.','Glass with blur and highlights. Changes surfaces, not video.'):translate('Cristal ligero sin desenfoque intensivo, ideal para Android TV. El vídeo no cambia.','Light glass without expensive blur, ideal for Android TV. Video is unchanged.');
  }
  function applyTransparency(){
    const amount=transparency/100;
    document.body.style.setProperty('--glass-transparency',String(amount));
    document.body.style.setProperty('--glass-legacy',String(Math.min(1,2*amount)));
    document.body.style.setProperty('--glass-beyond',String(Math.max(0,2*amount-1)));
    slider.value=String(transparency);
    slider.disabled=mode==='off';
    box.querySelector('#glass-transparency-value').textContent=transparency+'%';
    slider.setAttribute('aria-valuetext',transparency+'%');
  }
  function persist(){
    try{localStorage.setItem(key,mode);localStorage.setItem(transparencyKey,String(transparency));}catch(_){}
  }
  function syncNative(){
    try{
      if(typeof bridge.setGlassAppearance==='function')bridge.setGlassAppearance(mode);
      if(typeof bridge.setGlassTransparency==='function')bridge.setGlassTransparency(transparency);
    }catch(_){}
  }
  function apply(){
    const premium=supportsGlass() && (mode==='premium'||(mode==='adaptive'&&adaptivePremium()));
    document.body.dataset.glassMode=mode;
    document.body.dataset.glassEffective=mode==='off'?'off':premium?'premium':'light';
    select.value=mode;
    applyTransparency();
    localize();
    syncNative();
  }
  select.addEventListener('change',()=>{mode=modes.includes(select.value)?select.value:'adaptive';persist();apply();});
  slider.addEventListener('input',()=>{transparency=Math.max(0,Math.min(100,Number(slider.value)));applyTransparency();persist();});
  slider.addEventListener('change',syncNative);
  box.querySelector('#glass-reset').addEventListener('click',()=>{mode='adaptive';transparency=50;persist();apply();});
  const previousLanguage=languageUI;languageUI=function(){previousLanguage.apply(this,arguments);localize();};
  let wasRemote=document.body.classList.contains('asplayer-tv-dpad');
  new MutationObserver(()=>{const remote=document.body.classList.contains('asplayer-tv-dpad');if(remote!==wasRemote){wasRemote=remote;apply();}}).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode==='adaptive')apply();});
  apply();
})();
