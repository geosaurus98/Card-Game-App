/* Unit tests for the Impostor game logic and word list.
 * Run: node tools/test-impostor-logic.js   (no dependencies) */
const assert = require('assert');
const L = require('../js/impostor-logic.js');
const WORDS = require('../js/impostor-words.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}
const CATS = Object.keys(WORDS);

// ---------- Word list ----------
test('word list has 15 categories of 100 words', () => {
  assert.strictEqual(CATS.length, 15);
  CATS.forEach((c) => assert.strictEqual(WORDS[c].length, 100, `${c} has ${WORDS[c].length}`));
});
test('no blank or duplicate words within a category', () => {
  CATS.forEach((c) => {
    const seen = new Set();
    WORDS[c].forEach((w) => {
      assert.ok(typeof w === 'string' && w.trim() === w && w.length > 0, `bad word "${w}" in ${c}`);
      assert.ok(!seen.has(w.toLowerCase()), `duplicate "${w}" in ${c}`);
      seen.add(w.toLowerCase());
    });
  });
});

// ---------- Settings ----------
test('defaults: 4 players, 1 impostor, random category, hint on, timer off, clockwise', () => {
  const s = L.normalizeSettings({}, CATS);
  assert.deepStrictEqual(
    [s.playerCount, s.impostorCount, s.category, s.hint, s.timerMinutes, s.direction],
    [4, 1, 'random', true, 0, 'clockwise']);
});
test('player count is clamped to 3–12', () => {
  assert.strictEqual(L.normalizeSettings({ playerCount: 1 }, CATS).playerCount, 3);
  assert.strictEqual(L.normalizeSettings({ playerCount: 99 }, CATS).playerCount, 12);
  assert.strictEqual(L.normalizeSettings({ playerCount: 'abc' }, CATS).playerCount, 3);
});
test('impostors are always a minority', () => {
  assert.strictEqual(L.maxImpostors(3), 1);
  assert.strictEqual(L.maxImpostors(4), 1);
  assert.strictEqual(L.maxImpostors(5), 2);
  assert.strictEqual(L.maxImpostors(12), 5);
  assert.strictEqual(L.normalizeSettings({ playerCount: 4, impostorCount: 3 }, CATS).impostorCount, 1);
  assert.strictEqual(L.normalizeSettings({ playerCount: 8, impostorCount: 0 }, CATS).impostorCount, 1);
});
test('unknown category and timer values fall back safely', () => {
  const s = L.normalizeSettings({ category: 'Nope', timerMinutes: 7, direction: 'sideways' }, CATS);
  assert.deepStrictEqual([s.category, s.timerMinutes, s.direction], ['random', 0, 'clockwise']);
  assert.strictEqual(L.normalizeSettings({ hint: false }, CATS).hint, false);
});

// ---------- Names ----------
test('blank names default to "Player N" and are trimmed', () => {
  assert.deepStrictEqual(L.normalizeNames(['  Ann  ', '', null], 4), ['Ann', 'Player 2', 'Player 3', 'Player 4']);
});
test('duplicate names are made distinct (case-insensitive)', () => {
  assert.deepStrictEqual(L.normalizeNames(['Sam', 'sam', 'Sam'], 3), ['Sam', 'sam (2)', 'Sam (3)']);
});
test('long names are cut to 20 characters', () => {
  assert.strictEqual(L.normalizeNames(['A'.repeat(40)], 1)[0].length, L.MAX_NAME_LENGTH);
});

// ---------- Word picking ----------
test('a chosen category is respected', () => {
  const rng = L.createRng(1);
  for (let i = 0; i < 50; i++) {
    const p = L.pickWord(WORDS, 'Animals', rng);
    assert.strictEqual(p.category, 'Animals');
    assert.ok(WORDS.Animals.includes(p.word));
  }
});
test('"random" uses many different categories', () => {
  const rng = L.createRng(2);
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(L.pickWord(WORDS, 'random', rng).category);
  assert.strictEqual(seen.size, CATS.length);
});
test('recently used words are avoided', () => {
  const rng = L.createRng(3);
  const recent = WORDS.Food.slice(0, 99).map((w) => 'Food|' + w);
  for (let i = 0; i < 20; i++) assert.strictEqual(L.pickWord(WORDS, 'Food', rng, recent).word, WORDS.Food[99]);
});
test('if every word was used recently, it still picks one', () => {
  const recent = WORDS.Food.map((w) => 'Food|' + w);
  assert.ok(WORDS.Food.includes(L.pickWord(WORDS, 'Food', L.createRng(4), recent).word));
});
test('rememberWord keeps a bounded history', () => {
  let recent = [];
  for (let i = 0; i < 100; i++) recent = L.rememberWord(recent, { category: 'X', word: 'w' + i });
  assert.strictEqual(recent.length, L.RECENT_LIMIT);
  assert.strictEqual(recent[recent.length - 1], 'X|w99');
});

// ---------- Roles ----------
test('assignImpostors returns the right number of distinct, valid indices', () => {
  const rng = L.createRng(5);
  for (let n = 3; n <= 12; n++) {
    for (let k = 1; k <= L.maxImpostors(n); k++) {
      const imp = L.assignImpostors(n, k, rng);
      assert.strictEqual(imp.length, k);
      assert.strictEqual(new Set(imp).size, k);
      imp.forEach((i) => assert.ok(i >= 0 && i < n));
    }
  }
});
test('every player is equally likely to be the impostor', () => {
  const rng = L.createRng(6);
  const counts = new Array(6).fill(0);
  const runs = 60000;
  for (let i = 0; i < runs; i++) counts[L.assignImpostors(6, 1, rng)[0]]++;
  counts.forEach((c) => assert.ok(Math.abs(c / runs - 1 / 6) < 0.01, `skewed: ${counts}`));
});
test('roleFor: impostor sees the hint only when enabled; others see the word', () => {
  const round = { players: ['A', 'B', 'C'], word: 'Pizza', category: 'Food', impostors: [1], hint: true, starter: 0 };
  assert.deepStrictEqual(L.roleFor(round, 0), { impostor: false, word: 'Pizza' });
  assert.deepStrictEqual(L.roleFor(round, 1), { impostor: true, hint: 'Food' });
  assert.deepStrictEqual(L.roleFor(Object.assign({}, round, { hint: false }), 1), { impostor: true, hint: null });
});
test('createRound builds a consistent round from saved settings', () => {
  const r = L.createRound({ playerCount: 5, impostorCount: 2, names: ['Ann', 'Bo'], category: 'Sports', hint: false }, WORDS, L.createRng(7));
  assert.deepStrictEqual(r.players, ['Ann', 'Bo', 'Player 3', 'Player 4', 'Player 5']);
  assert.strictEqual(r.category, 'Sports');
  assert.ok(WORDS.Sports.includes(r.word));
  assert.strictEqual(r.impostors.length, 2);
  assert.strictEqual(r.hint, false);
  assert.ok(r.starter >= 0 && r.starter < 5);
});
test('same seed gives the same round (reproducible)', () => {
  const s = { playerCount: 6, impostorCount: 2 };
  assert.deepStrictEqual(L.createRound(s, WORDS, L.createRng(42)), L.createRound(s, WORDS, L.createRng(42)));
});

// ---------- Turn order ----------
test('clockwise order starts at the starter and wraps around', () => {
  assert.deepStrictEqual(L.turnOrder(5, 3, 'clockwise'), [3, 4, 0, 1, 2]);
});
test('anticlockwise order goes the other way and wraps', () => {
  assert.deepStrictEqual(L.turnOrder(5, 1, 'anticlockwise'), [1, 0, 4, 3, 2]);
});
test('turn order always includes every player exactly once', () => {
  for (let n = 3; n <= 12; n++) {
    for (let s = 0; s < n; s++) {
      ['clockwise', 'anticlockwise'].forEach((d) => {
        const o = L.turnOrder(n, s, d);
        assert.strictEqual(o[0], s);
        assert.deepStrictEqual([...o].sort((a, b) => a - b), [...Array(n).keys()]);
      });
    }
  }
});
test('starter is roughly uniform', () => {
  const rng = L.createRng(8);
  const counts = new Array(4).fill(0);
  for (let i = 0; i < 40000; i++) counts[L.pickStarter(4, rng)]++;
  counts.forEach((c) => assert.ok(Math.abs(c / 40000 - 0.25) < 0.01, `skewed: ${counts}`));
});

// ---------- Timer ----------
test('formatTime shows m:ss and never goes negative', () => {
  assert.strictEqual(L.formatTime(125), '2:05');
  assert.strictEqual(L.formatTime(0.2), '0:01');
  assert.strictEqual(L.formatTime(-5), '0:00');
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
