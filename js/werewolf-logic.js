/* Werewolf / Mafia — pure game logic (no DOM). Browser: CGR.werewolfLogic; Node: module.exports.
 * Randomness is injectable (rng returns a float in [0, 1)). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.werewolfLogic = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const MIN_PLAYERS = 5;
  const MAX_PLAYERS = 18;

  /* Role catalogue. Names and descriptions differ by theme. */
  const ROLES = {
    werewolf: {
      team: 'wolves',
      name: { werewolf: 'Werewolf', mafia: 'Mafia' },
      emoji: { werewolf: '🐺', mafia: '🕴️' },
      text: {
        werewolf: 'Each night, wake with the other werewolves and silently choose a victim. By day, blend in and avoid being voted out.',
        mafia: 'Each night, wake with the rest of the Mafia and silently choose a victim. By day, blend in and avoid being voted out.'
      }
    },
    villager: {
      team: 'village',
      name: { werewolf: 'Villager', mafia: 'Civilian' },
      emoji: { werewolf: '🧑‍🌾', mafia: '🧑' },
      text: {
        werewolf: 'You have no special power. Listen, discuss and vote out the werewolves.',
        mafia: 'You have no special power. Listen, discuss and vote out the Mafia.'
      }
    },
    seer: {
      team: 'village',
      name: { werewolf: 'Seer', mafia: 'Detective' },
      emoji: { werewolf: '🔮', mafia: '🕵️' },
      text: {
        werewolf: 'Each night, point at one player. The narrator will secretly show you whether they are a werewolf.',
        mafia: 'Each night, point at one player. The narrator will secretly show you whether they are in the Mafia.'
      }
    },
    doctor: {
      team: 'village',
      name: { werewolf: 'Doctor', mafia: 'Doctor' },
      emoji: { werewolf: '🩺', mafia: '🩺' },
      text: {
        werewolf: 'Each night, choose one player to protect (it can be you). If the werewolves pick them, they survive.',
        mafia: 'Each night, choose one player to protect (it can be you). If the Mafia pick them, they survive.'
      }
    },
    hunter: {
      team: 'village',
      name: { werewolf: 'Hunter', mafia: 'Vigilante' },
      emoji: { werewolf: '🏹', mafia: '🔫' },
      text: {
        werewolf: 'You are on the village’s side. If you are eliminated, you immediately take one other player down with you.',
        mafia: 'You are on the town’s side. If you are eliminated, you immediately take one other player down with you.'
      }
    }
  };
  const SPECIALS = ['seer', 'doctor', 'hunter'];

  function randomInt(n, rng) { return Math.floor((rng || Math.random)() * n); }
  function clamp(n, lo, hi) {
    n = Math.round(Number(n));
    if (!isFinite(n)) n = lo;
    return Math.min(hi, Math.max(lo, n));
  }

  /* Suggested number of wolves for a group size. */
  function recommendedWolves(n) { return n <= 6 ? 1 : n <= 9 ? 2 : n <= 12 ? 3 : 4; }
  /* Wolves must be a minority at the start. */
  function maxWolves(n) { return Math.max(1, Math.floor((n - 1) / 2)); }

  function normalizeSettings(input) {
    const s = input || {};
    const playerCount = clamp(s.playerCount == null ? 7 : s.playerCount, MIN_PLAYERS, MAX_PLAYERS);
    const wolves = clamp(s.wolves == null ? recommendedWolves(playerCount) : s.wolves, 1, maxWolves(playerCount));
    const out = {
      playerCount,
      wolves,
      theme: s.theme === 'mafia' ? 'mafia' : 'werewolf',
      seer: s.seer !== false,
      doctor: s.doctor !== false,
      hunter: s.hunter === true,
      names: Array.isArray(s.names) ? s.names.slice(0, MAX_PLAYERS).map((x) => String(x == null ? '' : x)) : []
    };
    // Specials can't crowd out the village: drop from the end until they fit.
    for (let i = SPECIALS.length - 1; i >= 0 && specialsCount(out) > playerCount - wolves; i--) out[SPECIALS[i]] = false;
    return out;
  }

  function specialsCount(s) { return SPECIALS.filter((r) => s[r]).length; }

  /* The multiset of roles for these settings (unshuffled). */
  function roleList(settings) {
    const s = normalizeSettings(settings);
    const roles = [];
    for (let i = 0; i < s.wolves; i++) roles.push('werewolf');
    SPECIALS.forEach((r) => { if (s[r]) roles.push(r); });
    while (roles.length < s.playerCount) roles.push('villager');
    return roles;
  }

  /* Shuffle roles onto seats (Fisher–Yates). Returns an array of role ids, one per player. */
  function dealRoles(settings, rng) {
    const roles = roleList(settings);
    for (let i = roles.length - 1; i > 0; i--) {
      const j = randomInt(i + 1, rng);
      const t = roles[i]; roles[i] = roles[j]; roles[j] = t;
    }
    return roles;
  }

  function roleName(role, theme) { return ROLES[role].name[theme === 'mafia' ? 'mafia' : 'werewolf']; }

  /* Narrator lines for night `n`. Roles are called even if their player has
   * died, so nobody can work out who has been eliminated from the script. */
  function nightScript(roles, n, theme) {
    const t = theme === 'mafia' ? 'mafia' : 'werewolf';
    const has = (r) => roles.indexOf(r) !== -1;
    const wolves = t === 'mafia' ? 'Mafia' : 'Werewolves';
    const steps = [
      `Night ${n}. Everyone, close your eyes. Tap the table so nobody can hear movement.`,
      n === 1
        ? `${wolves}, open your eyes and look around to see your teammates. Silently agree on someone to eliminate, and point to them. … ${wolves}, close your eyes.`
        : `${wolves}, open your eyes. Silently agree on someone to eliminate, and point to them. … ${wolves}, close your eyes.`
    ];
    if (has('seer')) steps.push(`${roleName('seer', t)}, open your eyes. Point to one player you want to check. (Narrator: thumbs up if they are ${t === 'mafia' ? 'Mafia' : 'a werewolf'}, thumbs down if not.) … ${roleName('seer', t)}, close your eyes.`);
    if (has('doctor')) steps.push(`Doctor, open your eyes. Point to one player to protect tonight. … Doctor, close your eyes.`);
    steps.push('Everyone, open your eyes. It’s morning.');
    return steps;
  }

  function dayScript(theme) {
    const enemy = theme === 'mafia' ? 'the Mafia' : 'the werewolves';
    return [
      `Announce who was eliminated in the night — unless the Doctor saved them. Eliminated players may not speak for the rest of the game.`,
      `Discuss who you think is one of ${enemy}. When ready, vote. The player with the most votes is eliminated (on a tie, nobody is).`,
      'If the Hunter is eliminated, they immediately choose one other player to eliminate.'
    ];
  }

  /* 'village', 'wolves', or null while the game continues. */
  function checkWinner(roles, alive) {
    let wolves = 0;
    let others = 0;
    roles.forEach((r, i) => {
      if (!alive[i]) return;
      if (ROLES[r].team === 'wolves') wolves++; else others++;
    });
    if (wolves === 0) return 'village';
    if (wolves >= others) return 'wolves';
    return null;
  }

  return {
    MIN_PLAYERS, MAX_PLAYERS, ROLES, SPECIALS,
    recommendedWolves, maxWolves, normalizeSettings, roleList, dealRoles, roleName, nightScript, dayScript, checkWinner
  };
});
