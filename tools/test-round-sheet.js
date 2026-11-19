/* Unit tests for the hand-by-hand scorecards. Run: node tools/test-round-sheet.js (no dependencies) */
const assert = require('assert');
const R = require('../js/round-sheet-logic.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}
const P4 = ['p1', 'p2', 'p3', 'p4'];
const by = (vals, ids) => Object.fromEntries((ids || P4).map((p, i) => [p, vals[i]]));

// ---------- Oh Hell ----------
test('oh hell: hand sizes for each schedule', () => {
  const H = R.ohhell;
  assert.deepStrictEqual(H.hands({ schedule: 'down', maxHand: 3 }), [3, 2, 1]);
  assert.deepStrictEqual(H.hands({ schedule: 'up', maxHand: 3 }), [1, 2, 3]);
  assert.deepStrictEqual(H.hands({ schedule: 'down-up', maxHand: 3 }), [3, 2, 1, 2, 3]);
  assert.deepStrictEqual(H.hands({ schedule: 'up-down', maxHand: 3 }), [1, 2, 3, 2, 1]);
  assert.strictEqual(H.defaults(4).maxHand, 10);
  assert.strictEqual(H.defaults(7).maxHand, 7, '51 / 7');
});
test('oh hell: scoring variants', () => {
  const H = R.ohhell;
  assert.strictEqual(H.score({ scoring: 'standard' }, 3, 3), 13);
  assert.strictEqual(H.score({ scoring: 'standard' }, 0, 0), 10);
  assert.strictEqual(H.score({ scoring: 'standard' }, 2, 4), 0);
  assert.strictEqual(H.score({ scoring: 'standard', missPenalty: true }, 2, 4), -2);
  assert.strictEqual(H.score({ scoring: 'tricks' }, 2, 2), 12);
  assert.strictEqual(H.score({ scoring: 'tricks' }, 2, 3), 3);
});
test('oh hell: hook rule forbids the bid that makes bids equal tricks', () => {
  const H = R.ohhell;
  assert.strictEqual(H.forbiddenBid({ hook: true }, 5, { p1: 1, p2: 2, p3: 0 }), 2);
  assert.strictEqual(H.forbiddenBid({ hook: true }, 5, { p1: 4, p2: 2 }), null, 'already over: anything goes');
  assert.strictEqual(H.forbiddenBid({ hook: false }, 5, { p1: 1 }), null);
  assert.strictEqual(H.dealerIndex(5, 4), 1);
});
test('oh hell: validation and replay to the end', () => {
  const H = R.ohhell;
  const opts = { scoring: 'standard', hook: true, schedule: 'down', maxHand: 2 };
  assert.ok(H.validate(opts, P4, 2, { bids: by([1, 0, 1, 0]), tricks: by([1, 0, 0, 0]) }).includes('add up to 2'));
  assert.strictEqual(H.validate(opts, P4, 2, { bids: by([1, 0, 1, 0]) }), null, 'bids alone are fine');
  const entries = [{ bids: by([1, 0, 1, 1]), tricks: by([1, 0, 1, 0]) }, { bids: by([1, 0, 1, 0]), tricks: by([1, 0, 0, 0]) }];
  const r = H.replay(opts, P4, entries);
  assert.deepStrictEqual(r.totals, by([22, 20, 11, 10]));
  assert.ok(r.over); assert.deepStrictEqual(r.winners, ['p1']);
  assert.strictEqual(H.replay(opts, P4, entries.slice(0, 1)).info.next, 1);
});

// ---------- Spades ----------
test('spades: contract, bags, set, nil', () => {
  const S = R.spades;
  const o = S.defaults();
  // A (p1+p3) bids 4+3=7 takes 5+3=8 → 71 (1 bag). B (p2+p4) bids 3+2=5 takes 2+3=5 → 50.
  const r = S.replay(o, ['A', 'B'], [{ bids: by([4, 3, 3, 2]), tricks: by([5, 2, 3, 3]) }]);
  assert.deepStrictEqual(r.totals, { A: 71, B: 50 });
  assert.deepStrictEqual(r.info.bags, { A: 1, B: 0 });
  // A set: bid 6 takes 5 → −60. B nil (p2) made +100, p4 bid 4 takes 8 → 44 (4 bags).
  const r2 = S.replay(o, ['A', 'B'], [{ bids: by([3, 0, 3, 4]), tricks: by([2, 0, 3, 8]) }]);
  assert.deepStrictEqual(r2.totals, { A: -60, B: 144 });
  // Failed blind nil −200; its tricks don't help the partner but count as bags.
  const r3 = S.replay(o, ['A', 'B'], [{ bids: by([0, 5, 6, 5]), blind: { p1: true }, tricks: by([2, 3, 5, 3]) }]);
  assert.strictEqual(r3.totals.A, -260, 'blind nil fails −200, partner 6 bid takes 5 → set −60');
  assert.strictEqual(r3.rows[0].bags.A, 2);
  assert.strictEqual(S.replay(Object.assign({}, o, { blindNil: false }), ['A', 'B'], [{ bids: by([0, 5, 6, 5]), blind: { p1: true }, tricks: by([1, 3, 6, 3]) }]).totals.A, -100 + 60);
});
test('spades: ten bags cost 100 and reset; game to 500 / lose at −200', () => {
  const S = R.spades;
  const o = S.defaults();
  const hand = { bids: by([1, 1, 1, 1]), tricks: by([4, 2, 4, 3]) }; // A: bid 2 take 8 → 26, 6 bags. B: bid 2 take 5 → 23, 3 bags
  const r = S.replay(o, ['A', 'B'], [hand, hand]);
  assert.strictEqual(r.totals.A, 26 + 26 - 100);
  assert.strictEqual(r.info.bags.A, 2);
  assert.ok(r.rows[1].notes.A.some((n) => n.includes('10 bags')));
  const big = { bids: by([7, 0, 6, 0]), tricks: by([7, 0, 6, 0]) }; // A 130, B two nils +200
  const r2 = S.replay(o, ['A', 'B'], [big, big, big, big]);
  assert.ok(r2.over); assert.deepStrictEqual(r2.winners, ['B']);
  assert.ok(S.validate(o, { bids: by([1, 1, 1, 1]), tricks: by([4, 4, 4, 4]) }).includes('13'));
});

// ---------- 500 ----------
test('500: bid values and slam', () => {
  const F = R.fivehundred;
  assert.strictEqual(F.value({ tricks: 6, suit: 'S' }), 40);
  assert.strictEqual(F.value({ tricks: 7, suit: 'S' }), 140);
  assert.strictEqual(F.value({ tricks: 8, suit: 'H' }), 300);
  assert.strictEqual(F.value({ tricks: 10, suit: 'NT' }), 520);
  assert.strictEqual(F.value({ suit: 'M' }), 250);
  assert.strictEqual(F.value({ suit: 'OM' }), 500);
  const s3 = ['p1', 'p2', 'p3'];
  const r = F.replay(F.defaults(), s3, [{ bidder: 'p1', contract: { tricks: 7, suit: 'S' }, tricks: by([10, 0, 0], s3) }]);
  assert.strictEqual(r.totals.p1, 250, 'slam on a 140 bid scores 250');
});
test('500: made, set, opponents 10 per trick, misère, win only by bidding', () => {
  const F = R.fivehundred;
  const s3 = ['p1', 'p2', 'p3'];
  const r = F.replay(F.defaults(), s3, [
    { bidder: 'p1', contract: { tricks: 7, suit: 'H' }, tricks: by([7, 2, 1], s3) },
    { bidder: 'p2', contract: { tricks: 8, suit: 'C' }, tricks: by([3, 6, 1], s3) },
    { bidder: 'p3', contract: { suit: 'M' }, tricks: by([5, 5, 0], s3) }
  ]);
  assert.deepStrictEqual(r.totals, { p1: 200 + 30, p2: 20 - 260, p3: 10 + 10 + 250 });
  // Opponents can't reach 500 on tricks alone.
  const r2 = F.replay(F.defaults(), ['A', 'B'], [
    { bidder: 'A', contract: { tricks: 10, suit: 'NT' }, tricks: { A: 10, B: 0 } },
    { bidder: 'B', contract: { tricks: 6, suit: 'S' }, tricks: { A: 4, B: 6 } }
  ]);
  assert.strictEqual(r2.totals.A, 520);
  assert.ok(r2.over); assert.deepStrictEqual(r2.winners, ['A']);
  const r3 = F.replay(F.defaults(), ['A', 'B'], [
    { bidder: 'A', contract: { tricks: 9, suit: 'NT' }, tricks: { A: 9, B: 1 } },
    { bidder: 'B', contract: { tricks: 6, suit: 'S' }, tricks: { A: 9, B: 1 } }
  ]);
  assert.strictEqual(r3.totals.A, 490, 'capped at 490 by tricks');
  assert.ok(!r3.over);
  assert.ok(F.validate(F.defaults(), s3, { bidder: 'p1', contract: { tricks: 7, suit: 'S' }, tricks: by([5, 4, 0], s3) }).includes('10'));
});

// ---------- Bridge ----------
test('bridge: trick points, overtricks, insult, slams', () => {
  const B = R.bridge;
  assert.strictEqual(B.trickPoints('NT', 3, 0), 100);
  assert.strictEqual(B.trickPoints('S', 4, 0), 120);
  assert.strictEqual(B.trickPoints('C', 2, 1), 80);
  assert.strictEqual(B.trickPoints('H', 2, 2), 240);
  assert.deepStrictEqual(B.deal({ level: 2, denom: 'H', dbl: 0, taken: 10 }, false), { made: true, below: 60, above: 60, defenders: 0, over: 2 });
  const dbl = B.deal({ level: 2, denom: 'C', dbl: 1, taken: 9 }, true);
  assert.strictEqual(dbl.below, 80); assert.strictEqual(dbl.above, 200 + 50);
  assert.strictEqual(B.deal({ level: 6, denom: 'S', dbl: 0, taken: 12 }, false).above, 500);
  assert.strictEqual(B.deal({ level: 7, denom: 'NT', dbl: 0, taken: 13 }, true).above, 1500);
});
test('bridge: undertricks undoubled, doubled and redoubled', () => {
  const B = R.bridge;
  assert.strictEqual(B.undertricks(2, false, 0), 100);
  assert.strictEqual(B.undertricks(2, true, 0), 200);
  assert.deepStrictEqual([1, 2, 3, 4, 5].map((d) => B.undertricks(d, false, 1)), [100, 300, 500, 800, 1100]);
  assert.deepStrictEqual([1, 2, 3].map((d) => B.undertricks(d, true, 1)), [200, 500, 800]);
  assert.strictEqual(B.undertricks(3, false, 2), 1000);
});
test('bridge: part scores add up to game, vulnerability, rubber bonus', () => {
  const B = R.bridge;
  const e = (decl, level, denom, taken, dbl) => ({ decl, level, denom, taken, dbl: dbl || 0 });
  let r = B.replay({}, ['A', 'B'], [e('A', 2, 'S', 8), e('A', 2, 'H', 8)]);
  assert.strictEqual(r.info.games.A, 1, '60 + 60 makes game');
  assert.deepStrictEqual(r.info.below, { A: 0, B: 0 }, 'new game starts');
  assert.ok(r.info.vul.A && !r.info.vul.B);
  r = B.replay({}, ['A', 'B'], [e('A', 4, 'S', 10), e('B', 3, 'NT', 7), e('A', 4, 'H', 10)]);
  assert.ok(r.over); assert.deepStrictEqual(r.winners, ['A']);
  assert.strictEqual(r.totals.A, 120 + 120 + 700 + 100, 'won 2–0: 700, plus B down 2 not vulnerable (100)');
  assert.strictEqual(r.totals.B, 0);
});
test('bridge: rubber 2–1 bonus 500, defenders score undertricks, honours', () => {
  const B = R.bridge;
  const e = (decl, level, denom, taken, dbl, honours) => ({ decl, level, denom, taken, dbl: dbl || 0, honours });
  const r = B.replay({}, ['A', 'B'], [
    e('A', 4, 'S', 10), e('B', 3, 'NT', 9), e('B', 4, 'H', 9), e('A', 3, 'NT', 9, 0, { side: 'B', pts: 100 })
  ]);
  // A: 120 + 100 + rubber 500 = 720; plus B went down 1 vulnerable → 100 to A = 820. B: 100 + honours 100.
  assert.strictEqual(r.totals.A, 120 + 100 + 500 + 100);
  assert.strictEqual(r.totals.B, 100 + 100);
  assert.deepStrictEqual(r.winners, ['A']);
  assert.ok(B.validate({}, { decl: 'A', level: 8, denom: 'S', taken: 3 }));
});

// ---------- Farkle ----------
test('farkle: scoring dice', () => {
  const F = R.farkle;
  const c = (arr) => { const o = {}; arr.forEach((f) => { o[f] = (o[f] || 0) + 1; }); return o; };
  assert.strictEqual(F.scoreDice(c([1])), 100);
  assert.strictEqual(F.scoreDice(c([5, 5])), 100);
  assert.strictEqual(F.scoreDice(c([1, 1, 1])), 1000);
  assert.strictEqual(F.scoreDice(c([4, 4, 4])), 400);
  assert.strictEqual(F.scoreDice(c([4, 4, 4, 1, 5])), 550);
  assert.strictEqual(F.scoreDice(c([2, 2, 2, 2])), 1000);
  assert.strictEqual(F.scoreDice(c([6, 6, 6, 6, 6])), 2000);
  assert.strictEqual(F.scoreDice(c([3, 3, 3, 3, 3, 3])), 3000);
  assert.strictEqual(F.scoreDice(c([1, 2, 3, 4, 5, 6])), 1500);
  assert.strictEqual(F.scoreDice(c([2, 2, 3, 3, 6, 6])), 1500);
  assert.strictEqual(F.scoreDice(c([2, 2, 2, 6, 6, 6])), 800, 'two triples');
  assert.strictEqual(F.scoreDice(c([1, 2])), null, 'a 2 alone does not score');
  assert.strictEqual(F.scoreDice({}), null);
});
test('farkle: turn order, opening minimum, last-turn rule', () => {
  const F = R.farkle;
  const o = F.defaults();
  const s = ['p1', 'p2', 'p3'];
  assert.strictEqual(F.current(s, [{}, {}, {}, {}]), 'p2');
  assert.ok(F.validate(o, s, [], { pid: 'p1', pts: 300 }, { p1: 0 }).includes('500'));
  assert.strictEqual(F.validate(o, s, [], { pid: 'p1', pts: 300 }, { p1: 600 }), null);
  assert.ok(F.validate(o, s, [], { pid: 'p1', pts: 125 }, { p1: 600 }));
  const entries = [{ pid: 'p1', pts: 9000 }, { pid: 'p2', pts: 0 }, { pid: 'p3', pts: 500 }, { pid: 'p1', pts: 1500 }];
  let r = F.replay(o, s, entries);
  assert.ok(!r.over && r.info.finalRound && r.info.triggeredBy === 'p1');
  r = F.replay(o, s, entries.concat([{ pid: 'p2', pts: 11000 }, { pid: 'p3', pts: 0 }]));
  assert.ok(r.over); assert.deepStrictEqual(r.winners, ['p2']);
});

// ---------- Contract Rummy ----------
test('contract rummy: seven contracts with melds, minimum cards and deal sizes', () => {
  const C = R.crummy;
  assert.strictEqual(C.CONTRACTS.length, 7);
  C.CONTRACTS.forEach((c) => {
    const min = c.melds.reduce((s, m) => s + (m === 'set' ? 3 : 4), 0);
    assert.strictEqual(c.min, min, c.name + ' minimum cards');
    assert.ok(c.deal >= c.min, c.name + ' deal is big enough');
  });
  assert.deepStrictEqual(C.CONTRACTS.map((c) => c.melds.join('+')), ['set+set', 'set+run', 'run+run', 'set+set+set', 'set+set+run', 'set+run+run', 'run+run+run']);
  assert.ok(C.CONTRACTS[6].allCards);
  assert.strictEqual(C.label(1), '2. One set and one run');
});
test('contract rummy: penalty from cards left, Ace/Joker value options', () => {
  const C = R.crummy;
  const hand = { low: 3, high: 2, ace: 1, joker: 1 };
  assert.strictEqual(C.penalty(C.defaults(), hand), 15 + 20 + 15 + 25);
  assert.strictEqual(C.penalty({ aceValue: 20, jokerValue: 50 }, hand), 15 + 20 + 20 + 50);
  assert.strictEqual(C.penalty(C.defaults(), {}), 0);
});
test('contract rummy: someone goes out, rows remember the contract and who went out, lowest wins', () => {
  const C = R.crummy;
  const s = ['p1', 'p2', 'p3'];
  assert.ok(C.validate({}, s, { pts: by([5, 10, 15], s) }).includes('gone out'));
  assert.ok(C.validate({}, s, { out: 'p2', pts: by([0, 10, 15], s) }).includes('scores 0'));
  const entries = Array.from({ length: 7 }, (_, i) => ({ out: 'p1', pts: by([0, 10 + i, 20], s) }));
  const r = C.replay({}, s, entries);
  assert.ok(r.over); assert.deepStrictEqual(r.winners, ['p1']);
  assert.strictEqual(r.rows[2].contract.name, 'Two runs');
  assert.strictEqual(r.rows[0].out, 'p1');
  const part = C.replay({}, s, entries.slice(0, 2));
  assert.strictEqual(part.info.next, 'Two runs');
  assert.strictEqual(part.info.current.deal, 10);
  assert.strictEqual(C.replay({}, s, entries.slice(0, 3)).info.current.deal, 12, 'rounds 4–7 deal 12');
});

// ---------- Canasta ----------
test('canasta: hand scores, red threes, unmelded team, minimum meld', () => {
  const C = R.canasta;
  assert.strictEqual(C.handScore({ natural: 1, mixed: 1, red3: 2, out: 'out', melded: true, meld: 340, hand: 0 }), 500 + 300 + 200 + 100 + 340);
  assert.strictEqual(C.handScore({ red3: 4, out: 'concealed', melded: true, natural: 1, meld: 200, hand: 0 }), 800 + 200 + 500 + 200);
  assert.strictEqual(C.handScore({ red3: 1, melded: false, hand: 85 }), -185);
  assert.deepStrictEqual([-10, 0, 1495, 1500, 2995, 3000].map((x) => C.minimumMeld(x)), [15, 50, 50, 90, 90, 120]);
  const t = (o) => Object.assign({ natural: 0, mixed: 0, red3: 0, out: 'none', melded: true, meld: 0, hand: 0 }, o);
  assert.ok(C.validate({}, { A: t({ red3: 3 }), B: t({ red3: 2 }) }).includes('four'));
  assert.ok(C.validate({}, { A: t({ out: 'out' }), B: t({}) }).includes('canasta'));
  const r = C.replay(C.defaults(), ['A', 'B'], [{ A: t({ natural: 5, meld: 3000, out: 'out' }), B: t({ meld: 100 }) }]);
  assert.ok(r.over); assert.deepStrictEqual(r.winners, ['A']);
  assert.deepStrictEqual(C.replay(C.defaults(), ['A', 'B'], [{ A: t({ natural: 3, meld: 100 }), B: t({ melded: false, hand: 50 }) }]).info.minimum, { A: 90, B: 15 });
});

// ---------- Cribbage ----------
test('cribbage: pegging, back peg, win at 121, skunks', () => {
  const C = R.cribbage;
  const s = ['p1', 'p2'];
  const r = C.replay({ target: 121 }, s, [{ side: 'p1', pts: 60 }, { side: 'p2', pts: 20 }, { side: 'p1', pts: 50 }, { side: 'p1', pts: 15 }, { side: 'p2', pts: 5 }]);
  assert.ok(r.over); assert.deepStrictEqual(r.winners, ['p1']);
  assert.strictEqual(r.totals.p1, 121, 'capped at the target');
  assert.strictEqual(r.rows.length, 4, 'entries after the win are ignored');
  assert.strictEqual(r.info.back.p1, 110);
  assert.strictEqual(r.info.skunks.p2, 'double skunk');
  const r2 = C.replay({ target: 121 }, s, [{ side: 'p2', pts: 85 }, { side: 'p1', pts: 121 }]);
  assert.strictEqual(r2.info.skunks.p2, 'skunk');
  assert.ok(C.validate({}, s, { side: 'p1', pts: 30 }));
});

// ---------- Hearts ----------
test('hearts: points, shooting the moon both ways, omnibus J♦, lowest wins', () => {
  const H = R.hearts;
  const o = H.defaults();
  const e = { hearts: by([5, 3, 5, 0]), queen: 'p4' };
  assert.deepStrictEqual(H.hand(o, P4, e).deltas, by([5, 3, 5, 13]));
  const moon = { hearts: by([13, 0, 0, 0]), queen: 'p1' };
  assert.deepStrictEqual(H.hand(o, P4, moon).deltas, by([0, 26, 26, 26]));
  assert.deepStrictEqual(H.hand(Object.assign({}, o, { moon: 'subtract' }), P4, moon).deltas, by([-26, 0, 0, 0]));
  assert.strictEqual(H.hand(Object.assign({}, o, { omnibus: true }), P4, Object.assign({ jack: 'p2' }, e)).deltas.p2, -7);
  assert.ok(H.validate(o, P4, { hearts: by([5, 3, 5, 1]), queen: 'p4' }).includes('13'));
  assert.ok(H.validate(Object.assign({}, o, { omnibus: true }), P4, e).includes('J♦'));
  const r = H.replay(o, P4, Array.from({ length: 4 }, () => moon));
  assert.ok(r.over); assert.deepStrictEqual(r.winners, ['p1']);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
