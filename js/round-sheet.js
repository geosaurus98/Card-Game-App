/* Hand-by-hand scorecards (#/score/<id> for games whose scorekeeper "sheet" is one of the
 * round-sheet kinds). Enter what happened in a hand; the app works out every score.
 * Logic: round-sheet-logic.js. Saved in localStorage under "sheet:<gameId>". */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const L = CGR.roundSheet;
  const esc = CGR.esc;
  const key = (id) => 'sheet:' + id;
  const live = {};

  /* ---------- Per-game setup ---------- */
  const CONF = {
    ohhell: { min: 3, max: 7, def: 4, teams: false },
    spades: { min: 4, max: 4, def: 4, teams: true, names: 'players' },
    fivehundred: { min: 3, max: 4, def: 3, teams: (n) => n === 4, names: 'players' },
    bridge: { min: 4, max: 4, def: 4, teams: true, names: 'teams', teamDefaults: ['We', 'They'] },
    farkle: { min: 1, max: 8, def: 3, teams: false },
    crummy: { min: 3, max: 8, def: 4, teams: false },
    canasta: { min: 4, max: 4, def: 4, teams: true, names: 'teams' },
    cribbage: { min: 2, max: 4, def: 2, teams: (n) => n === 4, names: 'players' },
    hearts: { min: 3, max: 6, def: 4, teams: false }
  };
  const isTeams = (st) => { const t = CONF[st.kind].teams; return typeof t === 'function' ? t(st.players.length) : t; };
  function sides(st) { return isTeams(st) ? ['A', 'B'] : st.players.map((p) => p.id); }
  const pname = (st, pid) => (st.players.find((p) => p.id === pid) || {}).name || pid;
  function sideName(st, s) {
    if (!isTeams(st)) return pname(st, s);
    if (CONF[st.kind].names === 'teams') return (st.teamNames && st.teamNames[s]) || (CONF[st.kind].teamDefaults || ['Team A', 'Team B'])[s === 'A' ? 0 : 1];
    const members = s === 'A' ? ['p1', 'p3'] : ['p2', 'p4'];
    return members.map((m) => pname(st, m)).join(' & ');
  }
  const optsOf = (st) => Object.assign({}, st.kind === 'ohhell' ? L.ohhell.defaults(st.players.length) : L[st.kind].defaults(), st.opts || {});

  function fresh(game, kind, prev) {
    const c = CONF[kind];
    const n = prev ? prev.players.length : Math.min(c.max, Math.max(c.min, game.scorekeeper.defaultPlayers || c.def));
    const players = prev ? prev.players : Array.from({ length: n }, (_, i) => ({ id: 'p' + (i + 1), name: 'Player ' + (i + 1) }));
    return { v: 1, gameId: game.id, kind, started: !!prev, players, teamNames: prev ? prev.teamNames : {}, opts: prev ? prev.opts : {},
      entries: [], draft: null, turn: null, touched: false, updatedAt: Date.now(), meta: '' };
  }
  function load(game, kind) {
    if (live[game.id]) return live[game.id];
    const s = CGR.store.get(key(game.id), null);
    live[game.id] = s && s.v === 1 && s.kind === kind && Array.isArray(s.players) && Array.isArray(s.entries) ? s : fresh(game, kind);
    return live[game.id];
  }
  function replay(st) { return L[st.kind].replay(optsOf(st), sides(st), st.entries); }
  function save(st) {
    const r = replay(st);
    st.touched = st.started && (st.entries.length > 0 || !!(st.draft && st.draft.phase === 'tricks'));
    st.meta = r.over ? 'finished' : metaText(st, r);
    st.updatedAt = Date.now();
    CGR.store.set(key(st.gameId), st);
  }
  function metaText(st, r) {
    if (st.kind === 'ohhell') return `hand ${st.entries.length + 1} of ${r.info.hands.length}`;
    if (st.kind === 'crummy') return `round ${st.entries.length + 1} of 7`;
    const s = sides(st);
    return s.map((x) => `${sideName(st, x)} ${r.totals[x]}`).join(' · ');
  }

  /* ---------- Small HTML helpers ---------- */
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] || {}), o); t[last] = v; }
  function stepper(path, val, min, max, label, blank) {
    const shown = val == null || val === '' ? (blank || '–') : val;
    return `<div class="rs-step" role="group" aria-label="${esc(label)}">
      <button type="button" class="btn btn-secondary" data-step="${path}" data-d="-1" data-min="${min}" data-max="${max}" aria-label="Less: ${esc(label)}" ${val != null && val !== '' && val <= min ? 'disabled' : ''}>−</button>
      <output>${esc(String(shown))}</output>
      <button type="button" class="btn btn-secondary" data-step="${path}" data-d="1" data-min="${min}" data-max="${max}" aria-label="More: ${esc(label)}" ${val != null && val !== '' && val >= max ? 'disabled' : ''}>+</button></div>`;
  }
  function chips(path, current, options, label) {
    return `<div class="rs-chips" role="group" aria-label="${esc(label)}">${options.map(([v, text]) => `<button type="button" class="rs-chip${String(current) === String(v) ? ' on' : ''}" data-set="${path}" data-val='${esc(JSON.stringify(v))}' aria-pressed="${String(current) === String(v)}">${esc(String(text))}</button>`).join('')}</div>`;
  }
  const numInput = (path, val, label) => `<input type="number" inputmode="numeric" min="0" step="1" class="rs-num" data-path="${path}" value="${val == null ? '' : esc(String(val))}" aria-label="${esc(label)}" placeholder="0">`;
  const fmtDelta = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  const N = (v) => (v === '' || v == null ? 0 : Number(v));

  /* ---------- Drafts (what is being entered for the next hand) ---------- */
  function newDraft(st) {
    const s = sides(st);
    const zero = (ids, v) => Object.fromEntries(ids.map((x) => [x, v]));
    const ps = st.players.map((p) => p.id);
    switch (st.kind) {
      case 'ohhell': return { phase: 'bids', bids: zero(ps, null), tricks: zero(ps, 0) };
      case 'spades': return { phase: 'bids', bids: zero(ps, null), blind: {}, tricks: zero(ps, 0) };
      case 'fivehundred': return { bidder: null, contract: { tricks: 6, suit: null }, tricks: zero(s, 0) };
      case 'bridge': return { decl: null, level: null, denom: null, dbl: 0, taken: null, honours: '' };
      case 'crummy': return { pts: zero(ps, '') };
      case 'canasta': { const t = () => ({ natural: 0, mixed: 0, red3: 0, out: 'none', melded: true, meld: '', hand: '' }); return { A: t(), B: t() }; }
      case 'hearts': return { hearts: zero(ps, 0), queen: null, jack: null };
      default: return {};
    }
  }
  function draft(st) { if (!st.draft) st.draft = newDraft(st); return st.draft; }

  /* Turn a draft into an entry (numbers only). */
  function entryOf(st) {
    const d = draft(st);
    switch (st.kind) {
      case 'ohhell': return { bids: Object.assign({}, d.bids), tricks: Object.assign({}, d.tricks) };
      case 'spades': return { bids: Object.assign({}, d.bids), blind: Object.assign({}, d.blind), tricks: Object.assign({}, d.tricks) };
      case 'fivehundred': return { bidder: d.bidder, contract: d.contract.suit === 'M' || d.contract.suit === 'OM' ? { suit: d.contract.suit } : { tricks: d.contract.tricks, suit: d.contract.suit }, tricks: Object.assign({}, d.tricks) };
      case 'bridge': {
        const h = d.honours ? d.honours.split(':') : null;
        return { decl: d.decl, level: d.level, denom: d.denom, dbl: d.dbl, taken: d.taken, honours: h ? { side: h[0], pts: Number(h[1]) } : null };
      }
      case 'crummy': return { pts: Object.fromEntries(Object.keys(d.pts).map((k) => [k, d.pts[k] === '' ? NaN : Number(d.pts[k])])) };
      case 'canasta': {
        const t = (x) => ({ natural: x.natural, mixed: x.mixed, red3: x.red3, out: x.out, melded: x.melded, meld: N(x.meld), hand: N(x.hand) });
        return { A: t(d.A), B: t(d.B) };
      }
      case 'hearts': return { hearts: Object.assign({}, d.hearts), queen: d.queen, jack: d.jack };
      default: return null;
    }
  }
  function validate(st, e) {
    const o = optsOf(st), K = L[st.kind], s = sides(st);
    switch (st.kind) {
      case 'ohhell': return K.validate(o, s, K.hands(o)[st.entries.length], e);
      case 'spades': return K.validate(o, e);
      case 'bridge': case 'canasta': return K.validate(o, e);
      default: return K.validate(o, s, e);
    }
  }

  /* ---------- Info panel per game ---------- */
  function infoHTML(st, r) {
    const o = optsOf(st);
    const s = sides(st);
    switch (st.kind) {
      case 'ohhell': {
        if (r.over) return '';
        const n = st.players.length;
        const dealer = st.players[L.ohhell.dealerIndex(st.entries.length, n)];
        return `<p class="rs-info"><strong>Hand ${st.entries.length + 1} of ${r.info.hands.length}</strong> · ${r.info.next} card${r.info.next === 1 ? '' : 's'} each · Dealer: <strong>${esc(dealer.name)}</strong></p>`;
      }
      case 'spades': return `<p class="rs-info">Bags: ${s.map((x) => `${esc(sideName(st, x))} <strong>${r.info.bags[x]}</strong>/10`).join(' · ')}</p>`;
      case 'bridge': {
        const i = r.info;
        return `<div class="rs-info rs-bridge">${s.map((x) => `<div><strong>${esc(sideName(st, x))}</strong>
          <span>Games ${i.games[x]}${i.vul[x] ? ' · <span class="rs-vul">vulnerable</span>' : ''}</span>
          <span>Below the line this game: ${i.below[x]} / 100</span>
          <span class="muted small">Above ${i.above[x]} · below ${i.belowAll[x]}</span></div>`).join('')}</div>`;
      }
      case 'farkle': {
        if (r.over) return '';
        const cur = L.farkle.current(s, st.entries);
        return `<p class="rs-info"><strong>${esc(pname(st, cur))}</strong>’s turn${r.info.finalRound ? ` · <strong class="rs-warn">Final round</strong> — ${esc(pname(st, r.info.triggeredBy))} reached ${o.target}` : ''}${!r.info.onBoard[cur] && o.openMin ? ` · needs ${o.openMin}+ to get on the board` : ''}</p>`;
      }
      case 'crummy': return r.over ? '' : `<p class="rs-info"><strong>Round ${r.info.round} of 7:</strong> ${esc(r.info.next)}</p>`;
      case 'canasta': return `<p class="rs-info">Minimum first meld: ${s.map((x) => `${esc(sideName(st, x))} <strong>${r.info.minimum[x]}</strong>`).join(' · ')}</p>`;
      case 'hearts': return `<p class="rs-info">Game ends at ${o.target}. Lowest score wins.</p>`;
      default: return '';
    }
  }

  /* ---------- Entry forms ---------- */
  function formHTML(st, r) {
    if (r.over) return '';
    const d = draft(st);
    const o = optsOf(st);
    const s = sides(st);
    switch (st.kind) {
      case 'ohhell': {
        const hand = r.info.next;
        const n = st.players.length;
        const di = L.ohhell.dealerIndex(st.entries.length, n);
        const order = Array.from({ length: n }, (_, k) => st.players[(di + 1 + k) % n]);
        if (d.phase === 'bids') {
          const others = Object.fromEntries(order.slice(0, -1).map((p) => [p.id, d.bids[p.id]]).filter(([, v]) => v != null));
          const allOthers = order.slice(0, -1).every((p) => d.bids[p.id] != null);
          const banned = allOthers ? L.ohhell.forbiddenBid(o, hand, others) : null;
          return `<h2>Bids</h2><p class="muted small">In bidding order (dealer last).</p>
            <ul class="rs-rows">${order.map((p, k) => `<li><span>${esc(p.name)}${k === n - 1 ? ' <span class="rs-tag">dealer</span>' : ''}</span>${stepper('bids.' + p.id, d.bids[p.id], 0, hand, p.name + ' bid')}</li>`).join('')}</ul>
            <p class="rs-hint">${banned != null ? `Hook rule: the dealer can’t bid <strong>${banned}</strong>.` : ''} Bids total ${L.sumOf(Object.fromEntries(Object.entries(d.bids).filter(([, v]) => v != null)))} for ${hand} trick${hand === 1 ? '' : 's'}.</p>
            <button type="button" class="btn" data-act="bids-done">Bids done — play the hand ▶</button>`;
        }
        const total = L.sumOf(d.tricks);
        return `<h2>Tricks taken</h2>
          <ul class="rs-rows">${order.map((p) => `<li><span>${esc(p.name)} <span class="muted small">bid ${d.bids[p.id]}</span></span>${stepper('tricks.' + p.id, d.tricks[p.id], 0, hand, p.name + ' tricks')}</li>`).join('')}</ul>
          <p class="rs-hint ${total === hand ? 'ok' : ''}">${total} of ${hand} tricks entered</p>
          <div class="btn-row"><button type="button" class="btn btn-secondary" data-act="edit-bids">Edit bids</button><button type="button" class="btn" data-act="save">Save hand</button></div>`;
      }
      case 'spades': {
        if (d.phase === 'bids') {
          return `<h2>Bids</h2><p class="muted small">0 = nil.${o.blindNil ? ' Tick “blind” for blind nil.' : ''}</p>
            <ul class="rs-rows">${st.players.map((p) => `<li><span>${esc(p.name)} <span class="muted small">${esc(sideName(st, p.id === 'p1' || p.id === 'p3' ? 'A' : 'B'))}</span></span>
              ${stepper('bids.' + p.id, d.bids[p.id], 0, 13, p.name + ' bid')}
              ${o.blindNil && d.bids[p.id] === 0 ? `<label class="rs-blind"><input type="checkbox" data-check="blind.${p.id}" ${d.blind[p.id] ? 'checked' : ''}> blind</label>` : ''}</li>`).join('')}</ul>
            <button type="button" class="btn" data-act="bids-done">Bids done — play the hand ▶</button>`;
        }
        const total = L.sumOf(d.tricks);
        return `<h2>Tricks taken</h2>
          <ul class="rs-rows">${st.players.map((p) => `<li><span>${esc(p.name)} <span class="muted small">bid ${d.bids[p.id] === 0 ? (d.blind[p.id] ? 'blind nil' : 'nil') : d.bids[p.id]}</span></span>${stepper('tricks.' + p.id, d.tricks[p.id], 0, 13, p.name + ' tricks')}</li>`).join('')}</ul>
          <p class="rs-hint ${total === 13 ? 'ok' : ''}">${total} of 13 tricks entered</p>
          <div class="btn-row"><button type="button" class="btn btn-secondary" data-act="edit-bids">Edit bids</button><button type="button" class="btn" data-act="save">Save hand</button></div>`;
      }
      case 'fivehundred': {
        const F = L.fivehundred;
        const c = d.contract;
        const total = L.sumOf(d.tricks);
        return `<h2>The hand</h2>
          <p class="rs-label">Won the bidding</p>${chips('bidder', d.bidder, s.map((x) => [x, sideName(st, x)]), 'Bidder')}
          <p class="rs-label">Contract</p>
          ${chips('contract.suit', c.suit, F.SUITS.concat([['M', 'Misère'], ['OM', 'Open misère']]), 'Suit')}
          ${c.suit && c.suit !== 'M' && c.suit !== 'OM' ? chips('contract.tricks', c.tricks, [6, 7, 8, 9, 10].map((n) => [n, n]), 'Tricks bid') : ''}
          ${c.suit ? `<p class="rs-hint">${esc(F.label(c))} is worth <strong>${F.value(c)}</strong>${c.suit === 'M' || c.suit === 'OM' ? ' (opponents score nothing)' : ''}</p>` : ''}
          <p class="rs-label">Tricks won</p>
          <ul class="rs-rows">${s.map((x) => `<li><span>${esc(sideName(st, x))}</span>${stepper('tricks.' + x, d.tricks[x], 0, 10, sideName(st, x) + ' tricks')}</li>`).join('')}</ul>
          <p class="rs-hint ${total === 10 ? 'ok' : ''}">${total} of 10 tricks entered</p>
          <button type="button" class="btn" data-act="save">Save hand</button>`;
      }
      case 'bridge': {
        const B = L.bridge;
        let result = '';
        if (d.level && d.taken != null) {
          const need = d.level + 6;
          result = d.taken >= need ? (d.taken > need ? `Made with ${d.taken - need} overtrick${d.taken - need > 1 ? 's' : ''}` : 'Made exactly') : `Down ${need - d.taken}`;
        }
        return `<h2>The deal</h2>
          <p class="rs-label">Declarer</p>${chips('decl', d.decl, s.map((x) => [x, sideName(st, x)]), 'Declarer')}
          <p class="rs-label">Contract</p>
          ${chips('level', d.level, [1, 2, 3, 4, 5, 6, 7].map((n) => [n, n]), 'Level')}
          ${chips('denom', d.denom, B.DENOMS, 'Suit')}
          ${chips('dbl', d.dbl, [[0, 'Undoubled'], [1, 'Doubled'], [2, 'Redoubled']], 'Doubling')}
          <p class="rs-label">Tricks taken by declarer</p>
          <div class="rs-rows"><div class="rs-row1">${stepper('taken', d.taken, 0, 13, 'Tricks taken', '–')}<span class="rs-hint">${esc(result)}</span></div></div>
          <p class="rs-label">Honours <span class="muted small">(optional)</span></p>
          ${chips('honours', d.honours, [['', 'None']].concat(...s.map((x) => [[x + ':100', sideName(st, x) + ' 100'], [x + ':150', sideName(st, x) + ' 150']])), 'Honours')}
          <button type="button" class="btn" data-act="save">Save deal</button>`;
      }
      case 'farkle': {
        const F = L.farkle;
        const t = st.turn || { pts: 0, left: 6, sel: [] };
        const cnt = {}; t.sel.forEach((f) => { cnt[f] = (cnt[f] || 0) + 1; });
        const selScore = t.sel.length ? F.scoreDice(cnt) : null;
        const cur = F.current(s, st.entries);
        const onBoard = r.totals[cur] > 0;
        const canBank = t.pts > 0 && (onBoard || t.pts >= o.openMin);
        const die = (f) => `<span class="ds-die" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i class="${({ 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] })[f].indexOf(i) !== -1 ? 'p' : ''}"></i>`).join('')}</span>`;
        return `<h2>This turn: <span class="rs-turnpts">${t.pts}</span></h2>
          <p class="muted small">${t.left} dice to roll${t.left === 6 && t.pts ? ' — hot dice! 🔥' : ''}. Tap the dice you set aside, then add them.</p>
          <div class="ds-slots rs-sel">${t.sel.map((f, i) => `<button type="button" class="ds-slot" data-unsel="${i}" aria-label="Remove ${f}">${die(f)}</button>`).join('')}${Array.from({ length: Math.max(0, t.left - t.sel.length) }, () => '<span class="ds-slot empty" aria-hidden="true"></span>').join('')}</div>
          <div class="ds-faces">${[1, 2, 3, 4, 5, 6].map((f) => `<button type="button" class="ds-face" data-fface="${f}" aria-label="Set aside a ${f}" ${t.sel.length >= t.left ? 'disabled' : ''}>${die(f)}</button>`).join('')}</div>
          <p class="rs-hint ${selScore ? 'ok' : ''}">${t.sel.length ? (selScore ? `These dice score <strong>${selScore}</strong>` : 'Those dice don’t all score') : 'Scoring: 1 = 100, 5 = 50, three of a kind = 100 × number (1s = 1,000), four 1,000, five 2,000, six 3,000, straight or three pairs 1,500.'}</p>
          <div class="btn-row">
            <button type="button" class="btn btn-secondary" data-act="f-add" ${selScore ? '' : 'disabled'}>Add ${selScore || ''}</button>
            <button type="button" class="btn btn-secondary" data-act="f-type">Type points</button>
          </div>
          <div class="btn-row rs-gap">
            <button type="button" class="btn btn-danger" data-act="f-farkle">Farkle! (0)</button>
            <button type="button" class="btn" data-act="f-bank" ${canBank ? '' : 'disabled'}>Bank ${t.pts}${!onBoard && o.openMin && t.pts < o.openMin ? ` (need ${o.openMin})` : ''}</button>
          </div>`;
      }
      case 'crummy': {
        return `<h2>Penalty points</h2><p class="muted small">Cards left in hand: 2–9 = 5, 10–K = 10, Ace = 15, Joker = 25. Whoever went out scores 0.</p>
          <ul class="rs-rows rs-pen">${st.players.map((p) => `<li><span>${esc(p.name)}</span>
            <span class="rs-penin">${numInput('pts.' + p.id, d.pts[p.id], p.name + ' penalty')}
            <span class="rs-quick">${[5, 10, 15, 25].map((v) => `<button type="button" class="btn btn-ghost" data-addto="pts.${p.id}" data-amt="${v}">+${v}</button>`).join('')}
            <button type="button" class="btn btn-ghost" data-set="pts.${p.id}" data-val="0">Out</button></span></span></li>`).join('')}</ul>
          <button type="button" class="btn" data-act="save">Save round</button>`;
      }
      case 'canasta': {
        const col = (x) => {
          const t = d[x];
          return `<div class="rs-team"><h3>${esc(sideName(st, x))} <span class="rs-prev" data-prev="${x}"></span></h3>
            <label class="switch-row"><input type="checkbox" role="switch" data-check="${x}.melded" ${t.melded ? 'checked' : ''}><span>Melded this hand</span></label>
            <ul class="rs-rows">
              <li><span>Natural canastas <span class="muted small">500</span></span>${stepper(x + '.natural', t.natural, 0, 8, 'Natural canastas')}</li>
              <li><span>Mixed canastas <span class="muted small">300</span></span>${stepper(x + '.mixed', t.mixed, 0, 8, 'Mixed canastas')}</li>
              <li><span>Red 3s <span class="muted small">100 · all 4 = 800</span></span>${stepper(x + '.red3', t.red3, 0, 4, 'Red threes')}</li>
              <li><span>Melded card points</span>${numInput(x + '.meld', t.meld, 'Melded card points')}</li>
              <li><span>Cards left in hands</span>${numInput(x + '.hand', t.hand, 'Points left in hand')}</li>
            </ul>
            ${chips(x + '.out', t.out, [['none', 'Didn’t go out'], ['out', 'Went out +100'], ['concealed', 'Concealed +200']], 'Going out')}</div>`;
        };
        return `<h2>Score the hand</h2>${col('A')}${col('B')}<button type="button" class="btn" data-act="save">Save hand</button>`;
      }
      case 'cribbage': {
        const target = o.target;
        const line = L.cribbage.skunkLine(target);
        return `<h2>Peg</h2><div class="rs-board">${s.map((x) => {
          const tot = r.totals[x];
          const back = r.info.back[x];
          return `<div class="rs-lane"><div class="rs-lane-head"><strong>${esc(sideName(st, x))}</strong><span class="rs-lane-total">${tot}</span></div>
            <div class="rs-track" aria-hidden="true"><i class="rs-skunk" style="left:${(line / target) * 100}%"></i><i class="rs-skunk dbl" style="left:${((line - 30) / target) * 100}%"></i>
              <span class="rs-peg back" style="left:${(back / target) * 100}%"></span><span class="rs-peg" style="left:${(tot / target) * 100}%"></span></div>
            <div class="rs-quick">${[1, 2, 3, 4, 5, 6, 8, 10, 12].map((v) => `<button type="button" class="btn btn-secondary" data-peg="${x}" data-amt="${v}" aria-label="Peg ${v} for ${esc(sideName(st, x))}">+${v}</button>`).join('')}
              <button type="button" class="btn btn-secondary" data-pegtype="${x}" aria-label="Peg another amount for ${esc(sideName(st, x))}">±#</button></div></div>`;
        }).join('')}</div><p class="muted small">Dashed lines: skunk (${line}) and double skunk (${line - 30}).</p>`;
      }
      case 'hearts': {
        const total = L.sumOf(d.hearts);
        return `<h2>Points taken</h2>
          <ul class="rs-rows">${st.players.map((p) => `<li><span>${esc(p.name)} <span class="muted small">hearts</span></span>${stepper('hearts.' + p.id, d.hearts[p.id], 0, 13, p.name + ' hearts')}</li>`).join('')}</ul>
          <p class="rs-hint ${total === 13 ? 'ok' : ''}">${total} of 13 hearts entered</p>
          <p class="rs-label">Took the Q♠ (13)</p>${chips('queen', d.queen, st.players.map((p) => [p.id, p.name]), 'Queen of spades')}
          ${o.omnibus ? `<p class="rs-label">Took the J♦ (−10)</p>${chips('jack', d.jack, st.players.map((p) => [p.id, p.name]), 'Jack of diamonds')}` : ''}
          <div class="btn-row rs-gap"><button type="button" class="btn btn-secondary" data-act="moon">🌙 Shot the moon</button><button type="button" class="btn" data-act="save">Save hand</button></div>`;
      }
      default: return '';
    }
  }

  /* Live preview of what the current draft would score. */
  function previewHTML(st) {
    if (st.kind === 'canasta') return null;
    if (['ohhell', 'spades'].indexOf(st.kind) !== -1 && draft(st).phase !== 'tricks') return '';
    if (['farkle', 'cribbage'].indexOf(st.kind) !== -1) return '';
    const e = entryOf(st);
    if (validate(st, e)) return '';
    const s = sides(st);
    const r = L[st.kind].replay(optsOf(st), s, st.entries.concat([e]));
    const row = r.rows[r.rows.length - 1];
    if (!row) return '';
    return `This hand: ${s.map((x) => `${esc(sideName(st, x))} <strong>${fmtDelta(row.deltas[x])}</strong>`).join(' · ')}${row.moon ? ` · 🌙 ${esc(pname(st, row.moon))} shot the moon` : ''}`;
  }

  /* ---------- History ---------- */
  function rowLabel(st, row, i) {
    const e = st.entries[i];
    switch (st.kind) {
      case 'ohhell': return `${i + 1}<span class="muted small"> · ${row.hand}c</span>`;
      case 'fivehundred': return `${esc(sideName(st, e.bidder)).split(' ')[0]} ${esc(row.label)} ${row.made ? '✓' : '✗'}`;
      case 'bridge': return `${esc(sideName(st, e.decl))} ${esc(row.label)} ${esc(row.result || '')}${row.notes && row.notes.length ? `<span class="muted small"> · ${esc(row.notes.join(', '))}</span>` : ''}`;
      case 'farkle': return `${esc(pname(st, row.pid))}${row.farkle ? ' <span class="rs-warn">farkle</span>' : ''}`;
      case 'crummy': return `${i + 1}. <span class="muted small">${esc(row.contract)}</span>`;
      case 'hearts': return `${i + 1}${row.moon ? ' 🌙' : ''}`;
      case 'cribbage': return esc(sideName(st, row.side));
      default: return String(i + 1);
    }
  }
  function historyHTML(st, r) {
    if (!r.rows.length) return '';
    const s = sides(st);
    let rows = r.rows.map((row, i) => ({ row, i }));
    let more = '';
    if (st.kind === 'cribbage' && rows.length > 12) { more = `<p class="muted small">Showing the last 12 of ${rows.length} pegs.</p>`; rows = rows.slice(-12); }
    return `<h2 class="rs-h">History</h2>${more}<div class="ds-wrap"><table class="rs-hist"><thead><tr><th scope="col">${st.kind === 'farkle' || st.kind === 'cribbage' ? 'Turn' : 'Hand'}</th>${s.map((x) => `<th scope="col">${esc(sideName(st, x))}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(({ row, i }) => `<tr><th scope="row">${rowLabel(st, row, i)}</th>${s.map((x) => `<td><span class="rs-d ${row.deltas[x] < 0 ? 'neg' : ''}">${row.deltas[x] ? fmtDelta(row.deltas[x]) : '·'}</span><span class="rs-t">${row.totals[x]}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function standingsHTML(st, r, game) {
    const s = sides(st);
    const low = game.scorekeeper.direction === 'low';
    const lead = r.rows.length ? L.leaders(r.totals, s, low) : [];
    return `<ul class="rs-stand">${s.map((x) => `<li class="${lead.indexOf(x) !== -1 ? 'lead' : ''}${r.winners.indexOf(x) !== -1 ? ' win' : ''}">
      <span class="rs-sname">${esc(sideName(st, x))}</span><strong class="rs-total">${r.totals[x]}</strong>
      ${st.kind === 'cribbage' && r.info.skunks && r.info.skunks[x] ? `<span class="rs-warn small">${esc(r.info.skunks[x])}</span>` : ''}</li>`).join('')}</ul>`;
  }

  function overHTML(st, r) {
    if (!r.over) return '';
    const names = r.winners.map((x) => esc(sideName(st, x))).join(' & ');
    const extra = st.kind === 'cribbage' ? Object.values(r.info.skunks || {}).filter(Boolean).map((x) => ` — a ${x}!`).join('') : '';
    return `<div class="gameover" role="status"><span class="trophy" aria-hidden="true">🏆</span> ${names} ${r.winners.length > 1 ? 'share the win' : 'win' + (isTeams(st) || r.winners.length > 1 ? '' : 's')}${extra}!
      <div class="btn-row" style="margin-top:.75rem"><button type="button" class="btn" data-act="share">📤 Share results</button>
      <button type="button" class="btn btn-secondary" data-act="again">New game</button></div></div>`;
  }

  /* ---------- Setup ---------- */
  function setupHTML(game, st) {
    const c = CONF[st.kind];
    const o = optsOf(st);
    const n = st.players.length;
    const teamNameInputs = CONF[st.kind].names === 'teams';
    const opt = [];
    const sel = (k, label, options) => `<label class="field"><span>${label}</span><select data-opt="${k}">${options.map(([v, t]) => `<option value="${esc(String(v))}" ${String(o[k]) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    const sw = (k, label, sub) => `<label class="switch-row field"><input type="checkbox" role="switch" data-optb="${k}" ${o[k] ? 'checked' : ''}><span><strong>${label}</strong>${sub ? `<br><span class="muted small">${sub}</span>` : ''}</span></label>`;
    switch (st.kind) {
      case 'ohhell':
        opt.push(sel('schedule', 'Hand sizes', [['down-up', 'Down to 1, then back up'], ['down', 'Down to 1'], ['up', 'Up from 1'], ['up-down', 'Up, then back down']]));
        opt.push(`<fieldset class="field"><legend>Most cards in a hand</legend>${stepper('opt.maxHand', o.maxHand, 1, L.ohhell.maxHandLimit(n), 'Most cards')}</fieldset>`);
        opt.push(sel('scoring', 'Scoring', [['standard', 'Exact bid: 10 + bid; miss: 0'], ['tricks', '1 per trick, +10 for an exact bid']]));
        opt.push(sw('missPenalty', 'Missing costs 1 per trick off', 'Instead of scoring 0 (standard scoring only).'));
        opt.push(sw('hook', 'Hook rule', 'The dealer can’t make the bids add up to the number of tricks.'));
        break;
      case 'spades':
        opt.push(sel('target', 'Play to', [[500, '500'], [300, '300'], [250, '250']]));
        opt.push(sw('bagPenalty', 'Bag penalty', '10 bags cost 100 points.'));
        opt.push(sw('blindNil', 'Allow blind nil', 'Worth ±200.'));
        break;
      case 'fivehundred':
        opt.push(sw('winOnlyByBid', 'Win only by making a bid', 'Trick points from defending stop at 490.'));
        break;
      case 'farkle':
        opt.push(sel('target', 'Play to', [[10000, '10,000'], [5000, '5,000'], [3000, '3,000']]));
        opt.push(sel('openMin', 'Opening minimum', [[0, 'None'], [300, '300'], [500, '500'], [1000, '1,000']]));
        break;
      case 'canasta':
        opt.push(sel('target', 'Play to', [[5000, '5,000'], [3000, '3,000']]));
        break;
      case 'cribbage':
        opt.push(sel('target', 'Game', [[121, '121 (standard)'], [61, '61 (short game)']]));
        break;
      case 'hearts':
        opt.push(sel('target', 'Game ends at', [[100, '100'], [50, '50']]));
        opt.push(sel('moon', 'Shooting the moon', [['add', 'Everyone else +26'], ['subtract', 'Shooter −26']]));
        opt.push(sw('omnibus', 'Omnibus Hearts', 'The J♦ is worth −10.'));
        break;
      default: break;
    }
    const count = c.min === c.max ? '' : `<fieldset class="field"><legend>Players</legend>${stepper('count', n, c.min, c.max, 'Players')}
      ${st.kind === 'fivehundred' ? '<p class="muted small">4 players play in partnerships (1 & 3 v 2 & 4).</p>' : st.kind === 'cribbage' ? '<p class="muted small">4 players play as partners (1 & 3 v 2 & 4).</p>' : ''}</fieldset>`;
    const names = teamNameInputs
      ? `<fieldset class="field"><legend>Teams</legend><div class="imp-names">${['A', 'B'].map((x, i) => `<label class="imp-name"><span class="imp-name-num" aria-hidden="true">${i + 1}</span>
          <input type="text" data-team="${x}" value="${esc((st.teamNames || {})[x] || '')}" placeholder="${esc((c.teamDefaults || ['Team A', 'Team B'])[i])}" maxlength="16" aria-label="Team ${i + 1} name"></label>`).join('')}</div></fieldset>`
      : `<fieldset class="field"><legend>Names${isTeams(st) ? ' <span class="muted small">(seat order — 1 & 3 are partners)</span>' : ''}</legend><div class="imp-names">${st.players.map((p, i) => `<label class="imp-name"><span class="imp-name-num" aria-hidden="true">${i + 1}</span>
          <input type="text" data-pid="${p.id}" value="${esc(p.name)}" maxlength="16" aria-label="Player ${i + 1} name"></label>`).join('')}</div></fieldset>`;
    return `<div class="page-head"><h1 tabindex="-1">${esc(game.name)} scorecard</h1>
        <p class="muted">Enter what happened each hand — the scores, totals and winner are worked out for you.</p></div>
      <form id="rs-setup" onsubmit="return false">${count}${names}${opt.join('')}</form>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" data-act="start">Start scorecard</button></div></div>`;
  }

  /* ---------- Main ---------- */
  function mainHTML(game, st) {
    const r = replay(st);
    const pv = previewHTML(st);
    return `<div class="page-head ds-head"><h1 tabindex="-1">${esc(game.name)} scorecard</h1>
        <p class="muted small"><a href="#/game/${esc(game.id)}">Rules</a></p></div>
      ${overHTML(st, r)}
      ${standingsHTML(st, r, game)}
      ${infoHTML(st, r)}
      ${r.over ? '' : `<section class="rs-form" aria-label="Enter the next hand">${formHTML(st, r)}<p class="rs-preview" id="rs-preview" aria-live="polite">${pv || ''}</p></section>`}
      ${historyHTML(st, r)}
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" data-act="undo" ${st.entries.length ? '' : 'disabled'}>↶ Undo</button>
        <button type="button" class="btn btn-secondary" data-act="menu">⋯ Options</button></div></div>`;
  }

  function resultsText(game, st) {
    const r = replay(st);
    const s = sides(st).slice().sort((a, b) => (game.scorekeeper.direction === 'low' ? r.totals[a] - r.totals[b] : r.totals[b] - r.totals[a]));
    return `${game.name} — ${new Date().toLocaleDateString()}\n${s.map((x, i) => `${i + 1}. ${sideName(st, x)} — ${r.totals[x]}`).join('\n')}`;
  }
  async function share(game, st) {
    const text = resultsText(game, st);
    const canShare = typeof navigator.share === 'function';
    const actions = [{ label: 'Close', value: 'cancel', style: 'secondary' }, { label: 'Copy', value: 'copy', style: canShare ? 'secondary' : '', primary: !canShare }];
    if (canShare) actions.push({ label: 'Share…', value: 'share', primary: true });
    const res = await CGR.ui.dialog({ title: 'Share results', message: text, pre: true, actions });
    if (res.action === 'share') { try { await navigator.share({ title: game.name + ' scores', text }); } catch (e) { /* cancelled */ } }
    else if (res.action === 'copy') { try { await navigator.clipboard.writeText(text); CGR.ui.toast('Copied to clipboard'); } catch (e) { CGR.ui.toast('Couldn’t copy'); } }
  }

  CGR.views.roundSheet = function (id) {
    const game = CGR.data.get(id);
    if (!game) return CGR.views.notFound();
    const kind = game.scorekeeper.sheet;
    return {
      title: 'Score: ' + game.name,
      back: '#/game/' + game.id,
      html: '<div id="rs-root" class="rs"></div>',
      onMount(v) {
        const root = v.querySelector('#rs-root');
        const st0 = () => load(game, kind);
        function render(focusHeading) {
          const st = st0();
          const active = document.activeElement;
          const ds = active && root.contains(active) ? Object.assign({}, active.dataset) : null;
          root.innerHTML = st.started ? mainHTML(game, st) : setupHTML(game, st);
          if (st.kind === 'canasta' && st.started) updateCanasta(st);
          if (focusHeading) { window.scrollTo(0, 0); const h = root.querySelector('h1'); if (h) h.focus({ preventScroll: true }); return; }
          if (ds) {
            const k = Object.keys(ds).find((x) => ['step', 'set', 'act', 'peg', 'fface', 'addto', 'path', 'check', 'opt', 'optb'].indexOf(x) !== -1);
            if (k) {
              const attr = 'data-' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
              let sel = `[${attr}="${CSS.escape(ds[k])}"]`;
              if (ds.d) sel += `[data-d="${ds.d}"]`; if (ds.val) sel += `[data-val='${ds.val}']`; if (ds.amt) sel += `[data-amt="${ds.amt}"]`;
              const again = root.querySelector(sel);
              if (again && !again.disabled) again.focus({ preventScroll: true });
            }
          }
        }
        function updateCanasta(st) {
          ['A', 'B'].forEach((x) => {
            const el = root.querySelector(`[data-prev="${x}"]`);
            if (el) { const e = entryOf(st)[x]; el.textContent = fmtDelta(L.canasta.handScore(e)); }
          });
        }
        function commit(st) { save(st); render(); }

        function saveEntry(st) {
          const e = entryOf(st);
          const err = validate(st, e);
          if (err) { CGR.ui.toast(err); return; }
          st.entries.push(e);
          st.draft = null;
          save(st);
          const r = replay(st);
          render();
          CGR.ui.announce(r.over ? 'Game over' : 'Saved');
          if (r.over) window.scrollTo(0, 0);
        }

        root.addEventListener('click', async (ev) => {
          const b = ev.target.closest('button, [data-act]');
          if (!b || !root.contains(b) || b.disabled) return;
          const st = st0();
          const ds = b.dataset;
          if (ds.step) {
            const d = Number(ds.d), min = Number(ds.min), max = Number(ds.max);
            if (ds.step === 'count') {
              const n = Math.max(min, Math.min(max, st.players.length + d));
              while (st.players.length < n) st.players.push({ id: 'p' + (st.players.length + 1), name: 'Player ' + (st.players.length + 1) });
              st.players.length = n;
              st.opts = Object.assign({}, st.opts); if (st.kind === 'ohhell') st.opts.maxHand = Math.min(optsOf(st).maxHand, L.ohhell.maxHandLimit(n));
              st.draft = null; return commit(st);
            }
            if (ds.step.indexOf('opt.') === 0) { const k = ds.step.slice(4); const o = optsOf(st); st.opts = Object.assign({}, st.opts, { [k]: Math.max(min, Math.min(max, o[k] + d)) }); return commit(st); }
            const cur = getPath(draft(st), ds.step);
            let next;
            if (cur == null || cur === '') next = d > 0 ? Math.max(min, 1) : min;
            else next = Math.max(min, Math.min(max, cur + d));
            setPath(draft(st), ds.step, next);
            return commit(st);
          }
          if (ds.set) { setPath(draft(st), ds.set, JSON.parse(ds.val)); return commit(st); }
          if (ds.addto) { const cur = getPath(draft(st), ds.addto); setPath(draft(st), ds.addto, N(cur) + Number(ds.amt)); return commit(st); }
          if (ds.peg) {
            st.entries.push({ side: ds.peg, pts: Number(ds.amt) });
            save(st);
            const r = replay(st);
            render();
            if (r.over) { window.scrollTo(0, 0); CGR.ui.announce('Game over'); }
            return;
          }
          if (ds.pegtype) {
            const res = await CGR.ui.dialog({ title: 'Peg points — ' + sideName(st, ds.pegtype), input: { label: 'Points (1–29)', type: 'number', inputmode: 'numeric' } });
            if (res.action !== 'ok') return;
            const n = Number(res.value);
            const err = L.cribbage.validate({}, sides(st), { side: ds.pegtype, pts: n });
            if (err) { CGR.ui.toast(err); return; }
            st.entries.push({ side: ds.pegtype, pts: n }); return commit(st);
          }
          if (ds.fface) { st.turn = st.turn || { pts: 0, left: 6, sel: [] }; if (st.turn.sel.length < st.turn.left) st.turn.sel.push(Number(ds.fface)); return commit(st); }
          if (ds.unsel != null) { st.turn.sel.splice(Number(ds.unsel), 1); return commit(st); }
          switch (ds.act) {
            case 'start': {
              root.querySelectorAll('[data-pid]').forEach((inp) => { const p = st.players.find((x) => x.id === inp.dataset.pid); if (p) p.name = inp.value.trim().slice(0, 16) || p.name; });
              root.querySelectorAll('[data-team]').forEach((inp) => { st.teamNames = Object.assign({}, st.teamNames, { [inp.dataset.team]: inp.value.trim().slice(0, 16) }); });
              st.started = true; st.entries = []; st.draft = null; st.turn = null;
              save(st); return render(true);
            }
            case 'bids-done': {
              const d = draft(st);
              const err = validate(st, { bids: d.bids });
              if (err) { CGR.ui.toast(err); return; }
              if (st.kind === 'ohhell') {
                const o = optsOf(st), n = st.players.length;
                const dealer = st.players[L.ohhell.dealerIndex(st.entries.length, n)].id;
                const others = Object.fromEntries(Object.entries(d.bids).filter(([k]) => k !== dealer));
                const banned = L.ohhell.forbiddenBid(o, L.ohhell.hands(o)[st.entries.length], others);
                if (banned != null && d.bids[dealer] === banned) { CGR.ui.toast(`Hook rule: the dealer can’t bid ${banned}`); return; }
              }
              d.phase = 'tricks'; return commit(st);
            }
            case 'edit-bids': draft(st).phase = 'bids'; return commit(st);
            case 'save': return saveEntry(st);
            case 'moon': {
              const res = await CGR.ui.dialog({ title: 'Who shot the moon?', actions: [{ label: 'Cancel', value: 'cancel', style: 'secondary' }].concat(st.players.map((p) => ({ label: p.name, value: p.id }))) });
              if (res.action === 'cancel') return;
              const d = draft(st);
              st.players.forEach((p) => { d.hearts[p.id] = p.id === res.action ? 13 : 0; });
              d.queen = res.action;
              return commit(st);
            }
            case 'f-add': {
              const t = st.turn; const cnt = {}; t.sel.forEach((f) => { cnt[f] = (cnt[f] || 0) + 1; });
              const pts = L.farkle.scoreDice(cnt);
              if (!pts) return;
              t.pts += pts; t.left -= t.sel.length; t.sel = [];
              if (t.left === 0) { t.left = 6; CGR.ui.toast('Hot dice! Roll all six again 🔥'); }
              return commit(st);
            }
            case 'f-type': {
              const res = await CGR.ui.dialog({ title: 'Add points to this turn', input: { label: 'Points (multiple of 50)', type: 'number', inputmode: 'numeric' } });
              if (res.action !== 'ok') return;
              const n = Number(res.value);
              if (!Number.isInteger(n) || n <= 0 || n % 50) { CGR.ui.toast('Points must be a positive multiple of 50'); return; }
              st.turn = st.turn || { pts: 0, left: 6, sel: [] }; st.turn.pts += n; return commit(st);
            }
            case 'f-bank': case 'f-farkle': {
              const s = sides(st); const cur = L.farkle.current(s, st.entries);
              const pts = ds.act === 'f-bank' ? (st.turn ? st.turn.pts : 0) : 0;
              const r = replay(st);
              const err = L.farkle.validate(optsOf(st), s, st.entries, { pid: cur, pts }, r.totals);
              if (err) { CGR.ui.toast(err); return; }
              st.entries.push({ pid: cur, pts });
              st.turn = null;
              save(st);
              CGR.ui.toast(pts ? `${pname(st, cur)} banks ${pts}` : `${pname(st, cur)} farkled!`);
              render();
              return;
            }
            case 'undo': {
              if (!st.entries.length) return;
              st.entries.pop(); st.draft = null; st.turn = null;
              CGR.ui.toast('Removed the last entry');
              return commit(st);
            }
            case 'share': return share(game, st);
            case 'again': st.entries = []; st.draft = null; st.turn = null; return commit(st);
            case 'menu': {
              const res = await CGR.ui.dialog({ title: 'Scorecard options', actions: [
                { label: 'Close', value: 'cancel', style: 'secondary' },
                { label: 'Simple tracker', value: 'simple', style: 'secondary' },
                { label: 'Players & rules', value: 'setup', style: 'secondary' },
                { label: 'Share', value: 'share', style: 'secondary' },
                { label: 'New game', value: 'again', primary: true }] });
              if (res.action === 'share') share(game, st);
              else if (res.action === 'simple') location.hash = '#/score/' + game.id + '?simple=1';
              else if (res.action === 'again') { if (!st.entries.length || await CGR.ui.confirm('Start a new game?', 'All hands are cleared. Players and rules stay the same.', 'New game', true)) { st.entries = []; st.draft = null; st.turn = null; commit(st); } }
              else if (res.action === 'setup') { if (!st.entries.length || await CGR.ui.confirm('Change players or rules?', 'This clears the scorecard.', 'Continue', true)) { st.started = false; st.entries = []; st.draft = null; st.turn = null; commit(st); } }
              return;
            }
            default: return;
          }
        });

        root.addEventListener('change', (ev) => {
          const t = ev.target;
          const st = st0();
          if (t.dataset.opt) { st.opts = Object.assign({}, st.opts, { [t.dataset.opt]: isNaN(Number(t.value)) ? t.value : Number(t.value) }); return commit(st); }
          if (t.dataset.optb) { st.opts = Object.assign({}, st.opts, { [t.dataset.optb]: t.checked }); return commit(st); }
          if (t.dataset.check) { setPath(draft(st), t.dataset.check, t.checked); return commit(st); }
          if (t.dataset.pid && !st.started) { const p = st.players.find((x) => x.id === t.dataset.pid); if (p) p.name = t.value.trim().slice(0, 16) || p.name; save(st); }
          if (t.dataset.team && !st.started) { st.teamNames = Object.assign({}, st.teamNames, { [t.dataset.team]: t.value.trim().slice(0, 16) }); save(st); }
        });
        root.addEventListener('input', (ev) => {
          const t = ev.target;
          if (!t.dataset.path) return;
          const st = st0();
          const v = t.value.trim();
          setPath(draft(st), t.dataset.path, v === '' ? '' : Math.max(0, Math.round(Number(v)) || 0));
          save(st);
          const pv = root.querySelector('#rs-preview');
          if (pv) pv.innerHTML = previewHTML(st) || '';
          if (st.kind === 'canasta') updateCanasta(st);
        });

        render();
      }
    };
  };

  CGR.roundSheetKinds = Object.keys(CONF);
})();
