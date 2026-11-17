/* Unit tests for party game logic. Run: node tools/test-party-logic.js (no dependencies) */
const assert = require('assert');
const W = require('../js/werewolf-logic.js');
const G = require('../js/guess-logic.js');
const P = require('../js/party-logic.js');
const PW = require('../js/party-words.js');
const IW = require('../js/impostor-words.js');
const { createRng } = require('../js/impostor-logic.js');
const M = require('../js/party-more-logic.js');
const D = require('../js/party-decks.js');

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

// ---------- Forbidden Words / Forehead (guess-logic additions) ----------
test('guess: buzz loses the card, costs a point (never below 0) and draws the next', () => {
  const rng = createRng(5);
  const g = G.createGame({ mode: 'forbidden', teams: ['A', 'B'], words: ['f0', 'f1', 'f2', 'f3'], rounds: 2 }, rng);
  G.startTurn(g, rng);
  const first = g.current.word;
  G.buzz(g, rng, true);
  assert.strictEqual(g.teams[0].score, 0, 'score floors at 0');
  assert.deepStrictEqual(g.current.buzzed, [first]);
  assert.notStrictEqual(g.current.word, first);
  G.gotIt(g, rng); G.gotIt(g, rng);
  G.buzz(g, rng, true);
  assert.strictEqual(g.teams[0].score, 1);
  G.buzz(g, rng, false);
  assert.strictEqual(g.teams[0].score, 1, 'no penalty when turned off');
  G.endTurn(g, rng);
  assert.strictEqual(g.teamIndex, 1, 'non-fishbowl modes rotate like charades');
});
test('guess: buzz does nothing in fishbowl', () => {
  const rng = createRng(1);
  const g = G.createGame({ mode: 'fishbowl', teams: ['A', 'B'], words: ['a', 'b', 'c'] }, rng);
  G.startTurn(g, rng);
  const w = g.current.word;
  G.buzz(g, rng, true);
  assert.strictEqual(g.current.word, w);
});
test('guess: forehead allows a solo game and up to 10 players', () => {
  const solo = G.createGame({ mode: 'forehead', teams: ['Sam'], words: ['x', 'y'], minTeams: 1, maxTeams: 10, rounds: 2 }, createRng(1));
  assert.strictEqual(solo.teams.length, 1);
  G.startTurn(solo); G.endTurn(solo); assert.ok(!solo.over); G.startTurn(solo); G.endTurn(solo);
  assert.ok(solo.over, 'two turns for one player and two rounds');
  const big = G.createGame({ mode: 'forehead', teams: Array.from({ length: 12 }, (_, i) => 'P' + i), words: ['x'], maxTeams: 10 }, createRng(1));
  assert.strictEqual(big.teams.length, 10);
  assert.strictEqual(G.createGame({ teams: Array(6).fill('') , words: ['x'] }).teams.length, 4, 'charades still capped at 4 teams');
});

// ---------- Prompt deck ----------
test('deck: every card once before repeats, no back-to-back repeat across reshuffles', () => {
  const rng = createRng(9);
  const d = M.createDeck(5, rng);
  const first = Array.from({ length: 5 }, () => M.drawCard(d, rng));
  assert.deepStrictEqual(first.slice().sort(), [0, 1, 2, 3, 4]);
  let prev = first[4];
  for (let i = 0; i < 200; i++) { const c = M.drawCard(d, rng); assert.notStrictEqual(c, prev); prev = c; }
  assert.strictEqual(M.drawCard(M.createDeck(0, rng), rng), null);
  const one = M.createDeck(1, rng);
  assert.strictEqual(M.drawCard(one, rng), 0); assert.strictEqual(M.drawCard(one, rng), 0);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(d)), 'deck is plain data for localStorage');
});

// ---------- Forehead tilt ----------
test('tilt: must start upright, nod = correct, tip back = pass, re-arms only near upright', () => {
  let r = M.readTilt(-9, false);
  assert.strictEqual(r.action, null, 'not armed until held upright');
  r = M.readTilt(0.5, r.armed); assert.ok(r.armed);
  r = M.readTilt(-8, r.armed); assert.strictEqual(r.action, 'correct'); assert.ok(!r.armed);
  r = M.readTilt(-8, r.armed); assert.strictEqual(r.action, null, 'holding the nod does not repeat');
  r = M.readTilt(5, r.armed); assert.ok(!r.armed, 'still tilted: not re-armed');
  r = M.readTilt(1, r.armed); assert.ok(r.armed);
  r = M.readTilt(8, r.armed); assert.strictEqual(r.action, 'pass');
  r = M.readTilt(0, false); r = M.readTilt(-4, r.armed); assert.strictEqual(r.action, null, 'small tilts ignored');
  assert.strictEqual(M.readTilt(8, true, true).action, 'correct', 'flipped swaps directions');
  assert.strictEqual(M.readTilt(NaN, true).action, null);
});

// ---------- Most Likely To / Would You Rather ----------
test('most likely: votes tally, undo never goes negative, ranking breaks ties by seat', () => {
  let t = {};
  t = M.addVote(t, 'Bo'); t = M.addVote(t, 'Al'); t = M.addVote(t, 'Bo'); t = M.addVote(t, 'Cy');
  assert.deepStrictEqual(M.ranking(t, ['Al', 'Bo', 'Cy']).map((r) => r.name), ['Bo', 'Al', 'Cy']);
  t = M.addVote(t, 'Cy', -1); t = M.addVote(t, 'Cy', -1);
  assert.ok(!('Cy' in t));
  assert.deepStrictEqual(M.ranking(t, ['Bo', 'Al']).map((r) => r.votes), [2, 1]);
});
test('would you rather: split adds to 100', () => {
  assert.deepStrictEqual(M.split(0, 0), { a: 0, b: 0, total: 0 });
  assert.deepStrictEqual(M.split(1, 2), { a: 33, b: 67, total: 3 });
  assert.deepStrictEqual(M.split(5, 0), { a: 100, b: 0, total: 5 });
});

// ---------- Never Have I Ever ----------
test('never: lives clamp, game ends with one player left', () => {
  const s = M.createLives(['A', 'B', 'C'], 2);
  M.changeLife(s, 0, -1); M.changeLife(s, 0, -1); M.changeLife(s, 0, -1);
  assert.strictEqual(s.players[0].lives, 0);
  M.changeLife(s, 0, 5); assert.strictEqual(s.players[0].lives, 2, 'undo capped at max');
  M.changeLife(s, 0, -2); M.changeLife(s, 1, -2);
  assert.ok(M.livesOver(s)); assert.deepStrictEqual(M.alive(s).map((p) => p.name), ['C']);
  assert.strictEqual(M.createLives(['A'], 3).players.length, 1);
  assert.ok(!M.livesOver(M.createLives(['A'], 3)), 'solo never auto-ends');
});

// ---------- Categories Countdown ----------
test('categories: turns rotate, clock shrinks each lap to a minimum, misses cost lives', () => {
  const g = M.createCategories({ players: ['A', 'B', 'C'], lives: 2, startSeconds: 6, minSeconds: 4 }, createRng(3));
  g.current = 0;
  assert.strictEqual(M.turnSeconds(g), 6);
  M.answered(g); assert.strictEqual(g.current, 1);
  M.answered(g); M.answered(g);
  assert.strictEqual(g.current, 0); assert.strictEqual(M.turnSeconds(g), 5, 'one second shorter after a lap');
  for (let i = 0; i < 12; i++) M.answered(g);
  assert.strictEqual(M.turnSeconds(g), 4, 'never below the minimum');
  M.timedOut(g); // A loses a life
  assert.strictEqual(g.players[0].lives, 1); assert.strictEqual(g.current, 1); assert.strictEqual(g.answers, 0);
  M.timedOut(g); // B misses; play moves on to C
  assert.strictEqual(g.current, 2);
  g.current = 1; M.timedOut(g); // B misses again: out
  assert.strictEqual(g.players[1].lives, 0); assert.strictEqual(g.current, 2, 'skips the eliminated player');
  M.answered(g); assert.strictEqual(g.current, 0, 'B is skipped in rotation');
  M.timedOut(g); // A out
  assert.ok(g.over); assert.strictEqual(M.winner(g).name, 'C');
  assert.throws(() => M.createCategories({ players: ['solo'] }));
});

// ---------- New decks ----------
test('decks: forbidden cards have 4 distinct banned words that are not part of the word', () => {
  assert.ok(D.forbidden.length >= 120);
  assert.strictEqual(new Set(D.forbidden.map((c) => c[0].toLowerCase())).size, D.forbidden.length);
  D.forbidden.forEach((c) => {
    assert.strictEqual(c.length, 5, c[0]);
    assert.strictEqual(new Set(c.map((x) => x.toLowerCase())).size, 5, c[0]);
    c.slice(1).forEach((b) => assert.ok(!c[0].toLowerCase().includes(b.toLowerCase()), `${c[0]} bans ${b}`));
  });
});
test('decks: prompt packs, categories, songs and forehead decks are full and unique', () => {
  for (const k of ['mostLikely', 'neverHave']) {
    assert.ok(D[k].family.length >= 70 && D[k].grownup.length >= 40, k);
    const all = D[k].family.concat(D[k].grownup);
    assert.strictEqual(new Set(all).size, all.length, k + ' duplicates');
  }
  assert.ok(D.wouldRather.family.length >= 60 && D.wouldRather.grownup.length >= 25);
  D.wouldRather.family.concat(D.wouldRather.grownup).forEach((p) => assert.ok(p.length === 2 && p[0] && p[1]));
  assert.strictEqual(new Set(D.categories).size, D.categories.length);
  assert.ok(D.categories.length >= 100);
  const songs = [].concat(...Object.values(D.songs));
  assert.ok(songs.length >= 130);
  assert.strictEqual(new Set(songs.map((s) => s[0].toLowerCase())).size, songs.length, 'song titles unique');
  assert.ok(D.famous.length >= 100 && new Set(D.famous).size === D.famous.length);
  assert.ok(D.characters.length >= 80 && new Set(D.characters).size === D.characters.length);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
