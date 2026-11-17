/* Forehead Guess (#/forehead) — one player holds the phone on their forehead,
 * screen facing out; everyone else gives clues. Nod down = got it, tip up = pass
 * (motion sensor), or tap the screen. Turn engine: guess-logic.js (one 'team' per
 * player); tilt reading: party-more-logic.js. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const G = CGR.guessLogic;
  const L = CGR.moreLogic;
  const P = CGR.party;
  const esc = CGR.esc;
  const KEY = 'forehead';
  const TIMES = [30, 45, 60, 90, 120];
  const MAX = 10;

  function decks() {
    const iw = CGR.impostorWords;
    const d = {};
    d['Famous people'] = CGR.partyDecks.famous;
    d['Characters'] = CGR.partyDecks.characters;
    ['Animals', 'Food', 'Jobs', 'Movies', 'Places', 'Sports', 'Countries', 'Household Items', 'Transport', 'Fantasy & Myth'].forEach((c) => { if (iw[c]) d[c] = iw[c]; });
    d['Actions'] = CGR.partyWords.actions;
    d['Songs'] = [].concat(...Object.values(CGR.partyDecks.songs).map((list) => list.map((s) => s[0]))).filter((t) => t.length <= 40);
    return d;
  }

  function load() {
    const s = CGR.store.get(KEY, {});
    const names = Object.keys(decks());
    return {
      playerCount: P.clamp(Math.round(s.playerCount) || 3, 1, MAX),
      names: Array.isArray(s.names) ? s.names : [],
      seconds: TIMES.indexOf(Number(s.seconds)) !== -1 ? Number(s.seconds) : 60,
      rounds: P.clamp(Math.round(s.rounds) || 1, 1, 5),
      decks: Array.isArray(s.decks) && s.decks.some((x) => names.indexOf(x) !== -1) ? s.decks.filter((x) => names.indexOf(x) !== -1) : ['Famous people', 'Characters', 'Animals'].filter((x) => names.indexOf(x) !== -1),
      tilt: s.tilt !== false,
      flipTilt: !!s.flipTilt,
      turn: s.turn === 'left' ? 'left' : 'right'
    };
  }
  const save = (s) => CGR.store.set(KEY, s);

  let game = null;
  let phase = 'setup'; // setup | intro | ready | live | turnEnd | over
  let timer = null;
  let readyTimer = null;
  let motion = null;     // detach function for devicemotion
  let armed = false;
  let sensorSeen = false;
  let cleanup = [];

  const player = () => game.teams[game.teamIndex];
  function stopAll() {
    if (timer) timer.stop();
    timer = null;
    if (readyTimer) clearInterval(readyTimer);
    readyTimer = null;
    if (motion) motion();
    motion = null;
  }

  /* iOS asks for permission (needs a tap); others just work. */
  function askMotion() {
    const DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      return DME.requestPermission().then((r) => r === 'granted').catch(() => false);
    }
    return Promise.resolve(!!DME);
  }

  function scoresHTML() {
    return `<ul class="gg-scores">${game.teams.map((t, i) => `<li class="${i === game.teamIndex && phase !== 'over' ? 'current' : ''}">
      <span>${esc(t.name)}</span><strong>${t.score}</strong></li>`).join('')}</ul>`;
  }

  /* ---------- Screens ---------- */
  function setupHTML(s) {
    const times = TIMES.map((t) => `<option value="${t}" ${s.seconds === t ? 'selected' : ''}>${t} seconds</option>`).join('');
    return `<div class="page-head"><h1 tabindex="-1">Forehead Guess</h1>
        <p class="muted">Hold the phone on your forehead, screen facing out. Everyone else gives clues — you guess the word. Nod down when you get it, tip the phone up to pass.</p></div>
      <form id="fh-setup" onsubmit="return false">
        <fieldset class="field"><legend>Guessers</legend>${P.stepperHTML('playerCount', s.playerCount, 1, MAX, 'players')}
          <p class="muted small">Each guesser gets a turn with the phone; the rest of the group gives clues.</p></fieldset>
        <fieldset class="field"><legend>Names <span class="muted small">(optional)</span></legend>${P.namesHTML(s.playerCount, s.names, (i) => 'Player ' + (i + 1))}</fieldset>
        <label class="field"><span>Time per turn</span><select id="fh-time">${times}</select></label>
        <fieldset class="field"><legend>Turns each</legend>${P.stepperHTML('rounds', s.rounds, 1, 5, 'turns')}</fieldset>
        <fieldset class="chip-group checks field"><legend>Word decks</legend>
          ${Object.keys(decks()).map((d) => `<label><input type="checkbox" name="fh-deck" value="${esc(d)}" ${s.decks.indexOf(d) !== -1 ? 'checked' : ''}><span>${esc(d)}</span></label>`).join('')}
        </fieldset>
        <label class="switch-row field"><input type="checkbox" id="fh-tilt" role="switch" ${s.tilt ? 'checked' : ''}>
          <span><strong>Tilt controls</strong><br><span class="muted small">Nod down for “got it”, tip back to pass. You can always tap the screen instead.</span></span></label>
        <label class="switch-row field"><input type="checkbox" id="fh-flip" role="switch" ${s.flipTilt ? 'checked' : ''}>
          <span><strong>Swap tilt directions</strong><br><span class="muted small">Turn on if nodding passes instead of scoring on your phone.</span></span></label>
        <fieldset class="field"><legend>Hold the phone with its top pointing</legend>
          <div class="segmented two">
            <label><input type="radio" name="fh-turn" value="left" ${s.turn === 'left' ? 'checked' : ''}><span>⬅ Left</span></label>
            <label><input type="radio" name="fh-turn" value="right" ${s.turn === 'right' ? 'checked' : ''}><span>Right ➡</span></label>
          </div>
          <p class="muted small">The word is turned sideways so it reads correctly when the phone is held on its side.</p></fieldset>
      </form>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="fh-start">Start game</button></div></div>`;
  }

  function introHTML() {
    const round = Math.floor(game.turnsPlayed / game.teams.length) + 1;
    return `<div class="page-head">${game.rounds > 1 ? `<p class="muted">Turn ${round} of ${game.rounds}</p>` : ''}
        <h1 tabindex="-1"><span class="imp-who">${esc(player().name)}</span>, you’re guessing</h1>
        <p>Tap Ready, then put the phone on your forehead with the screen facing everyone else. Don’t peek!</p>
        <ul class="fh-howto">
          <li><span aria-hidden="true">🙇</span> Nod down (or tap the right half) — <strong>got it</strong></li>
          <li><span aria-hidden="true">🙆</span> Tip back (or tap the left half) — <strong>pass</strong></li>
        </ul></div>
      ${game.teams.length > 1 ? scoresHTML() : ''}
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="fh-ready">Ready ▶</button></div></div>`;
  }

  function stageHTML(inner, cls) {
    const s = load();
    return `<div class="fh-stage ${cls || ''} turn-${s.turn}" id="fh-stage">
        <div class="fh-rot">
          <button type="button" class="fh-zone fh-pass" id="fh-pass" aria-label="Pass"></button>
          <button type="button" class="fh-zone fh-got" id="fh-got" aria-label="Got it"></button>
          <div class="fh-inner">${inner}</div>
        </div>
        <button type="button" class="fh-quit" id="fh-quit" aria-label="End turn">✕</button>
      </div>`;
  }

  function liveInner() {
    const c = game.current;
    return `<div class="fh-time" id="fh-time">${P.fmt(timer ? timer.remaining : 0)}</div>
      <div class="fh-word" id="fh-word" role="status">${esc(c.word)}</div>
      <div class="fh-hint"><span>⟲ pass</span><span>${c.got.length} ✓</span><span>got it ✓</span></div>`;
  }

  function turnEndHTML() {
    const c = game.lastTurn;
    return `<div class="page-head"><h1 tabindex="-1">Time’s up! ⏰</h1>
        <p>${esc(c.name)} got <strong>${c.got.length}</strong>.</p></div>
      ${c.got.length || c.skipped.length ? `<ul class="gg-got">${c.got.map((w) => `<li>✓ ${esc(w)}</li>`).join('')}${c.skipped.map((w) => `<li class="buzzed">⟲ ${esc(w)}</li>`).join('')}</ul>` : ''}
      ${game.teams.length > 1 ? scoresHTML() : ''}
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="fh-continue">${game.over ? 'See results' : 'Next guesser'}</button></div></div>`;
  }

  function overHTML() {
    const lead = G.leaders(game);
    const title = game.teams.length === 1 ? `You got ${game.teams[0].score}!` : (lead.length > 1 ? 'It’s a tie!' : esc(lead[0].name) + ' wins!');
    return `<div class="page-head"><h1 tabindex="-1">🏆 ${title}</h1></div>
      ${scoresHTML()}
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" id="fh-menu">Back to menu</button>
        <button type="button" class="btn" id="fh-again">Play again</button></div></div>`;
  }

  /* ---------- Behaviour ---------- */
  function render(root) {
    root.innerHTML = phase === 'setup' ? setupHTML(load())
      : phase === 'intro' ? introHTML()
      : phase === 'ready' ? stageHTML('<div class="fh-word fh-count" id="fh-count">3</div><div class="fh-hint"><span>Phone on your forehead!</span></div>', 'ready')
      : phase === 'live' ? stageHTML(liveInner())
      : phase === 'turnEnd' ? turnEndHTML()
      : overHTML();
    document.body.classList.toggle('fh-playing', phase === 'ready' || phase === 'live');
    ({ setup: wireSetup, intro: wireIntro, ready: wireStage, live: wireStage, turnEnd: wireTurnEnd, over: wireOver })[phase](root);
    if (phase !== 'ready' && phase !== 'live') P.focusHeading(root);
  }

  function start(root) {
    const s = load();
    const names = Array.from({ length: s.playerCount }, (_, i) => (String(s.names[i] || '').trim() || 'Player ' + (i + 1)).slice(0, 20));
    const words = [].concat(...s.decks.map((d) => decks()[d] || []));
    game = G.createGame({ mode: 'forehead', teams: names, words, rounds: s.rounds, maxTeams: MAX, minTeams: 1 }, Math.random);
    phase = 'intro';
    render(root);
  }

  function wireSetup(root) {
    const form = root.querySelector('#fh-setup');
    const read = () => {
      const s = load();
      s.names = P.readNames(form, s.names);
      s.seconds = Number(form.querySelector('#fh-time').value);
      const d = Array.from(form.querySelectorAll('input[name="fh-deck"]:checked')).map((x) => x.value);
      s.decks = d.length ? d : s.decks;
      s.tilt = form.querySelector('#fh-tilt').checked;
      s.flipTilt = form.querySelector('#fh-flip').checked;
      const turn = form.querySelector('input[name="fh-turn"]:checked');
      s.turn = turn ? turn.value : s.turn;
      return s;
    };
    form.addEventListener('input', () => save(read()));
    form.addEventListener('change', (e) => {
      if (e.target.name === 'fh-deck' && !form.querySelector('input[name="fh-deck"]:checked')) {
        e.target.checked = true;
        CGR.ui.toast('Pick at least one deck');
      }
      save(read());
    });
    P.wireSteppers(root, (key, d) => {
      const s = read();
      if (key === 'playerCount') s.playerCount = P.clamp(s.playerCount + d, 1, MAX);
      else s.rounds = P.clamp(s.rounds + d, 1, 5);
      save(s);
      render(root);
    });
    root.querySelector('#fh-start').addEventListener('click', () => { save(read()); start(root); });
  }

  function wireIntro(root) {
    root.querySelector('#fh-ready').addEventListener('click', () => {
      P.unlockAudio();
      const s = load();
      const go = () => {
        phase = 'ready';
        render(root);
        let n = 3;
        readyTimer = setInterval(() => {
          n -= 1;
          const el = document.getElementById('fh-count');
          if (n > 0) { if (el) el.textContent = n; P.beep(700, 90, 0.1); return; }
          clearInterval(readyTimer); readyTimer = null;
          beginTurn(root);
        }, 1000);
        P.beep(700, 90, 0.1);
      };
      if (s.tilt) {
        // Always listen: if permission was refused or there is no sensor, simply no readings arrive.
        listenTilt(root);
        askMotion().then((ok) => {
          go();
          if (!ok) setTimeout(() => { if (!sensorSeen && phase !== 'setup') CGR.ui.toast('Tilt isn’t available — tap the screen instead'); }, 1500);
        });
      } else go();
    });
  }

  function listenTilt(root) {
    if (motion) motion();
    const flipped = load().flipTilt;
    armed = false; // must be held upright first
    sensorSeen = false;
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.z == null) return;
      sensorSeen = true;
      if (phase !== 'live') { armed = Math.abs(a.z) < L.TILT.rearm; return; }
      const r = L.readTilt(a.z, armed, flipped);
      armed = r.armed;
      if (r.action) act(root, r.action);
    };
    window.addEventListener('devicemotion', onMotion);
    motion = () => window.removeEventListener('devicemotion', onMotion);
  }

  function beginTurn(root) {
    G.startTurn(game, Math.random);
    timer = P.countdown(load().seconds, (r) => {
      const el = document.getElementById('fh-time');
      if (el) el.textContent = P.fmt(r);
      if (r > 0 && r <= 5 && Math.ceil(r) !== timer._lastBeep) { timer._lastBeep = Math.ceil(r); P.beep(1000, 80, 0.1); }
    }, () => endTurn(root));
    phase = 'live';
    render(root);
    timer.start();
  }

  function flash(kind) {
    const st = document.getElementById('fh-stage');
    if (!st) return;
    st.classList.remove('flash-got', 'flash-pass');
    void st.offsetWidth; // restart the animation
    st.classList.add(kind === 'correct' ? 'flash-got' : 'flash-pass');
  }

  function act(root, action) {
    if (phase !== 'live' || !game.current) return;
    if (action === 'correct') { G.gotIt(game, Math.random); P.beep(1400, 90, 0.12); P.vibrate(60); }
    else { G.skip(game, Math.random); P.beep(400, 120, 0.1); P.vibrate([30, 40, 30]); }
    const w = document.getElementById('fh-word');
    if (w) w.textContent = game.current.word;
    const hint = root.querySelector('.fh-hint span:nth-child(2)');
    if (hint) hint.textContent = game.current.got.length + ' ✓';
    flash(action);
  }

  function endTurn(root) {
    const c = game.current || { got: [], skipped: [] };
    stopAll();
    P.beep(300, 500, 0.25, 'square'); P.vibrate([300]);
    game.lastTurn = { name: player().name, got: c.got.slice(), skipped: c.skipped.slice() };
    G.endTurn(game, Math.random);
    phase = 'turnEnd';
    render(root);
  }

  function wireStage(root) {
    root.querySelector('#fh-got').addEventListener('click', () => act(root, 'correct'));
    root.querySelector('#fh-pass').addEventListener('click', () => act(root, 'pass'));
    root.querySelector('#fh-quit').addEventListener('click', () => {
      if (phase === 'live') endTurn(root);
      else { stopAll(); phase = 'intro'; render(root); }
    });
  }

  function wireTurnEnd(root) {
    root.querySelector('#fh-continue').addEventListener('click', () => { phase = game.over ? 'over' : 'intro'; render(root); });
  }

  function wireOver(root) {
    root.querySelector('#fh-again').addEventListener('click', () => start(root));
    root.querySelector('#fh-menu').addEventListener('click', () => { game = null; phase = 'setup'; location.hash = '#/party'; });
  }

  CGR.views.forehead = function () {
    return {
      title: 'Forehead Guess',
      back: '#/party',
      html: '<div id="fh-root" class="imp"></div>',
      onMount(v) {
        const root = v.querySelector('#fh-root');
        // Coming back mid-turn (e.g. after the app was backgrounded): end that turn cleanly.
        if (phase === 'ready') { stopAll(); phase = 'intro'; }
        render(root);
        cleanup = [P.onBackground(() => {
          if (phase === 'live') endTurn(root);
          else if (phase === 'ready') { stopAll(); phase = 'intro'; render(root); }
        })];
      },
      onUnmount() {
        if (phase === 'live' || phase === 'ready') {
          const c = game && game.current;
          stopAll();
          if (c) { game.lastTurn = { name: player().name, got: c.got.slice(), skipped: c.skipped.slice() }; G.endTurn(game, Math.random); phase = 'turnEnd'; } else phase = 'intro';
        }
        document.body.classList.remove('fh-playing');
        cleanup.forEach((f) => f()); cleanup = [];
      },
      async confirmLeave() {
        if (phase === 'setup' || phase === 'over') return true;
        const ok = await CGR.ui.confirm('Quit this game?', 'Scores will be lost.', 'Quit', true);
        if (ok) { stopAll(); game = null; phase = 'setup'; document.body.classList.remove('fh-playing'); }
        return ok;
      }
    };
  };

  // Exposed for tests: whether a motion reading has been seen this turn.
  CGR.views.forehead.sensorSeen = () => sensorSeen;
})();
