/* Category scorecard for five-dice games (Yacht family) — pure logic, no DOM.
 * Browser: CGR.diceSheet; Node: module.exports (tests: tools/test-dice-sheet.js).
 *
 * Rule sets:
 *   yahtzee — the familiar modern rules: 13 boxes, upper bonus 35 at 63+,
 *             extra five-of-a-kinds earn 100 each, with the joker rule.
 *   yacht   — classic Yacht: 12 boxes, no bonuses.
 *   yatzy   — Nordic Yatzy: 15 boxes, upper bonus 50 at 63+.
 *
 * A sheet is plain data: { [playerId]: { [category]: score } } plus yahtzee-bonus counts. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.diceSheet = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const UPPER = [
    { id: 'ones', name: 'Ones', face: 1 }, { id: 'twos', name: 'Twos', face: 2 }, { id: 'threes', name: 'Threes', face: 3 },
    { id: 'fours', name: 'Fours', face: 4 }, { id: 'fives', name: 'Fives', face: 5 }, { id: 'sixes', name: 'Sixes', face: 6 }
  ].map((c) => Object.assign({ section: 'upper', kind: 'face', hint: `Add up the ${c.face}s` }, c));

  /* kind: face | sum (total of all dice) | ofKind (total of all dice if n alike) | nTimes (n × the face, if n alike)
   *       | fixed (value if pattern) | fullSum (total if full house) | pair | twoPairs */
  const RULES = {
    yahtzee: {
      id: 'yahtzee', name: 'Yahtzee-style', note: '13 boxes · 35 bonus at 63 · extra five-of-a-kinds +100',
      upperBonus: { need: 63, score: 35 }, fiveBonus: 100, joker: true, fiveId: 'yahtzee',
      cats: UPPER.concat([
        { id: 'three', name: 'Three of a Kind', kind: 'ofKind', n: 3, hint: 'Total of all dice' },
        { id: 'four', name: 'Four of a Kind', kind: 'ofKind', n: 4, hint: 'Total of all dice' },
        { id: 'full', name: 'Full House', kind: 'fixed', pattern: 'full', value: 25, hint: '3 + 2 alike: 25' },
        { id: 'small', name: 'Small Straight', kind: 'fixed', pattern: 'run4', value: 30, hint: '4 in a row: 30' },
        { id: 'large', name: 'Large Straight', kind: 'fixed', pattern: 'run5', value: 40, hint: '5 in a row: 40' },
        { id: 'yahtzee', name: 'Five of a Kind', kind: 'fixed', pattern: 'five', value: 50, hint: 'All five alike: 50' },
        { id: 'chance', name: 'Chance', kind: 'sum', hint: 'Total of all dice' }
      ])
    },
    yacht: {
      id: 'yacht', name: 'Yacht (classic)', note: '12 boxes · no bonuses',
      upperBonus: null, fiveBonus: 0, joker: false, fiveId: 'yacht',
      cats: UPPER.concat([
        { id: 'full', name: 'Full House', kind: 'fullSum', hint: '3 + 2 alike: total of all dice' },
        { id: 'four', name: 'Four of a Kind', kind: 'nTimes', n: 4, hint: 'Total of the four alike' },
        { id: 'little', name: 'Little Straight', kind: 'fixed', pattern: 'low5', value: 30, hint: '1-2-3-4-5: 30' },
        { id: 'big', name: 'Big Straight', kind: 'fixed', pattern: 'high5', value: 30, hint: '2-3-4-5-6: 30' },
        { id: 'choice', name: 'Choice', kind: 'sum', hint: 'Total of all dice' },
        { id: 'yacht', name: 'Yacht', kind: 'fixed', pattern: 'five', value: 50, hint: 'All five alike: 50' }
      ])
    },
    yatzy: {
      id: 'yatzy', name: 'Yatzy (Nordic)', note: '15 boxes · 50 bonus at 63',
      upperBonus: { need: 63, score: 50 }, fiveBonus: 0, joker: false, fiveId: 'yatzy',
      cats: UPPER.concat([
        { id: 'pair', name: 'One Pair', kind: 'pair', hint: 'Total of the highest pair' },
        { id: 'twopairs', name: 'Two Pairs', kind: 'twoPairs', hint: 'Total of two different pairs' },
        { id: 'three', name: 'Three of a Kind', kind: 'nTimes', n: 3, hint: 'Total of the three alike' },
        { id: 'four', name: 'Four of a Kind', kind: 'nTimes', n: 4, hint: 'Total of the four alike' },
        { id: 'small', name: 'Small Straight', kind: 'fixed', pattern: 'low5', value: 15, hint: '1-2-3-4-5: 15' },
        { id: 'large', name: 'Large Straight', kind: 'fixed', pattern: 'high5', value: 20, hint: '2-3-4-5-6: 20' },
        { id: 'full', name: 'Full House', kind: 'fullSum', hint: '3 + 2 alike: total of all dice' },
        { id: 'chance', name: 'Chance', kind: 'sum', hint: 'Total of all dice' },
        { id: 'yatzy', name: 'Yatzy', kind: 'fixed', pattern: 'five', value: 50, hint: 'All five alike: 50' }
      ])
    }
  };
  Object.values(RULES).forEach((r) => r.cats.forEach((c) => { if (!c.section) c.section = 'lower'; }));

  function rules(id) { return RULES[id] || RULES.yahtzee; }
  function cat(r, id) { return r.cats.find((c) => c.id === id) || null; }

  /* ---------- Dice analysis ---------- */
  function counts(dice) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    dice.forEach((d) => { c[d] += 1; });
    return c;
  }
  const sum = (dice) => dice.reduce((a, b) => a + b, 0);
  function validDice(dice) {
    return Array.isArray(dice) && dice.length === 5 && dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6);
  }
  function longestRun(c) {
    let best = 0, run = 0;
    for (let f = 1; f <= 6; f++) { run = c[f] ? run + 1 : 0; best = Math.max(best, run); }
    return best;
  }
  function matches(pattern, c) {
    switch (pattern) {
      case 'five': return c.some((n) => n === 5);
      case 'full': return c.indexOf(3) !== -1 && c.indexOf(2) !== -1;
      case 'run4': return longestRun(c) >= 4;
      case 'run5': return longestRun(c) === 5;
      case 'low5': return [1, 2, 3, 4, 5].every((f) => c[f] === 1);
      case 'high5': return [2, 3, 4, 5, 6].every((f) => c[f] === 1);
      default: return false;
    }
  }
  const isFive = (dice) => validDice(dice) && counts(dice).some((n) => n === 5);

  /* Score `dice` would make in category `cid`, ignoring the joker rule. */
  function rawScore(r, cid, dice) {
    const c = cat(r, cid);
    if (!c || !validDice(dice)) return 0;
    const k = counts(dice);
    switch (c.kind) {
      case 'face': return k[c.face] * c.face;
      case 'sum': return sum(dice);
      case 'ofKind': return k.some((n) => n >= c.n) ? sum(dice) : 0;
      case 'nTimes': { for (let f = 6; f >= 1; f--) if (k[f] >= c.n) return f * c.n; return 0; }
      case 'fixed': return matches(c.pattern, k) ? c.value : 0;
      case 'fullSum': return matches('full', k) ? sum(dice) : 0;
      case 'pair': { for (let f = 6; f >= 1; f--) if (k[f] >= 2) return f * 2; return 0; }
      case 'twoPairs': {
        const pairs = [];
        for (let f = 6; f >= 1; f--) if (k[f] >= 2) pairs.push(f);
        return pairs.length >= 2 ? (pairs[0] + pairs[1]) * 2 : 0;
      }
      default: return 0;
    }
  }

  /* ---------- One player's card ---------- */
  function emptyCard() { return { boxes: {}, bonusFives: 0 }; }
  const filled = (card, cid) => Object.prototype.hasOwnProperty.call(card.boxes, cid);
  function openCats(r, card) { return r.cats.filter((c) => !filled(card, c.id)).map((c) => c.id); }

  /* Joker rule (Yahtzee-style): a five of a kind when the five-of-a-kind box is already
   * filled must go in the matching upper box if open; otherwise any lower box (full
   * house and straights score in full); only if those are full, an upper box for 0. */
  function jokerActive(r, card, dice) { return !!(r.joker && isFive(dice) && filled(card, r.fiveId)); }

  /* Which open boxes this roll may be placed in. */
  function allowed(r, card, dice) {
    const open = openCats(r, card);
    if (!jokerActive(r, card, dice)) return open;
    const face = dice[0];
    const upper = r.cats.find((c) => c.kind === 'face' && c.face === face);
    if (upper && open.indexOf(upper.id) !== -1) return [upper.id];
    const lower = open.filter((id) => cat(r, id).section === 'lower');
    return lower.length ? lower : open;
  }

  /* Score the roll would make in an open box, including the joker rule. */
  function scoreFor(r, card, cid, dice) {
    const c = cat(r, cid);
    if (!c) return 0;
    if (jokerActive(r, card, dice) && c.kind === 'fixed' && ['full', 'run4', 'run5'].indexOf(c.pattern) !== -1) return c.value;
    return rawScore(r, cid, dice);
  }

  /* Does this roll earn a five-of-a-kind bonus? (Yahtzee box already scored 50.) */
  function earnsBonus(r, card, dice) {
    return !!(r.fiveBonus && isFive(dice) && card.boxes[r.fiveId] === (cat(r, r.fiveId) || {}).value);
  }

  /* Place a roll: returns { ok, score, bonus } and updates the card. */
  function place(r, card, cid, dice) {
    if (!validDice(dice) || filled(card, cid) || allowed(r, card, dice).indexOf(cid) === -1) return { ok: false };
    const bonus = earnsBonus(r, card, dice);
    const score = scoreFor(r, card, cid, dice);
    card.boxes[cid] = score;
    if (bonus) card.bonusFives += 1;
    return { ok: true, score, bonus };
  }

  /* Scores that could legally appear in a box (for typing a score by hand). */
  const possibleCache = {};
  function possible(r, cid) {
    const c = cat(r, cid);
    if (!c) return [];
    const ck = r.id + ':' + cid;
    if (possibleCache[ck]) return possibleCache[ck];
    const out = new Set([0]);
    const each = (fn) => { for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let d = 1; d <= 6; d++) for (let e = 1; e <= 6; e++) for (let f = 1; f <= 6; f++) out.add(fn([a, b, d, e, f])); };
    each((dice) => rawScore(r, cid, dice));
    possibleCache[ck] = Array.from(out).sort((x, y) => x - y);
    return possibleCache[ck];
  }
  function validManual(r, cid, n) {
    if (!Number.isInteger(n)) return false;
    const c = cat(r, cid);
    // A joker can put a fixed value into full house / straights; those values are already possible.
    return possible(r, cid).indexOf(n) !== -1 || (c && r.joker && c.kind === 'fixed' && n === c.value);
  }

  /* ---------- Totals ---------- */
  function totals(r, card) {
    let upper = 0, lower = 0, upperFilled = 0, pace = 0;
    r.cats.forEach((c) => {
      if (!filled(card, c.id)) return;
      const v = card.boxes[c.id];
      if (c.section === 'upper') { upper += v; upperFilled += 1; pace += v - 3 * c.face; } else lower += v;
    });
    const ub = r.upperBonus;
    const bonus = ub && upper >= ub.need ? ub.score : 0;
    const fiveBonus = (card.bonusFives || 0) * (r.fiveBonus || 0);
    const upperDone = upperFilled === 6;
    return {
      upper, bonus, lower, fiveBonus,
      total: upper + bonus + lower + fiveBonus,
      // Bonus progress: still needed, and pace vs three of each face (63 = 3 × (1+…+6)).
      need: ub ? Math.max(0, ub.need - upper) : 0,
      pace,
      bonusLost: !!(ub && upperDone && upper < ub.need),
      done: openCats(r, card).length === 0
    };
  }

  /* ---------- Whole game ---------- */
  /* Next player: fewest filled boxes, earliest seat. null when everyone is done. */
  function nextPlayer(r, order, cards) {
    let best = null, bestN = Infinity;
    order.forEach((pid) => {
      const n = r.cats.length - openCats(r, cards[pid]).length;
      if (n < r.cats.length && n < bestN) { best = pid; bestN = n; }
    });
    return best;
  }
  function turnNumber(r, order, cards) {
    const filledCounts = order.map((pid) => r.cats.length - openCats(r, cards[pid]).length);
    return Math.min(r.cats.length, Math.min.apply(null, filledCounts) + 1);
  }
  function standings(r, order, cards, names) {
    return order.map((pid, i) => ({ pid, name: names[pid] || 'Player ' + (i + 1), total: totals(r, cards[pid]).total }))
      .sort((a, b) => b.total - a.total);
  }

  return { RULES, rules, cat, counts, validDice, rawScore, emptyCard, openCats, allowed, scoreFor, earnsBonus, jokerActive, place,
    possible, validManual, totals, nextPlayer, turnNumber, standings };
});
