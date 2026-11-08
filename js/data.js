/* Loads games.json and provides lookup, filtering and search helpers. */
window.CGR = window.CGR || {};

CGR.data = (function () {
  const COUNTS = ['1', '2', '3', '4', '5+'];
  const TYPES = ['cards', 'dice'];
  /* Tag vocabulary (games.json "tags" field) and display labels, in display order. */
  const TAG_LABELS = {
    'kids': 'Good for kids', 'party': 'Party', 'trick-taking': 'Trick-taking', 'rummy': 'Rummy-style',
    'patience': 'Patience', 'shedding': 'Shedding', 'bluffing': 'Bluffing', 'betting': 'Betting',
    'real-time': 'Real-time', 'partnership': 'Partnerships', 'push-your-luck': 'Push your luck',
    'multi-deck': '2+ decks', 'special-equipment': 'Special equipment'
  };
  let games = [];
  let byId = {};

  async function load() {
    const res = await fetch('./games.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    games = json.games.slice().sort((a, b) => a.name.localeCompare(b.name));
    byId = {};
    games.forEach((g) => { byId[g.id] = g; });
    return games;
  }

  function all() { return games; }
  function get(id) { return byId[id]; }
  /* Game type: "cards" (default when missing) or "dice". */
  function typeOf(g) { return g.type === 'dice' ? 'dice' : 'cards'; }
  function tagsOf(g) { return (g.tags || []).filter((t) => TAG_LABELS[t]); }
  function ofType(type) { return games.filter((g) => !type || typeOf(g) === type); }
  function forCount(count, type) { return ofType(type).filter((g) => g.playerCounts.indexOf(count) !== -1); }

  /* Does the game support a given number of players / count bucket? */
  function supports(game, count) { return game.playerCounts.indexOf(count) !== -1; }

  function normalise(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '');
  }

  /* Search by name, alias, keyword, equipment and objective.
   * Every word typed must match somewhere; name matches rank first. */
  function search(query) {
    const words = normalise(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const scored = [];
    games.forEach((g) => {
      const name = normalise(g.name + ' ' + (g.aliases || []).join(' '));
      const hay = name + ' ' + normalise([
        (g.keywords || []).join(' '), tagsOf(g).map((t) => TAG_LABELS[t]).join(' '), (g.equipment || []).join(' '), g.objective, g.difficulty,
        g.playTime.category, typeOf(g) === 'dice' ? 'dice game' : 'card game', g.playerCounts.map((c) => c + ' player').join(' ')
      ].join(' '));
      if (!words.every((w) => hay.indexOf(w) !== -1)) return;
      let score = 0;
      words.forEach((w) => {
        if (normalise(g.name).indexOf(w) === 0) score += 4;
        else if (name.indexOf(w) !== -1) score += 2;
        else score += 1;
      });
      scored.push({ g, score });
    });
    scored.sort((a, b) => b.score - a.score || a.g.name.localeCompare(b.g.name));
    return scored.map((x) => x.g);
  }

  function filter({ count, difficulty, time, type, kids, noSpecial }) {
    return games.filter((g) =>
      (!kids || tagsOf(g).indexOf('kids') !== -1) &&
      (!noSpecial || tagsOf(g).indexOf('special-equipment') === -1) &&
      (!type || typeOf(g) === type) &&
      (!count || supports(g, count)) &&
      (!difficulty || g.difficulty === difficulty) &&
      (!time || g.playTime.category === time));
  }

  /* Formatting helpers */
  function playersLabel(g) {
    const { min, max } = g.players;
    if (min === max) return min + (min === 1 ? ' player' : ' players');
    return min + '–' + max + ' players';
  }
  function timeLabel(g) {
    const [a, b] = g.playTime.minutes;
    return (a === b ? a : a + '–' + b) + ' min';
  }
  function countLabel(c) { return c === '1' ? '1 player' : c + ' players'; }
  const TIME_LABELS = { short: 'Short (under 15 min)', medium: 'Medium (15–45 min)', long: 'Long (45+ min)' };

  /* Route prefix for a type: '#/' for cards, '#/dice/' for dice. */
  function base(type) { return type === 'dice' ? '#/dice/' : '#/'; }

  return { COUNTS, TYPES, TAG_LABELS, tagsOf, TIME_LABELS, load, all, get, typeOf, ofType, base, forCount, supports, search, filter, playersLabel, timeLabel, countLabel };
})();

/* Tiny HTML-escaping helper used by all views. */
CGR.esc = function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
