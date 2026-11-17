/* Categories Countdown (#/categories) — name something in the category before
 * your time runs out, then pass the phone. The clock gets shorter every lap.
 * Run out of time and you lose a life; last player standing wins.
 * Logic: party-more-logic.js. Categories: party-decks.js. Letters: party-logic.js. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const L = CGR.moreLogic;
  const PL = CGR.partyLogic;
  const P = CGR.party;
  const esc = CGR.esc;
  const KEY = 'categories';
  const STARTS = [6, 8, 10, 15];

  let game = null;
  let phase = 'setup'; // setup | ready | live | out | over
  let cat = null;      // { text, letter }
  let timer = null;
  let deck = null;
  let lastOut = null;
  let cleanup = [];

  function load() {
    const s = CGR.store.get(KEY, {});
    return {
      count: P.clamp(Math.round(s.count) || 4, 2, 12),
      names: Array.isArray(s.names) ? s.names : [],
      lives: P.clamp(Math.round(s.lives) || 3, 1, 5),
      start: STARTS.indexOf(Number(s.start)) !== -1 ? Number(s.start) : 10,
      letter: s.letter !== false
    };
  }
  const save = (s) => CGR.store.set(KEY, s);
  const stop = () => { if (timer) timer.stop(); timer = null; };

  function newCategory() {
    const list = CGR.partyDecks.categories;
    deck = deck || L.createDeck(list.length, Math.random);
    const text = list[L.drawCard(deck, Math.random)];
    cat = { text, letter: load().letter && !/^(Words|Things that rhyme)/.test(text) ? PL.randomLetter(Math.random) : null };
  }

  function livesHTML(p) {
    const d = [];
    for (let i = 0; i < game.lives; i++) d.push(`<i class="${i < p.lives ? 'on' : ''}"></i>`);
    return `<span class="nv-lives" aria-label="${p.lives} of ${game.lives} lives">${d.join('')}</span>`;
  }
  function tableHTML() {
    return `<ul class="pg-people cc">${game.players.map((p, i) => `<li><div class="pg-person${p.lives ? '' : ' out'}${i === game.current && phase !== 'over' ? ' current' : ''}">
      <span>${esc(p.name)}</span>${livesHTML(p)}</div></li>`).join('')}</ul>`;
  }
  function catHTML() {
    return `<p class="pg-lead">Name…</p><h2 class="cc-cat">${esc(cat.text)}</h2>${cat.letter ? `<p class="cc-letter">starting with <strong>${esc(cat.letter)}</strong></p>` : ''}`;
  }

  function setupHTML(s) {
    const starts = STARTS.map((t) => `<option value="${t}" ${s.start === t ? 'selected' : ''}>${t} seconds</option>`).join('');
    return `<div class="page-head"><h1 tabindex="-1">Categories Countdown</h1>
        <p class="muted">Name something in the category, tap the big button and pass the phone on — fast! No repeats. Every time play goes round, the clock gets a second shorter. Run out of time and you lose a life.</p></div>
      <form id="cc-setup" onsubmit="return false">
        <fieldset class="field"><legend>Players</legend>${P.stepperHTML('count', s.count, 2, 12, 'players')}</fieldset>
        <fieldset class="field"><legend>Names</legend>${P.namesHTML(s.count, s.names, (i) => 'Player ' + (i + 1))}</fieldset>
        <fieldset class="field"><legend>Lives each</legend>${P.stepperHTML('lives', s.lives, 1, 5, 'lives')}</fieldset>
        <label class="field"><span>Starting time per answer</span><select id="cc-start">${starts}</select></label>
        <label class="switch-row field"><input type="checkbox" id="cc-letter" role="switch" ${s.letter ? 'checked' : ''}>
          <span><strong>Add a starting letter</strong><br><span class="muted small">e.g. “Fruit — starting with B”. Harder! You can change the letter if it’s impossible.</span></span></label>
      </form>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="cc-go">Start game</button></div></div>`;
  }

  function readyHTML() {
    const p = game.players[game.current];
    return `<div class="pg-card">${catHTML()}</div>
      <p class="center">First up: <strong class="imp-who">${esc(p.name)}</strong> · ${L.turnSeconds(game)} seconds each</p>
      <div class="btn-row center">
        <button type="button" class="btn btn-ghost" id="cc-change">🔄 Different category</button>
        ${cat.letter ? '<button type="button" class="btn btn-ghost" id="cc-relet">🔤 New letter</button>' : ''}
      </div>
      ${tableHTML()}
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="cc-begin">Start the clock ▶</button></div></div>`;
  }

  function liveHTML() {
    const p = game.players[game.current];
    return `<div class="pg-card cc-live">${catHTML()}
        <p class="cc-who"><span class="imp-who">${esc(p.name)}</span></p>
        <div class="cc-time" id="cc-time" role="timer">${Math.ceil(timer ? timer.remaining : L.turnSeconds(game))}</div>
        <div class="cc-bar"><i id="cc-fill"></i></div>
        <p class="muted small">${game.answers} answer${game.answers === 1 ? '' : 's'} so far</p>
      </div>
      <div class="action-bar gg-actions"><div class="action-bar-inner">
        <button type="button" class="btn btn-danger" id="cc-bad">✗ Bad answer</button>
        <button type="button" class="btn cc-next" id="cc-next">✓ Next player</button></div></div>`;
  }

  function outHTML() {
    const p = lastOut;
    return `<div class="imp-pass"><h1 tabindex="-1">${lastOut.reason === 'time' ? 'Time’s up! ⏰' : 'Not allowed! ✗'}</h1>
        <p><strong class="imp-who">${esc(p.name)}</strong> ${p.lives ? `loses a life (${p.lives} left).` : 'is out!'}</p></div>
      ${tableHTML()}
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="cc-new">New category ▶</button></div></div>`;
  }

  function overHTML() {
    const w = L.winner(game);
    return `<div class="page-head"><h1 tabindex="-1">🏆 ${w ? esc(w.name) + ' wins!' : 'Game over'}</h1>
        <p class="muted">Last category: ${esc(cat.text)}${cat.letter ? ' (' + esc(cat.letter) + ')' : ''}</p></div>
      ${tableHTML()}
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" id="cc-menu">Back to menu</button>
        <button type="button" class="btn" id="cc-again">Play again</button></div></div>`;
  }

  function render(root) {
    root.innerHTML = ({ setup: () => setupHTML(load()), ready: readyHTML, live: liveHTML, out: outHTML, over: overHTML })[phase]();
    ({ setup: wireSetup, ready: wireReady, live: wireLive, out: wireOut, over: wireOver })[phase](root);
    P.focusHeading(root);
  }

  function startGame(root) {
    const s = load();
    const names = Array.from({ length: s.count }, (_, i) => (String(s.names[i] || '').trim() || 'Player ' + (i + 1)).slice(0, 20));
    game = L.createCategories({ players: names, lives: s.lives, startSeconds: s.start }, Math.random);
    newCategory();
    phase = 'ready';
    render(root);
  }

  function wireSetup(root) {
    const form = root.querySelector('#cc-setup');
    const read = () => {
      const s = load();
      s.names = P.readNames(form, s.names);
      s.start = Number(form.querySelector('#cc-start').value);
      s.letter = form.querySelector('#cc-letter').checked;
      return s;
    };
    form.addEventListener('input', () => save(read()));
    form.addEventListener('change', () => save(read()));
    P.wireSteppers(root, (k, d) => {
      const s = read();
      if (k === 'count') s.count = P.clamp(s.count + d, 2, 12); else s.lives = P.clamp(s.lives + d, 1, 5);
      save(s); render(root);
    });
    root.querySelector('#cc-go').addEventListener('click', () => { save(read()); startGame(root); });
  }

  function startClock(root) {
    stop();
    const total = L.turnSeconds(game);
    timer = P.countdown(total, (r) => {
      const el = document.getElementById('cc-time');
      if (el) el.textContent = Math.ceil(r);
      const f = document.getElementById('cc-fill');
      if (f) f.style.width = Math.max(0, (r / total) * 100) + '%';
      if (r > 0 && r <= 3 && Math.ceil(r) !== timer._lastBeep) { timer._lastBeep = Math.ceil(r); P.beep(1000, 70, 0.1); }
    }, () => lose(root, 'time'));
    timer.start();
  }

  function wireReady(root) {
    root.querySelector('#cc-change').addEventListener('click', () => { newCategory(); render(root); });
    const re = root.querySelector('#cc-relet');
    if (re) re.addEventListener('click', () => { cat.letter = PL.randomLetter(Math.random); render(root); });
    root.querySelector('#cc-begin').addEventListener('click', () => {
      P.unlockAudio();
      phase = 'live';
      render(root);
      startClock(root);
    });
  }

  function lose(root, reason) {
    stop();
    P.beep(220, 500, 0.25, 'square'); P.vibrate([250, 80, 250]);
    const p = game.players[game.current];
    L.timedOut(game);
    lastOut = { name: p.name, lives: p.lives, reason };
    phase = game.over ? 'over' : 'out';
    render(root);
  }

  function wireLive(root) {
    root.querySelector('#cc-next').addEventListener('click', () => {
      L.answered(game);
      P.beep(1300, 60, 0.08);
      render(root);
      startClock(root);
    });
    root.querySelector('#cc-bad').addEventListener('click', () => lose(root, 'bad'));
  }

  function wireOut(root) {
    root.querySelector('#cc-new').addEventListener('click', () => { newCategory(); phase = 'ready'; render(root); });
  }

  function wireOver(root) {
    root.querySelector('#cc-again').addEventListener('click', () => startGame(root));
    root.querySelector('#cc-menu').addEventListener('click', () => { game = null; phase = 'setup'; location.hash = '#/party'; });
  }

  CGR.views.categories = function () {
    return {
      title: 'Categories Countdown', back: '#/party',
      html: '<div id="cc-root" class="imp"></div>',
      onMount(v) {
        const root = v.querySelector('#cc-root');
        if (phase === 'live') phase = 'ready'; // the clock never runs while you're away
        render(root);
        cleanup = [P.onBackground(() => { if (phase === 'live') { stop(); phase = 'ready'; render(root); } })];
      },
      onUnmount() { stop(); if (phase === 'live') phase = 'ready'; cleanup.forEach((f) => f()); cleanup = []; },
      async confirmLeave() {
        if (phase === 'setup' || phase === 'over') return true;
        const ok = await CGR.ui.confirm('Quit this game?', 'Everyone’s lives will be reset.', 'Quit', true);
        if (ok) { stop(); game = null; phase = 'setup'; }
        return ok;
      }
    };
  };
})();
