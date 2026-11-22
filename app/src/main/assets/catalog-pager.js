/* 5.9.18 — progressive catalog pages with a bounded, reversible DOM window.
 * Provider metadata stays in its existing cache; only rendered cards are paged.
 */
(() => {
  'use strict';
  const PAGE = 50, AHEAD = 5, MAX_ROWS = 100;
  let state = null, frame = 0;

  function current() {
    return state && state.top.parentNode === state.holder &&
      state.bottom.parentNode === state.holder &&
      state.context() === state.key &&
      !state.holder.closest('.hidden,[inert]');
  }
  function stride(s) {
    return parseFloat(getComputedStyle(s.holder).getPropertyValue('--pager-stride')) || 110;
  }
  function indexOf(el) {
    const row = el && el.closest('[data-pager-index]');
    return row ? Number(row.dataset.pagerIndex) : -1;
  }
  function listOffset(s) {
    const h = s.top.getBoundingClientRect(), p = s.pane.getBoundingClientRect();
    return h.top - p.top + s.pane.scrollTop - s.pane.clientTop;
  }
  function viewportIndex(s) {
    return Math.max(0, Math.floor((s.pane.scrollTop - listOffset(s)) / stride(s)));
  }
  function spacer() {
    const el = document.createElement('div');
    el.className = 'asplayer-page-spacer';
    el.setAttribute('aria-hidden', 'true');
    return el;
  }
  function makeRow(s, index, html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const row = template.content.firstElementChild;
    row.dataset.pagerIndex = String(index);
    row.classList.add('asplayer-page-row');
    return row;
  }
  function renderWindow(s, index, refresh = false) {
    if (!s.rows.length) return;
    index = Math.max(0, Math.min(s.rows.length - 1, index));
    // At most one new logical page is exposed per navigation/scroll event.
    if (index >= s.loaded - AHEAD && s.loaded < s.rows.length)
      s.loaded = Math.min(s.rows.length, s.loaded + PAGE);
    const start = Math.max(0, Math.floor((index + AHEAD) / PAGE) - 1) * PAGE;
    const end = Math.min(s.loaded, start + MAX_ROWS);
    const rowStride = stride(s);
    if (!refresh && s.start === start && s.end === end && s.rowStride === rowStride) return;
    const focused = document.activeElement;
    const focusIndex = indexOf(focused);
    const focusStar = focused?.matches('.fav-star');
    const focusKey = s.holder.contains(focused) && focusIndex >= 0
      ? s.keys[focusIndex] : null;
    for (const [i, entry] of s.nodes) {
      if (i < start || i >= end) {
        entry.node.remove();
        s.nodes.delete(i);
      }
    }
    // Insert only missing/changed rows. Existing focused buttons stay connected.
    let next = s.bottom;
    for (let i = end - 1; i >= start; --i) {
      let entry = s.nodes.get(i);
      const html = (!entry || refresh) ? s.render(s.rows[i], i) : entry.html;
      if (!entry || entry.html !== html) {
        const node = makeRow(s, i, html);
        if (entry) entry.node.replaceWith(node);
        else s.holder.insertBefore(node, next);
        entry = { node, html };
        s.nodes.set(i, entry);
      }
      next = entry.node;
    }
    s.top.style.height = start * rowStride + 'px';
    s.bottom.style.height = (s.loaded - end) * rowStride + 'px';
    s.rowStride = rowStride;
    s.start = start;
    s.end = end;
    const progress = document.getElementById('catalog-page-progress');
    if (progress) {
      progress.textContent = s.loaded + ' / ' + s.rows.length;
      progress.title = document.documentElement.lang === 'es'
        ? 'Elementos disponibles para navegar' : 'Items available to browse';
      progress.hidden = s.rows.length <= PAGE;
    }
    if (focusKey !== null && !focused.isConnected) {
      const i = s.keys.indexOf(focusKey);
      const node = s.nodes.get(i)?.node;
      const target = focusStar ? node?.querySelector('.fav-star') : tile(node);
      target?.focus({preventScroll:true});
    }
  }
  function tile(node) {
    return node?.matches('button[data-item]') ? node : node?.querySelector('button[data-item]');
  }
  function syncDensity(s) {
    const old = s.rowStride, next = stride(s);
    if (!old || old === next) return;
    const relative = s.pane.scrollTop - listOffset(s);
    const anchor = Math.max(0, relative / old);
    const focused = document.activeElement;
    const focusIndex = s.holder.contains(focused) ? indexOf(focused) : -1;
    renderWindow(s, focusIndex >= 0 ? focusIndex : Math.floor(anchor));
    if (relative > 0) s.pane.scrollTop = listOffset(s) + anchor * next;
    if (focusIndex >= 0 && focused.isConnected) {
      const item = focused.getBoundingClientRect(), pane = s.pane.getBoundingClientRect();
      if (item.top < pane.top) s.pane.scrollTop += item.top - pane.top;
      else if (item.bottom > pane.bottom) s.pane.scrollTop += item.bottom - pane.bottom;
    }
  }
  window.addEventListener('resize', () => {
    if (current() && state.rows.length) syncDensity(state);
  });
  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!current() || !state.rows.length) return;
      const s = state;
      syncDensity(s);
      const first = viewportIndex(s);
      const last = first + Math.ceil(s.pane.clientHeight / stride(s));
      // A queued scroll frame may arrive immediately after DPAD advances into
      // the next virtual window. Never evict the currently focused TV item.
      const focused = document.activeElement;
      const remoteIndex = document.body.classList.contains('asplayer-tv-dpad') &&
        s.holder.contains(focused) ? indexOf(focused) : -1;
      // Use the viewport's end to prefetch the next block, but do not retain
      // unbounded image nodes when scrolling back through a large category.
      renderWindow(s, remoteIndex >= 0 ? remoteIndex : Math.min(s.loaded - 1, last));
    });
  }
  function mount(holder, rows, render, options) {
    const pane = holder.closest('#tv-content-pane');
    if (!pane) return false;
    const key = options.context();
    const same = state && state.holder === holder && state.key === key &&
      state.top.parentNode === holder && state.bottom.parentNode === holder;
    const focused = document.activeElement;
    const focusedIndex = same && holder.contains(focused) ? indexOf(focused) : -1;
    const focusedKey = focusedIndex >= 0 ? state.keys[focusedIndex] : null;
    const star = focused?.matches('.fav-star');
    const anchor = same ? viewportIndex(state) : 0;
    const anchorKey = same ? state.keys[anchor] : null;
    const offset = same ? pane.scrollTop - listOffset(state) - anchor * stride(state) : 0;
    const keys = rows.map(options.identity);
    if (!same) {
      if (state) state.pane.removeEventListener('scroll', onScroll);
      const top = spacer(), bottom = spacer();
      holder.replaceChildren(top, bottom);
      holder.classList.add('asplayer-paged');
      state = { holder, pane, top, bottom, key, nodes:new Map(), start:-1, end:-1,
        loaded:Math.min(PAGE, rows.length) };
      pane.addEventListener('scroll', onScroll, {passive:true});
      pane.scrollTop = 0;
    }
    const s = state;
    Object.assign(s, { rows, keys, render, context:options.context });
    if (!rows.length) {
      s.nodes.clear();
      holder.innerHTML = options.empty;
      holder.classList.remove('asplayer-paged');
      const progress = document.getElementById('catalog-page-progress');
      if (progress) progress.hidden = true;
      return true;
    }
    let target = focusedKey === null ? -1 : keys.indexOf(focusedKey);
    if (target < 0 && focusedIndex >= 0) target = Math.min(focusedIndex, rows.length - 1);
    const foundAnchor = anchorKey == null ? -1 : keys.indexOf(anchorKey);
    const nextAnchor = foundAnchor < 0 ? Math.min(anchor, rows.length - 1) : foundAnchor;
    const at = target >= 0 ? target : nextAnchor;
    s.loaded = Math.min(rows.length, Math.max(s.loaded, Math.ceil((at + 1) / PAGE) * PAGE));
    renderWindow(s, at, true);
    if (same && foundAnchor >= 0 && nextAnchor !== anchor)
      pane.scrollTop = listOffset(s) + nextAnchor * stride(s) + offset;
    if (target >= 0) {
      const node = s.nodes.get(target)?.node;
      const nextFocus = star ? node?.querySelector('.fav-star') : tile(node);
      if (nextFocus && nextFocus !== focused) nextFocus.focus({preventScroll:true});
    }
    return true;
  }
  function at(index, star = false) {
    if (!current() || index < 0 || index >= state.rows.length) return null;
    const s = state;
    syncDensity(s);
    // DPAD movement crosses the window synchronously, preserving logical index.
    if (index >= s.loaded) s.loaded = Math.min(s.rows.length, Math.ceil((index + 1) / PAGE) * PAGE);
    renderWindow(s, index);
    const node = s.nodes.get(index)?.node;
    return (star && node?.querySelector('.fav-star')) || tile(node);
  }
  window.ASPLAYER_PAGER = { mount, at, active:()=>!!current() };
  const progress = document.createElement('span');
  progress.id = 'catalog-page-progress';
  progress.setAttribute('role', 'status');
  progress.setAttribute('aria-live', 'polite');
  progress.hidden = true;
  document.getElementById('tv-results-bar')?.append(progress);
  const style = document.createElement('style');
  style.textContent = `
    #loadmore{display:none!important}
    #catalog-page-progress{margin-left:auto;font-size:11px;color:#b9d7e9;white-space:nowrap}
    #tv-content-pane:not(:has(#cards.asplayer-paged .asplayer-page-row)) #catalog-page-progress{display:none}
    body #tv-content-pane{overflow-anchor:none}
    body #cards.asplayer-paged{--pager-stride:100px;--pager-gap:7px;gap:0}
    body.asplayer-tv-dpad #cards.asplayer-paged{--pager-stride:110px;--pager-gap:9px;gap:0}
    #cards .asplayer-page-spacer{flex:none;width:100%;pointer-events:none}
    body #cards.asplayer-paged > .asplayer-page-row{flex:none;height:calc(var(--pager-stride) - var(--pager-gap));margin:0 0 var(--pager-gap)}
    body #cards.asplayer-paged .asplayer-page-row .tile{height:100%;min-height:0}
    body #cards.asplayer-paged .caption strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    body #cards.asplayer-paged .caption{overflow:hidden}
  `;
  document.head.appendChild(style);
})();
