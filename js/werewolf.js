/* Werewolf / Mafia — screens (route: #/werewolf). Logic: werewolf-logic.js.
 * Phases: setup → pass/reveal for each player → handoff → narrator (night/day) → over. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const W = CGR.werewolfLogic;
  const P = CGR.party;
  const esc = CGR.esc;
  const KEY = 'werewolf';

  let game = null; // { settings, names, roles, alive, phase, index, revealedOnce, night, step, mode, showRoles }
  let cleanup = [];

  const load = () => W.normalizeSettings(CGR.store.get(KEY, {}));
  const save = (s) => CGR.store.set(KEY, s);
  const nameOf = (i) => game.names[i];
  const role = (i) => game.roles[i];
  const themeWord = () => (game.settings.theme === 'mafia' ? 'Mafia' : 'Werewolves');

  function names(s) {
    return Array.from({ length: s.playerCount }, (_, i) => (String(s.names[i] || '').trim() || 'Player ' + (i + 1)).slice(0, 20));
  }

  function newGame(s) {
    game = {
      settings: s, names: names(s), roles: W.dealRoles(s, Math.random), alive: new Array(s.playerCount).fill(true),
      phase: 'pass', index: 0, revealedOnce: false, night: 1, step: 0, mode: 'night', showRoles: false
    };
  }

  /* ---------------- HTML ---------------- */
  function setupHTML(s) {
    const t = s.theme;
    const toggle = (key, label, desc) => `<label class="switch-row field">
        <input type="checkbox" data-role="${key}" role="switch" ${s[key] ? 'checked' : ''}>
        <span><strong>${label}</strong><br><span class="muted small">${desc}</span></span></label>`;
    return `
      <div class="page-head"><h1 tabindex="-1">${t === 'mafia' ? 'Mafia' : 'Werewolf'}</h1>
        <p class="muted">A hidden-role game for ${W.MIN_PLAYERS}–${W.MAX_PLAYERS} players, plus one narrator who holds the phone. The village must find the ${t === 'mafia' ? 'Mafia' : 'werewolves'} before they’re outnumbered.</p></div>
      <form id="ww-setup" onsubmit="return false">
        <fieldset class="field"><legend>Theme</legend>
          <div class="segmented two">
            <label><input type="radio" name="ww-theme" value="werewolf" ${t === 'werewolf' ? 'checked' : ''}><span>🐺 Werewolf</span></label>
            <label><input type="radio" name="ww-theme" value="mafia" ${t === 'mafia' ? 'checked' : ''}><span>🕴️ Mafia</span></label>
          </div></fieldset>
        <fieldset class="field"><legend>Players <span class="muted small">(not counting the narrator)</span></legend>
          ${P.stepperHTML('playerCount', s.playerCount, W.MIN_PLAYERS, W.MAX_PLAYERS, 'players')}</fieldset>
        <fieldset class="field"><legend>Names <span class="muted small">(optional)</span></legend>
          ${P.namesHTML(s.playerCount, s.names, (i) => 'Player ' + (i + 1))}</fieldset>
        <fieldset class="field"><legend>${t === 'mafia' ? 'Mafia members' : 'Werewolves'}</legend>
          ${P.stepperHTML('wolves', s.wolves, 1, W.maxWolves(s.playerCount), t === 'mafia' ? 'Mafia' : 'werewolves')}
          <p class="muted small">Suggested for ${s.playerCount} players: ${W.recommendedWolves(s.playerCount)}.</p></fieldset>
        ${toggle('seer', W.roleName('seer', t), 'Checks one player each night.')}
        ${toggle('doctor', 'Doctor', 'Protects one player each night.')}
        ${toggle('hunter', W.roleName('hunter', t), 'Takes someone down when eliminated.')}
      </form>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="ww-start">Deal roles</button></div></div>`;
  }

  function passHTML() {
    return `<div class="imp-pass">
        <p class="muted">Player ${game.index + 1} of ${game.names.length}</p>
        <h1 tabindex="-1">Pass to <span class="imp-who">${esc(nameOf(game.index))}</span></h1>
        <p>Only <strong>${esc(nameOf(game.index))}</strong> should look at the screen.</p></div>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="ww-ready">I’m ${esc(nameOf(game.index))} — Ready</button></div></div>`;
  }

  function revealHTML() {
    return `<div class="page-head imp-reveal-head"><h1 tabindex="-1">${esc(nameOf(game.index))}</h1>
        <p class="muted">Press and hold the card. Let go to hide it.</p></div>
      <button type="button" class="imp-card" id="ww-card" aria-label="Press and hold to reveal your role. Release to hide.">
        <span class="imp-card-text" aria-live="assertive">Hold to reveal</span></button>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn" id="ww-done" disabled>Hold the card first</button></div></div>`;
  }

  function handoffHTML() {
    return `<div class="imp-pass"><p class="muted">Everyone has their role.</p>
        <h1 tabindex="-1">Give the phone to the <span class="imp-who">narrator</span></h1>
        <p>The narrator reads the script out loud and keeps track of who is still in.</p></div>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="ww-narrate">I’m the narrator</button></div></div>`;
  }

  function playersListHTML() {
    const t = game.settings.theme;
    return `<ul class="ww-players">${game.names.map((n, i) => {
      const r = role(i);
      const alive = game.alive[i];
      return `<li class="${alive ? '' : 'dead'}">
        <button type="button" class="ww-player" data-player="${i}" aria-pressed="${!alive}" aria-label="${esc(n)}${game.showRoles ? ', ' + esc(W.roleName(r, t)) : ''}: ${alive ? 'in the game. Tap to eliminate' : 'eliminated. Tap to bring back'}">
          <span class="ww-name">${esc(n)}</span>
          ${game.showRoles ? `<span class="ww-role ${W.ROLES[r].team}">${W.ROLES[r].emoji[t]} ${esc(W.roleName(r, t))}</span>` : ''}
          <span class="ww-state">${alive ? 'In' : 'Out'}</span>
        </button></li>`;
    }).join('')}</ul>`;
  }

  function narratorHTML() {
    const t = game.settings.theme;
    const aliveCount = game.alive.filter(Boolean).length;
    let script;
    if (game.mode === 'night') {
      const steps = W.nightScript(game.roles, game.night, t);
      const i = Math.min(game.step, steps.length - 1);
      const last = i === steps.length - 1;
      script = `<section class="card ww-script" aria-live="polite">
          <p class="muted small">Night ${game.night} · step ${i + 1} of ${steps.length} — read aloud</p>
          <p class="ww-line">${esc(steps[i])}</p>
          <div class="btn-row">
            <button type="button" class="btn btn-secondary" id="ww-prev" ${i === 0 ? 'disabled' : ''}>Back</button>
            <button type="button" class="btn" id="ww-next">${last ? `Start day ${game.night} ☀️` : 'Next'}</button>
          </div></section>`;
    } else {
      script = `<section class="card ww-script">
          <p class="muted small">Day ${game.night} — read aloud</p>
          <ol class="ww-day">${W.dayScript(t).map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
          <p class="muted small">Tap a player below to mark them eliminated.</p>
        </section>`;
    }
    return `<div class="page-head"><h1 tabindex="-1">${game.mode === 'night' ? '🌙 Night ' : '☀️ Day '}${game.night}</h1>
        <p class="muted">${aliveCount} players still in.</p></div>
      ${script}
      <div class="ww-roles-toggle">
        <label class="switch-row"><input type="checkbox" id="ww-show-roles" role="switch" ${game.showRoles ? 'checked' : ''}>
          <span><strong>Show roles</strong> <span class="muted small">(narrator only)</span></span></label>
      </div>
      ${playersListHTML()}
      <div class="action-bar"><div class="action-bar-inner">
        ${game.mode === 'day' ? `<button type="button" class="btn" id="ww-night">Start night ${game.night + 1} 🌙</button>` : `<button type="button" class="btn btn-secondary" id="ww-skip-day">Skip to day ☀️</button>`}
      </div></div>`;
  }

  function overHTML(winner) {
    const t = game.settings.theme;
    const villageName = t === 'mafia' ? 'The town' : 'The village';
    return `<div class="page-head"><h1 tabindex="-1">${winner === 'wolves' ? `${W.ROLES.werewolf.emoji[t]} ${themeWord()} win!` : `🏡 ${villageName} wins!`}</h1>
        <p class="muted">${winner === 'wolves' ? `The ${themeWord().toLowerCase()} now equal or outnumber everyone else.` : `Every ${t === 'mafia' ? 'Mafia member' : 'werewolf'} has been found.`}</p></div>
      <h2>Everyone’s roles</h2>
      <ul class="ww-players reveal">${game.names.map((n, i) => `<li class="${game.alive[i] ? '' : 'dead'}"><div class="ww-player">
          <span class="ww-name">${esc(n)}</span>
          <span class="ww-role ${W.ROLES[role(i)].team}">${W.ROLES[role(i)].emoji[t]} ${esc(W.roleName(role(i), t))}</span>
          <span class="ww-state">${game.alive[i] ? 'In' : 'Out'}</span></div></li>`).join('')}</ul>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" id="ww-menu">Back to menu</button>
        <button type="button" class="btn" id="ww-again">Play again</button></div></div>`;
  }

  /* ---------------- Behaviour ---------------- */
  function render(root, focus) {
    const phase = game ? game.phase : 'setup';
    const winner = game && game.phase === 'narrate' ? W.checkWinner(game.roles, game.alive) : null;
    if (winner) game.phase = 'over';
    root.innerHTML = !game ? setupHTML(load())
      : game.phase === 'pass' ? passHTML()
      : game.phase === 'reveal' ? revealHTML()
      : game.phase === 'handoff' ? handoffHTML()
      : game.phase === 'narrate' ? narratorHTML()
      : overHTML(W.checkWinner(game.roles, game.alive));
    ({ setup: wireSetup, pass: wirePass, reveal: wireReveal, handoff: wireHandoff, narrate: wireNarrate, over: wireOver })[game ? game.phase : 'setup'](root);
    if (focus !== false || phase !== (game ? game.phase : 'setup')) P.focusHeading(root);
  }

  function wireSetup(root) {
    const form = root.querySelector('#ww-setup');
    const read = () => {
      const s = load();
      s.names = P.readNames(form, s.names);
      const th = form.querySelector('input[name="ww-theme"]:checked');
      s.theme = th ? th.value : 'werewolf';
      form.querySelectorAll('[data-role]').forEach((c) => { s[c.dataset.role] = c.checked; });
      return s;
    };
    form.addEventListener('input', () => save(read()));
    form.addEventListener('change', (e) => {
      save(read());
      if (e.target.name === 'ww-theme' || e.target.dataset.role) render(root, false);
    });
    P.wireSteppers(root, (key, d) => {
      const s = read();
      if (key === 'playerCount') {
        const wasRecommended = s.wolves === W.recommendedWolves(s.playerCount);
        s.playerCount += d;
        if (wasRecommended) s.wolves = W.recommendedWolves(W.normalizeSettings(s).playerCount);
      } else s[key] += d;
      save(W.normalizeSettings(s));
      render(root, false);
    });
    root.querySelector('#ww-start').addEventListener('click', () => {
      const s = W.normalizeSettings(read());
      save(s);
      newGame(s);
      render(root);
    });
  }

  function wirePass(root) {
    root.querySelector('#ww-ready').addEventListener('click', () => { game.phase = 'reveal'; render(root); });
  }

  function wireReveal(root) {
    const done = root.querySelector('#ww-done');
    const t = game.settings.theme;
    const r = role(game.index);
    const card = root.querySelector('#ww-card');
    P.holdToReveal(card, () => `
        <span class="imp-label">You are</span>
        <span class="imp-secret">${W.ROLES[r].emoji[t]} ${esc(W.roleName(r, t))}</span>
        <span class="ww-role-text">${esc(W.ROLES[r].text[t])}</span>`,
      () => { done.disabled = false; done.textContent = 'Done — hide and pass on'; },
      () => (W.ROLES[r].team === 'wolves' ? 'impostor' : 'revealed'));
    done.addEventListener('click', () => {
      game.index += 1;
      game.phase = game.index < game.names.length ? 'pass' : 'handoff';
      render(root);
    });
  }

  function wireHandoff(root) {
    root.querySelector('#ww-narrate').addEventListener('click', () => { game.phase = 'narrate'; game.mode = 'night'; game.step = 0; render(root); });
  }

  function wireNarrate(root) {
    const steps = () => W.nightScript(game.roles, game.night, game.settings.theme);
    const next = root.querySelector('#ww-next');
    if (next) next.addEventListener('click', () => {
      if (game.step >= steps().length - 1) { game.mode = 'day'; game.step = 0; render(root); }
      else { game.step += 1; render(root, false); root.querySelector('#ww-next').focus({ preventScroll: true }); }
    });
    const prev = root.querySelector('#ww-prev');
    if (prev) prev.addEventListener('click', () => { game.step = Math.max(0, game.step - 1); render(root, false); });
    const skipDay = root.querySelector('#ww-skip-day');
    if (skipDay) skipDay.addEventListener('click', () => { game.mode = 'day'; game.step = 0; render(root); });
    const night = root.querySelector('#ww-night');
    if (night) night.addEventListener('click', () => { game.night += 1; game.mode = 'night'; game.step = 0; render(root); });
    root.querySelector('#ww-show-roles').addEventListener('change', (e) => { game.showRoles = e.target.checked; render(root, false); });
    root.querySelectorAll('[data-player]').forEach((b) => b.addEventListener('click', async () => {
      const i = Number(b.dataset.player);
      if (game.alive[i]) {
        const ok = await CGR.ui.confirm(`Eliminate ${nameOf(i)}?`, 'They can no longer speak or vote. Tap them again if this was a mistake.', 'Eliminate', true);
        if (!ok) return;
        game.alive[i] = false;
        if (role(i) === 'hunter') {
          await CGR.ui.dialog({ title: `${nameOf(i)} was the ${W.roleName('hunter', game.settings.theme)}!`, message: 'Before leaving, they choose one other player to eliminate. Tap that player next.', actions: [{ label: 'OK', value: 'ok', primary: true }] });
        }
      } else {
        game.alive[i] = true;
      }
      render(root, false);
    }));
  }

  function wireOver(root) {
    root.querySelector('#ww-again').addEventListener('click', () => { newGame(load()); render(root); });
    root.querySelector('#ww-menu').addEventListener('click', () => { game = null; location.hash = '#/party'; });
  }

  CGR.views.werewolf = function () {
    if (game && game.phase === 'reveal') game.phase = 'pass';
    return {
      title: 'Werewolf',
      back: '#/party',
      html: '<div id="ww-root" class="imp"></div>',
      onMount(view) {
        const root = view.querySelector('#ww-root');
        render(root, false);
        cleanup = [P.onBackground(() => { if (game && game.phase === 'reveal') { game.phase = 'pass'; render(root, false); } })];
      },
      onUnmount() { cleanup.forEach((f) => f()); cleanup = []; if (game && game.phase === 'over') game = null; },
      async confirmLeave() {
        if (!game || game.phase === 'over') return true;
        const ok = await CGR.ui.confirm('Quit this game?', 'Roles and progress will be lost.', 'Quit', true);
        if (ok) game = null;
        return ok;
      }
    };
  };
})();
