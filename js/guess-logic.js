/* Timed team guessing games — shared turn engine for Charades and Fishbowl.
 * Pure logic (no DOM). Browser: CGR.guessLogic; Node: module.exports.
 *
 * Charades: an endless shuffled deck; play a set number of rounds (each team
 *   gets one turn per round); most points wins.
 * Fishbowl: players' own words go in the bowl. Three rounds use the same words
 *   (describe → one word → act it out). A round ends when the bowl is empty. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.guessLogic = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const FISHBOWL_ROUNDS = [
    { name: 'Describe it', rule: 'Say anything except the word itself (or rhymes and spellings).' },
    { name: 'One word', rule: 'Give a single word as your clue — nothing else.' },
    { name: 'Act it out', rule: 'No words or sounds: act it out!' }
  ];
  const MAX_TEAMS = 4;

  function randomInt(n, rng) { return Math.floor((rng || Math.random)() * n); }
  function shuffle(list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomInt(i + 1, rng);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function teamNames(names, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const n = names && names[i] ? String(names[i]).trim().slice(0, 20) : '';
      out.push(n || 'Team ' + String.fromCharCode(65 + i));
    }
    return out;
  }

  /* Clean a list of typed words: trim, drop blanks, remove case-insensitive duplicates. */
  function cleanWords(words) {
    const seen = {};
    const out = [];
    (words || []).forEach((w) => {
      const t = String(w == null ? '' : w).trim().replace(/\s+/g, ' ').slice(0, 40);
      const k = t.toLowerCase();
      if (t && !seen[k]) { seen[k] = true; out.push(t); }
    });
    return out;
  }

  /* opts: { mode: 'charades'|'fishbowl', teams: [names], words: [..], rounds (charades turns per team) } */
  function createGame(opts, rng) {
    const words = cleanWords(opts.words);
    if (!words.length) throw new Error('No words');
    const teamCount = Math.min(MAX_TEAMS, Math.max(2, (opts.teams || []).length || 2));
    return {
      mode: opts.mode === 'fishbowl' ? 'fishbowl' : 'charades',
      teams: teamNames(opts.teams, teamCount).map((name) => ({ name, score: 0, roundScores: [0, 0, 0] })),
      words,
      bowl: shuffle(words, rng), // draw from the end
      used: [],                   // charades: words already shown (refill when deck runs out)
      round: 1,
      rounds: Math.max(1, Math.min(10, Number(opts.rounds) || 3)),
      teamIndex: 0,
      turnsPlayed: 0,
      current: null,              // { word, got: [], skipped: [] } during a turn
      roundOver: false,
      over: false
    };
  }

  function draw(g, rng) {
    if (!g.bowl.length) {
      if (g.mode === 'fishbowl') return null;
      g.bowl = shuffle(g.used, rng);
      g.used = [];
    }
    return g.bowl.pop() || null;
  }

  function startTurn(g, rng) {
    if (g.over || g.roundOver) return g;
    g.current = { word: draw(g, rng), got: [], skipped: [] };
    return g;
  }

  function gotIt(g, rng) {
    const c = g.current;
    if (!c || c.word == null) return g;
    const team = g.teams[g.teamIndex];
    team.score += 1;
    if (g.mode === 'fishbowl') team.roundScores[g.round - 1] += 1;
    c.got.push(c.word);
    if (g.mode === 'charades') g.used.push(c.word);
    c.word = draw(g, rng);
    if (g.mode === 'fishbowl' && c.word == null) g.roundOver = true;
    return g;
  }

  /* Pass on the current word. Fishbowl puts it back in the bowl; charades sets it aside. */
  function skip(g, rng) {
    const c = g.current;
    if (!c || c.word == null) return g;
    if (g.mode === 'fishbowl' && !g.bowl.length) return g; // last word: nothing else to draw
    c.skipped.push(c.word);
    const old = c.word;
    c.word = draw(g, rng);
    if (g.mode === 'fishbowl') g.bowl.splice(randomInt(g.bowl.length + 1, rng), 0, old);
    else g.used.push(old);
    return g;
  }

  /* Finish the turn (timer ran out, or the round ended). The unfinished word goes back. */
  function endTurn(g, rng) {
    const c = g.current;
    if (c && c.word != null) {
      if (g.mode === 'fishbowl') g.bowl.splice(randomInt(g.bowl.length + 1, rng), 0, c.word);
      else g.bowl.unshift(c.word); // charades: back at the bottom of the deck
    }
    g.current = null;
    g.turnsPlayed += 1;
    if (g.mode === 'charades') {
      g.teamIndex = (g.teamIndex + 1) % g.teams.length;
      if (g.turnsPlayed >= g.rounds * g.teams.length) g.over = true;
    } else if (!g.roundOver) {
      g.teamIndex = (g.teamIndex + 1) % g.teams.length;
    }
    return g;
  }

  /* Fishbowl: move to the next round with every word back in the bowl.
   * The team that emptied the bowl goes first in the next round. */
  function nextRound(g, rng) {
    if (g.mode !== 'fishbowl') return g;
    g.round += 1;
    g.roundOver = false;
    if (g.round > FISHBOWL_ROUNDS.length) { g.over = true; return g; }
    g.bowl = shuffle(g.words, rng);
    return g;
  }

  function leaders(g) {
    const best = Math.max.apply(null, g.teams.map((t) => t.score));
    return g.teams.filter((t) => t.score === best);
  }

  return { FISHBOWL_ROUNDS, MAX_TEAMS, shuffle, teamNames, cleanWords, createGame, startTurn, gotIt, skip, endTurn, nextRound, leaders };
});
