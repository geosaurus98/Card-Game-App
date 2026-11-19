/* Unit tests for the five-dice scorecard. Run: node tools/test-dice-sheet.js (no dependencies) */
const assert = require('assert');
const S = require('../js/dice-sheet-logic.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}
const Y = S.rules('yahtzee');
const C = S.rules('yacht');
const N = S.rules('yatzy');
const card = (boxes, bonusFives) => ({ boxes: Object.assign({}, boxes), bonusFives: bonusFives || 0 });

test('rule sets have 13 / 12 / 15 boxes with unique ids', () => {
  assert.strictEqual(Y.cats.length, 13);
  assert.strictEqual(C.cats.length, 12);
  assert.strictEqual(N.cats.length, 15);
  for (const r of [Y, C, N]) assert.strictEqual(new Set(r.cats.map((c) => c.id)).size, r.cats.length);
  assert.strictEqual(S.rules('nope'), Y, 'unknown rules fall back to Yahtzee-style');
});

test('yahtzee-style: upper boxes, of-a-kind, chance', () => {
  assert.strictEqual(S.rawScore(Y, 'threes', [3, 3, 1, 3, 6]), 9);
  assert.strictEqual(S.rawScore(Y, 'sixes', [1, 2, 3, 4, 5]), 0);
  assert.strictEqual(S.rawScore(Y, 'three', [4, 4, 4, 2, 6]), 20);
  assert.strictEqual(S.rawScore(Y, 'three', [4, 4, 2, 2, 6]), 0);
  assert.strictEqual(S.rawScore(Y, 'four', [5, 5, 5, 5, 5]), 25, 'five alike counts as four of a kind');
  assert.strictEqual(S.rawScore(Y, 'chance', [6, 6, 5, 1, 2]), 20);
});

test('yahtzee-style: full house, straights, five of a kind', () => {
  assert.strictEqual(S.rawScore(Y, 'full', [2, 2, 5, 5, 5]), 25);
  assert.strictEqual(S.rawScore(Y, 'full', [5, 5, 5, 5, 5]), 0, 'five alike is not a full house (without the joker)');
  assert.strictEqual(S.rawScore(Y, 'small', [1, 3, 2, 4, 6]), 30);
  assert.strictEqual(S.rawScore(Y, 'small', [3, 4, 5, 6, 6]), 30);
  assert.strictEqual(S.rawScore(Y, 'small', [1, 2, 3, 5, 6]), 0);
  assert.strictEqual(S.rawScore(Y, 'large', [2, 3, 4, 5, 6]), 40);
  assert.strictEqual(S.rawScore(Y, 'large', [1, 2, 3, 4, 6]), 0);
  assert.strictEqual(S.rawScore(Y, 'yahtzee', [4, 4, 4, 4, 4]), 50);
  assert.strictEqual(S.rawScore(Y, 'yahtzee', [4, 4, 4, 4, 3]), 0);
});

test('classic yacht: full house totals, four of a kind counts four dice, fixed straights', () => {
  assert.strictEqual(S.rawScore(C, 'full', [6, 6, 6, 5, 5]), 28);
  assert.strictEqual(S.rawScore(C, 'four', [3, 3, 3, 3, 6]), 12);
  assert.strictEqual(S.rawScore(C, 'four', [3, 3, 3, 3, 3]), 12);
  assert.strictEqual(S.rawScore(C, 'little', [5, 4, 3, 2, 1]), 30);
  assert.strictEqual(S.rawScore(C, 'little', [2, 3, 4, 5, 6]), 0);
  assert.strictEqual(S.rawScore(C, 'big', [2, 3, 4, 5, 6]), 30);
  assert.strictEqual(S.rawScore(C, 'choice', [1, 1, 1, 1, 2]), 6);
});

test('nordic yatzy: pairs, two pairs, n × face, small 15 / large 20', () => {
  assert.strictEqual(S.rawScore(N, 'pair', [3, 3, 5, 5, 1]), 10, 'highest pair');
  assert.strictEqual(S.rawScore(N, 'twopairs', [3, 3, 5, 5, 1]), 16);
  assert.strictEqual(S.rawScore(N, 'twopairs', [3, 3, 3, 3, 1]), 0, 'four alike is not two different pairs');
  assert.strictEqual(S.rawScore(N, 'three', [2, 2, 2, 6, 6]), 6);
  assert.strictEqual(S.rawScore(N, 'small', [1, 2, 3, 4, 5]), 15);
  assert.strictEqual(S.rawScore(N, 'large', [2, 3, 4, 5, 6]), 20);
  assert.strictEqual(S.rawScore(N, 'full', [1, 1, 2, 2, 2]), 8);
});

test('totals: upper bonus at 63, pace vs three of each, bonus lost when upper done short', () => {
  const c = card({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
  let t = S.totals(Y, c);
  assert.strictEqual(t.upper, 63); assert.strictEqual(t.bonus, 35); assert.strictEqual(t.pace, 0); assert.strictEqual(t.total, 98);
  t = S.totals(N, c); assert.strictEqual(t.bonus, 50, 'Yatzy bonus is 50');
  t = S.totals(C, c); assert.strictEqual(t.bonus, 0, 'classic Yacht has no bonus');
  const short = card({ ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
  t = S.totals(Y, short);
  assert.strictEqual(t.need, 1); assert.strictEqual(t.pace, -1); assert.ok(t.bonusLost); assert.strictEqual(t.bonus, 0);
  t = S.totals(Y, card({ sixes: 24 }));
  assert.strictEqual(t.pace, 6, '4 sixes is 6 ahead of pace'); assert.ok(!t.bonusLost);
});

test('placing a roll fills the box; filled boxes cannot be reused', () => {
  const c = S.emptyCard();
  assert.deepStrictEqual(S.place(Y, c, 'full', [2, 2, 3, 3, 3]), { ok: true, score: 25, bonus: false, outright: false });
  assert.strictEqual(S.place(Y, c, 'full', [2, 2, 3, 3, 3]).ok, false);
  assert.strictEqual(S.place(Y, c, 'chance', [1, 1, 1, 1]).ok, false, 'needs five dice');
  assert.strictEqual(S.openCats(Y, c).length, 12);
});

test('yahtzee bonus +100 for each extra five of a kind, only after scoring 50 in that box', () => {
  const c = S.emptyCard();
  S.place(Y, c, 'yahtzee', [6, 6, 6, 6, 6]);
  const r = S.place(Y, c, 'fours', [4, 4, 4, 4, 4]);
  assert.ok(r.ok && r.bonus); assert.strictEqual(r.score, 20);
  assert.strictEqual(S.totals(Y, c).fiveBonus, 100);
  const z = card({ yahtzee: 0 });
  const r2 = S.place(Y, z, 'twos', [2, 2, 2, 2, 2]);
  assert.ok(r2.ok && !r2.bonus, 'no bonus when the box was scratched with 0');
  assert.strictEqual(S.place(C, card({ yacht: 50 }), 'choice', [3, 3, 3, 3, 3]).bonus, false, 'classic Yacht has no bonus');
});

test('joker rule: matching upper box first, then lower boxes at full value, else any upper for 0', () => {
  let c = card({ yahtzee: 50 });
  assert.deepStrictEqual(S.allowed(Y, c, [5, 5, 5, 5, 5]), ['fives'], 'must take the open matching upper box');
  c = card({ yahtzee: 50, fives: 15 });
  const ok = S.allowed(Y, c, [5, 5, 5, 5, 5]);
  assert.ok(ok.indexOf('full') !== -1 && ok.indexOf('ones') === -1, 'any open lower box, not upper');
  assert.strictEqual(S.scoreFor(Y, c, 'full', [5, 5, 5, 5, 5]), 25);
  assert.strictEqual(S.scoreFor(Y, c, 'small', [5, 5, 5, 5, 5]), 30);
  assert.strictEqual(S.scoreFor(Y, c, 'large', [5, 5, 5, 5, 5]), 40);
  assert.strictEqual(S.scoreFor(Y, c, 'three', [5, 5, 5, 5, 5]), 25);
  const lowerFull = { yahtzee: 50, fives: 15, three: 10, four: 10, full: 25, small: 30, large: 40, chance: 20 };
  assert.deepStrictEqual(S.allowed(Y, card(lowerFull), [5, 5, 5, 5, 5]), ['ones', 'twos', 'threes', 'fours', 'sixes']);
  assert.strictEqual(S.scoreFor(Y, card(lowerFull), 'ones', [5, 5, 5, 5, 5]), 0);
  assert.strictEqual(S.place(Y, card({ yahtzee: 50 }), 'chance', [5, 5, 5, 5, 5]).ok, false, 'joker blocks other boxes');
  assert.strictEqual(S.allowed(Y, S.emptyCard(), [5, 5, 5, 5, 5]).length, 13, 'no joker before the box is filled');
  assert.strictEqual(S.allowed(C, card({ yacht: 50 }), [5, 5, 5, 5, 5]).length, 11, 'classic Yacht has no joker rule');
});

test('manual scores are checked against what the box can hold', () => {
  assert.deepStrictEqual(S.possible(Y, 'fours'), [0, 4, 8, 12, 16, 20]);
  assert.deepStrictEqual(S.possible(Y, 'full'), [0, 25]);
  assert.ok(S.validManual(Y, 'chance', 5) && S.validManual(Y, 'chance', 30) && !S.validManual(Y, 'chance', 31) && !S.validManual(Y, 'chance', 4));
  assert.ok(!S.validManual(Y, 'three', 4) && S.validManual(Y, 'three', 5) && S.validManual(Y, 'three', 0));
  assert.ok(S.validManual(Y, 'small', 30) && !S.validManual(Y, 'small', 25));
  assert.ok(!S.validManual(C, 'four', 5) && S.validManual(C, 'four', 24));
  assert.ok(!S.validManual(Y, 'fours', 3.5));
});

test('turn order: fewest filled boxes first, by seat; game ends when every card is full', () => {
  const cards = { a: card({ ones: 1 }), b: S.emptyCard() };
  assert.strictEqual(S.nextPlayer(Y, ['a', 'b'], cards), 'b');
  cards.b.boxes.twos = 2;
  assert.strictEqual(S.nextPlayer(Y, ['a', 'b'], cards), 'a');
  assert.strictEqual(S.turnNumber(Y, ['a', 'b'], cards), 2);
  const full = {}; Y.cats.forEach((c) => { full[c.id] = 0; });
  const done = { a: card(full), b: card(full) };
  done.a.boxes.chance = 20;
  assert.strictEqual(S.nextPlayer(Y, ['a', 'b'], done), null);
  assert.ok(S.totals(Y, done.a).done);
  assert.deepStrictEqual(S.standings(Y, ['a', 'b'], done, { a: 'Ann', b: 'Bob' }).map((s) => [s.name, s.total]), [['Ann', 20], ['Bob', 0]]);
});

test('perfect yahtzee-style game scores 1575', () => {
  const c = S.emptyCard();
  S.place(Y, c, 'yahtzee', [6, 6, 6, 6, 6]);
  for (let f = 1; f <= 6; f++) S.place(Y, c, ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'][f - 1], [f, f, f, f, f]);
  for (const id of ['three', 'four', 'full', 'small', 'large', 'chance']) assert.ok(S.place(Y, c, id, [6, 6, 6, 6, 6]).ok, id);
  const t = S.totals(Y, c);
  assert.strictEqual(c.bonusFives, 12);
  assert.strictEqual(t.total, 1575);
});

// ---------- Generala ----------
const G = S.rules('generala');
const G2 = S.rules('generala2');
test('generala: 10 / 11 boxes, offered only on the Generala scorecard', () => {
  assert.strictEqual(G.cats.length, 10);
  assert.strictEqual(G2.cats.length, 11);
  assert.deepStrictEqual(S.rulesFor('generala').map((r) => r.id), ['generala', 'generala2']);
  assert.deepStrictEqual(S.rulesFor('yacht').map((r) => r.id), ['yahtzee', 'yacht', 'yatzy']);
});
test('generala: escalera (incl. 3-4-5-6-1), full 30, poker 40, generala 50', () => {
  assert.strictEqual(S.rawScore(G, 'esc', [1, 2, 3, 4, 5]), 20);
  assert.strictEqual(S.rawScore(G, 'esc', [6, 5, 4, 3, 2]), 20);
  assert.strictEqual(S.rawScore(G, 'esc', [3, 4, 5, 6, 1]), 20);
  assert.strictEqual(S.rawScore(G, 'esc', [1, 2, 3, 4, 6]), 0);
  assert.strictEqual(S.rawScore(G, 'full', [2, 2, 6, 6, 6]), 30);
  assert.strictEqual(S.rawScore(G, 'poker', [4, 4, 4, 4, 1]), 40);
  assert.strictEqual(S.rawScore(G, 'poker', [4, 4, 4, 4, 4]), 40);
  assert.strictEqual(S.rawScore(G, 'generala', [2, 2, 2, 2, 2]), 50);
  assert.strictEqual(S.totals(G, { boxes: { 1: 3 }, bonusFives: 0 }).bonus, 0, 'no upper bonus');
});
test('generala: served (first roll) adds 5; manual scores accept served values', () => {
  const c = S.emptyCard();
  assert.strictEqual(S.place(G, c, 'full', [3, 3, 5, 5, 5], true).score, 35);
  assert.strictEqual(S.scoreFor(G, c, 'ones', [1, 1, 1, 2, 2], true), 3, 'no served bonus on number boxes');
  assert.strictEqual(S.scoreFor(G, c, 'esc', [1, 1, 1, 2, 2], true), 0, 'no bonus on a zero');
  assert.deepStrictEqual(S.possible(G, 'poker'), [0, 40, 45]);
  assert.ok(S.validManual(G, 'esc', 25) && !S.validManual(G, 'esc', 22));
});
test('generala: a served Generala wins outright and ends the game', () => {
  const cards = { a: S.emptyCard(), b: S.emptyCard() };
  const r = S.place(G, cards.b, 'generala', [6, 6, 6, 6, 6], true);
  assert.ok(r.ok && r.outright); assert.strictEqual(r.score, 55);
  assert.strictEqual(S.nextPlayer(G, ['a', 'b'], cards), null);
  assert.strictEqual(S.standings(G, ['a', 'b'], cards, { a: 'A', b: 'B' })[0].name, 'B');
  const plain = S.emptyCard();
  assert.ok(!S.place(G, plain, 'generala', [6, 6, 6, 6, 6], false).outright, 'not served: just 50');
});
test('generala: Double Generala needs a 50 in Generala first', () => {
  const c = S.emptyCard();
  assert.strictEqual(S.scoreFor(G2, c, 'double', [5, 5, 5, 5, 5]), 0);
  S.place(G2, c, 'generala', [2, 2, 2, 2, 2]);
  assert.strictEqual(S.scoreFor(G2, c, 'double', [5, 5, 5, 5, 5]), 100);
  assert.deepStrictEqual(S.possible(G2, 'double'), [0, 100]);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
