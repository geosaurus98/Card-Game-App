/* Hand-by-hand scorecards — pure logic (no DOM).
 * Browser: CGR.roundSheet; Node: module.exports (tests: tools/test-round-sheet.js).
 *
 * Each game stores only what happened in each hand ("entries"); replay() works out
 * every score, running totals and game-specific state from them, so undo is just
 * "remove the last entry".
 *
 * Kinds: ohhell, spades, fivehundred, bridge, farkle, crummy, canasta, cribbage, hearts.
 * Sides are players (ids p1…) or, for partnership games, teams 'A' and 'B'. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.roundSheet = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const sumOf = (o) => Object.keys(o || {}).reduce((s, k) => s + (Number(o[k]) || 0), 0);
  const zeroTotals = (sides) => Object.fromEntries(sides.map((s) => [s, 0]));
  function leaders(totals, sides, low) {
    const vals = sides.map((s) => totals[s]);
    const best = low ? Math.min.apply(null, vals) : Math.max.apply(null, vals);
    return sides.filter((s) => totals[s] === best);
  }

  /* =========================================================================
   * Oh Hell — bids and tricks, hand sizes going down (and up)
   * ======================================================================= */
  const ohhell = {
    defaults(n) { return { scoring: 'standard', missPenalty: false, hook: true, schedule: 'down-up', maxHand: Math.min(10, Math.floor(51 / n)) }; },
    maxHandLimit(n) { return Math.floor(51 / n); },
    /* Hand sizes for the whole game. */
    hands(opts) {
      const m = Math.max(1, opts.maxHand || 7);
      const down = Array.from({ length: m }, (_, i) => m - i);
      const up = Array.from({ length: m }, (_, i) => i + 1);
      if (opts.schedule === 'up') return up;
      if (opts.schedule === 'down') return down;
      if (opts.schedule === 'up-down') return up.concat(down.slice(1));
      return down.concat(up.slice(1));
    },
    score(opts, bid, tricks) {
      const exact = bid === tricks;
      if (opts.scoring === 'tricks') return tricks + (exact ? 10 : 0);
      if (exact) return 10 + bid;
      return opts.missPenalty ? -Math.abs(bid - tricks) : 0;
    },
    /* The dealer may not bid this (hook rule); null when any bid is fine. */
    forbiddenBid(opts, hand, otherBids) {
      if (!opts.hook) return null;
      const left = hand - sumOf(otherBids);
      return left >= 0 ? left : null;
    },
    dealerIndex(handNo, n) { return handNo % n; },
    validate(opts, players, hand, e) {
      const bidsOk = players.every((p) => Number.isInteger(e.bids[p]) && e.bids[p] >= 0 && e.bids[p] <= hand);
      if (!bidsOk) return 'Every player needs a bid between 0 and ' + hand + '.';
      if (e.tricks) {
        if (!players.every((p) => Number.isInteger(e.tricks[p]) && e.tricks[p] >= 0)) return 'Enter everyone’s tricks.';
        if (sumOf(e.tricks) !== hand) return `Tricks must add up to ${hand} (now ${sumOf(e.tricks)}).`;
      }
      return null;
    },
    replay(opts, sides, entries) {
      const totals = zeroTotals(sides);
      const hands = this.hands(opts);
      const rows = entries.map((e, i) => {
        const deltas = {};
        sides.forEach((p) => { deltas[p] = this.score(opts, e.bids[p], e.tricks[p]); totals[p] += deltas[p]; });
        return { deltas, totals: Object.assign({}, totals), hand: hands[i] };
      });
      const over = entries.length >= hands.length;
      return { rows, totals, over, winners: over ? leaders(totals, sides) : [], info: { hands, next: over ? null : hands[entries.length] } };
    }
  };

  /* =========================================================================
   * Spades — partnerships (p1+p3 = A, p2+p4 = B), nil, blind nil, bags
   * ======================================================================= */
  const spades = {
    TEAMS: { A: ['p1', 'p3'], B: ['p2', 'p4'] },
    defaults() { return { target: 500, loseAt: -200, blindNil: true, bagPenalty: true }; },
    validate(opts, e) {
      const ps = ['p1', 'p2', 'p3', 'p4'];
      if (!ps.every((p) => Number.isInteger(e.bids[p]) && e.bids[p] >= 0 && e.bids[p] <= 13)) return 'Every player needs a bid (0 = nil).';
      if (e.tricks) {
        if (!ps.every((p) => Number.isInteger(e.tricks[p]) && e.tricks[p] >= 0)) return 'Enter everyone’s tricks.';
        if (sumOf(e.tricks) !== 13) return `Tricks must add up to 13 (now ${sumOf(e.tricks)}).`;
      }
      return null;
    },
    /* Score one team for one hand. Returns { points, bags, notes }. */
    team(opts, members, e) {
      let points = 0, bags = 0;
      const notes = [];
      let bid = 0, made = 0;
      members.forEach((p) => {
        const b = e.bids[p], t = e.tricks[p];
        if (b === 0) {
          const worth = e.blind && e.blind[p] && opts.blindNil ? 200 : 100;
          if (t === 0) { points += worth; notes.push(`${worth === 200 ? 'Blind nil' : 'Nil'} made +${worth}`); }
          else { points -= worth; bags += t; notes.push(`${worth === 200 ? 'Blind nil' : 'Nil'} failed −${worth}`); }
        } else { bid += b; made += t; }
      });
      if (bid > 0) {
        if (made >= bid) { points += 10 * bid + (made - bid); bags += made - bid; }
        else { points -= 10 * bid; notes.push(`Set (−${10 * bid})`); }
      } else bags += made; // both nil: any tricks are bags
      return { points, bags, notes };
    },
    replay(opts, sides, entries) {
      const totals = { A: 0, B: 0 };
      const bags = { A: 0, B: 0 };
      const rows = entries.map((e) => {
        const deltas = {}, notes = {};
        ['A', 'B'].forEach((s) => {
          const r = this.team(opts, this.TEAMS[s], e);
          let pts = r.points;
          notes[s] = r.notes.slice();
          if (opts.bagPenalty) {
            bags[s] += r.bags;
            while (bags[s] >= 10) { bags[s] -= 10; pts -= 100; notes[s].push('10 bags −100'); }
          } else bags[s] += r.bags;
          deltas[s] = pts;
          totals[s] += pts;
        });
        return { deltas, totals: Object.assign({}, totals), notes, bags: Object.assign({}, bags) };
      });
      const hit = ['A', 'B'].some((s) => totals[s] >= opts.target || totals[s] <= opts.loseAt);
      const over = hit && totals.A !== totals.B;
      return { rows, totals, over, winners: over ? leaders(totals, ['A', 'B']) : [], info: { bags } };
    }
  };

  /* =========================================================================
   * 500 — Avondale schedule; 3 players alone or 4 in partnerships
   * ======================================================================= */
  const SUIT_BASE = { S: 40, C: 60, D: 80, H: 100, NT: 120 };
  const fivehundred = {
    SUITS: [['S', '♠'], ['C', '♣'], ['D', '♦'], ['H', '♥'], ['NT', 'NT']],
    defaults() { return { winOnlyByBid: true }; },
    value(c) {
      if (c.suit === 'M') return 250;
      if (c.suit === 'OM') return 500;
      return SUIT_BASE[c.suit] + 100 * (c.tricks - 6);
    },
    label(c) {
      if (c.suit === 'M') return 'Misère';
      if (c.suit === 'OM') return 'Open misère';
      return c.tricks + (this.SUITS.find((s) => s[0] === c.suit) || ['', c.suit])[1];
    },
    validate(opts, sides, e) {
      if (sides.indexOf(e.bidder) === -1) return 'Choose who won the bidding.';
      if (!e.contract || !(e.contract.suit === 'M' || e.contract.suit === 'OM' || (SUIT_BASE[e.contract.suit] && e.contract.tricks >= 6 && e.contract.tricks <= 10))) return 'Choose the contract.';
      if (!sides.every((s) => Number.isInteger(e.tricks[s]) && e.tricks[s] >= 0)) return 'Enter the tricks.';
      if (sumOf(e.tricks) !== 10) return `Tricks must add up to 10 (now ${sumOf(e.tricks)}).`;
      return null;
    },
    replay(opts, sides, entries) {
      const totals = zeroTotals(sides);
      let over = false, winners = [];
      const rows = entries.map((e) => {
        const deltas = zeroTotals(sides);
        const c = e.contract;
        const val = this.value(c);
        const t = e.tricks[e.bidder];
        const misere = c.suit === 'M' || c.suit === 'OM';
        const made = misere ? t === 0 : t >= c.tricks;
        let bid = made ? val : -val;
        if (made && !misere && t === 10 && val < 250) bid = 250; // slam
        deltas[e.bidder] = bid;
        if (!misere) {
          sides.forEach((s) => {
            if (s === e.bidder) return;
            let pts = 10 * e.tricks[s];
            if (opts.winOnlyByBid && totals[s] + pts >= 500) pts = Math.max(0, 490 - totals[s]);
            deltas[s] = pts;
          });
        }
        sides.forEach((s) => { totals[s] += deltas[s]; });
        if (!over) {
          const won = sides.filter((s) => totals[s] >= 500);
          const lost = sides.filter((s) => totals[s] <= -500);
          if (won.length) { over = true; winners = won.indexOf(e.bidder) !== -1 ? [e.bidder] : leaders(totals, won); }
          else if (lost.length) { over = true; winners = leaders(totals, sides.filter((s) => lost.indexOf(s) === -1)); }
        }
        return { deltas, totals: Object.assign({}, totals), made, label: this.label(c) };
      });
      return { rows, totals, over, winners, info: {} };
    }
  };

  /* =========================================================================
   * Contract Bridge — rubber scoring, We (A) / They (B)
   * ======================================================================= */
  const DENOMS = [['C', '♣'], ['D', '♦'], ['H', '♥'], ['S', '♠'], ['NT', 'NT']];
  const bridge = {
    DENOMS,
    defaults() { return {}; },
    trickPoints(denom, level, dbl) {
      const per = denom === 'C' || denom === 'D' ? 20 : 30;
      const base = denom === 'NT' ? 40 + 30 * (level - 1) : per * level;
      return base * (dbl === 2 ? 4 : dbl === 1 ? 2 : 1);
    },
    undertricks(down, vul, dbl) {
      if (!dbl) return down * (vul ? 100 : 50);
      let pts = 0;
      for (let i = 1; i <= down; i++) {
        if (vul) pts += i === 1 ? 200 : 300;
        else pts += i === 1 ? 100 : i <= 3 ? 200 : 300;
      }
      return dbl === 2 ? pts * 2 : pts;
    },
    /* Score one deal. Returns { below, above (for declarer), defenders (above for the other side), made }. */
    deal(e, vul) {
      const need = e.level + 6;
      if (e.taken >= need) {
        const below = this.trickPoints(e.denom, e.level, e.dbl);
        const over = e.taken - need;
        let above = 0;
        if (over) {
          if (!e.dbl) above += over * (e.denom === 'C' || e.denom === 'D' ? 20 : 30);
          else above += over * (e.dbl === 2 ? (vul ? 400 : 200) : (vul ? 200 : 100));
        }
        if (e.dbl) above += e.dbl === 2 ? 100 : 50;
        if (e.level === 6) above += vul ? 750 : 500;
        if (e.level === 7) above += vul ? 1500 : 1000;
        return { made: true, below, above, defenders: 0, over };
      }
      return { made: false, below: 0, above: 0, defenders: this.undertricks(need - e.taken, vul, e.dbl), down: need - e.taken };
    },
    label(e) {
      return `${e.level}${(DENOMS.find((d) => d[0] === e.denom) || ['', e.denom])[1]}${e.dbl === 2 ? 'XX' : e.dbl ? 'X' : ''}`;
    },
    validate(opts, e) {
      if (e.decl !== 'A' && e.decl !== 'B') return 'Choose which side declared.';
      if (!(e.level >= 1 && e.level <= 7)) return 'Choose the contract level.';
      if (!DENOMS.some((d) => d[0] === e.denom)) return 'Choose the suit or NT.';
      if (!(Number.isInteger(e.taken) && e.taken >= 0 && e.taken <= 13)) return 'Enter the tricks declarer took.';
      return null;
    },
    replay(opts, sides, entries) {
      const games = { A: 0, B: 0 };
      const below = { A: 0, B: 0 };   // current game
      const belowAll = { A: 0, B: 0 };
      const above = { A: 0, B: 0 };
      let over = false;
      const rows = entries.map((e) => {
        if (over) return { deltas: { A: 0, B: 0 }, totals: { A: above.A + belowAll.A, B: above.B + belowAll.B } };
        const d = e.decl, o = d === 'A' ? 'B' : 'A';
        const vul = games[d] >= 1;
        const r = this.deal(e, vul);
        const deltas = { A: 0, B: 0 };
        const notes = [];
        below[d] += r.below; belowAll[d] += r.below; above[d] += r.above; above[o] += r.defenders;
        deltas[d] += r.below + r.above; deltas[o] += r.defenders;
        if (e.honours && e.honours.pts && (e.honours.side === 'A' || e.honours.side === 'B')) {
          above[e.honours.side] += e.honours.pts; deltas[e.honours.side] += e.honours.pts; notes.push(`Honours ${e.honours.pts}`);
        }
        if (below[d] >= 100) {
          games[d] += 1;
          notes.push('Game!');
          below.A = 0; below.B = 0;
          if (games[d] === 2) {
            const bonus = games[o] === 0 ? 700 : 500;
            above[d] += bonus; deltas[d] += bonus;
            notes.push(`Rubber +${bonus}`);
            over = true;
          }
        }
        return { deltas, totals: { A: above.A + belowAll.A, B: above.B + belowAll.B }, made: r.made, label: this.label(e), vul, notes, result: r.made ? (r.over ? `+${r.over}` : '=') : `−${r.down}` };
      });
      const totals = { A: above.A + belowAll.A, B: above.B + belowAll.B };
      return { rows, totals, over, winners: over ? leaders(totals, ['A', 'B']) : [],
        info: { games: Object.assign({}, games), below: Object.assign({}, below), above: Object.assign({}, above), belowAll: Object.assign({}, belowAll), vul: { A: games.A >= 1, B: games.B >= 1 } } };
    }
  };

  /* =========================================================================
   * Farkle — turn by turn; dice scoring; last-turn rule
   * ======================================================================= */
  const farkle = {
    defaults() { return { target: 10000, openMin: 500 }; },
    /* Points for a set of dice set aside together (counts[1..6]); null if any die doesn't score. */
    scoreDice(counts) {
      const c = [0].concat([1, 2, 3, 4, 5, 6].map((f) => counts[f] || 0));
      const n = c.reduce((a, b) => a + b, 0);
      if (!n || n > 6) return null;
      let best = null;
      if (n === 6) {
        if ([1, 2, 3, 4, 5, 6].every((f) => c[f] === 1)) best = 1500;
        const pairs = [1, 2, 3, 4, 5, 6].filter((f) => c[f] === 2).length;
        if (pairs === 3) best = Math.max(best || 0, 1500);
        if ([1, 2, 3, 4, 5, 6].some((f) => c[f] === 6)) best = Math.max(best || 0, 3000);
      }
      let pts = 0, ok = true;
      for (let f = 1; f <= 6; f++) {
        const k = c[f];
        if (!k) continue;
        if (k >= 3) pts += k === 3 ? (f === 1 ? 1000 : f * 100) : k === 4 ? 1000 : k === 5 ? 2000 : 3000;
        else if (f === 1) pts += 100 * k;
        else if (f === 5) pts += 50 * k;
        else ok = false;
      }
      if (ok) best = Math.max(best || 0, pts);
      return best;
    },
    /* Whose turn: strict seat order. */
    current(sides, entries) { return sides[entries.length % sides.length]; },
    validate(opts, sides, entries, e, totals) {
      if (e.pts < 0 || !Number.isInteger(e.pts) || e.pts % 50) return 'Points must be a multiple of 50.';
      if (e.pts && !totals[e.pid] && e.pts < opts.openMin) return `You need at least ${opts.openMin} in one turn to get on the board.`;
      return null;
    },
    replay(opts, sides, entries) {
      const totals = zeroTotals(sides);
      let trigger = -1;
      const rows = entries.map((e, i) => {
        const deltas = zeroTotals(sides);
        deltas[e.pid] = e.pts;
        totals[e.pid] += e.pts;
        if (trigger < 0 && totals[e.pid] >= opts.target) trigger = i;
        return { deltas, totals: Object.assign({}, totals), pid: e.pid, farkle: !e.pts };
      });
      const over = trigger >= 0 && entries.length - 1 - trigger >= sides.length - 1;
      return { rows, totals, over, winners: over ? leaders(totals, sides) : [],
        info: { finalRound: trigger >= 0 && !over, triggeredBy: trigger >= 0 ? entries[trigger].pid : null, onBoard: Object.fromEntries(sides.map((s) => [s, totals[s] > 0])) } };
    }
  };

  /* =========================================================================
   * Contract Rummy — seven contracts, penalty points, lowest wins
   * ======================================================================= */
  const crummy = {
    /* The seven contracts. A set is 3+ cards of one rank (any suits); a run is 4+ cards in
     * sequence in one suit. min = fewest cards needed to lay the contract down. */
    CONTRACTS: [
      { name: 'Two sets', melds: ['set', 'set'], min: 6, deal: 10 },
      { name: 'One set and one run', melds: ['set', 'run'], min: 7, deal: 10 },
      { name: 'Two runs', melds: ['run', 'run'], min: 8, deal: 10 },
      { name: 'Three sets', melds: ['set', 'set', 'set'], min: 9, deal: 12 },
      { name: 'Two sets and one run', melds: ['set', 'set', 'run'], min: 10, deal: 12 },
      { name: 'One set and two runs', melds: ['set', 'run', 'run'], min: 11, deal: 12 },
      { name: 'Three runs', melds: ['run', 'run', 'run'], min: 12, deal: 12, allCards: true, note: 'You must use every card in your hand — no discard to go out.' }
    ],
    /* Penalty card groups: key, label, value (Ace and Joker values are options). */
    groups(opts) {
      return [
        { k: 'low', label: '2–9', value: 5 },
        { k: 'high', label: '10, J, Q, K', value: 10 },
        { k: 'ace', label: 'Ace', value: opts.aceValue || 15 },
        { k: 'joker', label: 'Joker', value: opts.jokerValue || 25 }
      ];
    },
    defaults() { return { aceValue: 15, jokerValue: 25 }; },
    /* Penalty for the cards left in one hand: counts = { low, high, ace, joker }. */
    penalty(opts, counts) {
      return this.groups(opts).reduce((s, g) => s + g.value * ((counts && counts[g.k]) || 0), 0);
    },
    label(i) { const c = this.CONTRACTS[i]; return c ? `${i + 1}. ${c.name}` : ''; },
    validate(opts, sides, e) {
      if (!sides.every((s) => Number.isInteger(e.pts[s]) && e.pts[s] >= 0)) return 'Enter a penalty (0 or more) for everyone.';
      const out = sides.filter((s) => e.pts[s] === 0);
      if (!out.length) return 'Someone must have gone out (0 points). Tap “Went out” for them.';
      if (e.out && sides.indexOf(e.out) !== -1 && e.pts[e.out] !== 0) return 'The player who went out scores 0.';
      return null;
    },
    replay(opts, sides, entries) {
      const totals = zeroTotals(sides);
      const rows = entries.map((e, i) => {
        sides.forEach((s) => { totals[s] += e.pts[s]; });
        const out = e.out && sides.indexOf(e.out) !== -1 ? e.out : (sides.find((s) => e.pts[s] === 0) || null);
        return { deltas: Object.assign({}, e.pts), totals: Object.assign({}, totals), contract: this.CONTRACTS[i], round: i + 1, out };
      });
      const over = entries.length >= this.CONTRACTS.length;
      const i = entries.length;
      return { rows, totals, over, winners: over ? leaders(totals, sides, true) : [],
        info: { round: i + 1, current: over ? null : this.CONTRACTS[i], next: over ? null : this.CONTRACTS[i].name } };
    }
  };

  /* =========================================================================
   * Canasta (partnership) — per-hand calculator, minimum meld
   * ======================================================================= */
  const canasta = {
    defaults() { return { target: 5000 }; },
    minimumMeld(score) { return score < 0 ? 15 : score < 1500 ? 50 : score < 3000 ? 90 : 120; },
    /* t: { natural, mixed, red3, out: 'none'|'out'|'concealed', melded, meld, hand } */
    handScore(t) {
      const red = t.red3 >= 4 ? 800 : 100 * (t.red3 || 0);
      if (!t.melded) return -red - (t.hand || 0);
      return 500 * (t.natural || 0) + 300 * (t.mixed || 0) + red + (t.out === 'concealed' ? 200 : t.out === 'out' ? 100 : 0) + (t.meld || 0) - (t.hand || 0);
    },
    validate(opts, e) {
      const a = e.A, b = e.B;
      if ((a.red3 || 0) + (b.red3 || 0) > 4) return 'There are only four red 3s.';
      if (a.out !== 'none' && b.out !== 'none') return 'Only one team can go out.';
      for (const [n, t] of [['Team A', a], ['Team B', b]]) {
        if (t.out !== 'none' && (t.natural || 0) + (t.mixed || 0) < 1) return `${n} needs a canasta to go out.`;
        if (t.out !== 'none' && !t.melded) return `${n} can’t go out without melding.`;
        if ([t.natural, t.mixed, t.meld, t.hand].some((v) => v != null && (!Number.isInteger(v) || v < 0))) return 'Use whole numbers of 0 or more.';
      }
      return null;
    },
    replay(opts, sides, entries) {
      const totals = { A: 0, B: 0 };
      const rows = entries.map((e) => {
        const deltas = { A: this.handScore(e.A), B: this.handScore(e.B) };
        totals.A += deltas.A; totals.B += deltas.B;
        return { deltas, totals: Object.assign({}, totals) };
      });
      const over = (totals.A >= opts.target || totals.B >= opts.target) && totals.A !== totals.B;
      return { rows, totals, over, winners: over ? leaders(totals, ['A', 'B']) : [],
        info: { minimum: { A: this.minimumMeld(totals.A), B: this.minimumMeld(totals.B) } } };
    }
  };

  /* =========================================================================
   * Cribbage — pegging; first to the target wins at once; skunks
   * ======================================================================= */
  const cribbage = {
    defaults() { return { target: 121 }; },
    skunkLine(target) { return target === 61 ? 31 : 91; },
    validate(opts, sides, e) { return sides.indexOf(e.side) !== -1 && Number.isInteger(e.pts) && e.pts > 0 && e.pts <= 29 ? null : 'Pegs must be 1–29.'; },
    replay(opts, sides, entries) {
      const totals = zeroTotals(sides);
      const back = zeroTotals(sides);
      let over = false, winner = null;
      const rows = [];
      entries.forEach((e) => {
        if (over) return;
        back[e.side] = totals[e.side];
        totals[e.side] = Math.min(opts.target, totals[e.side] + e.pts);
        const deltas = zeroTotals(sides); deltas[e.side] = e.pts;
        rows.push({ deltas, totals: Object.assign({}, totals), side: e.side });
        if (totals[e.side] >= opts.target) { over = true; winner = e.side; }
      });
      const line = this.skunkLine(opts.target);
      const skunks = {};
      if (over) sides.forEach((s) => { if (s !== winner) skunks[s] = totals[s] < line - 30 ? 'double skunk' : totals[s] < line ? 'skunk' : null; });
      return { rows, totals, over, winners: over ? [winner] : [], info: { back, skunks, line } };
    }
  };

  /* =========================================================================
   * Hearts — 13 hearts + Q♠; shooting the moon; lowest wins at 100
   * ======================================================================= */
  const hearts = {
    defaults() { return { target: 100, moon: 'add', omnibus: false }; },
    validate(opts, sides, e) {
      if (!sides.every((s) => Number.isInteger(e.hearts[s]) && e.hearts[s] >= 0)) return 'Enter everyone’s hearts.';
      if (sumOf(e.hearts) !== 13) return `Hearts must add up to 13 (now ${sumOf(e.hearts)}).`;
      if (sides.indexOf(e.queen) === -1) return 'Who took the Q♠?';
      if (opts.omnibus && sides.indexOf(e.jack) === -1) return 'Who took the J♦?';
      return null;
    },
    /* Points for one hand: { deltas, moon: pid|null }. */
    hand(opts, sides, e) {
      const deltas = {};
      sides.forEach((s) => { deltas[s] = e.hearts[s] + (e.queen === s ? 13 : 0); });
      const shooter = sides.find((s) => e.hearts[s] === 13 && e.queen === s) || null;
      if (shooter) {
        sides.forEach((s) => { deltas[s] = opts.moon === 'subtract' ? (s === shooter ? -26 : 0) : (s === shooter ? 0 : 26); });
      }
      if (opts.omnibus && e.jack) deltas[e.jack] -= 10;
      return { deltas, moon: shooter };
    },
    replay(opts, sides, entries) {
      const totals = zeroTotals(sides);
      const rows = entries.map((e) => {
        const h = this.hand(opts, sides, e);
        sides.forEach((s) => { totals[s] += h.deltas[s]; });
        return { deltas: h.deltas, totals: Object.assign({}, totals), moon: h.moon };
      });
      const over = sides.some((s) => totals[s] >= opts.target);
      return { rows, totals, over, winners: over ? leaders(totals, sides, true) : [], info: {} };
    }
  };

  const KINDS = { ohhell, spades, fivehundred, bridge, farkle, crummy, canasta, cribbage, hearts };
  return Object.assign({ KINDS, sumOf, leaders }, KINDS);
});
