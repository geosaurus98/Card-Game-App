/* Charades (#/charades) and Fishbowl (#/fishbowl) — screens.
 * Both use the shared turn engine in guess-logic.js. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const G = CGR.guessLogic;
  const P = CGR.party;
  const esc = CGR.esc;
  const TURN_CHOICES = [30, 45, 60, 90, 120];

  /* Charades decks: "Actions" plus several word-list categories. */
  function charadesDecks() {
    const iw = CGR.impostorWords;
    const decks = { 'Actions': CGR.partyWords.actions };
    ['Animals', 'Jobs', 'Sports', 'Movies', 'Transport', 'Hobbies', 'Household Items', 'Fantasy & Myth', 'Musical Instruments'].forEach((c) => { if (iw[c]) decks[c] = iw[c]; });
    return decks;
  }

  function makeView(mode) {
    const KEY = mode;
    const isFish = mode === 'fishbowl';
    let game = null;      // guess-logic game object
    let phase = 'setup';  // setup | words | intro | live | turnEnd | roundEnd | over
    let bowlWords = [];   // fishbowl entries before the game starts
    let timer = null;
    let carry = 0;        // fishbowl: seconds carried into the next round
    let paused = false;
    let cleanup = [];

    function load() {
      const s = CGR.store.get(KEY, {});
      const decks = Object.keys(charadesDecks());
      return {
        teamCount: P.clamp(Math.round(s.teamCount) || 2, 2, G.MAX_TEAMS),
        teamNames: Array.isArray(s.teamNames) ? s.teamNames : [],
        turnSeconds: TURN_CHOICES.indexOf(Number(s.turnSeconds)) !== -1 ? Number(s.turnSeconds) : 60,
        rounds: P.clamp(Math.round(s.rounds) || 3, 1, 10),
        decks: Array.isArray(s.decks) && s.decks.some((d) => decks.indexOf(d) !== -1) ? s.decks.filter((d) => decks.indexOf(d) !== -1) : ['Actions', 'Animals', 'Jobs']
      };
    }
    const save = (s) => CGR.store.set(KEY, s);
    const team = () => game.teams[game.teamIndex];
    const stopTimer = () => { if (timer) timer.stop(); timer = null; };

    function scoresHTML(highlight) {
      return `<ul class="gg-scores">${game.teams.map((t, i) => `<li class="${highlight && i === game.teamIndex ? 'current' : ''}">
        <span>${esc(t.name)}</span><strong>${t.score}</strong></li>`).join('')}</ul>`;
    }

    /* ---------------- HTML ---------------- */
    function setupHTML(s) {
      const times = TURN_CHOICES.map((t) => `<option value="${t}" ${s.turnSeconds === t ? 'selected' : ''}>${t} seconds</option>`).join('');
      const teamInputs = P.namesHTML(s.teamCount, s.teamNames, (i) => 'Team ' + String.fromCharCode(65 + i));
      const deckChips = isFish ? '' : `<fieldset class="chip-group checks field"><legend>What to act out</legend>
          ${Object.keys(charadesDecks()).map((d) => `<label><input type="checkbox" name="gg-deck" value="${esc(d)}" ${s.decks.indexOf(d) !== -1 ? 'checked' : ''}><span>${esc(d)}</span></label>`).join('')}
        </fieldset>`;
      return `<div class="page-head"><h1 tabindex="-1">${isFish ? 'Fishbowl' : 'Charades'}</h1>
          <p class="muted">${isFish
            ? 'Everyone adds words to the bowl. Teams race to guess them all, three times over: describe them, then one word only, then act them out.'
            : 'Act it out — no talking! Your team guesses as many as possible before the timer runs out.'}</p></div>
        <form id="gg-setup" onsubmit="return false">
          <fieldset class="field"><legend>Teams</legend>${P.stepperHTML('teamCount', s.teamCount, 2, G.MAX_TEAMS, 'teams')}</fieldset>
          <fieldset class="field"><legend>Team names <span class="muted small">(optional)</span></legend>${teamInputs}</fieldset>
          <label class="field"><span>Time per turn</span><select id="gg-time">${times}</select></label>
          ${isFish ? '' : `<fieldset class="field"><legend>Rounds <span class="muted small">(each team gets one turn per round)</span></legend>${P.stepperHTML('rounds', s.rounds, 1, 10, 'rounds')}</fieldset>`}
          ${deckChips}
        </form>
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="gg-next">${isFish ? 'Next: fill the bowl' : 'Start game'}</button></div></div>`;
    }

    function wordsHTML() {
      return `<div class="page-head"><h1 tabindex="-1">Fill the bowl</h1>
          <p class="muted">Pass the phone round. Each player secretly adds 3–5 things: people, places, films, objects… Words are hidden once added.</p></div>
        <form id="gg-word-form" class="gg-add" onsubmit="return false">
          <label class="field"><span>Add a word or phrase</span>
            <input type="text" id="gg-word" maxlength="40" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" placeholder="e.g. The Eiffel Tower"></label>
          <button type="submit" class="btn" id="gg-add">Add to bowl</button>
        </form>
        <p class="gg-count" id="gg-count" aria-live="polite">${bowlWords.length} ${bowlWords.length === 1 ? 'word' : 'words'} in the bowl</p>
        <div class="btn-row">
          <button type="button" class="btn btn-secondary" id="gg-random">🎲 Add 10 random words</button>
          <button type="button" class="btn btn-ghost" id="gg-undo" ${bowlWords.length ? '' : 'disabled'}>Remove last</button>
        </div>
        <div class="action-bar"><div class="action-bar-inner">
          <button type="button" class="btn" id="gg-play" ${bowlWords.length >= 5 ? '' : 'disabled'}>${bowlWords.length >= 5 ? 'Start game' : 'Add at least 5 words'}</button></div></div>`;
    }

    function introHTML() {
      const r = isFish ? G.FISHBOWL_ROUNDS[game.round - 1] : null;
      const sub = isFish ? `Round ${game.round} of 3: <strong>${esc(r.name)}</strong>` : `Round ${Math.floor(game.turnsPlayed / game.teams.length) + 1} of ${game.rounds}`;
      const secs = isFish && carry > 0 ? carry : load().turnSeconds;
      return `<div class="page-head"><p class="muted">${sub}</p>
          <h1 tabindex="-1"><span class="imp-who">${esc(team().name)}</span>’s turn</h1>
          <p>Pick someone to ${isFish && game.round < 3 ? 'give clues' : 'act'} and hand them the phone. Everyone else on ${esc(team().name)} guesses.</p>
          ${r ? `<p class="gg-rule">${esc(r.rule)}</p>` : '<p class="gg-rule">No talking, no pointing at things in the room, no spelling it out.</p>'}
          <p class="muted">${Math.round(secs)} seconds${isFish && carry > 0 ? ' (time left over from last round)' : ''}.</p></div>
        ${scoresHTML(true)}
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="gg-go">Start turn ▶</button></div></div>`;
    }

    function liveHTML() {
      const c = game.current;
      return `<div class="gg-live${paused ? ' paused' : ''}">
          <div class="gg-time" id="gg-time" role="timer" aria-live="off">${P.fmt(timer ? timer.remaining : 0)}</div>
          <p class="muted">${esc(team().name)} · ${c.got.length} so far${isFish ? ` · ${game.bowl.length + 1} left in the bowl` : ''}</p>
          <h1 class="gg-word" tabindex="-1">${paused ? 'Paused' : esc(c.word)}</h1>
          ${paused ? '<p>The word is hidden while paused.</p>' : ''}
        </div>
        <div class="action-bar gg-actions"><div class="action-bar-inner">
          ${paused ? '<button type="button" class="btn" id="gg-resume">Resume ▶</button>' : `
          <button type="button" class="btn btn-secondary" id="gg-skip" ${isFish && !game.bowl.length ? 'disabled' : ''}>Skip</button>
          <button type="button" class="btn" id="gg-got">Got it ✓</button>`}
        </div></div>`;
    }

    function turnEndHTML(reason) {
      const c = game.lastTurn;
      return `<div class="page-head"><h1 tabindex="-1">${reason === 'bowl' ? 'Bowl empty! 🎉' : 'Time’s up! ⏰'}</h1>
          <p>${esc(c.team)} got <strong>${c.got.length}</strong>.</p></div>
        ${c.got.length ? `<ul class="gg-got">${c.got.map((w) => `<li>✓ ${esc(w)}</li>`).join('')}</ul>` : ''}
        ${scoresHTML(false)}
        <div class="action-bar"><div class="action-bar-inner">
          <button type="button" class="btn" id="gg-continue">${game.over ? 'See results' : reason === 'bowl' ? (game.round >= 3 ? 'See results' : `Start round ${game.round + 1}`) : 'Next team'}</button></div></div>`;
    }

    function overHTML() {
      const lead = G.leaders(game);
      return `<div class="page-head"><h1 tabindex="-1">🏆 ${lead.length > 1 ? 'It’s a tie!' : esc(lead[0].name) + ' win!'}</h1></div>
        ${scoresHTML(false)}
        ${isFish ? `<table class="history gg-rounds"><thead><tr><th>Team</th><th>R1</th><th>R2</th><th>R3</th></tr></thead>
          <tbody>${game.teams.map((t) => `<tr><td>${esc(t.name)}</td>${t.roundScores.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
        <div class="action-bar"><div class="action-bar-inner">
          <button type="button" class="btn btn-secondary" id="gg-menu">Back to menu</button>
          <button type="button" class="btn" id="gg-again">Play again</button></div></div>`;
    }

    /* ---------------- Behaviour ---------------- */
    function render(root, extra) {
      root.innerHTML = phase === 'setup' ? setupHTML(load())
        : phase === 'words' ? wordsHTML()
        : phase === 'intro' ? introHTML()
        : phase === 'live' ? liveHTML()
        : phase === 'turnEnd' ? turnEndHTML(extra)
        : overHTML();
      ({ setup: wireSetup, words: wireWords, intro: wireIntro, live: wireLive, turnEnd: wireTurnEnd, over: wireOver })[phase](root, extra);
      if (phase !== 'live' || !extra) P.focusHeading(root);
    }

    function start(root) {
      const s = load();
      const words = isFish ? bowlWords : [].concat(...s.decks.map((d) => charadesDecks()[d] || []));
      game = G.createGame({ mode, teams: s.teamNames.slice(0, s.teamCount).concat(new Array(s.teamCount).fill('')).slice(0, s.teamCount), words, rounds: s.rounds }, Math.random);
      carry = 0;
      phase = 'intro';
      render(root);
    }

    function wireSetup(root) {
      const form = root.querySelector('#gg-setup');
      const read = () => {
        const s = load();
        s.teamNames = P.readNames(form, s.teamNames);
        s.turnSeconds = Number(form.querySelector('#gg-time').value);
        if (!isFish) {
          const d = Array.from(form.querySelectorAll('input[name="gg-deck"]:checked')).map((x) => x.value);
          s.decks = d.length ? d : s.decks;
        }
        return s;
      };
      form.addEventListener('input', () => save(read()));
      form.addEventListener('change', (e) => {
        if (e.target.name === 'gg-deck' && !form.querySelector('input[name="gg-deck"]:checked')) {
          e.target.checked = true; // keep at least one deck
          CGR.ui.toast('Pick at least one category');
        }
        save(read());
      });
      P.wireSteppers(root, (key, d) => {
        const s = read();
        if (key === 'teamCount') s.teamCount = P.clamp(s.teamCount + d, 2, G.MAX_TEAMS);
        else s.rounds = P.clamp(s.rounds + d, 1, 10);
        save(s);
        render(root);
      });
      root.querySelector('#gg-next').addEventListener('click', () => {
        save(read());
        if (isFish) { phase = 'words'; render(root); } else start(root);
      });
    }

    function wireWords(root) {
      const input = root.querySelector('#gg-word');
      const update = () => {
        const n = bowlWords.length;
        root.querySelector('#gg-count').textContent = `${n} ${n === 1 ? 'word' : 'words'} in the bowl`;
        root.querySelector('#gg-undo').disabled = !n;
        const play = root.querySelector('#gg-play');
        play.disabled = n < 5;
        play.textContent = n >= 5 ? 'Start game' : 'Add at least 5 words';
      };
      root.querySelector('#gg-word-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const before = bowlWords.length;
        bowlWords = G.cleanWords(bowlWords.concat(input.value));
        input.value = '';
        CGR.ui.toast(bowlWords.length > before ? 'Added ✓' : 'Already in the bowl');
        update();
        input.focus();
      });
      root.querySelector('#gg-random').addEventListener('click', () => {
        const all = [].concat(...Object.values(CGR.impostorWords));
        const pick = G.shuffle(all, Math.random).filter((w) => bowlWords.indexOf(w) === -1).slice(0, 10);
        bowlWords = G.cleanWords(bowlWords.concat(pick));
        CGR.ui.toast('Added 10 random words');
        update();
      });
      root.querySelector('#gg-undo').addEventListener('click', () => { bowlWords.pop(); CGR.ui.toast('Removed the last word'); update(); });
      root.querySelector('#gg-play').addEventListener('click', () => start(root));
    }

    function wireIntro(root) {
      root.querySelector('#gg-go').addEventListener('click', () => {
        P.unlockAudio();
        G.startTurn(game, Math.random);
        const secs = isFish && carry > 0 ? carry : load().turnSeconds;
        carry = 0;
        paused = false;
        timer = P.countdown(secs, (r) => {
          const el = document.getElementById('gg-time');
          if (el) el.textContent = P.fmt(r);
          if (r > 0 && r <= 5 && Math.ceil(r) !== timer._lastBeep) { timer._lastBeep = Math.ceil(r); P.beep(1000, 80, 0.1); }
        }, () => finishTurn(root, 'time'));
        phase = 'live';
        render(root);
        timer.start();
      });
    }

    function finishTurn(root, reason) {
      const remaining = timer ? timer.remaining : 0;
      stopTimer();
      if (reason === 'time') { P.beep(300, 500, 0.25, 'square'); P.vibrate([300]); }
      const c = game.current;
      game.lastTurn = { team: team().name, got: c ? c.got.slice() : [] };
      if (reason === 'bowl') carry = Math.max(5, Math.round(remaining));
      G.endTurn(game, Math.random);
      phase = 'turnEnd';
      render(root, reason);
    }

    function wireLive(root) {
      const resume = root.querySelector('#gg-resume');
      if (resume) {
        resume.addEventListener('click', () => { paused = false; render(root, true); timer.start(); });
        return;
      }
      root.querySelector('#gg-got').addEventListener('click', () => {
        G.gotIt(game, Math.random);
        P.beep(1400, 70, 0.08);
        if (game.roundOver) { finishTurn(root, 'bowl'); return; }
        render(root, true);
      });
      root.querySelector('#gg-skip').addEventListener('click', () => { G.skip(game, Math.random); render(root, true); });
    }

    function wireTurnEnd(root, reason) {
      root.querySelector('#gg-continue').addEventListener('click', () => {
        if (reason === 'bowl') G.nextRound(game, Math.random);
        phase = game.over ? 'over' : 'intro';
        render(root);
      });
    }

    function wireOver(root) {
      root.querySelector('#gg-again').addEventListener('click', () => {
        if (isFish) { phase = 'words'; render(root); } else start(root);
      });
      root.querySelector('#gg-menu').addEventListener('click', () => { game = null; phase = 'setup'; location.hash = '#/party'; });
    }

    return function view() {
      return {
        title: isFish ? 'Fishbowl' : 'Charades',
        back: '#/party',
        html: '<div id="gg-root" class="imp"></div>',
        onMount(v) {
          const root = v.querySelector('#gg-root');
          if (phase === 'live' && timer) { timer.pause(); paused = true; }
          render(root, phase === 'live');
          // Pause the clock (and hide the word) if the phone is locked or the app is backgrounded.
          cleanup = [P.onBackground(() => {
            if (phase === 'live' && timer && timer.running) { timer.pause(); paused = true; render(root, true); }
          })];
        },
        onUnmount() {
          if (timer && timer.running) { timer.pause(); paused = true; }
          cleanup.forEach((f) => f()); cleanup = [];
        },
        async confirmLeave() {
          if (phase === 'setup' || phase === 'over' || (phase === 'words' && !bowlWords.length)) return true;
          const ok = await CGR.ui.confirm('Quit this game?', 'Scores will be lost.', 'Quit', true);
          if (ok) { stopTimer(); game = null; phase = 'setup'; bowlWords = []; paused = false; }
          return ok;
        }
      };
    };
  }

  CGR.views.charades = makeView('charades');
  CGR.views.fishbowl = makeView('fishbowl');
})();
