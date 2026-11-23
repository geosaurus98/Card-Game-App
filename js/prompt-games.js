/* Prompt-deck party games — screens:
 *   Most Likely To (#/most-likely): everyone points at once; optionally tally who gets picked.
 *   Would You Rather (#/would-you-rather): discuss, or pass the phone for a secret vote.
 *   Never Have I Ever (#/never): tap anyone who HAS done it; they lose a life.
 * Decks: party-decks.js. Logic: party-more-logic.js. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const L = CGR.moreLogic;
  const P = CGR.party;
  const esc = CGR.esc;
  const PACKS = [['family', 'Family-friendly'], ['grownup', 'Grown-ups']];

  /* Shared: pick packs, keep a no-repeat deck in localStorage. */
  function packsHTML(s, name) {
    return `<fieldset class="chip-group checks field"><legend>Question packs</legend>
      ${PACKS.map(([k, label]) => `<label><input type="checkbox" name="${name}" value="${k}" ${s.packs.indexOf(k) !== -1 ? 'checked' : ''}><span>${label}</span></label>`).join('')}
      </fieldset>`;
  }
  function readPacks(form, name, fallback) {
    const v = Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((x) => x.value);
    return v.length ? v : fallback;
  }
  function guardPacks(form, name) {
    form.addEventListener('change', (e) => {
      if (e.target.name === name && !form.querySelector(`input[name="${name}"]:checked`)) {
        e.target.checked = true;
        CGR.ui.toast('Pick at least one pack');
      }
    });
  }
  function cleanPacks(p) {
    const ok = Array.isArray(p) ? p.filter((x) => x === 'family' || x === 'grownup') : [];
    return ok.length ? ok : ['family'];
  }
  function namesFrom(s, fallback) {
    return Array.from({ length: s.count }, (_, i) => (String(s.names[i] || '').trim() || fallback + ' ' + (i + 1)).slice(0, 20));
  }

  /* A prompt source: cards from the chosen packs, drawn without repeats. */
  function makeSource(key, data) {
    let deck = null;
    let sig = '';
    let cards = [];
    return {
      next(packs) {
        const s = packs.slice().sort().join(',');
        if (s !== sig) {
          sig = s;
          cards = [].concat(...packs.map((p) => data[p] || []));
          const saved = CGR.store.get(key + '-deck', null);
          deck = saved && saved.sig === sig && saved.deck && saved.deck.size === cards.length ? saved.deck : L.createDeck(cards.length, Math.random);
        }
        const i = L.drawCard(deck, Math.random);
        CGR.store.set(key + '-deck', { sig, deck });
        return cards[i];
      }
    };
  }

  function focus(root) { P.focusHeading(root); }

  /* =======================================================================
   * Most Likely To
   * ===================================================================== */
  (function () {
    const KEY = 'most-likely';
    let phase = 'setup'; // setup | play | board
    let prompt = null;
    let tally = {};
    let history = [];
    let counting = null;
    let source = null;

    function load() {
      const s = CGR.store.get(KEY, {});
      return { count: P.clamp(Math.round(s.count) || 4, 3, 16), names: Array.isArray(s.names) ? s.names : [], packs: cleanPacks(s.packs), track: s.track !== false, drink: !!s.drink };
    }
    const save = (s) => CGR.store.set(KEY, s);

    function setupHTML(s) {
      return `<div class="page-head"><h1 tabindex="-1">Most Likely To</h1>
          <p class="muted">Read the question, count down from three, then everyone points at the person most likely to do it. Majority takes the point!</p></div>
        <form id="ml-setup" onsubmit="return false">
          <label class="switch-row field"><input type="checkbox" id="ml-track" role="switch" ${s.track ? 'checked' : ''}>
            <span><strong>Keep score</strong><br><span class="muted small">Tap whoever got the most fingers pointed at them. See who ends up “most likely” overall.</span></span></label>
          ${s.track ? `<fieldset class="field"><legend>Players</legend>${P.stepperHTML('count', s.count, 3, 16, 'players')}</fieldset>
          <fieldset class="field"><legend>Names</legend>${P.namesHTML(s.count, s.names, (i) => 'Player ' + (i + 1))}</fieldset>` : ''}
          ${packsHTML(s, 'ml-pack')}
          ${P.drinkSwitchHTML('ml-drink', s.drink, 'Whoever gets the most fingers drinks.')}
        </form>
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="ml-start">Start</button></div></div>`;
    }

    function playHTML(s) {
      const names = namesFrom(s, 'Player');
      return `<div class="pg-card" role="status">
          <p class="pg-lead">Who’s most likely to…</p>
          <h1 class="pg-prompt" tabindex="-1">${esc(prompt)}?</h1>
          <div class="pg-count" id="ml-count" aria-live="assertive"></div>
        </div>
        <div class="btn-row center"><button type="button" class="btn btn-secondary" id="ml-321">3, 2, 1… point! 👉</button></div>
        ${s.track ? `<p class="muted small center">Tap whoever got the most fingers pointed at them (tap both for a tie):</p>
        <ul class="pg-people">${names.map((n) => `<li><button type="button" class="pg-person" data-name="${esc(n)}"><span>${esc(n)}</span><strong>${tally[n] || 0}</strong></button></li>`).join('')}</ul>
        <div class="btn-row center"><button type="button" class="btn btn-ghost" id="ml-undo" ${history.length ? '' : 'disabled'}>Undo last</button>
          <button type="button" class="btn btn-ghost" id="ml-board">🏆 Leaderboard</button></div>` : ''}
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="ml-next">Next question ▶</button></div></div>`;
    }

    function boardHTML(s) {
      const rank = L.ranking(tally, namesFrom(s, 'Player'));
      return `<div class="page-head"><h1 tabindex="-1">🏆 Most likely overall</h1></div>
        ${rank.length ? `<ol class="pg-board">${rank.map((r, i) => `<li><span class="pg-pos">${i + 1}</span><span>${esc(r.name)}</span><strong>${r.votes}</strong></li>`).join('')}</ol>` : '<p class="empty">No votes yet.</p>'}
        <div class="action-bar"><div class="action-bar-inner">
          <button type="button" class="btn btn-secondary" id="ml-reset">New game</button>
          <button type="button" class="btn" id="ml-back">Keep playing</button></div></div>`;
    }

    function render(root) {
      const s = load();
      if (counting) { clearInterval(counting); counting = null; }
      root.innerHTML = phase === 'setup' ? setupHTML(s) : phase === 'play' ? playHTML(s) : boardHTML(s);
      ({ setup: wireSetup, play: wirePlay, board: wireBoard })[phase](root);
      focus(root);
    }

    function wireSetup(root) {
      const form = root.querySelector('#ml-setup');
      guardPacks(form, 'ml-pack');
      const read = () => {
        const s = load();
        s.names = P.readNames(form, s.names);
        s.packs = readPacks(form, 'ml-pack', s.packs);
        s.track = form.querySelector('#ml-track').checked;
        s.drink = form.querySelector('#ml-drink').checked;
        return s;
      };
      form.addEventListener('input', () => save(read()));
      form.addEventListener('change', async (e) => { if (e.target.id === 'ml-drink') await P.drinkConfirm(e.target); save(read()); if (e.target.id === 'ml-track') render(root); });
      P.wireSteppers(root, (k, d) => { const s = read(); s.count = P.clamp(s.count + d, 3, 16); save(s); render(root); });
      root.querySelector('#ml-start').addEventListener('click', () => {
        save(read());
        tally = {}; history = [];
        source = source || makeSource(KEY, CGR.partyDecks.mostLikely);
        prompt = source.next(load().packs);
        phase = 'play';
        render(root);
      });
    }

    function wirePlay(root) {
      root.querySelector('#ml-next').addEventListener('click', () => { prompt = source.next(load().packs); render(root); });
      root.querySelector('#ml-321').addEventListener('click', () => {
        P.unlockAudio();
        const el = root.querySelector('#ml-count');
        let n = 3;
        el.textContent = n; P.beep(700, 90, 0.1);
        if (counting) clearInterval(counting);
        counting = setInterval(() => {
          n -= 1;
          if (n > 0) { el.textContent = n; P.beep(700, 90, 0.1); return; }
          clearInterval(counting); counting = null;
          el.textContent = load().drink ? 'Point! 👉 Most fingers drinks 🍺' : 'Point! 👉'; P.beep(1200, 250, 0.15); P.vibrate(80);
        }, 800);
      });
      root.querySelectorAll('.pg-person').forEach((b) => b.addEventListener('click', () => {
        tally = L.addVote(tally, b.dataset.name, 1);
        history.push(b.dataset.name);
        b.querySelector('strong').textContent = tally[b.dataset.name];
        const u = root.querySelector('#ml-undo'); if (u) u.disabled = false;
        if (load().drink) CGR.ui.toast(`${b.dataset.name} drinks! 🍺`);
      }));
      const undo = root.querySelector('#ml-undo');
      if (undo) undo.addEventListener('click', () => {
        const n = history.pop();
        if (n) tally = L.addVote(tally, n, -1);
        const b = Array.from(root.querySelectorAll('.pg-person')).find((x) => x.dataset.name === n);
        if (b) b.querySelector('strong').textContent = tally[n] || 0;
        undo.disabled = !history.length;
      });
      const board = root.querySelector('#ml-board');
      if (board) board.addEventListener('click', () => { phase = 'board'; render(root); });
    }

    function wireBoard(root) {
      root.querySelector('#ml-back').addEventListener('click', () => { phase = 'play'; render(root); });
      root.querySelector('#ml-reset').addEventListener('click', () => { tally = {}; history = []; phase = 'setup'; render(root); });
    }

    CGR.views['most-likely'] = function () {
      return {
        title: 'Most Likely To', back: '#/party',
        html: '<div id="ml-root" class="imp"></div>',
        onMount(v) { render(v.querySelector('#ml-root')); },
        onUnmount() { if (counting) { clearInterval(counting); counting = null; } },
        async confirmLeave() {
          if (phase === 'setup' || !history.length) { phase = 'setup'; return true; }
          const ok = await CGR.ui.confirm('Quit this game?', 'The tally will be lost.', 'Quit', true);
          if (ok) { phase = 'setup'; tally = {}; history = []; }
          return ok;
        }
      };
    };
  })();

  /* =======================================================================
   * Would You Rather
   * ===================================================================== */
  (function () {
    const KEY = 'would-you-rather';
    let phase = 'setup'; // setup | play | vote | pass | result
    let pair = null;
    let votes = { a: 0, b: 0 };
    let source = null;

    function load() {
      const s = CGR.store.get(KEY, {});
      return { packs: cleanPacks(s.packs), secret: !!s.secret, voters: P.clamp(Math.round(s.voters) || 4, 2, 20), drink: !!s.drink };
    }
    const save = (s) => CGR.store.set(KEY, s);

    function setupHTML(s) {
      return `<div class="page-head"><h1 tabindex="-1">Would You Rather</h1>
          <p class="muted">Two choices, no sitting on the fence. Everyone picks one — then explain yourself!</p></div>
        <form id="wr-setup" onsubmit="return false">
          ${packsHTML(s, 'wr-pack')}
          <label class="switch-row field"><input type="checkbox" id="wr-secret" role="switch" ${s.secret ? 'checked' : ''}>
            <span><strong>Secret vote</strong><br><span class="muted small">Pass the phone round and vote privately, then reveal how the group split.</span></span></label>
          ${s.secret ? `<fieldset class="field"><legend>Voters</legend>${P.stepperHTML('voters', s.voters, 2, 20, 'voters')}</fieldset>` : ''}
          ${P.drinkSwitchHTML('wr-drink', s.drink, 'Everyone on the smaller side drinks.')}
        </form>
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="wr-start">Start</button></div></div>`;
    }

    function choiceButtons(id) {
      return `<div class="wr-choices">
          <button type="button" class="wr-choice a" data-pick="a" id="${id}-a"><span class="wr-or">A</span>${esc(pair[0])}</button>
          <span class="wr-vs" aria-hidden="true">or</span>
          <button type="button" class="wr-choice b" data-pick="b" id="${id}-b"><span class="wr-or">B</span>${esc(pair[1])}</button>
        </div>`;
    }

    function playHTML(s) {
      if (s.secret) {
        return `<div class="page-head center"><p class="muted">Would you rather…</p><h1 tabindex="-1" class="pg-prompt">${esc(pair[0])} <span class="muted">or</span> ${esc(pair[1])}?</h1>
            <p>Talk it over, then pass the phone round. Each person taps their choice in secret.</p></div>
          <div class="action-bar"><div class="action-bar-inner">
            <button type="button" class="btn btn-secondary" id="wr-skip">Skip</button>
            <button type="button" class="btn" id="wr-vote">Start voting (${s.voters} voters)</button></div></div>`;
      }
      return `<div class="page-head center"><h1 tabindex="-1" class="pg-lead-h">Would you rather…</h1></div>
        ${choiceButtons('wr')}
        <p class="muted small center">Everyone shout or point at the same time. Tap a side to highlight it.${load().drink ? ' <strong>The smaller side drinks! 🍺</strong>' : ''}</p>
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="wr-next">Next ▶</button></div></div>`;
    }

    function voteHTML(s) {
      const n = votes.a + votes.b + 1;
      return `<div class="page-head center"><p class="muted">Voter ${n} of ${s.voters}</p><h1 tabindex="-1" class="pg-lead-h">Would you rather…</h1></div>
        ${choiceButtons('wv')}
        <p class="muted small center">Your choice is hidden as soon as you tap.</p>`;
    }

    function passHTML(s) {
      const n = votes.a + votes.b;
      return `<div class="imp-pass"><h1 tabindex="-1">Vote saved ✓</h1>
          <p>Pass the phone to voter ${n + 1} of ${s.voters}.</p></div>
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="wr-ready">I’m voter ${n + 1} — show the choice</button></div></div>`;
    }

    function resultHTML() {
      const sp = L.split(votes.a, votes.b);
      return `<div class="page-head center"><h1 tabindex="-1">The group says…</h1></div>
        <div class="wr-result">
          <div class="wr-bar a" style="--pct:${sp.a}%"><span>${esc(pair[0])}</span><strong>${sp.a}% · ${votes.a}</strong></div>
          <div class="wr-bar b" style="--pct:${sp.b}%"><span>${esc(pair[1])}</span><strong>${sp.b}% · ${votes.b}</strong></div>
        </div>
        <p class="center">${votes.a === votes.b ? (load().drink ? 'A perfect split — everyone drinks! 🍺' : 'A perfect split! Fight it out.') : load().drink ? `🍺 Everyone who chose <strong>${esc(votes.a < votes.b ? pair[0] : pair[1])}</strong> drinks.` : 'The minority has some explaining to do…'}</p>
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="wr-next">Next question ▶</button></div></div>`;
    }

    function render(root) {
      const s = load();
      root.innerHTML = ({ setup: setupHTML, play: playHTML, vote: voteHTML, pass: passHTML, result: resultHTML })[phase](s);
      ({ setup: wireSetup, play: wirePlay, vote: wireVote, pass: wirePass, result: wirePlay })[phase](root);
      focus(root);
    }

    function nextPair() { pair = source.next(load().packs); votes = { a: 0, b: 0 }; phase = 'play'; }

    function wireSetup(root) {
      const form = root.querySelector('#wr-setup');
      guardPacks(form, 'wr-pack');
      const read = () => { const s = load(); s.packs = readPacks(form, 'wr-pack', s.packs); s.secret = form.querySelector('#wr-secret').checked; s.drink = form.querySelector('#wr-drink').checked; return s; };
      form.addEventListener('change', async (e) => { if (e.target.id === 'wr-drink') await P.drinkConfirm(e.target); save(read()); if (e.target.id === 'wr-secret') render(root); });
      P.wireSteppers(root, (k, d) => { const s = read(); s.voters = P.clamp(s.voters + d, 2, 20); save(s); render(root); });
      root.querySelector('#wr-start').addEventListener('click', () => {
        save(read());
        source = source || makeSource(KEY, CGR.partyDecks.wouldRather);
        nextPair();
        render(root);
      });
    }

    function wirePlay(root) {
      const next = root.querySelector('#wr-next');
      if (next) next.addEventListener('click', () => { nextPair(); render(root); });
      const skip = root.querySelector('#wr-skip');
      if (skip) skip.addEventListener('click', () => { nextPair(); render(root); });
      const vote = root.querySelector('#wr-vote');
      if (vote) vote.addEventListener('click', () => { votes = { a: 0, b: 0 }; phase = 'vote'; render(root); });
      root.querySelectorAll('.wr-choice').forEach((b) => b.addEventListener('click', () => {
        root.querySelectorAll('.wr-choice').forEach((x) => x.classList.toggle('picked', x === b));
      }));
    }

    function wireVote(root) {
      root.querySelectorAll('.wr-choice').forEach((b) => b.addEventListener('click', () => {
        votes[b.dataset.pick] += 1;
        P.vibrate(40);
        phase = votes.a + votes.b >= load().voters ? 'result' : 'pass';
        render(root);
      }));
    }

    function wirePass(root) {
      root.querySelector('#wr-ready').addEventListener('click', () => { phase = 'vote'; render(root); });
    }

    CGR.views['would-you-rather'] = function () {
      return {
        title: 'Would You Rather', back: '#/party',
        html: '<div id="wr-root" class="imp"></div>',
        onMount(v) { if (phase === 'vote' || phase === 'pass') phase = 'pass'; render(v.querySelector('#wr-root')); },
        confirmLeave() { phase = 'setup'; return true; }
      };
    };
  })();

  /* =======================================================================
   * Never Have I Ever
   * ===================================================================== */
  (function () {
    const KEY = 'never';
    let phase = 'setup'; // setup | play | over
    let prompt = null;
    let state = null;   // L.createLives
    let history = [];   // indexes that lost a life this game (for undo)
    let source = null;

    function load() {
      const s = CGR.store.get(KEY, {});
      return { count: P.clamp(Math.round(s.count) || 4, 2, 16), names: Array.isArray(s.names) ? s.names : [], lives: P.clamp(Math.round(s.lives) || 5, 3, 10), packs: cleanPacks(s.packs), drink: !!s.drink };
    }
    const save = (s) => CGR.store.set(KEY, s);

    function setupHTML(s) {
      return `<div class="page-head"><h1 tabindex="-1">Never Have I Ever</h1>
          <p class="muted">Read the statement out. Anyone who <em>has</em> done it puts a finger down (loses a life). Last one with lives left wins — and you’ll hear some stories.</p></div>
        <form id="nv-setup" onsubmit="return false">
          <fieldset class="field"><legend>Players</legend>${P.stepperHTML('count', s.count, 2, 16, 'players')}</fieldset>
          <fieldset class="field"><legend>Names</legend>${P.namesHTML(s.count, s.names, (i) => 'Player ' + (i + 1))}</fieldset>
          ${P.drinkSwitchHTML('nv-drink', s.drink, 'Instead of losing lives, everyone who has done it drinks. No one is knocked out.')}
          ${s.drink ? '' : `<fieldset class="field"><legend>Lives (fingers) each</legend>${P.stepperHTML('lives', s.lives, 3, 10, 'lives')}</fieldset>`}
          ${packsHTML(s, 'nv-pack')}
        </form>
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="nv-start">Start</button></div></div>`;
    }

    function livesHTML(p) {
      if (state.drink) return `<strong class="nv-sips">🍺 ${state.lives - p.lives}</strong>`;
      const dots = [];
      for (let i = 0; i < state.lives; i++) dots.push(`<i class="${i < p.lives ? 'on' : ''}"></i>`);
      return `<span class="nv-lives" aria-label="${p.lives} of ${state.lives} lives">${dots.join('')}</span>`;
    }

    function playHTML() {
      return `<div class="pg-card" role="status">
          <p class="pg-lead">Never have I ever…</p>
          <h1 class="pg-prompt" tabindex="-1">${esc(prompt)}</h1>
        </div>
        <p class="muted small center">Tap everyone who <strong>has</strong> done it${state.drink ? ' — they drink 🍺' : ''}:</p>
        <ul class="pg-people nv">${state.players.map((p, i) => `<li><button type="button" class="pg-person${p.lives ? '' : ' out'}" data-i="${i}" ${p.lives ? '' : 'disabled'}>
          <span>${esc(p.name)}</span>${livesHTML(p)}</button></li>`).join('')}</ul>
        <div class="btn-row center"><button type="button" class="btn btn-ghost" id="nv-undo" ${history.length ? '' : 'disabled'}>Undo last</button></div>
        <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="nv-next">Next ▶</button></div></div>`;
    }

    function overHTML() {
      const a = L.alive(state);
      return `<div class="page-head"><h1 tabindex="-1">🏆 ${a.length === 1 ? esc(a[0].name) + ' wins!' : 'Everyone’s out!'}</h1>
          <p>${a.length === 1 ? 'The most innocent player at the table… apparently.' : ''}</p></div>
        <ul class="pg-people nv">${state.players.map((p) => `<li><div class="pg-person${p.lives ? '' : ' out'}"><span>${esc(p.name)}</span>${livesHTML(p)}</div></li>`).join('')}</ul>
        <div class="action-bar"><div class="action-bar-inner">
          <button type="button" class="btn btn-secondary" id="nv-menu">Back to menu</button>
          <button type="button" class="btn" id="nv-again">Play again</button></div></div>`;
    }

    function render(root) {
      root.innerHTML = phase === 'setup' ? setupHTML(load()) : phase === 'play' ? playHTML() : overHTML();
      ({ setup: wireSetup, play: wirePlay, over: wireOver })[phase](root);
      focus(root);
    }

    function startGame() {
      const s = load();
      state = s.drink ? Object.assign(L.createLives(namesFrom(s, 'Player'), 10), { lives: 999, drink: true }) : L.createLives(namesFrom(s, 'Player'), s.lives);
      if (state.drink) state.players.forEach((p) => { p.lives = 999; });
      history = [];
      source = source || makeSource(KEY, CGR.partyDecks.neverHave);
      prompt = source.next(s.packs);
      phase = 'play';
    }

    function wireSetup(root) {
      const form = root.querySelector('#nv-setup');
      guardPacks(form, 'nv-pack');
      const read = () => { const s = load(); s.names = P.readNames(form, s.names); s.packs = readPacks(form, 'nv-pack', s.packs); s.drink = form.querySelector('#nv-drink').checked; return s; };
      form.addEventListener('input', () => save(read()));
      form.addEventListener('change', async (e) => { if (e.target.id === 'nv-drink') { await P.drinkConfirm(e.target); save(read()); render(root); return; } save(read()); });
      P.wireSteppers(root, (k, d) => {
        const s = read();
        if (k === 'count') s.count = P.clamp(s.count + d, 2, 16); else s.lives = P.clamp(s.lives + d, 3, 10);
        save(s); render(root);
      });
      root.querySelector('#nv-start').addEventListener('click', () => { save(read()); startGame(); render(root); });
    }

    function wirePlay(root) {
      root.querySelector('#nv-next').addEventListener('click', () => {
        if (L.livesOver(state)) { phase = 'over'; render(root); return; }
        prompt = source.next(load().packs);
        render(root);
      });
      root.querySelectorAll('.pg-person[data-i]').forEach((b) => b.addEventListener('click', () => {
        const i = Number(b.dataset.i);
        if (!state.players[i].lives) return;
        L.changeLife(state, i, -1);
        history.push(i);
        P.vibrate(40);
        if (L.livesOver(state)) { phase = 'over'; P.beep(1200, 300, 0.15); render(root); return; }
        render(root);
        const again = root.querySelector(`.pg-person[data-i="${i}"]`);
        if (again && !again.disabled) again.focus({ preventScroll: true });
      }));
      root.querySelector('#nv-undo').addEventListener('click', () => {
        const i = history.pop();
        if (i != null) L.changeLife(state, i, 1);
        render(root);
      });
    }

    function wireOver(root) {
      root.querySelector('#nv-again').addEventListener('click', () => { startGame(); render(root); });
      root.querySelector('#nv-menu').addEventListener('click', () => { phase = 'setup'; state = null; location.hash = '#/party'; });
    }

    CGR.views.never = function () {
      return {
        title: 'Never Have I Ever', back: '#/party',
        html: '<div id="nv-root" class="imp"></div>',
        onMount(v) { render(v.querySelector('#nv-root')); },
        async confirmLeave() {
          if (phase !== 'play' || !history.length) { phase = 'setup'; return true; }
          const ok = await CGR.ui.confirm('Quit this game?', 'Everyone’s lives will be reset.', 'Quit', true);
          if (ok) { phase = 'setup'; state = null; }
          return ok;
        }
      };
    };
  })();
})();
