/* 5.9.27: responsive catalog geometry and meaningful settings order. */
(()=>{
  'use strict';
  const shell=document.querySelector('#app-shell');
  const bar=document.querySelector('#mobilebar');
  // A fixed menu on Home/Settings; a measured flex row on narrow catalogs.
  // Moving the existing node keeps its listeners, selected tab and focus.
  if(shell&&bar&&bar.parentElement!==shell)shell.appendChild(bar);

  const grid=document.querySelector('#view-settings .settings-grid');
  if(!grid)return;
  const card=selector=>grid.querySelector(selector)?.closest('.setting');
  const account=card('[data-i18n="accountSettings"]');
  const parental=card('#parent-toggle');
  const language=card('#language');
  account?.classList.add('settings-account','settings-priority');
  parental?.classList.add('settings-priority');
  language?.classList.add('settings-priority');
  // Move the actual cards, not clones or CSS order, so D-pad/tab order
  // follows the same arrangement as the visible settings.
  const ordered=[
    account,parental,language,card('#glass-appearance'),
    card('#preferred-player'),card('#profile-settings')||grid.querySelector('#profile-settings'),
    card('#order-content'),card('#refresh-cache'),card('[data-i18n="history"]'),
    card('#synopsis-source'),card('#online-endpoint'),grid.querySelector('#play-update-settings'),
    card('[data-i18n="aboutHeading"]')
  ].filter(el=>el&&el.parentElement===grid);
  const about=card('[data-i18n="aboutHeading"]');
  for(const el of [...new Set(ordered)])grid.appendChild(el);
  // Preserve any remaining feature panels and keep About last.
  const orderedSet=new Set(ordered);
  for(const el of [...grid.children])if(!orderedSet.has(el))grid.insertBefore(el,about||null);
  if(about)grid.appendChild(about);
})();
