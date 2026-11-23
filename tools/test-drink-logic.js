/* Unit tests for the drinking games. Run: node tools/test-drink-logic.js (no dependencies) */
const assert = require('assert');
const D = require('../js/drink-logic.js');
const DATA = require('../js/drink-data.js');
const { createRng } = require('../js/impostor-logic.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}

test('deck: 52 unique cards; 7.5 deck drops 8s, 9s and 10s', () => {
  const d = D.newDeck(createRng(1));
  assert.strictEqual(d.length, 52);
  assert.strictEqual(new Set(d).size, 52);
  const s = D.newDeck(createRng(1), { ranks: D.BUST[7.5].ranks });
  assert.strictEqual(s.length, 40);
  assert.ok(!s.some((c) => ['8', '9', '10'].indexOf(D.rankOf(c)) !== -1));
  assert.strictEqual(D.label('10H'), '10♥');
  assert.ok(D.isRed('QD') && !D.isRed('KS'));
  assert.strictEqual(D.value('AS'), 14); assert.strictEqual(D.value('AS', true), 1); assert.strictEqual(D.value('KD'), 13);
});

test('higher/lower: equal is wrong unless allowed; aces high', () => {
  assert.ok(D.higherLower('5H', '9C', 'higher'));
  assert.ok(!D.higherLower('5H', '9C', 'lower'));
  assert.ok(!D.higherLower('5H', '5C', 'higher'));
  assert.ok(D.higherLower('5H', '5C', 'higher', true));
  assert.ok(D.higherLower('KH', 'AC', 'higher'));
});

test('ride the bus: four questions', () => {
  assert.ok(D.busAnswer(0, [], '7H', 'red'));
  assert.ok(!D.busAnswer(0, [], '7S', 'red'));
  assert.ok(D.busAnswer(1, ['7H'], '9S', 'higher'));
  assert.ok(D.busAnswer(2, ['4H', 'JS'], '8C', 'inside'));
  assert.ok(D.busAnswer(2, ['4H', 'JS'], 'KC', 'outside'));
  assert.ok(!D.busAnswer(2, ['4H', 'JS'], 'JC', 'outside'), 'hitting an edge is wrong');
  assert.ok(D.busAnswer(3, ['4H', 'JS', '8C'], '2D', 'D'));
  assert.strictEqual(D.BUS_STEPS.length, 4);
});

test('pyramid order and holders', () => {
  const o = D.pyramidOrder([5, 4, 3, 2, 1]);
  assert.strictEqual(o.length, 15);
  assert.deepStrictEqual([o[0].row, o[5].row, o[14].row], [1, 2, 5]);
  assert.deepStrictEqual(D.holders({ a: ['7H', '2C'], b: ['7S'], c: ['QD'] }, '7D'), ['a', 'b']);
});

test('horse race: horses move, side cards push back, a winner crosses the line', () => {
  const g = D.createRace(createRng(4), 5);
  assert.strictEqual(g.side.length, 5);
  assert.ok(!g.deck.concat(g.side).some((c) => D.rankOf(c) === 'A'));
  let steps = 0;
  while (!g.winner && steps < 200) { D.raceStep(g); steps++; }
  assert.ok(g.winner && 'CDHS'.includes(g.winner));
  const res = D.settleRace([{ pid: 'p1', suit: 'H', sips: 3 }, { pid: 'p2', suit: 'S', sips: 2 }], 'H');
  assert.deepStrictEqual(res, { give: [{ pid: 'p1', sips: 3 }], drink: [{ pid: 'p2', sips: 2 }] });
  // Forced: flip side card once all horses pass it.
  const f = { length: 3, pos: { C: 1, D: 1, H: 1, S: 0 }, deck: ['5S'], side: ['9H', '2C', '3D'], flipped: 0, events: [], winner: null };
  D.raceStep(f);
  assert.deepStrictEqual(f.pos, { C: 1, D: 1, H: 0, S: 1 });
  assert.strictEqual(f.events[1].type, 'back');
});

test('beat the dealer: first try, second try, miss by the difference', () => {
  assert.deepStrictEqual(D.dealerResult('7H', '7', null), { who: 'dealer', sips: 5, tries: 1 });
  assert.deepStrictEqual(D.dealerResult('7H', '4', null), { hint: 'higher' });
  assert.deepStrictEqual(D.dealerResult('7H', '4', '7'), { who: 'dealer', sips: 3, tries: 2 });
  assert.deepStrictEqual(D.dealerResult('7H', '4', 'J'), { who: 'guesser', sips: 4, tries: 2 });
  assert.deepStrictEqual(D.dealerResult('AH', 'K', 'Q'), { who: 'guesser', sips: 11, tries: 2 }, 'ace is low (1)');
});

test('mexico: values and ranking', () => {
  assert.strictEqual(D.mexicoValue(3, 5), 53);
  assert.strictEqual(D.mexicoValue(1, 2), 21);
  assert.ok(D.mexicoRank(21) > D.mexicoRank(66));
  assert.ok(D.mexicoRank(11) > D.mexicoRank(65));
  assert.ok(D.mexicoRank(65) > D.mexicoRank(31));
  assert.strictEqual(D.MEXICO_ORDER.length, 21);
  assert.strictEqual(D.MEXICO_ORDER[0], 31);
  assert.strictEqual(D.MEXICO_ORDER[20], 21);
  assert.strictEqual(D.mexicoName(44), 'Double 4s');
});

test('bust: 21 with soft aces, 7.5 with half-point faces, results', () => {
  assert.strictEqual(D.handValue(['AH', 'KS'], 21), 21);
  assert.strictEqual(D.handValue(['AH', 'AS', '9C'], 21), 21);
  assert.strictEqual(D.handValue(['KH', 'QS', '5C'], 21), 25);
  assert.strictEqual(D.handValue(['7H', 'QS'], 7.5), 7.5);
  assert.strictEqual(D.handValue(['5H', '3S'], 7.5), 8);
  const r = D.bustResults({ a: 19, b: 22, c: 21, d: 21 }, 21);
  assert.deepStrictEqual(r, { busted: ['b'], best: ['c', 'd'], perfect: ['c', 'd'] });
  assert.deepStrictEqual(D.bustResults({ a: 9, b: 8 }, 7.5).best, []);
});

test('up and down the river: drink or give n per matching card', () => {
  const hands = { a: ['7H', '7S', '2C', 'KD'], b: ['7D', '3C', '4C', '5C'], c: ['8H', '9H', '10H', 'JH'] };
  assert.deepStrictEqual(D.riverCall(hands, '7C', 3, 'up'), [{ pid: 'a', sips: 6, action: 'drink' }, { pid: 'b', sips: 3, action: 'drink' }]);
  assert.deepStrictEqual(D.riverCall(hands, 'JD', 2, 'down'), [{ pid: 'c', sips: 2, action: 'give' }]);
  assert.deepStrictEqual(D.riverCall(hands, 'AD', 5, 'down'), []);
});

test('rule roulette never repeats the last spin', () => {
  const rng = createRng(2);
  let last = null;
  for (let i = 0; i < 200; i++) { const n = D.spin(DATA.roulette, rng, last); assert.notStrictEqual(n, last); last = n; }
});

test('content: kings rule sets cover every rank; question packs are full and unique', () => {
  for (const k of Object.keys(DATA.kings)) for (const r of D.RANKS) assert.ok(DATA.kings[k][r] && DATA.kings[k][r][0] && DATA.kings[k][r][1], `${k} ${r}`);
  for (const k of ['mild', 'spicy', 'couples']) {
    assert.ok(DATA.truth[k].length >= 25, k);
    assert.strictEqual(new Set(DATA.truth[k]).size, DATA.truth[k].length, k + ' duplicates');
  }
  assert.ok(DATA.paranoia.length >= 50 && new Set(DATA.paranoia).size === DATA.paranoia.length);
  assert.ok(DATA.roulette.length >= 35 && DATA.roulette.every((r) => r.length === 3 && (r[2] === 'now' || r[2] === 'rule')));
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
