/* Impostor word game — screens (route: #/impostor).
 * UI only: all game rules live in impostor-logic.js; words in impostor-words.js.
 *
 * Phases: setup → pass → reveal → (next player…) → start → discuss → result.
 * The round is kept in memory only (never saved), so secrets don't persist.
 * Settings and player names are saved under "cgr:impostor". */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const L = CGR.impostorLogic;
  const WORDS = CGR.impostorWords;
  const CATS = Object.keys(WORDS);
  const esc = CGR.esc;
  const STORE_KEY = 'impostor';

  let game = null;      // { round, phase, index, revealedOnce, direction, timer }
  let ticker = null;    // setInterval id for the discussion timer
  let cleanup = [];     // listeners to remove when leaving the screen

  function loadSettings() { return L.normalizeSettings(CGR.store.get(STORE_KEY, {}), CATS); }
  function saveSettings(s) { CGR.store.set(STORE_KEY, s); }

  function startRound(settings) {
    const round = L.createRound(settings, WORDS, Math.random);
    settings.recent = L.rememberWord(settings.recent, round);
    saveSettings(settings);
    const secs = settings.timerMinutes * 60;
    game = {
      round,
      phase: 'pass',
      index: 0,
      revealedOnce: false,
      direction: settings.direction,
      timer: secs ? { total: secs, remaining: secs, running: false, endAt: 0 } : null
    };
  }

  function inProgress() { return !!game && ['pass', 'reveal', 'start', 'discuss'].indexOf(game.phase) !== -1; }

  /* ------------------------------------------------------------------ */
  /* Rendering per phase                                                  */
  /* ------------------------------------------------------------------ */
  function setupHTML(s) {
    const max = L.maxImpostors(s.playerCount);
    const names = [];
    for (let i = 0; i < s.playerCount; i++) {
      names.push(`<label class="imp-name"><span class="visually-hidden">Player ${i + 1} name</span>
        <span class="imp-name-num" aria-hidden="true">${i + 1}</span>
        <input type="text" data-name="${i}" value="${esc(s.names[i] || '')}" placeholder="${esc(L.defaultName(i))}"
          maxlength="${L.MAX_NAME_LENGTH}" autocomplete="off" autocapitalize="words" enterkeyhint="next"></label>`);
    }
    const timerOpts = L.TIMER_CHOICES.map((m) => `<option value="${m}" ${s.timerMinutes === m ? 'selected' : ''}>${m ? m + ' min' : 'Off'}</option>`).join('');
    const catOpts = [`<option value="random" ${s.category === 'random' ? 'selected' : ''}>🎲 Random</option>`]
      .concat(CATS.map((c) => `<option value="${esc(c)}" ${s.category === c ? 'selected' : ''}>${esc(c)}</option>`)).join('');
    return `
      <div class="page-head"><h1 tabindex="-1">Impostor</h1>
        <p class="muted">Everyone gets the same secret word — except the impostor. Give clues, then vote on who’s bluffing.</p></div>
      <form id="imp-setup" onsubmit="return false">
        <fieldset class="field">
          <legend>Players</legend>
          <div class="stepper">
            <button type="button" class="btn btn-secondary" data-step="playerCount" data-d="-1" aria-label="Fewer players" ${s.playerCount <= L.MIN_PLAYERS ? 'disabled' : ''}>−</button>
            <output aria-live="polite">${s.playerCount}</output>
            <button type="button" class="btn btn-secondary" data-step="playerCount" data-d="1" aria-label="More players" ${s.playerCount >= L.MAX_PLAYERS ? 'disabled' : ''}>+</button>
          </div>
        </fieldset>
        <fieldset class="field">
          <legend>Names <span class="muted small">(optional, in seating order)</span></legend>
          <div class="imp-names">${names.join('')}</div>
          <button type="button" class="btn btn-ghost btn-small" id="imp-clear-names">Clear names</button>
        </fieldset>
        <fieldset class="field">
          <legend>Impostors</legend>
          <div class="stepper">
            <button type="button" class="btn btn-secondary" data-step="impostorCount" data-d="-1" aria-label="Fewer impostors" ${s.impostorCount <= 1 ? 'disabled' : ''}>−</button>
            <output aria-live="polite">${s.impostorCount}</output>
            <button type="button" class="btn btn-secondary" data-step="impostorCount" data-d="1" aria-label="More impostors" ${s.impostorCount >= max ? 'disabled' : ''}>+</button>
          </div>
          ${max === 1 ? '<p class="muted small">Add more players to allow extra impostors.</p>' : `<p class="muted small">Up to ${max} with ${s.playerCount} players.</p>`}
        </fieldset>
        <label class="field"><span>Category</span><select id="imp-cat">${catOpts}</select></label>
        <label class="switch-row field">
          <input type="checkbox" id="imp-hint" role="switch" ${s.hint ? 'checked' : ''}>
          <span><strong>Impostor gets a hint</strong><br><span class="muted small">They see the category name instead of the word.</span></span>
        </label>
        <label class="field"><span>Discussion timer</span><select id="imp-timer">${timerOpts}</select></label>
      </form>
      <details class="card imp-howto">
        <summary>How to play</summary>
        <ol>
          <li>Pass the phone round. Each player holds the card to see the secret word — the impostor sees “You are the impostor” instead.</li>
          <li>Going round in order from the starting player, everyone says one word or short clue about the secret word. Not too obvious, or the impostor will guess it!</li>
          <li>Discuss and vote on who you think the impostor is, then tap “Reveal impostor”.</li>
          <li>Common scoring: if the group catches the impostor, the group wins — unless the impostor can then guess the secret word.</li>
        </ol>
      </details>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn" id="imp-start">Start game</button>
      </div></div>`;
  }

  function passHTML() {
    const r = game.round;
    const name = r.players[game.index];
    return `
      <div class="imp-pass">
        <p class="muted">Player ${game.index + 1} of ${r.players.length}</p>
        <h1 tabindex="-1">Pass to <span class="imp-who">${esc(name)}</span></h1>
        <p>Only <strong>${esc(name)}</strong> should look at the screen.</p>
      </div>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn" id="imp-ready">I’m ${esc(name)} — Ready</button>
      </div></div>`;
  }

  function revealHTML() {
    const name = game.round.players[game.index];
    return `
      <div class="page-head imp-reveal-head"><h1 tabindex="-1">${esc(name)}</h1>
        <p class="muted">Press and hold the card. Let go to hide it.</p></div>
      <button type="button" class="imp-card" id="imp-card" aria-label="Press and hold to reveal your role. Release to hide.">
        <span class="imp-card-text" aria-live="assertive">Hold to reveal</span>
      </button>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn" id="imp-done" ${game.revealedOnce ? '' : 'disabled'}>${game.revealedOnce ? 'Done — hide and pass on' : 'Hold the card first'}</button>
      </div></div>`;
  }

  function circleHTML(order) {
    const r = game.round;
    const n = r.players.length;
    const pos = {};
    order.forEach((seat, turn) => { pos[seat] = turn + 1; });
    const seats = r.players.map((name, i) => {
      const a = (-90 + (360 / n) * i) * Math.PI / 180;
      const x = 50 + 40 * Math.cos(a);
      const y = 50 + 40 * Math.sin(a);
      return `<li class="imp-seat${i === r.starter ? ' starter' : ''}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">
        <span class="imp-seat-num">${pos[i]}</span><span class="imp-seat-name">${esc(name)}</span></li>`;
    }).join('');
    const label = order.map((i) => r.players[i]).join(', ') + ', then back to ' + r.players[order[0]];
    return `<div class="imp-circle" role="img" aria-label="Turn order: ${esc(label)}">
        <ol aria-hidden="true">${seats}</ol>
        <span class="imp-dir" aria-hidden="true">${game.direction === 'anticlockwise' ? '↺' : '↻'}</span>
      </div>`;
  }

  function orderLine(order) {
    const r = game.round;
    return `<p class="imp-order">${order.map((i) => esc(r.players[i])).join(' → ')} → <span class="muted">${esc(r.players[order[0]])}</span></p>`;
  }

  function startHTML() {
    const r = game.round;
    const order = L.turnOrder(r.players.length, r.starter, game.direction);
    return `
      <div class="page-head"><p class="muted">Everyone has seen their role.</p>
        <h1 tabindex="-1"><span class="imp-who">${esc(r.players[r.starter])}</span> starts</h1></div>
      <fieldset class="field">
        <legend>Direction</legend>
        <div class="segmented two">
          <label><input type="radio" name="imp-dir" value="clockwise" ${game.direction === 'clockwise' ? 'checked' : ''}><span>↻ Clockwise</span></label>
          <label><input type="radio" name="imp-dir" value="anticlockwise" ${game.direction === 'anticlockwise' ? 'checked' : ''}><span>↺ Anticlockwise</span></label>
        </div>
      </fieldset>
      ${circleHTML(order)}
      ${orderLine(order)}
      <p class="muted small">Seats follow the order names were entered. Numbers show who goes when.</p>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn" id="imp-discuss">Start clues &amp; discussion</button>
      </div></div>`;
  }

  function timerHTML() {
    const t = game.timer;
    if (!t) return '';
    const done = t.remaining <= 0;
    return `<section class="card imp-timer${done ? ' done' : ''}" aria-label="Discussion timer">
        <div class="imp-time" id="imp-time" role="timer" aria-live="off">${done ? 'Time’s up!' : L.formatTime(t.remaining)}</div>
        <div class="btn-row">
          <button type="button" class="btn ${t.running ? 'btn-secondary' : ''}" id="imp-timer-toggle" ${done ? 'disabled' : ''}>${t.running ? 'Pause' : (t.remaining < t.total ? 'Resume' : 'Start timer')}</button>
          <button type="button" class="btn btn-secondary" id="imp-timer-reset">Reset</button>
        </div>
      </section>`;
  }

  function discussHTML() {
    const r = game.round;
    const order = L.turnOrder(r.players.length, r.starter, game.direction);
    return `
      <div class="page-head"><h1 tabindex="-1">Clues &amp; discussion</h1>
        <p>Going ${game.direction}, each player gives one clue about the secret word, starting with <strong>${esc(r.players[r.starter])}</strong>. Then discuss and vote.</p></div>
      ${orderLine(order)}
      ${timerHTML()}
      <p class="muted small">${r.impostors.length > 1 ? `There are ${r.impostors.length} impostors.` : 'There is 1 impostor.'}</p>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn" id="imp-reveal-imp">Reveal impostor</button>
      </div></div>`;
  }

  function resultHTML() {
    const r = game.round;
    const names = r.impostors.map((i) => `<li>${esc(r.players[i])}</li>`).join('');
    return `
      <div class="page-head"><h1 tabindex="-1">The impostor${r.impostors.length > 1 ? 's were' : ' was'}…</h1></div>
      <ul class="imp-result-names">${names}</ul>
      <div class="card imp-result-word">
        <p class="muted">The secret word was</p>
        <p class="imp-word">${esc(r.word)}</p>
        <p class="muted">Category: ${esc(r.category)}</p>
      </div>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" id="imp-menu">Back to menu</button>
        <button type="button" class="btn" id="imp-again">Play again</button>
      </div></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Behaviour                                                            */
  /* ------------------------------------------------------------------ */
  function render(root, focus) {
    stopTicker();
    const phase = game ? game.phase : 'setup';
    root.innerHTML = phase === 'setup' ? setupHTML(loadSettings())
      : phase === 'pass' ? passHTML()
      : phase === 'reveal' ? revealHTML()
      : phase === 'start' ? startHTML()
      : phase === 'discuss' ? discussHTML()
      : resultHTML();
    ({ setup: wireSetup, pass: wirePass, reveal: wireReveal, start: wireStart, discuss: wireDiscuss, result: wireResult })[phase](root);
    window.scrollTo(0, 0);
    if (focus !== false) {
      const h1 = root.querySelector('h1');
      if (h1) h1.focus({ preventScroll: true });
    }
  }

  function go(root, phase) { game.phase = phase; render(root); }

  function wireSetup(root) {
    const form = root.querySelector('#imp-setup');
    const read = () => {
      const s = loadSettings();
      const names = s.names.slice();
      form.querySelectorAll('[data-name]').forEach((inp) => { names[Number(inp.dataset.name)] = inp.value; });
      s.names = names;
      s.category = root.querySelector('#imp-cat').value;
      s.hint = root.querySelector('#imp-hint').checked;
      s.timerMinutes = Number(root.querySelector('#imp-timer').value);
      return s;
    };
    form.addEventListener('input', () => saveSettings(read()));
    form.addEventListener('change', () => saveSettings(read()));
    form.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const s = read();
      s[b.dataset.step] += Number(b.dataset.d);
      saveSettings(L.normalizeSettings(s, CATS));
      const key = `[data-step="${b.dataset.step}"][data-d="${b.dataset.d}"]`;
      render(root, false);
      const again = root.querySelector(key);
      if (again && !again.disabled) again.focus({ preventScroll: true });
    }));
    root.querySelector('#imp-clear-names').addEventListener('click', () => {
      const s = read();
      s.names = [];
      saveSettings(s);
      render(root, false);
    });
    root.querySelector('#imp-start').addEventListener('click', () => {
      const s = L.normalizeSettings(read(), CATS);
      startRound(s);
      render(root);
    });
  }

  function wirePass(root) {
    root.querySelector('#imp-ready').addEventListener('click', () => {
      game.revealedOnce = false;
      go(root, 'reveal');
    });
  }

  function wireReveal(root) {
    const card = root.querySelector('#imp-card');
    const text = card.querySelector('.imp-card-text');
    const done = root.querySelector('#imp-done');
    let shown = false;

    function show() {
      if (shown) return;
      shown = true;
      const role = L.roleFor(game.round, game.index);
      card.classList.add('revealed');
      card.classList.toggle('impostor', role.impostor);
      // Content is only in the DOM while the card is held.
      text.innerHTML = role.impostor
        ? `<span class="imp-role">YOU ARE THE IMPOSTOR</span>${role.hint ? `<span class="imp-hint">Hint: ${esc(role.hint)}</span>` : '<span class="imp-hint">No hint — listen carefully!</span>'}`
        : `<span class="imp-label">The secret word is</span><span class="imp-secret">${esc(role.word)}</span>`;
      if (!game.revealedOnce) {
        game.revealedOnce = true;
        done.disabled = false;
        done.textContent = 'Done — hide and pass on';
      }
    }
    function hide() {
      shown = false;
      card.classList.remove('revealed', 'impostor');
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
    // Keyboard / screen-reader users: hold Space or Enter.
    card.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); show(); }
    });
    card.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hide(); } });
    card.addEventListener('blur', hide);
    card.addEventListener('click', (e) => e.preventDefault());

    done.addEventListener('click', () => {
      hide();
      game.index += 1;
      game.revealedOnce = false;
      go(root, game.index < game.round.players.length ? 'pass' : 'start');
    });
  }

  function wireStart(root) {
    root.querySelectorAll('input[name="imp-dir"]').forEach((r) => r.addEventListener('change', () => {
      game.direction = r.value;
      const s = loadSettings();
      s.direction = r.value;
      saveSettings(s);
      render(root, false);
      const again = root.querySelector(`input[name="imp-dir"][value="${r.value}"]`);
      if (again) again.focus({ preventScroll: true });
    }));
    root.querySelector('#imp-discuss').addEventListener('click', () => go(root, 'discuss'));
  }

  /* ---- Discussion timer (wall-clock based, so it stays right in the background) ---- */
  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

  function tick(root) {
    const t = game && game.timer;
    if (!t || !t.running) return;
    t.remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
    const el = root.querySelector('#imp-time');
    if (t.remaining <= 0) {
      t.running = false;
      stopTicker();
      if (navigator.vibrate) { try { navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ } }
      CGR.ui.announce('Time’s up');
      render(root, false);
      return;
    }
    if (el) el.textContent = L.formatTime(t.remaining);
  }

  function wireDiscuss(root) {
    const t = game.timer;
    if (t) {
      if (t.running) { ticker = setInterval(() => tick(root), 250); tick(root); }
      root.querySelector('#imp-timer-toggle').addEventListener('click', () => {
        if (t.running) {
          t.remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
          t.running = false;
        } else {
          t.endAt = Date.now() + t.remaining * 1000;
          t.running = true;
        }
        render(root, false);
        const b = root.querySelector('#imp-timer-toggle');
        if (b && !b.disabled) b.focus({ preventScroll: true });
      });
      root.querySelector('#imp-timer-reset').addEventListener('click', () => {
        t.running = false;
        t.remaining = t.total;
        render(root, false);
      });
    }
    root.querySelector('#imp-reveal-imp').addEventListener('click', async () => {
      const ok = await CGR.ui.confirm('Reveal the impostor?', 'Make sure everyone has voted first.', 'Reveal', false);
      if (ok) {
        if (game.timer) game.timer.running = false;
        go(root, 'result');
      }
    });
  }

  function wireResult(root) {
    root.querySelector('#imp-again').addEventListener('click', () => {
      startRound(loadSettings());
      render(root);
    });
    root.querySelector('#imp-menu').addEventListener('click', () => {
      game = null;
      location.hash = '#/party';
    });
  }

  /* ------------------------------------------------------------------ */
  /* View entry point                                                     */
  /* ------------------------------------------------------------------ */
  CGR.views.impostor = function () {
    // Coming back mid-reveal (e.g. via the system back button)? Never resume
    // with a role on screen: go back to the "Pass to…" screen instead.
    if (game && game.phase === 'reveal') { game.phase = 'pass'; game.revealedOnce = false; }
    return {
      title: 'Impostor',
      back: '#/party',
      html: '<div id="imp-root" class="imp"></div>',
      onMount(view) {
        const root = view.querySelector('#imp-root');
        render(root, false);
        // Hide any revealed role when the app goes to the background or the
        // screen locks, and require "Ready" again before showing it.
        const hideAll = () => {
          if (game && game.phase === 'reveal') {
            game.phase = 'pass';
            game.revealedOnce = false;
            render(root, false);
          }
        };
        const onVis = () => { if (document.visibilityState === 'hidden') hideAll(); };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('pagehide', hideAll);
        window.addEventListener('blur', hideAll);
        cleanup = [
          () => document.removeEventListener('visibilitychange', onVis),
          () => window.removeEventListener('pagehide', hideAll),
          () => window.removeEventListener('blur', hideAll)
        ];
      },
      onUnmount() {
        stopTicker();
        cleanup.forEach((fn) => fn());
        cleanup = [];
        if (game && game.phase === 'result') game = null;
      },
      async confirmLeave() {
        if (!inProgress()) return true;
        const ok = await CGR.ui.confirm('Quit this game?', 'The current round will end.', 'Quit', true);
        if (ok) game = null;
        return ok;
      }
    };
  };
})();
