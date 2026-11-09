/* Shared UI helpers for party games (DOM). Loaded on demand with each party screen. */
window.CGR = window.CGR || {};

CGR.party = (function () {
  const esc = CGR.esc;

  /* ---- Form fragments ---- */
  function stepperHTML(key, value, min, max, label) {
    return `<div class="stepper">
      <button type="button" class="btn btn-secondary" data-step="${key}" data-d="-1" aria-label="Fewer ${esc(label)}" ${value <= min ? 'disabled' : ''}>−</button>
      <output aria-live="polite">${value}</output>
      <button type="button" class="btn btn-secondary" data-step="${key}" data-d="1" aria-label="More ${esc(label)}" ${value >= max ? 'disabled' : ''}>+</button>
    </div>`;
  }

  /* Numbered name inputs (reuses the Impostor setup styling). */
  function namesHTML(count, names, placeholder, maxLength) {
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(`<label class="imp-name"><span class="visually-hidden">${esc(placeholder(i))}</span>
        <span class="imp-name-num" aria-hidden="true">${i + 1}</span>
        <input type="text" data-name="${i}" value="${esc((names || [])[i] || '')}" placeholder="${esc(placeholder(i))}"
          maxlength="${maxLength || 20}" autocomplete="off" autocapitalize="words" enterkeyhint="next"></label>`);
    }
    return `<div class="imp-names">${rows.join('')}</div>`;
  }

  function readNames(root, existing) {
    const names = (existing || []).slice();
    root.querySelectorAll('[data-name]').forEach((inp) => { names[Number(inp.dataset.name)] = inp.value; });
    return names;
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  /* ---- Hold-to-reveal card ----
   * While pressed (touch, mouse, or Space/Enter), the card shows contentHTML();
   * the content is removed from the page the moment it is released. */
  function holdToReveal(card, contentHTML, onFirstReveal, variantClass) {
    const text = card.querySelector('.imp-card-text');
    let shown = false;
    let revealedOnce = false;
    function show() {
      if (shown) return;
      shown = true;
      card.classList.add('revealed');
      if (variantClass) card.classList.toggle(variantClass(), true);
      text.innerHTML = contentHTML();
      if (!revealedOnce) { revealedOnce = true; if (onFirstReveal) onFirstReveal(); }
    }
    function hide() {
      shown = false;
      card.className = card.className.split(' ').filter((c) => c === 'imp-card').join(' ');
      text.textContent = 'Hold to reveal';
    }
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      show();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => card.addEventListener(ev, hide));
    card.addEventListener('contextmenu', (e) => e.preventDefault());
    card.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); show(); } });
    card.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hide(); } });
    card.addEventListener('blur', hide);
    card.addEventListener('click', (e) => e.preventDefault());
    return { hide };
  }

  /* Call fn when the app is backgrounded, the screen locks or the window loses focus.
   * Returns a function that removes the listeners. */
  function onBackground(fn) {
    const vis = () => { if (document.visibilityState === 'hidden') fn(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', fn);
    window.addEventListener('blur', fn);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pagehide', fn);
      window.removeEventListener('blur', fn);
    };
  }

  /* ---- Wall-clock countdown (stays correct if the tab is throttled) ---- */
  function countdown(seconds, onTick, onEnd) {
    let remaining = seconds;
    let endAt = 0;
    let id = null;
    const api = {
      get remaining() { return id ? Math.max(0, (endAt - Date.now()) / 1000) : remaining; },
      get running() { return !!id; },
      start() {
        if (id || remaining <= 0) return;
        endAt = Date.now() + remaining * 1000;
        id = setInterval(tick, 200);
        tick();
      },
      pause() { if (id) { remaining = api.remaining; clearInterval(id); id = null; } },
      stop() { if (id) clearInterval(id); id = null; },
      set(sec) { api.stop(); remaining = sec; }
    };
    function tick() {
      const r = api.remaining;
      if (onTick) onTick(r);
      if (r <= 0) { api.stop(); remaining = 0; if (onEnd) onEnd(); }
    }
    return api;
  }

  /* ---- Sound and vibration (offline, generated) ---- */
  let audio = null;
  function unlockAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) { audio = null; }
  }
  function beep(freq, ms, volume, type) {
    if (!audio) return;
    try {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq || 880;
      g.gain.value = volume == null ? 0.12 : volume;
      o.connect(g); g.connect(audio.destination);
      const t = audio.currentTime;
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (ms || 90) / 1000);
      o.start(t); o.stop(t + (ms || 90) / 1000 + 0.02);
    } catch (e) { /* ignore */ }
  }
  function vibrate(pattern) { if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } } }

  function fmt(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  /* Wire +/- steppers: on click, call change(key, delta). */
  function wireSteppers(root, change) {
    root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const sel = `[data-step="${b.dataset.step}"][data-d="${b.dataset.d}"]`;
      change(b.dataset.step, Number(b.dataset.d));
      const again = root.querySelector(sel);
      if (again && !again.disabled) again.focus({ preventScroll: true });
    }));
  }

  function focusHeading(root) {
    window.scrollTo(0, 0);
    const h1 = root.querySelector('h1');
    if (h1) h1.focus({ preventScroll: true });
  }

  return { stepperHTML, namesHTML, readNames, clamp, holdToReveal, onBackground, countdown, unlockAudio, beep, vibrate, fmt, wireSteppers, focusHeading };
})();
