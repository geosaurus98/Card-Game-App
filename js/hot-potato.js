/* Hot Potato — screens (route: #/hot-potato). Logic: party-logic.js; prompts: party-words.js.
 * A hidden random fuse ticks while players answer the prompt and pass the phone on.
 * Whoever is holding it when it goes off loses the round. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const PL = CGR.partyLogic;
  const P = CGR.party;
  const esc = CGR.esc;
  const KEY = 'hot-potato';
  const MIN = 2;
  const MAX = 16;

  let state = null; // { prompt, phase: 'ready'|'live'|'boom'|'scores', losses: [..], players: [..] }
  let fuse = null;
  let tickTimer = null;

  function load() {
    const s = CGR.store.get(KEY, {});
    return {
      playerCount: P.clamp(Math.round(s.playerCount) || 4, MIN, MAX),
      names: Array.isArray(s.names) ? s.names : [],
      length: PL.FUSE[s.length] ? s.length : 'medium',
      letter: !!s.letter,
      sound: s.sound !== false,
      recent: Array.isArray(s.recent) ? s.recent.slice(-30) : []
    };
  }
  const save = (s) => CGR.store.set(KEY, s);
  const playerNames = (s) => Array.from({ length: s.playerCount }, (_, i) => (String(s.names[i] || '').trim() || 'Player ' + (i + 1)).slice(0, 20));

  function stopFuse() {
    if (fuse) fuse.stop();
    fuse = null;
    if (tickTimer) clearTimeout(tickTimer);
    tickTimer = null;
  }

  function newPrompt(s) {
    const p = PL.makePrompt(CGR.partyWords.prompts, Math.random, s.recent, s.letter);
    s.recent = s.recent.concat(p.base).slice(-30);
    save(s);
    return p.text;
  }

  /* ---------------- HTML ---------------- */
  function setupHTML(s) {
    const len = (v, label) => `<label><input type="radio" name="hp-len" value="${v}" ${s.length === v ? 'checked' : ''}><span>${label}</span></label>`;
    return `<div class="page-head"><h1 tabindex="-1">Hot Potato</h1>
        <p class="muted">Answer the prompt, then pass the phone on — fast! A hidden fuse is ticking. Whoever’s holding the phone when it goes off loses the round.</p></div>
      <form id="hp-setup" onsubmit="return false">
        <fieldset class="field"><legend>Players</legend>${P.stepperHTML('playerCount', s.playerCount, MIN, MAX, 'players')}</fieldset>
        <fieldset class="field"><legend>Names <span class="muted small">(optional, for keeping score)</span></legend>
          ${P.namesHTML(s.playerCount, s.names, (i) => 'Player ' + (i + 1))}</fieldset>
        <fieldset class="field"><legend>Fuse length</legend>
          <div class="segmented">${len('short', 'Short')}${len('medium', 'Medium')}${len('long', 'Long')}</div>
          <p class="muted small">Short is 10–25 seconds, medium 20–45, long 35–75. Nobody knows exactly when it will go off.</p></fieldset>
        <label class="switch-row field"><input type="checkbox" id="hp-letter" role="switch" ${s.letter ? 'checked' : ''}>
          <span><strong>Add a starting letter</strong><br><span class="muted small">e.g. “Name an animal — starting with B”. Harder!</span></span></label>
        <label class="switch-row field"><input type="checkbox" id="hp-sound" role="switch" ${s.sound ? 'checked' : ''}>
          <span><strong>Ticking sound</strong><br><span class="muted small">Turn your volume up.</span></span></label>
      </form>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="hp-start">Start game</button></div></div>`;
  }

  function readyHTML() {
    return `<div class="page-head"><p class="muted">Round ${state.round}</p><h1 tabindex="-1">Get ready…</h1></div>
      <div class="hp-prompt card">${esc(state.prompt)}</div>
      <p class="muted">The first player answers, then passes the phone to the left. Each answer must be different!</p>
      <div class="btn-row"><button type="button" class="btn btn-secondary" id="hp-new">🔄 Different prompt</button></div>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" id="hp-scores-btn">Scores</button>
        <button type="button" class="btn" id="hp-go">Light the fuse 🔥</button></div></div>`;
  }

  function liveHTML() {
    return `<div class="hp-live" id="hp-live">
        <p class="hp-fuse" aria-hidden="true">🔥</p>
        <h1 tabindex="-1" class="hp-prompt-big">${esc(state.prompt)}</h1>
        <p class="hp-pass">Answer, then <strong>pass it on!</strong></p>
      </div>`;
  }

  function boomHTML() {
    const btns = state.players.map((n, i) => `<button type="button" class="btn btn-secondary" data-loser="${i}">${esc(n)}</button>`).join('');
    return `<div class="hp-boom"><p class="hp-bang" aria-hidden="true">💥</p><h1 tabindex="-1">BOOM!</h1>
        <p>Who was holding the phone?</p></div>
      <div class="hp-losers">${btns}</div>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn btn-secondary" id="hp-nobody">Skip — don’t record</button></div></div>`;
  }

  function scoresHTML() {
    const rows = state.players.map((n, i) => ({ n, l: state.losses[i] })).sort((a, b) => a.l - b.l);
    return `<div class="page-head"><h1 tabindex="-1">Scores</h1><p class="muted">Fewest explosions is winning.</p></div>
      <ol class="hp-scores">${rows.map((r) => `<li><span>${esc(r.n)}</span><span>${'💥'.repeat(Math.min(r.l, 10))}${r.l > 10 ? ' ×' + r.l : ''}${r.l ? '' : '<span class="muted">—</span>'}</span></li>`).join('')}</ol>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" id="hp-reset">New game</button>
        <button type="button" class="btn" id="hp-next">Next round</button></div></div>`;
  }

  /* ---------------- Behaviour ---------------- */
  function render(root) {
    stopFuse();
    const phase = state ? state.phase : 'setup';
    root.innerHTML = phase === 'setup' ? setupHTML(load())
      : phase === 'ready' ? readyHTML()
      : phase === 'live' ? liveHTML()
      : phase === 'boom' ? boomHTML() : scoresHTML();
    ({ setup: wireSetup, ready: wireReady, live: wireLive, boom: wireBoom, scores: wireScores })[phase](root);
    P.focusHeading(root);
  }

  function newRound(s) {
    state.round += 1;
    state.prompt = newPrompt(s);
    state.phase = 'ready';
  }

  function wireSetup(root) {
    const form = root.querySelector('#hp-setup');
    const read = () => {
      const s = load();
      s.names = P.readNames(form, s.names);
      const l = form.querySelector('input[name="hp-len"]:checked');
      s.length = l ? l.value : 'medium';
      s.letter = form.querySelector('#hp-letter').checked;
      s.sound = form.querySelector('#hp-sound').checked;
      return s;
    };
    form.addEventListener('input', () => save(read()));
    form.addEventListener('change', () => save(read()));
    P.wireSteppers(root, (key, d) => {
      const s = read();
      s.playerCount = P.clamp(s.playerCount + d, MIN, MAX);
      save(s);
      render(root);
    });
    root.querySelector('#hp-start').addEventListener('click', () => {
      const s = read();
      save(s);
      state = { players: playerNames(s), losses: new Array(s.playerCount).fill(0), round: 0, phase: 'ready' };
      newRound(s);
      render(root);
    });
  }

  function wireReady(root) {
    root.querySelector('#hp-new').addEventListener('click', () => {
      state.prompt = newPrompt(load());
      root.querySelector('.hp-prompt').textContent = state.prompt;
    });
    root.querySelector('#hp-scores-btn').addEventListener('click', () => { state.phase = 'scores'; render(root); });
    root.querySelector('#hp-go').addEventListener('click', () => {
      P.unlockAudio(); // must happen inside the tap
      state.phase = 'live';
      render(root);
    });
  }

  function wireLive(root) {
    const s = load();
    const total = PL.fuseSeconds(s.length, Math.random);
    // Ticks speed up a little as the fuse burns down, but never reveal the exact time.
    const tick = () => {
      if (!fuse) return;
      const frac = fuse.remaining / total;
      if (s.sound) P.beep(frac < 0.25 ? 1200 : 900, 60, 0.1, 'square');
      root.querySelector('#hp-live').classList.toggle('flash');
      tickTimer = setTimeout(tick, frac < 0.25 ? 250 : frac < 0.5 ? 450 : 700);
    };
    fuse = P.countdown(total, null, () => {
      if (s.sound) { P.beep(150, 600, 0.3, 'sawtooth'); P.beep(90, 800, 0.3, 'square'); }
      P.vibrate([400, 100, 400]);
      CGR.ui.announce('Boom!');
      state.phase = 'boom';
      render(root);
    });
    fuse.start();
    tick();
  }

  function wireBoom(root) {
    root.querySelectorAll('[data-loser]').forEach((b) => b.addEventListener('click', () => {
      state.losses[Number(b.dataset.loser)] += 1;
      state.phase = 'scores';
      render(root);
    }));
    root.querySelector('#hp-nobody').addEventListener('click', () => { state.phase = 'scores'; render(root); });
  }

  function wireScores(root) {
    root.querySelector('#hp-next').addEventListener('click', () => { newRound(load()); render(root); });
    root.querySelector('#hp-reset').addEventListener('click', async () => {
      if (await CGR.ui.confirm('Start a new game?', 'Scores will be cleared.', 'New game', true)) { state = null; render(root); }
    });
  }

  CGR.views['hot-potato'] = function () {
    if (state && state.phase === 'live') state.phase = 'ready'; // never resume a burning fuse
    return {
      title: 'Hot Potato',
      back: '#/party',
      html: '<div id="hp-root" class="imp"></div>',
      onMount(view) { render(view.querySelector('#hp-root')); },
      onUnmount() { stopFuse(); },
      async confirmLeave() {
        if (!state) return true;
        const ok = await CGR.ui.confirm('Quit this game?', 'Scores will be lost.', 'Quit', true);
        if (ok) state = null;
        return ok;
      }
    };
  };
})();
