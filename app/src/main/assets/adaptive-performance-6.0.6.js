/* ASPLAYER 6.0.6: UI-only adaptive performance.
 * No player configuration, network requests, account state or D-pad handlers.
 */
(() => {
  'use strict';
  const STORAGE_KEY = 'asplayer:performance:ui:606';
  const valid = new Set(['auto', 'efficient', 'balanced', 'complete']);
  const tiers = new Set(['efficient', 'balanced', 'complete']);
  const bridge = window.ASPLAYER || {};
  const labels = {
    en: {
      title: 'Device performance',
      hint: 'Automatically adapts visual effects to available resources. Does not change the video player, buffer, remote-control navigation or streaming quality.',
      setting: 'Performance profile',
      modes: {auto:'Automatic (recommended)',efficient:'Efficient',balanced:'Balanced',complete:'Complete'},
      names: {efficient:'Efficient',balanced:'Balanced',complete:'Complete'},
      effective: 'Active visual profile: '
    },
    es: {
      title: 'Rendimiento del dispositivo',
      hint: 'Adapta los efectos visuales a los recursos disponibles. No cambia el reproductor, el búfer, la cruceta ni la calidad del vídeo.',
      setting: 'Perfil de rendimiento',
      modes: {auto:'Automático (recomendado)',efficient:'Eficiente',balanced:'Equilibrado',complete:'Completo'},
      names: {efficient:'Eficiente',balanced:'Equilibrado',complete:'Completo'},
      effective: 'Perfil visual activo: '
    }
  };
  let preference = 'auto';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if(valid.has(saved)) preference = saved;
  } catch (_) { /* Storage unavailable; automatic mode is safe. */ }

  function readTier() {
    try {
      const value = bridge.getPerformanceTier?.();
      if(tiers.has(value)) return value;
    } catch (_) { /* Browser test or older Android bridge. */ }
    return 'balanced';
  }
  let automaticTier = readTier();
  const grid = document.querySelector('#view-settings .settings-grid');
  if (!grid) return;
  const section = document.createElement('div');
  section.className = 'box setting';
  section.id = 'asplayer-performance-setting';
  const title = document.createElement('h3');
  const hint = document.createElement('p');
  const label = document.createElement('label');
  const picker = document.createElement('select');
  picker.id = 'asplayer-performance-profile';
  label.htmlFor = picker.id;
  const status = document.createElement('p');
  status.className = 'tiny';
  status.id = 'asplayer-performance-status';
  status.setAttribute('role', 'status');
  for (const id of ['auto','efficient','balanced','complete']) {
    const option = document.createElement('option');
    option.value = id;
    picker.append(option);
  }
  section.append(title,hint,label,picker,status);
  const playbackSetting = document.getElementById('preferred-player')?.closest('.setting');
  if (playbackSetting?.parentNode === grid) grid.insertBefore(section,playbackSetting);
  else grid.append(section);

  // Keep only non-interactive decorative surfaces cheaper to composite.
  // Never remove :focus visuals, progress spinners, video surfaces or cover art.
  const style = document.createElement('style');
  style.id = 'asplayer-performance-css';
  style.textContent = [
    'body[data-performance-effective="efficient"] .hero,',
    'body[data-performance-effective="efficient"] .contact-priority,',
    'body[data-performance-effective="efficient"] .account-summary,',
    'body[data-performance-effective="efficient"] #app-shell .topbar,',
    'body[data-performance-effective="balanced"] .hero {',
    '  -webkit-backdrop-filter:none!important;backdrop-filter:none!important;',
    '}',
    'body[data-performance-effective="efficient"] .hero,',
    'body[data-performance-effective="efficient"] .contact-priority,',
    'body[data-performance-effective="efficient"] .account-summary {',
    '  box-shadow:none!important;',
    '}'
  ].join('\n');
  document.head.append(style);

  const language = () => (typeof lang !== 'undefined' && lang === 'es') ? 'es' : 'en';
  function localize() {
    const l = labels[language()];
    title.textContent = l.title;
    hint.textContent = l.hint;
    label.textContent = l.setting;
    for(const option of picker.options) option.textContent = l.modes[option.value];
    apply();
  }
  function apply() {
    const effective = preference === 'auto' ? automaticTier : preference;
    document.body.dataset.performanceMode = preference;
    document.body.dataset.performanceEffective = effective;
    picker.value = preference;
    status.textContent = labels[language()].effective + labels[language()].names[effective];
  }
  picker.addEventListener('change', () => {
    if (!valid.has(picker.value)) return;
    preference = picker.value;
    try {localStorage.setItem(STORAGE_KEY,preference);} catch (_) {}
    apply();
  });
  window.ASPLAYER_PERFORMANCE_UPDATE = tier => {
    if (!tiers.has(tier)) return;
    automaticTier = tier;
    apply();
  };
  // Existing localization flow is extended without adding navigation handlers.
  if (typeof languageUI === 'function') {
    const previous = languageUI;
    languageUI = function() {
      const result = previous.apply(this,arguments);
      localize();
      return result;
    };
  }
  localize();
})();