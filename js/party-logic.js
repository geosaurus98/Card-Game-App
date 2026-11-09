/* Small party tools — pure logic (no DOM). Browser: CGR.partyLogic; Node: module.exports.
 * Finger chooser, dice, coin and Hot Potato helpers. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.partyLogic = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const DICE_SIDES = [4, 6, 8, 10, 12, 20];
  const FUSE = { short: [10, 25], medium: [20, 45], long: [35, 75] }; // seconds
  const EASY_LETTERS = 'ABCDEFGHIJKLMNOPRSTW'; // avoids Q, U, V, X, Y, Z

  function randomInt(n, rng) { return Math.floor((rng || Math.random)() * n); }

  /* ---- Finger chooser ---- */
  function chooseOne(ids, rng) { return ids.length ? ids[randomInt(ids.length, rng)] : null; }

  /* Balanced random teams: returns { id: teamIndex }. Team sizes differ by at most one. */
  function splitTeams(ids, teamCount, rng) {
    const order = ids.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = randomInt(i + 1, rng);
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    const k = Math.max(2, Math.min(teamCount, order.length));
    const out = {};
    order.forEach((id, i) => { out[id] = i % k; });
    return out;
  }

  /* ---- Dice and coin ---- */
  function rollDice(count, sides, rng) {
    const n = Math.max(1, Math.min(10, Math.round(count) || 1));
    const s = DICE_SIDES.indexOf(Number(sides)) !== -1 ? Number(sides) : 6;
    const out = [];
    for (let i = 0; i < n; i++) out.push(1 + randomInt(s, rng));
    return out;
  }
  function flipCoin(rng) { return randomInt(2, rng) === 0 ? 'Heads' : 'Tails'; }

  /* ---- Hot Potato ---- */
  /* Random hidden fuse length in seconds for 'short' | 'medium' | 'long'. */
  function fuseSeconds(length, rng) {
    const r = FUSE[length] || FUSE.medium;
    return r[0] + (rng || Math.random)() * (r[1] - r[0]);
  }

  function randomLetter(rng) { return EASY_LETTERS[randomInt(EASY_LETTERS.length, rng)]; }

  /* Pick a prompt, avoiding the recently used ones when possible. Optionally add a starting letter. */
  function makePrompt(prompts, rng, recent, withLetter) {
    const avoid = recent || [];
    const fresh = prompts.filter((p) => avoid.indexOf(p) === -1);
    const pool = fresh.length ? fresh : prompts;
    const base = pool[randomInt(pool.length, rng)];
    return { base, text: withLetter ? `${base} — starting with “${randomLetter(rng)}”` : base };
  }

  return { DICE_SIDES, FUSE, EASY_LETTERS, chooseOne, splitTeams, rollDice, flipCoin, fuseSeconds, randomLetter, makePrompt };
});
