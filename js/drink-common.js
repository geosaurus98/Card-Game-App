/* Shared screen helpers for the drinking games (DOM). Loaded with each drinking game.
 * - A one-time "legal drinking age" check (stored on the device).
 * - Playing cards drawn in HTML, players setup, sip wording, water-break reminder. */
window.CGR = window.CGR || {};

CGR.drink = (function () {
  const esc = CGR.esc;
  const P = CGR.party;
  const L = CGR.drinkLogic;

  /* ---------- Age check ---------- */
  const confirmed = () => !!CGR.store.get('drink-age', false);
  function gateHTML(title) {
    return `<div class="page-head dk-gate"><p class="dk-emoji" aria-hidden="true">🍻</p><h1 tabindex="-1">${esc(title)}</h1>
        <p>Drinking games are for adults of legal drinking age.</p>
        <ul class="dk-gate-list"><li>Every game counts <strong>sips</strong>, not shots.</li>
          <li>Any drink works — water, juice or alcohol-free beer count too.</li>
          <li>Nobody has to drink. Pass, swap for a dare, or sit a round out.</li></ul></div>
      <div class="action-bar"><div class="action-bar-inner">
        <a class="btn btn-secondary" href="#/party">Not now</a>
        <button type="button" class="btn" id="dk-age-ok">I’m of legal drinking age</button></div></div>`;
  }
  /* Render the gate if needed; returns true when the game may show. */
  function gate(root, title, onOk) {
    if (confirmed()) return true;
    root.innerHTML = gateHTML(title);
    P.focusHeading(root);
    root.querySelector('#dk-age-ok').addEventListener('click', () => { CGR.store.set('drink-age', true); onOk(); });
    return false;
  }

  /* ---------- Water-break reminder (every 20 minutes while a drinking game is open) ---------- */
  let waterTimer = null;
  function waterOn() { return CGR.store.get('drink-water', true) !== false; }
  function startWater() {
    stopWater();
    if (!waterOn()) return;
    let last = Number(CGR.store.get('drink-water-last', 0)) || Date.now();
    if (Date.now() - last > 3 * 3600 * 1000) last = Date.now();
    CGR.store.set('drink-water-last', last);
    waterTimer = setInterval(() => {
      if (Date.now() - Number(CGR.store.get('drink-water-last', Date.now())) >= 20 * 60 * 1000) {
        CGR.store.set('drink-water-last', Date.now());
        CGR.ui.toast('💧 Water break! Everyone have a glass of water.');
        P.vibrate([60, 60, 60]);
      }
    }, 30 * 1000);
  }
  function stopWater() { if (waterTimer) clearInterval(waterTimer); waterTimer = null; }
  const waterSwitch = () => `<label class="switch-row field"><input type="checkbox" role="switch" id="dk-water" ${waterOn() ? 'checked' : ''}>
    <span><strong>Water-break reminder</strong><br><span class="muted small">A friendly nudge every 20 minutes.</span></span></label>`;
  function wireWater(root) {
    const w = root.querySelector('#dk-water');
    if (w) w.addEventListener('change', () => { CGR.store.set('drink-water', w.checked); if (w.checked) startWater(); else stopWater(); });
  }

  /* ---------- Cards ---------- */
  function card(c, opts) {
    const o = opts || {};
    if (!c || o.back) return `<span class="pc back${o.small ? ' sm' : ''}${o.cls ? ' ' + o.cls : ''}" aria-label="face-down card"></span>`;
    const r = L.rankOf(c), s = L.SUIT_SYM[L.suitOf(c)];
    return `<span class="pc${L.isRed(c) ? ' red' : ''}${o.small ? ' sm' : ''}${o.cls ? ' ' + o.cls : ''}" aria-label="${esc(r)} of ${L.SUIT_NAME[L.suitOf(c)]}">
      <span class="pc-r">${esc(r)}</span><span class="pc-s">${s}</span></span>`;
  }
  const sips = (n) => `${n} sip${n === 1 ? '' : 's'}`;

  /* ---------- Players setup screen ----------
   * cfg: { key, title, intro, min, max, def, extra(s) → html, readExtra(form, s), onStart(s, names), names: false } */
  function loadPlayers(cfg) {
    const s = CGR.store.get(cfg.key, {});
    return Object.assign({}, s, { count: P.clamp(Math.round(s.count) || cfg.def, cfg.min, cfg.max), names: Array.isArray(s.names) ? s.names : [] });
  }
  function names(s) { return Array.from({ length: s.count }, (_, i) => (String(s.names[i] || '').trim() || 'Player ' + (i + 1)).slice(0, 20)); }
  function setup(root, cfg) {
    const s = loadPlayers(cfg);
    root.innerHTML = `<div class="page-head"><h1 tabindex="-1">${esc(cfg.title)}</h1><p class="muted">${cfg.intro}</p></div>
      <form id="dk-setup" onsubmit="return false">
        ${cfg.noPlayers ? '' : `<fieldset class="field"><legend>Players</legend>${P.stepperHTML('count', s.count, cfg.min, cfg.max, 'players')}</fieldset>
        <fieldset class="field"><legend>Names</legend>${P.namesHTML(s.count, s.names, (i) => 'Player ' + (i + 1))}</fieldset>`}
        ${cfg.extra ? cfg.extra(s) : ''}
        ${waterSwitch()}
      </form>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="dk-start">Start</button></div></div>`;
    const form = root.querySelector('#dk-setup');
    const read = () => { const x = loadPlayers(cfg); x.names = P.readNames(form, x.names); if (cfg.readExtra) cfg.readExtra(form, x); return x; };
    form.addEventListener('input', () => CGR.store.set(cfg.key, read()));
    form.addEventListener('change', () => CGR.store.set(cfg.key, read()));
    P.wireSteppers(root, (k, d) => { const x = read(); if (k === 'count') x.count = P.clamp(x.count + d, cfg.min, cfg.max); else if (cfg.step) cfg.step(x, k, d); CGR.store.set(cfg.key, x); setup(root, cfg); });
    wireWater(root);
    root.querySelector('#dk-start').addEventListener('click', () => { const x = read(); CGR.store.set(cfg.key, x); startWater(); cfg.onStart(x, names(x)); });
    P.focusHeading(root);
  }

  /* Standard view wrapper with age gate, water timer and leave confirmation. */
  function view(title, rootId, api) {
    return function () {
      return {
        title, back: '#/party',
        html: `<div id="${rootId}" class="imp dk"></div>`,
        onMount(v) {
          const root = v.querySelector('#' + rootId);
          const go = () => { api.mount(root); if (api.playing()) startWater(); };
          if (gate(root, title, go)) go();
        },
        onUnmount() { stopWater(); if (api.unmount) api.unmount(); },
        async confirmLeave() {
          if (!api.playing()) return true;
          const ok = await CGR.ui.confirm('Leave this game?', 'The current game will be lost.', 'Leave', true);
          if (ok) api.reset();
          return ok;
        }
      };
    };
  }

  /* Press-and-hold peek: shows contentHTML() only while held (touch, mouse or keyboard). */
  function peek(el, contentHTML) {
    const show = (e) => { if (e) e.preventDefault(); el.classList.add('on'); el.innerHTML = contentHTML(); };
    const hide = () => { el.classList.remove('on'); el.textContent = el.dataset.label; };
    el.addEventListener('pointerdown', (e) => { try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } show(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach((ev) => el.addEventListener(ev, hide));
    el.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) show(e); });
    el.addEventListener('keyup', hide);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /* Big "who drinks" banner. */
  const callout = (html, kind) => `<div class="dk-call ${kind || ''}" role="status">${html}</div>`;

  return { confirmed, gate, card, sips, setup, names, view, callout, peek, startWater, stopWater };
})();
