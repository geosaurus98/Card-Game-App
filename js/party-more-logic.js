/* Pure logic (no DOM) for Forehead Guess tilt, prompt decks, Most Likely To,
 * Would You Rather, Never Have I Ever and Categories Countdown.
 * Browser: CGR.moreLogic; Node: module.exports. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.moreLogic = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  function randomInt(n, rng) { return Math.floor((rng || Math.random)() * n); }
  function shuffle(list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomInt(i + 1, rng);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- Prompt deck: every card once before any repeats ----------
   * A plain object so it can be saved in localStorage. Items are indexes. */
  function createDeck(size, rng) {
    const order = shuffle(Array.from({ length: size }, (_, i) => i), rng);
    return { size, order, pos: 0, last: null };
  }
  function drawCard(deck, rng) {
    if (!deck.size) return null;
    if (deck.pos >= deck.order.length) {
      let order = shuffle(Array.from({ length: deck.size }, (_, i) => i), rng);
      // Don't show the same card twice in a row across a reshuffle.
      if (deck.size > 1 && order[0] === deck.last) order.push(order.shift());
      deck.order = order;
      deck.pos = 0;
    }
    deck.last = deck.order[deck.pos++];
    return deck.last;
  }

  /* ---------- Forehead Guess tilt detection ----------
   * z = accelerationIncludingGravity.z (m/s²). Held upright on the forehead, z ≈ 0.
   * Nodding forward (screen to the floor) gives a strongly negative z → 'correct';
   * tipping back (screen to the ceiling) gives a strongly positive z → 'pass'.
   * After an action the phone must come back near upright before the next one.
   * Returns { action: 'correct'|'pass'|null, armed } — pass `armed` back in next time. */
  const TILT = { trigger: 6.5, rearm: 3 };
  function readTilt(z, armed, flipped) {
    if (typeof z !== 'number' || isNaN(z)) return { action: null, armed };
    const v = flipped ? -z : z;
    if (!armed) return { action: null, armed: Math.abs(v) < TILT.rearm };
    if (v <= -TILT.trigger) return { action: 'correct', armed: false };
    if (v >= TILT.trigger) return { action: 'pass', armed: false };
    return { action: null, armed: true };
  }

  /* ---------- Most Likely To ---------- */
  function addVote(tally, name, n) {
    const t = Object.assign({}, tally);
    t[name] = Math.max(0, (t[name] || 0) + (n == null ? 1 : n));
    if (!t[name]) delete t[name];
    return t;
  }
  /* [{ name, votes }] highest first; names given in `order` break ties (seat order). */
  function ranking(tally, order) {
    const seat = (n) => { const i = (order || []).indexOf(n); return i === -1 ? 1e9 : i; };
    return Object.keys(tally).filter((n) => tally[n] > 0)
      .map((name) => ({ name, votes: tally[name] }))
      .sort((a, b) => b.votes - a.votes || seat(a.name) - seat(b.name));
  }

  /* ---------- Would You Rather ---------- */
  /* Percentages that add up to 100 (or 0/0 with no votes). */
  function split(a, b) {
    const total = a + b;
    if (!total) return { a: 0, b: 0, total: 0 };
    const pa = Math.round((a / total) * 100);
    return { a: pa, b: 100 - pa, total };
  }

  /* ---------- Never Have I Ever (lives) ---------- */
  function createLives(names, lives) {
    const n = Math.max(1, Math.min(10, Math.round(lives) || 5));
    return { lives: n, players: names.map((name) => ({ name, lives: n })) };
  }
  /* Change a player's lives by d (normally −1), clamped to 0..max. */
  function changeLife(state, index, d) {
    const p = state.players[index];
    if (p) p.lives = Math.max(0, Math.min(state.lives, p.lives + d));
    return state;
  }
  function alive(state) { return state.players.filter((p) => p.lives > 0); }
  /* The game is over when at most one player still has lives (needs 2+ players). */
  function livesOver(state) { return state.players.length > 1 && alive(state).length <= 1; }

  /* ---------- Categories Countdown ----------
   * Players answer in turn; each answer passes play to the next player still in.
   * Run out of time and you lose a life (and a new category starts). The turn time
   * shrinks by one second each time play goes all the way round, down to a minimum. */
  function createCategories(opts, rng) {
    const names = (opts.players || []).filter((n) => n != null);
    if (names.length < 2) throw new Error('Need at least 2 players');
    const lives = Math.max(1, Math.min(5, Math.round(opts.lives) || 3));
    return {
      players: names.map((name) => ({ name, lives })),
      lives,
      startSeconds: Math.max(3, Math.min(30, Math.round(opts.startSeconds) || 10)),
      minSeconds: Math.max(2, Math.min(10, Math.round(opts.minSeconds) || 4)),
      current: randomInt(names.length, rng), // random first player
      laps: 0,
      sinceLap: 0,   // answers since the time last shrank
      answers: 0,    // answers in the current category
      over: false
    };
  }
  function inPlayers(g) { return g.players.filter((p) => p.lives > 0); }
  function turnSeconds(g) { return Math.max(g.minSeconds, g.startSeconds - g.laps); }
  function nextAlive(g, from) {
    for (let k = 1; k <= g.players.length; k++) {
      const i = (from + k) % g.players.length;
      if (g.players[i].lives > 0) return i;
    }
    return from;
  }
  /* The current player answered in time. */
  function answered(g) {
    if (g.over) return g;
    g.answers += 1;
    g.sinceLap += 1;
    if (g.sinceLap >= inPlayers(g).length) { g.laps += 1; g.sinceLap = 0; }
    g.current = nextAlive(g, g.current);
    return g;
  }
  /* The current player ran out of time (or gave a bad answer): lose a life,
   * start a fresh category; the next player still in goes first. */
  function timedOut(g) {
    if (g.over) return g;
    const p = g.players[g.current];
    p.lives = Math.max(0, p.lives - 1);
    g.answers = 0;
    g.sinceLap = 0;
    if (inPlayers(g).length <= 1) { g.over = true; return g; }
    g.current = nextAlive(g, g.current);
    return g;
  }
  function winner(g) { const a = inPlayers(g); return g.over && a.length === 1 ? a[0] : null; }

  return { shuffle, createDeck, drawCard, TILT, readTilt, addVote, ranking, split, createLives, changeLife, alive, livesOver,
    createCategories, inPlayers, turnSeconds, answered, timedOut, winner };
});
