/* Unit tests for party game logic. Run: node tools/test-party-logic.js (no dependencies) */
const assert = require('assert');
const W = require('../js/werewolf-logic.js');
const G = require('../js/guess-logic.js');
const P = require('../js/party-logic.js');
const PW = require('../js/party-words.js');
const IW = require('../js/impostor-words.js');
const { createRng } = require('../js/impostor-logic.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (e) { console.log('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}
const count = (arr, v) => arr.filter((x) => x === v).length;

// ---------- Werewolf ----------
test('werewolf: defaults (7 players, 2 wolves, seer + doctor, no hunter)', () => {
  const s = W.normalizeSettings({});
  assert.deepStrictEqual([s.playerCount, s.wolves, s.seer, s.doctor, s.hunter, s.theme], [7, 2, true, true, false, 'werewolf']);
});
test('werewolf: player count clamped to 5–18, wolves always a minority', () => {
  assert.strictEqual(W.normalizeSettings({ playerCount: 2 }).playerCount, 5);
  assert.strictEqual(W.normalizeSettings({ playerCount: 40 }).playerCount, 18);
  for (let n = 5; n <= 18; n++) {
    const s = W.normalizeSettings({ playerCount: n, wolves: 99 });
    assert.ok(s.wolves < n - s.wolves, `n=${n} wolves=${s.wolves}`);
  }
});
test('werewolf: recommended wolves scale with group size', () => {
  assert.deepStrictEqual([5, 6, 7, 9, 10, 12, 13, 18].map(W.recommendedWolves), [1, 1, 2, 2, 3, 3, 4, 4]);
});
test('werewolf: all specials fit even in the smallest game', () => {
  const s = W.normalizeSettings({ playerCount: 5, wolves: 2, seer: true, doctor: true, hunter: true });
  assert.deepStrictEqual(W.roleList(s).sort(), ['doctor', 'hunter', 'seer', 'werewolf', 'werewolf']);
});
test('werewolf: dealt roles match the settings for every size', () => {
  const rng = createRng(1);
  for (let n = 5; n <= 18; n++) {
    const s = W.normalizeSettings({ playerCount: n, hunter: true });
    const roles = W.dealRoles(s, rng);
    assert.strictEqual(roles.length, n);
    assert.strictEqual(count(roles, 'werewolf'), s.wolves);
    assert.strictEqual(count(roles, 'seer'), s.seer ? 1 : 0);
    assert.strictEqual(count(roles, 'hunter'), s.hunter ? 1 : 0);
  }
});
test('werewolf: each seat is equally likely to get a wolf', () => {
  const rng = createRng(2);
  const hits = new Array(8).fill(0);
  const runs = 40000;
  for (let i = 0; i < runs; i++) W.dealRoles({ playerCount: 8, wolves: 2 }, rng).forEach((r, k) => { if (r === 'werewolf') hits[k]++; });
  hits.forEach((h) => assert.ok(Math.abs(h / runs - 2 / 8) < 0.01, `skewed ${hits}`));
});
test('werewolf: night script calls only roles that were dealt, in order', () => {
  const s = W.nightScript(['werewolf', 'villager', 'doctor'], 2, 'werewolf');
  assert.ok(s[0].startsWith('Night 2'));
  assert.ok(s.some((l) => l.startsWith('Werewolves')));
  assert.ok(s.some((l) => l.startsWith('Doctor')));
  assert.ok(!s.some((l) => l.includes('Seer')));
  assert.ok(s[s.length - 1].includes('morning'));
});
test('werewolf: Mafia theme renames roles in the script', () => {
  const s = W.nightScript(['werewolf', 'seer'], 1, 'mafia');
  assert.ok(s.some((l) => l.startsWith('Mafia')) && s.some((l) => l.startsWith('Detective')));
  assert.strictEqual(W.roleName('villager', 'mafia'), 'Civilian');
});
test('werewolf: win conditions', () => {
  const roles = ['werewolf', 'werewolf', 'villager', 'villager', 'seer'];
  assert.strictEqual(W.checkWinner(roles, [true, true, true, true, true]), null);
  assert.strictEqual(W.checkWinner(roles, [false, false, true, true, true]), 'village');
  assert.strictEqual(W.checkWinner(roles, [true, true, true, true, false]), 'wolves'); // 2 vs 2
  assert.strictEqual(W.checkWinner(roles, [true, false, true, true, true]), null);    // 1 vs 3
});

// ---------- Guessing engine: Charades ----------
test('guess: words are cleaned and de-duplicated', () => {
  assert.deepStrictEqual(G.cleanWords([' Pizza ', 'pizza', '', null, 'Big  dog']), ['Pizza', 'Big dog']);
});
test('guess: team names default to Team A, Team B…', () => {
  assert.deepStrictEqual(G.teamNames(['Reds', ''], 3), ['Reds', 'Team B', 'Team C']);
});
test('charades: scoring, skipping and turn rotation', () => {
  const rng = createRng(3);
  const g = G.createGame({ mode: 'charades', teams: ['A', 'B'], words: ['w1', 'w2', 'w3'], rounds: 2 }, rng);
  G.startTurn(g, rng);
  const first = g.current.word;
  G.gotIt(g, rng);
  assert.strictEqual(g.teams[0].score, 1);
  assert.notStrictEqual(g.current.word, first);
  G.skip(g, rng);
  assert.strictEqual(g.teams[0].score, 1);
  G.endTurn(g, rng);
  assert.strictEqual(g.teamIndex, 1);
  assert.strictEqual(g.over, false);
});
test('charades: the deck never runs dry and the game ends after the set rounds', () => {
  const rng = createRng(4);
  const g = G.createGame({ mode: 'charades', teams: ['A', 'B'], words: ['a', 'b'], rounds: 2 }, rng);
  for (let t = 0; t < 4; t++) {
    G.startTurn(g, rng);
    for (let i = 0; i < 10; i++) { assert.ok(g.current.word); G.gotIt(g, rng); }
    G.endTurn(g, rng);
  }
  assert.strictEqual(g.over, true);
  assert.strictEqual(g.teams[0].score + g.teams[1].score, 40);
});

// ---------- Guessing engine: Fishbowl ----------
test('fishbowl: a round ends when the bowl is empty; same words come back next round', () => {
  const rng = createRng(5);
  const g = G.createGame({ mode: 'fishbowl', teams: ['A', 'B'], words: ['x', 'y', 'z'] }, rng);
  G.startTurn(g, rng);
  G.gotIt(g, rng); G.gotIt(g, rng); G.gotIt(g, rng);
  assert.strictEqual(g.roundOver, true);
  assert.strictEqual(g.current.word, null);
  assert.deepStrictEqual(g.teams[0].roundScores, [3, 0, 0]);
  G.endTurn(g, rng);
  assert.strictEqual(g.teamIndex, 0, 'team that emptied the bowl starts the next round');
  G.nextRound(g, rng);
  assert.strictEqual(g.round, 2);
  assert.strictEqual(g.bowl.length, 3);
});
test('fishbowl: skipped and unfinished words go back in the bowl', () => {
  const rng = createRng(6);
  const g = G.createGame({ mode: 'fishbowl', teams: ['A', 'B'], words: ['x', 'y', 'z'] }, rng);
  G.startTurn(g, rng);
  G.skip(g, rng);
  assert.strictEqual(g.bowl.length + 1, 3);
  G.endTurn(g, rng);
  assert.strictEqual(g.bowl.length, 3);
  assert.strictEqual(g.teamIndex, 1);
});
test('fishbowl: the last word cannot be skipped', () => {
  const rng = createRng(7);
  const g = G.createGame({ mode: 'fishbowl', teams: ['A', 'B'], words: ['only'] }, rng);
  G.startTurn(g, rng);
  G.skip(g, rng);
  assert.strictEqual(g.current.word, 'only');
});
test('fishbowl: game is over after three rounds', () => {
  const rng = createRng(8);
  const g = G.createGame({ mode: 'fishbowl', teams: ['A', 'B'], words: ['p', 'q'] }, rng);
  for (let r = 0; r < 3; r++) {
    G.startTurn(g, rng); G.gotIt(g, rng); G.gotIt(g, rng); G.endTurn(g, rng); G.nextRound(g, rng);
  }
  assert.strictEqual(g.over, true);
  assert.strictEqual(g.teams[0].score, 6);
});

// ---------- Chooser, dice, coin, hot potato ----------
test('chooser: picks one of the fingers, uniformly', () => {
  const rng = createRng(9);
  const hits = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 30000; i++) hits[P.chooseOne(['a', 'b', 'c'], rng)]++;
  Object.values(hits).forEach((h) => assert.ok(Math.abs(h / 30000 - 1 / 3) < 0.01));
  assert.strictEqual(P.chooseOne([], rng), null);
});
test('chooser: teams are balanced', () => {
  const rng = createRng(10);
  const t = P.splitTeams(['a', 'b', 'c', 'd', 'e'], 2, rng);
  const sizes = [0, 0];
  Object.values(t).forEach((k) => sizes[k]++);
  assert.ok(Math.abs(sizes[0] - sizes[1]) <= 1);
});
test('dice: values within range; counts and sides validated', () => {
  const rng = createRng(11);
  for (const s of P.DICE_SIDES) P.rollDice(5, s, rng).forEach((v) => assert.ok(v >= 1 && v <= s));
  assert.strictEqual(P.rollDice(99, 6, rng).length, 10);
  assert.ok(P.rollDice(1, 7, rng)[0] <= 6, 'unknown sides fall back to d6');
});
test('coin: roughly fair', () => {
  const rng = createRng(12);
  let h = 0;
  for (let i = 0; i < 20000; i++) if (P.flipCoin(rng) === 'Heads') h++;
  assert.ok(Math.abs(h / 20000 - 0.5) < 0.01);
});
test('hot potato: fuse lengths stay within their ranges', () => {
  const rng = createRng(13);
  for (const k of Object.keys(P.FUSE)) for (let i = 0; i < 200; i++) {
    const s = P.fuseSeconds(k, rng);
    assert.ok(s >= P.FUSE[k][0] && s <= P.FUSE[k][1]);
  }
});
test('hot potato: prompts avoid recent ones and can add a letter', () => {
  const rng = createRng(14);
  const recent = PW.prompts.slice(1);
  assert.strictEqual(P.makePrompt(PW.prompts, rng, recent).base, PW.prompts[0]);
  const p = P.makePrompt(PW.prompts, rng, [], true);
  assert.ok(/starting with “[A-Z]”$/.test(p.text));
});

// ---------- Data ----------
test('data: 100 charades actions and 80 hot potato prompts, no duplicates', () => {
  assert.strictEqual(PW.actions.length, 100);
  assert.strictEqual(new Set(PW.actions.map((w) => w.toLowerCase())).size, 100);
  assert.strictEqual(PW.prompts.length, 80);
  assert.strictEqual(new Set(PW.prompts).size, 80);
  assert.ok(IW.Animals.length >= 100, 'charades reuses impostor categories');
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
