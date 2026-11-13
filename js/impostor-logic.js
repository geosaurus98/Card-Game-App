/* Impostor word game — pure game logic (no DOM, no storage, no network).
 *
 * Every function that needs randomness takes an `rng` argument: a function
 * returning a float in [0, 1), like Math.random. Tests pass a seeded RNG
 * (see createRng) so results are reproducible.
 *
 * Works in the browser (CGR.impostorLogic) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.impostorLogic = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 12;
  const MAX_NAME_LENGTH = 20;
  const RANDOM = 'random';
  const TIMER_CHOICES = [0, 1, 2, 3, 5, 10]; // minutes; 0 = off
  const RECENT_LIMIT = 40; // words remembered to avoid quick repeats

  /* How much help the impostor gets, easiest first.
   * shortlist-N: the category plus N possible words, one of which is the real word. */
  const HINT_LEVELS = [
    { id: 'shortlist-4', label: 'Category + 4 possible words (easiest)' },
    { id: 'shortlist-6', label: 'Category + 6 possible words' },
    { id: 'shortlist-10', label: 'Category + 10 possible words' },
    { id: 'letter', label: 'Category + first letter' },
    { id: 'category', label: 'Category only (hard)' },
    { id: 'none', label: 'No hint (hardest)' }
  ];
  const DEFAULT_HINT = 'shortlist-6';
  const HINT_IDS = HINT_LEVELS.map((h) => h.id);

  /* Accepts the current hint ids and the old true/false setting. */
  function normalizeHint(h) {
    if (h === false) return 'none';
    if (HINT_IDS.indexOf(h) !== -1) return h;
    return DEFAULT_HINT; // includes the old `true` (category only), now upgraded to the easier default
  }

  function shortlistSize(hint) {
    const m = /^shortlist-(\d+)$/.exec(hint);
    return m ? Number(m[1]) : 0;
  }

  /* Small seeded PRNG (mulberry32) for reproducible tests. */
  function createRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(n, rng) {
    return Math.floor((rng || Math.random)() * n);
  }

  function clamp(n, lo, hi) {
    n = Math.round(Number(n));
    if (!isFinite(n)) n = lo;
    return Math.min(hi, Math.max(lo, n));
  }

  /* Impostors must be a minority: at most floor((players - 1) / 2), at least 1. */
  function maxImpostors(playerCount) {
    return Math.max(1, Math.floor((playerCount - 1) / 2));
  }

  function defaultName(i) { return 'Player ' + (i + 1); }

  /* Returns exactly `count` names: trimmed, length-limited, blanks replaced
   * by "Player N", and duplicates made distinct ("Sam", "Sam (2)"). */
  function normalizeNames(names, count) {
    const out = [];
    const seen = {};
    for (let i = 0; i < count; i++) {
      let name = names && names[i] != null ? String(names[i]).trim().replace(/\s+/g, ' ') : '';
      if (name.length > MAX_NAME_LENGTH) name = name.slice(0, MAX_NAME_LENGTH).trim();
      if (!name) name = defaultName(i);
      const key = name.toLowerCase();
      if (seen[key]) {
        let n = 2;
        while (seen[(name + ' (' + n + ')').toLowerCase()]) n++;
        name = name + ' (' + n + ')';
      }
      seen[name.toLowerCase()] = true;
      out.push(name);
    }
    return out;
  }

  /* Fill in defaults and clamp every setting to a valid value. */
  function normalizeSettings(input, categories) {
    const s = input || {};
    const playerCount = clamp(s.playerCount == null ? 4 : s.playerCount, MIN_PLAYERS, MAX_PLAYERS);
    const impostorCount = clamp(s.impostorCount == null ? 1 : s.impostorCount, 1, maxImpostors(playerCount));
    const category = s.category && (s.category === RANDOM || (categories || []).indexOf(s.category) !== -1) ? s.category : RANDOM;
    const timerMinutes = TIMER_CHOICES.indexOf(Number(s.timerMinutes)) !== -1 ? Number(s.timerMinutes) : 0;
    return {
      playerCount,
      impostorCount,
      category,
      hint: normalizeHint(s.hint),
      timerMinutes,
      direction: s.direction === 'anticlockwise' ? 'anticlockwise' : 'clockwise',
      names: Array.isArray(s.names) ? s.names.slice(0, MAX_PLAYERS).map((n) => String(n == null ? '' : n)) : [],
      recent: Array.isArray(s.recent) ? s.recent.slice(-RECENT_LIMIT) : []
    };
  }

  /* Pick a category (or a random one) and a word from it, avoiding words in
   * `recent` when possible. `recent` holds "Category|Word" keys. */
  function pickWord(words, category, rng, recent) {
    const cats = Object.keys(words);
    if (!cats.length) throw new Error('No word categories');
    const cat = category && category !== RANDOM && words[category] ? category : cats[randomInt(cats.length, rng)];
    const list = words[cat];
    const avoid = recent || [];
    const fresh = list.filter((w) => avoid.indexOf(cat + '|' + w) === -1);
    const pool = fresh.length ? fresh : list;
    return { category: cat, word: pool[randomInt(pool.length, rng)] };
  }

  /* Choose `impostorCount` distinct player indices (partial Fisher–Yates). Sorted. */
  function assignImpostors(playerCount, impostorCount, rng) {
    const k = clamp(impostorCount, 1, maxImpostors(playerCount));
    const idx = [];
    for (let i = 0; i < playerCount; i++) idx.push(i);
    for (let i = 0; i < k; i++) {
      const j = i + randomInt(playerCount - i, rng);
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return idx.slice(0, k).sort((a, b) => a - b);
  }

  function pickStarter(playerCount, rng) {
    return randomInt(playerCount, rng);
  }

  /* Seat order starting from `start`, wrapping around.
   * Clockwise follows the order the names were entered; anticlockwise reverses it. */
  function turnOrder(playerCount, start, direction) {
    const step = direction === 'anticlockwise' ? -1 : 1;
    const out = [];
    for (let i = 0; i < playerCount; i++) out.push(((start + step * i) % playerCount + playerCount) % playerCount);
    return out;
  }

  /* The real word plus (size - 1) other words from the same category, shuffled.
   * Words used as decoys are distinct; the real word appears exactly once. */
  function makeShortlist(list, word, size, rng) {
    const others = list.filter((w) => w !== word);
    for (let i = others.length - 1; i > 0; i--) {
      const j = randomInt(i + 1, rng);
      const t = others[i]; others[i] = others[j]; others[j] = t;
    }
    const out = others.slice(0, Math.max(0, size - 1)).concat(word);
    for (let i = out.length - 1; i > 0; i--) {
      const j = randomInt(i + 1, rng);
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /* Create a full round from settings. Returns plain data:
   * { players, word, category, impostors: [indices], hint, shortlist, starter } */
  function createRound(settings, words, rng) {
    const s = normalizeSettings(settings, Object.keys(words));
    const players = normalizeNames(s.names, s.playerCount);
    const picked = pickWord(words, s.category, rng, s.recent);
    const size = shortlistSize(s.hint);
    return {
      players,
      word: picked.word,
      category: picked.category,
      impostors: assignImpostors(players.length, s.impostorCount, rng),
      hint: s.hint,
      shortlist: size ? makeShortlist(words[picked.category], picked.word, size, rng) : null,
      starter: pickStarter(players.length, rng)
    };
  }

  /* What player `i` should see during the reveal. */
  function roleFor(round, i) {
    if (round.impostors.indexOf(i) !== -1) {
      const h = normalizeHint(round.hint);
      return {
        impostor: true,
        category: h === 'none' ? null : round.category,
        shortlist: h.indexOf('shortlist-') === 0 ? round.shortlist : null,
        letter: h === 'letter' ? round.word.charAt(0).toUpperCase() : null
      };
    }
    return { impostor: false, word: round.word };
  }

  /* Remember the word so "Play again" doesn't repeat it soon. */
  function rememberWord(recent, round) {
    return (recent || []).concat(round.category + '|' + round.word).slice(-RECENT_LIMIT);
  }

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.ceil(totalSeconds));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  return {
    MIN_PLAYERS, MAX_PLAYERS, MAX_NAME_LENGTH, RANDOM, TIMER_CHOICES, RECENT_LIMIT, HINT_LEVELS, DEFAULT_HINT,
    normalizeHint, shortlistSize, makeShortlist,
    createRng, maxImpostors, defaultName, normalizeNames, normalizeSettings,
    pickWord, assignImpostors, pickStarter, turnOrder, createRound, roleFor, rememberWord, formatTime
  };
});
