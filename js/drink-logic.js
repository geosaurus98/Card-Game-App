/* Drinking games — pure logic (no DOM). Browser: CGR.drinkLogic; Node: module.exports.
 * Cards are strings like "7H", "10S", "QD", "AC" (rank + suit letter). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.drinkLogic = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['C', 'D', 'H', 'S'];
  const SUIT_SYM = { C: '♣', D: '♦', H: '♥', S: '♠' };
  const SUIT_NAME = { C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' };

  function randomInt(n, rng) { return Math.floor((rng || Math.random)() * n); }
  function shuffle(a, rng) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1, rng); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- Cards ---------- */
  const rankOf = (c) => c.slice(0, -1);
  const suitOf = (c) => c.slice(-1);
  const isRed = (c) => suitOf(c) === 'H' || suitOf(c) === 'D';
  /* Ace high (A = 14) unless aceLow. */
  function value(c, aceLow) { const r = rankOf(c); const i = RANKS.indexOf(r); return r === 'A' ? (aceLow ? 1 : 14) : i + 1; }
  function label(c) { return rankOf(c) + SUIT_SYM[suitOf(c)]; }
  function newDeck(rng, opts) {
    const o = opts || {};
    const ranks = o.ranks || RANKS;
    const cards = [];
    SUITS.forEach((s) => ranks.forEach((r) => cards.push(r + s)));
    return shuffle(cards, rng);
  }

  /* ---------- Higher / lower, red / black, inside / outside, suit ---------- */
  /* guess: 'higher'|'lower'; equal counts as wrong unless equalWins. */
  function higherLower(prev, next, guess, equalWins) {
    const a = value(prev), b = value(next);
    if (a === b) return !!equalWins;
    return guess === 'higher' ? b > a : b < a;
  }
  /* guess: 'inside'|'outside' relative to cards a and b; landing on either edge is wrong. */
  function insideOutside(a, b, c, guess) {
    const lo = Math.min(value(a), value(b)), hi = Math.max(value(a), value(b)), v = value(c);
    if (v === lo || v === hi) return false;
    const inside = v > lo && v < hi;
    return guess === 'inside' ? inside : !inside;
  }
  /* The four Ride the Bus questions. cards = cards dealt so far this run, card = the new one. */
  function busAnswer(step, cards, card, guess) {
    if (step === 0) return (guess === 'red') === isRed(card);
    if (step === 1) return higherLower(cards[0], card, guess);
    if (step === 2) return insideOutside(cards[0], cards[1], card, guess);
    return suitOf(card) === guess;
  }
  const BUS_STEPS = ['Red or black?', 'Higher or lower?', 'Inside or outside?', 'Which suit?'];

  /* ---------- Pyramid layouts ---------- */
  /* rows: e.g. [5,4,3,2,1] (bottom row first). Returns [{ row (1-based worth), index }] in flip order. */
  function pyramidOrder(rows) {
    const out = [];
    rows.forEach((n, ri) => { for (let i = 0; i < n; i++) out.push({ row: ri + 1, i }); });
    return out;
  }
  /* Who holds this rank: { pid: [cards] } → [pid, …] */
  function holders(hands, card) {
    const r = rankOf(card);
    return Object.keys(hands).filter((p) => hands[p].some((c) => rankOf(c) === r));
  }

  /* ---------- Horse Race ----------
   * Aces are the horses; `length` face-down side cards make the track. Draw from the rest:
   * that suit moves up one. When every horse has passed a side card, flip it and move
   * that suit back one. First past `length` wins. */
  function createRace(rng, length) {
    const L = length || 7;
    const deck = newDeck(rng).filter((c) => rankOf(c) !== 'A');
    const side = deck.splice(0, L);
    return { length: L, pos: { C: 0, D: 0, H: 0, S: 0 }, deck, side, flipped: 0, last: null, events: [], winner: null };
  }
  function raceStep(g) {
    if (g.winner) return g;
    if (!g.deck.length) { g.winner = Object.keys(g.pos).sort((a, b) => g.pos[b] - g.pos[a])[0]; return g; }
    const c = g.deck.shift();
    const s = suitOf(c);
    g.pos[s] += 1;
    g.last = c;
    g.events = [{ type: 'move', card: c, suit: s }];
    if (g.pos[s] > g.length) { g.winner = s; return g; }
    // Flip side cards everybody has passed.
    while (g.flipped < g.length && Object.values(g.pos).every((p) => p > g.flipped)) {
      const sc = g.side[g.flipped];
      g.flipped += 1;
      const ss = suitOf(sc);
      g.pos[ss] = Math.max(0, g.pos[ss] - 1);
      g.events.push({ type: 'back', card: sc, suit: ss });
    }
    return g;
  }
  /* Bets: [{ pid, suit, sips }] → { give: [{pid, sips}], drink: [{pid, sips}] } */
  function settleRace(bets, winner) {
    return {
      give: bets.filter((b) => b.suit === winner).map((b) => ({ pid: b.pid, sips: b.sips })),
      drink: bets.filter((b) => b.suit !== winner).map((b) => ({ pid: b.pid, sips: b.sips }))
    };
  }

  /* ---------- Beat the Dealer ----------
   * The guesser names a rank; if wrong the dealer says higher/lower; second guess.
   * Right first time: dealer drinks `firstSips`; second time: dealer drinks `secondSips`;
   * still wrong: guesser drinks the difference between the guess and the card. */
  function dealerResult(card, guess1, guess2, opts) {
    const o = Object.assign({ firstSips: 5, secondSips: 3 }, opts || {});
    const v = value(card, true);
    const g1 = RANKS.indexOf(guess1) + 1, g2 = guess2 ? RANKS.indexOf(guess2) + 1 : null;
    if (g1 === v) return { who: 'dealer', sips: o.firstSips, tries: 1 };
    if (g2 == null) return { hint: v > g1 ? 'higher' : 'lower' };
    if (g2 === v) return { who: 'dealer', sips: o.secondSips, tries: 2 };
    return { who: 'guesser', sips: Math.abs(g2 - v), tries: 2 };
  }

  /* ---------- Mexico / Mia ----------
   * Two dice, read high die first (3 and 5 = 53). Order: 21 (Mexico) > doubles 66…11 > 65 > 64 … > 31. */
  function mexicoValue(a, b) { const hi = Math.max(a, b), lo = Math.min(a, b); return hi * 10 + lo; }
  function mexicoRank(v) {
    if (v === 21) return 1000;
    const hi = Math.floor(v / 10), lo = v % 10;
    if (hi === lo) return 500 + hi;
    return v; // 31 … 65
  }
  const MEXICO_ORDER = (() => {
    const all = [];
    for (let hi = 2; hi <= 6; hi++) for (let lo = 1; lo < hi; lo++) all.push(hi * 10 + lo);
    for (let d = 1; d <= 6; d++) all.push(d * 11);
    return all.sort((a, b) => mexicoRank(a) - mexicoRank(b));
  })();
  function mexicoName(v) { return v === 21 ? 'Mexico (2-1)' : Math.floor(v / 10) === v % 10 ? `Double ${v % 10}s` : String(v); }

  /* ---------- Bust! (21 / 7.5) ---------- */
  const BUST = {
    21: { target: 21, ranks: RANKS, deckNote: 'Full deck. Aces 1 or 11, J/Q/K 10.' },
    7.5: { target: 7.5, ranks: ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'], deckNote: '8s, 9s and 10s removed. A = 1, 2–7 face value, J/Q/K = ½.' }
  };
  function handValue(cards, mode) {
    if (Number(mode) === 7.5) return cards.reduce((s, c) => { const r = rankOf(c); return s + (r === 'J' || r === 'Q' || r === 'K' ? 0.5 : value(c, true)); }, 0);
    let total = 0, aces = 0;
    cards.forEach((c) => { const r = rankOf(c); if (r === 'A') { aces++; total += 11; } else total += ['J', 'Q', 'K'].indexOf(r) !== -1 ? 10 : Number(r); });
    while (total > 21 && aces) { total -= 10; aces--; }
    return total;
  }
  /* results: { pid: value } (busts over target). Returns { busted: [...], best: [...], perfect: [...] }. */
  function bustResults(values, mode) {
    const t = BUST[mode].target;
    const busted = Object.keys(values).filter((p) => values[p] > t);
    const ok = Object.keys(values).filter((p) => values[p] <= t);
    const top = ok.length ? Math.max.apply(null, ok.map((p) => values[p])) : null;
    return { busted, best: top == null ? [] : ok.filter((p) => values[p] === top), perfect: ok.filter((p) => values[p] === t) };
  }

  /* ---------- Up and Down the River ----------
   * Up: card n (1–5) — everyone holding that rank drinks n per matching card.
   * Down: card n — holders give n per matching card. */
  function riverCall(hands, card, n, phase) {
    const r = rankOf(card);
    return Object.keys(hands).map((p) => ({ pid: p, count: hands[p].filter((c) => rankOf(c) === r).length }))
      .filter((x) => x.count).map((x) => ({ pid: x.pid, sips: x.count * n, action: phase === 'up' ? 'drink' : 'give' }));
  }

  /* ---------- Rule Roulette ---------- */
  function spin(items, rng, last) {
    let i = randomInt(items.length, rng);
    if (items.length > 1 && i === last) i = (i + 1) % items.length;
    return i;
  }

  return { RANKS, SUITS, SUIT_SYM, SUIT_NAME, shuffle, rankOf, suitOf, isRed, value, label, newDeck,
    higherLower, insideOutside, busAnswer, BUS_STEPS, pyramidOrder, holders, createRace, raceStep, settleRace,
    dealerResult, mexicoValue, mexicoRank, MEXICO_ORDER, mexicoName, BUST, handValue, bustResults, riverCall, spin };
});
