/* More hand-by-hand scorecards: setup, entry forms and labels for Gin Rummy, Euchre,
 * Three-Handed Euchre, Six-Card Golf, Pinochle, Rummy 500, Auction Pitch, Bid Whist,
 * Whist, Skat, 1000, Sixty-Six / Schnapsen and French Tarot.
 * Scoring logic: round-sheet-logic.js. Screen shell: round-sheet.js (helpers arrive as H).
 * Loaded before round-sheet.js. */
window.CGR = window.CGR || {};

(function () {
  const esc = CGR.esc;
  const ids = (st) => st.players.map((p) => p.id);
  const zero = (keys, v) => Object.fromEntries(keys.map((k) => [k, v]));
  const playerChips = (H, st, path, cur, label, extra) => H.chips(path, cur, (extra || []).concat(st.players.map((p) => [p.id, p.name])), label);
  const sideChips = (H, st, path, cur, label) => H.chips(path, cur, H.sides(st).map((s) => [s, H.sideName(st, s)]), label);
  const seatNote = 'Seat order: players 1 & 3 are partners against 2 & 4.';

  /* ---------- Card keypad (Gin deadwood, Rummy 500 points) ----------
   * Tap a field to select it, then tap cards to add their value. */
  function keypadHTML(H, d, keys) {
    return `<div class="kp" role="group" aria-label="Add a card to the selected box">
      ${keys.map(([label, v]) => `<button type="button" class="kp-key" data-kp="${v}" ${d.focus ? '' : 'disabled'}>${esc(label)}</button>`).join('')}
      <button type="button" class="kp-key kp-clear" data-kpclear="1" ${d.focus ? '' : 'disabled'}>Clear</button>
      <button type="button" class="kp-key kp-type" data-kptype="1" ${d.focus ? '' : 'disabled'}>Type…</button></div>`;
  }
  function fieldHTML(H, d, path, label) {
    const v = H.getPath(d, path) || 0;
    return `<button type="button" class="kp-field${d.focus === path ? ' on' : ''}" data-kpfocus="${path}" aria-pressed="${d.focus === path}" aria-label="${esc(label)}: ${v}. Tap to select">
      <span class="kp-flabel">${esc(label)}</span><span class="kp-fval">${v}</span></button>`;
  }
  async function keypadClick(b, st, H) {
    const d = H.draft(st);
    const ds = b.dataset;
    if (ds.kpfocus) { d.focus = d.focus === ds.kpfocus ? null : ds.kpfocus; return true; }
    if (!d.focus) return false;
    if (ds.kp) { H.setPath(d, d.focus, (H.getPath(d, d.focus) || 0) + Number(ds.kp)); return true; }
    if (ds.kpclear) { H.setPath(d, d.focus, 0); return true; }
    if (ds.kptype) {
      const res = await CGR.ui.dialog({ title: 'Type a total', input: { label: 'Points', type: 'number', inputmode: 'numeric', value: H.getPath(d, d.focus) || '' } });
      if (res.action !== 'ok') return false;
      const n = Number(res.value);
      if (!Number.isInteger(n) || n < 0) { CGR.ui.toast('Enter a whole number of 0 or more'); return false; }
      H.setPath(d, d.focus, n);
      return true;
    }
    return false;
  }
  const GIN_KEYS = [['A', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8], ['9', 9], ['10 J Q K', 10]];
  const R500_KEYS = [['A (15)', 15], ['A low (1)', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8], ['9', 9], ['10 J Q K', 10]];

  const EXT = {};

  /* ======================= Gin Rummy ======================= */
  EXT.gin = {
    conf: { min: 2, max: 2, def: 2, teams: false },
    noPreview: false,
    setup: (st, o, { sel, sw }) => [
      sel('target', 'Play to', [[100, '100'], [150, '150'], [250, '250']]),
      sel('undercutBonus', 'Undercut bonus', [[25, '25'], [20, '20'], [10, '10']]),
      sel('ginBonus', 'Gin bonus', [[25, '25'], [20, '20']]),
      sw('endBonuses', 'End-of-game bonuses', '100 for the game (200 for a shutout) and 25 for every hand won.')
    ],
    draft: (st) => ({ type: 'knock', by: null, dw: zero(ids(st), 0), focus: null }),
    entry: (st, d) => ({ type: d.type, by: d.by, dw: Object.assign({}, d.dw) }),
    info: (st, r, H) => {
      const s = H.sides(st);
      const o = H.optsOf(st);
      if (r.over && o.endBonuses) return `<p class="rs-info">Final totals include ${s.map((x) => `${esc(H.sideName(st, x))}: ${r.info.running[x]} + ${r.info.bonuses[x]} bonus`).join(' · ')}.</p>`;
      return `<p class="rs-info">Hands won: ${s.map((x) => `${esc(H.sideName(st, x))} <strong>${r.info.handsWon[x]}</strong>`).join(' · ')}${o.endBonuses ? ' <span class="muted small">(25 each at the end)</span>' : ''}</p>`;
    },
    form: (st, r, H) => {
      const d = H.draft(st);
      const other = d.by ? st.players.find((p) => p.id !== d.by) : null;
      const fields = d.type === 'draw' ? '' : d.by ? `<p class="rs-label">Deadwood <span class="muted small">— tap a box, then tap the cards</span></p>
          <div class="kp-fields">${d.type === 'knock' ? fieldHTML(H, d, 'dw.' + d.by, H.pname(st, d.by) + ' (knocker)') : ''}${fieldHTML(H, d, 'dw.' + other.id, other.name)}</div>
          ${keypadHTML(H, d, GIN_KEYS)}` : '';
      return `<h2>The hand</h2>
        ${H.chips('type', d.type, [['knock', 'Knock'], ['gin', 'Gin (+' + H.optsOf(st).ginBonus + ')'], ['biggin', 'Big gin (+' + H.optsOf(st).bigGinBonus + ')'], ['draw', 'Draw (no score)']], 'Result')}
        ${d.type === 'draw' ? '' : `<p class="rs-label">${d.type === 'knock' ? 'Who knocked?' : 'Who went gin?'}</p>${playerChips(H, st, 'by', d.by, 'Player')}`}
        ${fields}
        <button type="button" class="btn rs-gap" data-act="save">Save hand</button>`;
    },
    click: keypadClick,
    label: (st, row, i, H) => `${i + 1}. ${esc(row.note)}${row.winner ? ` <span class="muted small">${esc(H.pname(st, row.winner))}</span>` : ''}`
  };

  /* ======================= Euchre ======================= */
  const euchreForm = (three) => (st, r, H) => {
    const d = H.draft(st);
    const o = H.optsOf(st);
    return `<h2>The hand</h2>
      <p class="rs-label">${three ? 'Maker (called trumps)' : 'Makers (called trumps)'}</p>
      ${three ? playerChips(H, st, 'maker', d.maker, 'Maker') : sideChips(H, st, 'makers', d.makers, 'Makers')}
      ${three ? '' : `<label class="switch-row rs-gap"><input type="checkbox" role="switch" data-check="alone" ${d.alone ? 'checked' : ''}><span><strong>Went alone</strong></span></label>`}
      <p class="rs-label">Result</p>
      ${H.chips('result', d.result, [['made', three ? '3–4 tricks (1)' : '3–4 tricks (1)'], ['march', three ? 'All 5 — march (3)' : d.alone ? 'All 5 alone (4)' : 'All 5 — march (2)'], ['euchred', three ? 'Euchred (2 each to the others)' : 'Euchred (2 to defenders)']], 'Result')}
      ${!three && o.defendAlone && d.alone && d.result === 'euchred' ? `<label class="switch-row rs-gap"><input type="checkbox" role="switch" data-check="defAlone" ${d.defAlone ? 'checked' : ''}><span><strong>A defender went alone</strong> <span class="muted small">(euchre worth 4)</span></span></label>` : ''}
      <button type="button" class="btn rs-gap" data-act="save">Save hand</button>`;
  };
  EXT.euchre = {
    conf: { min: 4, max: 4, def: 4, teams: true, names: 'players' },
    countNote: seatNote,
    setup: (st, o, { sel, sw }) => [sel('target', 'Play to', [[10, '10'], [11, '11'], [15, '15']]), sw('defendAlone', 'Defending alone', 'A defender may go alone against a lone maker; a euchre then scores 4.')],
    draft: () => ({ makers: null, result: null, alone: false, defAlone: false }),
    entry: (st, d) => ({ makers: d.makers, result: d.result, alone: !!d.alone, defAlone: !!d.defAlone }),
    form: euchreForm(false),
    label: (st, row, i, H) => { const e = st.entries[i]; return `${esc(H.sideName(st, e.makers).split(' & ')[0])}${e.alone ? ' alone' : ''} · ${{ made: 'made', march: 'march', euchred: 'euchred' }[e.result]}`; }
  };
  EXT.euchre3 = {
    conf: { min: 3, max: 3, def: 3, teams: false },
    setup: (st, o, { sel }) => [sel('target', 'Play to', [[10, '10'], [15, '15']])],
    draft: () => ({ maker: null, result: null }),
    entry: (st, d) => ({ maker: d.maker, result: d.result }),
    form: euchreForm(true),
    label: (st, row, i, H) => { const e = st.entries[i]; return `${esc(H.pname(st, e.maker))} · ${e.result}`; }
  };

  /* ======================= Six-Card Golf ======================= */
  EXT.golf = {
    conf: { min: 2, max: 8, def: 4, teams: false },
    setup: (st, o, { sel }) => [sel('holes', 'Holes', [[9, '9'], [18, '18']])],
    info: (st, r, H) => (r.over ? '' : `<p class="rs-info"><strong>Hole ${r.info.hole} of ${H.optsOf(st).holes}</strong> · lowest total wins</p>`),
    draft: (st) => ({ cards: Object.fromEntries(ids(st).map((p) => [p, [null, null, null, null, null, null]])), typed: zero(ids(st), null), sel: null }),
    entry: (st, d, H) => ({ pts: Object.fromEntries(ids(st).map((p) => [p, d.typed[p] != null ? d.typed[p] : H.L.golf.score(d.cards[p])])) }),
    form: (st, r, H) => {
      const d = H.draft(st);
      const G = H.L.golf;
      const players = st.players.map((p) => {
        if (d.typed[p.id] != null) {
          return `<li class="gf-player"><div class="cr-phead"><strong>${esc(p.name)}</strong><span class="cr-ptotal">${d.typed[p.id]} <span class="rs-tag">typed</span></span></div>
            <button type="button" class="btn btn-ghost" data-gfuntype="${p.id}">Enter cards instead</button></li>`;
        }
        const cards = d.cards[p.id];
        const sc = G.score(cards);
        const slot = (i) => {
          const c = cards[i];
          const paired = c && cards[i < 3 ? i + 3 : i - 3] === c;
          const on = d.sel && d.sel.p === p.id && d.sel.i === i;
          return `<button type="button" class="gf-slot${on ? ' on' : ''}${paired ? ' pair' : ''}${c ? '' : ' empty'}" data-gfslot="${p.id}:${i}" aria-label="${esc(p.name)} card ${i + 1}: ${c || 'empty'}">${c ? esc(c) : '?'}</button>`;
        };
        return `<li class="gf-player"><div class="cr-phead"><strong>${esc(p.name)}</strong><span class="cr-ptotal">${sc == null ? '—' : sc}</span></div>
          <div class="gf-grid">${[0, 1, 2, 3, 4, 5].map(slot).join('')}</div>
          <button type="button" class="btn btn-ghost cr-type" data-gftype="${p.id}">Type a score</button></li>`;
      }).join('');
      const selName = d.sel ? H.pname(st, d.sel.p) + ', card ' + (d.sel.i + 1) : null;
      return `<h2>Hole ${st.entries.length + 1}</h2>
        <p class="muted small">Tap a card position, then its rank. A matching pair in a column (one above the other) scores 0. A = 1, 2 = −2, J/Q = 10, K = 0.</p>
        <div class="gf-ranks" role="group" aria-label="Rank for ${esc(selName || 'the selected card')}">${G.RANKS.map((k) => `<button type="button" class="kp-key" data-gfrank="${k}" ${d.sel ? '' : 'disabled'}>${k}</button>`).join('')}</div>
        <ul class="cr-players">${players}</ul>
        <button type="button" class="btn" data-act="save">Save hole</button>`;
    },
    click: async (b, st, H) => {
      const d = H.draft(st);
      const ds = b.dataset;
      if (ds.gfslot) { const [p, i] = ds.gfslot.split(':'); d.sel = { p, i: Number(i) }; return true; }
      if (ds.gfrank && d.sel) {
        d.cards[d.sel.p][d.sel.i] = ds.gfrank;
        // Move to the next empty card of the same player, then the next player.
        const order = ids(st);
        let pi = order.indexOf(d.sel.p), i = d.sel.i;
        for (let n = 0; n < order.length * 6; n++) {
          i++; if (i > 5) { i = 0; pi = (pi + 1) % order.length; }
          if (d.typed[order[pi]] == null && !d.cards[order[pi]][i]) { d.sel = { p: order[pi], i }; return true; }
        }
        d.sel = null;
        return true;
      }
      if (ds.gftype) {
        const res = await CGR.ui.dialog({ title: 'Score for ' + H.pname(st, ds.gftype), input: { label: 'Points this hole (can be negative)', type: 'number', inputmode: 'numeric' } });
        if (res.action !== 'ok') return false;
        const n = Number(res.value);
        if (!Number.isInteger(n)) { CGR.ui.toast('Enter a whole number'); return false; }
        d.typed[ds.gftype] = n;
        return true;
      }
      if (ds.gfuntype) { d.typed[ds.gfuntype] = null; return true; }
      return false;
    },
    label: (st, row) => `Hole ${row.hole}`
  };

  /* ======================= Pinochle ======================= */
  EXT.pinochle = {
    conf: { min: 4, max: 4, def: 4, teams: true, names: 'players' },
    countNote: seatNote,
    setup: (st, o, { sel }) => [sel('target', 'Play to', [[1500, '1,500'], [1000, '1,000']])],
    draft: () => ({ bidder: null, bid: 250, meld: { A: 0, B: 0 }, counters: { A: '', B: '' } }),
    entry: (st, d, H) => ({ bidder: d.bidder, bid: d.bid, meld: { A: H.N(d.meld.A), B: H.N(d.meld.B) }, counters: { A: H.N(d.counters.A), B: d.counters.B === '' && d.counters.A !== '' ? 250 - H.N(d.counters.A) : H.N(d.counters.B) } }),
    form: (st, r, H) => {
      const d = H.draft(st);
      const P = H.L.pinochle;
      const col = (x) => `<div class="rs-team"><h3>${esc(H.sideName(st, x))}</h3>
          <ul class="rs-rows"><li><span>Meld</span>${H.numInput('meld.' + x, d.meld[x], 'Meld for ' + H.sideName(st, x))}</li>
          <li><span>Counters <span class="muted small">(A, 10, K = 10; last trick 10)</span></span>${H.numInput('counters.' + x, d.counters[x], 'Counters for ' + H.sideName(st, x))}</li></ul>
          <div class="rs-quick pn-melds">${P.MELDS.map(([n, v]) => `<button type="button" class="btn btn-ghost" data-addto="meld.${x}" data-amt="${v}">${esc(n)} +${v}</button>`).join('')}
            <button type="button" class="btn btn-ghost" data-set="meld.${x}" data-val="0">Clear meld</button></div></div>`;
      return `<h2>The hand</h2>
        <p class="rs-label">Won the bid</p>${sideChips(H, st, 'bidder', d.bidder, 'Bidder')}
        <p class="rs-label">Bid</p><div class="rs-row1">${H.stepper('bid', d.bid, 150, 1500, 'Bid', '–', 10)}</div>
        ${col('A')}${col('B')}
        <p class="muted small">Counters add up to 250. A side keeps its meld only if it wins at least one counter. If the bidders’ meld + counters fall short of the bid, they lose the bid.</p>
        <button type="button" class="btn" data-act="save">Save hand</button>`;
    },
    label: (st, row, i, H) => { const e = st.entries[i]; return `${esc(H.sideName(st, e.bidder).split(' & ')[0])} bid ${e.bid}${row.notes && row.notes[e.bidder] === 'Set' ? ' <span class="rs-warn">set</span>' : ' ✓'}`; }
  };

  /* ======================= Rummy 500 ======================= */
  EXT.rummy500 = {
    conf: { min: 2, max: 8, def: 4, teams: false },
    setup: (st, o, { sel }) => [sel('target', 'Play to', [[500, '500'], [250, '250']])],
    draft: (st) => ({ melded: zero(ids(st), 0), hand: zero(ids(st), 0), focus: null }),
    entry: (st, d) => ({ melded: Object.assign({}, d.melded), hand: Object.assign({}, d.hand) }),
    form: (st, r, H) => {
      const d = H.draft(st);
      return `<h2>Score the hand</h2>
        <p class="muted small">Tap a box, then tap the cards: everything you melded or laid off, and everything left in your hand. Ace = 15 (or 1 when used low in A-2-3), 10/J/Q/K = 10, others face value.</p>
        <ul class="cr-players">${st.players.map((p) => `<li class="cr-player"><div class="cr-phead"><strong>${esc(p.name)}</strong><span class="cr-ptotal">${H.fmtDelta((d.melded[p.id] || 0) - (d.hand[p.id] || 0))}</span></div>
          <div class="kp-fields">${fieldHTML(H, d, 'melded.' + p.id, 'Melded')}${fieldHTML(H, d, 'hand.' + p.id, 'Left in hand')}</div></li>`).join('')}</ul>
        <div class="kp-sticky">${keypadHTML(H, d, R500_KEYS)}</div>
        <button type="button" class="btn rs-gap" data-act="save">Save hand</button>`;
    },
    click: keypadClick,
    label: (st, row, i) => `Hand ${i + 1}`
  };

  /* ======================= Auction Pitch ======================= */
  EXT.pitch = {
    conf: { min: 2, max: 7, def: 4, teams: false },
    setup: (st, o, { sel, sw }) => [sel('target', 'Play to', [[7, '7'], [10, '10'], [11, '11'], [21, '21']]), sw('smudge', 'Smudge', 'A bid to win all four points; making it wins the game (unless the bidder was below zero).')],
    draft: () => ({ pitcher: null, bid: null, high: null, low: null, jack: '', game: '' }),
    entry: (st, d) => ({ pitcher: d.pitcher, bid: d.bid, high: d.high, low: d.low, jack: d.jack || null, game: d.game || null }),
    form: (st, r, H) => {
      const d = H.draft(st);
      const o = H.optsOf(st);
      return `<h2>The hand</h2>
        <p class="rs-label">Pitcher (won the bid)</p>${playerChips(H, st, 'pitcher', d.pitcher, 'Pitcher')}
        <p class="rs-label">Bid</p>${H.chips('bid', d.bid, [[1, '1'], [2, '2'], [3, '3'], [4, '4']].concat(o.smudge ? [[5, 'Smudge']] : []), 'Bid')}
        <p class="rs-label">High <span class="muted small">— highest trump dealt</span></p>${playerChips(H, st, 'high', d.high, 'High')}
        <p class="rs-label">Low <span class="muted small">— lowest trump dealt</span></p>${playerChips(H, st, 'low', d.low, 'Low')}
        <p class="rs-label">Jack <span class="muted small">— won the trick with the trump Jack</span></p>${playerChips(H, st, 'jack', d.jack, 'Jack', [['', 'Not dealt']])}
        <p class="rs-label">Game <span class="muted small">— most game points (A 4, K 3, Q 2, J 1, 10 = 10)</span></p>${playerChips(H, st, 'game', d.game, 'Game', [['', 'Tie — nobody']])}
        <button type="button" class="btn rs-gap" data-act="save">Save hand</button>`;
    },
    label: (st, row, i, H) => { const e = st.entries[i]; return `${esc(H.pname(st, e.pitcher))} bid ${e.bid === 5 ? 'smudge' : e.bid} ${row.made ? '✓' : '<span class="rs-warn">set</span>'}`; }
  };

  /* ======================= Bid Whist ======================= */
  EXT.bidwhist = {
    conf: { min: 4, max: 4, def: 4, teams: true, names: 'players' },
    countNote: seatNote,
    setup: (st, o, { sel, sw }) => [sel('target', 'Play to', [[7, '7'], [11, '11']]), sw('ntDouble', 'No trump scores double'), sw('loseAtMinus', 'Lose at minus the target', 'e.g. a team that falls to −7 loses.')],
    draft: () => ({ bidder: null, bid: null, type: null, books: null }),
    entry: (st, d) => ({ bidder: d.bidder, bid: d.bid, type: d.type, books: d.books }),
    form: (st, r, H) => {
      const d = H.draft(st);
      const need = d.bid ? 6 + d.bid : null;
      return `<h2>The hand</h2>
        <p class="rs-label">Won the bid</p>${sideChips(H, st, 'bidder', d.bidder, 'Bidder')}
        <p class="rs-label">Bid (books over six)</p>${H.chips('bid', d.bid, [3, 4, 5, 6, 7].map((n) => [n, n]), 'Bid')}
        ${H.chips('type', d.type, [['up', 'Uptown'], ['down', 'Downtown'], ['nt', 'No trump']], 'Type')}
        <p class="rs-label">Books won by the bidding team <span class="muted small">(the kitty counts as one)</span></p>
        <div class="rs-row1">${H.stepper('books', d.books, 0, 13, 'Books won')}<span class="rs-hint">${need ? `Needs ${need}` : ''}</span></div>
        <button type="button" class="btn rs-gap" data-act="save">Save hand</button>`;
    },
    label: (st, row, i, H) => { const e = st.entries[i]; return `${esc(H.sideName(st, e.bidder).split(' & ')[0])} ${e.bid} ${{ up: 'uptown', down: 'downtown', nt: 'no trump' }[e.type]} ${row.made ? '✓' : '<span class="rs-warn">set</span>'}`; }
  };

  /* ======================= Whist ======================= */
  EXT.whist = {
    conf: { min: 4, max: 4, def: 4, teams: true, names: 'players' },
    countNote: seatNote,
    setup: (st, o, { sel, sw }) => [sel('game', 'Game is', [[5, '5 points (English)'], [7, '7 points (American)'], [10, '10 points (Long Whist)']]), sw('honours', 'Count honours', 'All four trump honours = 4, three of them = 2. Not counted in American Whist.')],
    info: (st, r, H) => `<p class="rs-info">Rubber: best of three games. This game: ${H.sides(st).map((x) => `${esc(H.sideName(st, x))} <strong>${r.info.points[x]}</strong> / ${H.optsOf(st).game}`).join(' · ')}. <span class="muted small">The big numbers are games won.</span></p>`,
    draft: () => ({ tricksA: null, honours: '' }),
    entry: (st, d) => ({ tricksA: d.tricksA, honours: d.honours }),
    form: (st, r, H) => {
      const d = H.draft(st);
      const o = H.optsOf(st);
      const s = H.sides(st);
      return `<h2>The hand</h2>
        <p class="rs-label">Tricks won by ${esc(H.sideName(st, 'A'))}</p>
        <div class="rs-row1">${H.stepper('tricksA', d.tricksA, 0, 13, 'Tricks')}<span class="rs-hint">${d.tricksA != null ? `${esc(H.sideName(st, 'B'))} won ${13 - d.tricksA}` : ''}</span></div>
        ${o.honours ? `<p class="rs-label">Honours <span class="muted small">(A K Q J of trumps, as dealt)</span></p>${H.chips('honours', d.honours, [['', 'None']].concat(...s.map((x) => [[x + ':4', H.sideName(st, x) + ' all 4'], [x + ':2', H.sideName(st, x) + ' 3 of 4']])), 'Honours')}` : ''}
        <button type="button" class="btn rs-gap" data-act="save">Save hand</button>`;
    },
    label: (st, row, i) => { const e = st.entries[i]; return `${e.tricksA}–${13 - e.tricksA}${row.notes && row.notes.length ? ` <span class="muted small">${esc(row.notes.join(', '))}</span>` : ''}`; }
  };

  /* ======================= Skat ======================= */
  const SKAT_GAMES = [['D', '♦ 9'], ['H', '♥ 10'], ['S', '♠ 11'], ['C', '♣ 12'], ['G', 'Grand 24'], ['null', 'Null 23'], ['nullHand', 'Null hand 35'], ['nullOuvert', 'Null ouvert 46'], ['nullHandOuvert', 'Null hand ouvert 59']];
  EXT.skat = {
    conf: { min: 3, max: 4, def: 3, teams: false },
    countNote: 'With four, the dealer sits out each hand.',
    setup: (st, o, { sel }) => [sel('rounds', 'Number of hands', [[0, 'No limit'], [9, '9'], [12, '12'], [18, '18'], [24, '24'], [36, '36']])],
    info: (st, r, H) => { const o = H.optsOf(st); return o.rounds ? `<p class="rs-info">Hand ${Math.min(st.entries.length + 1, o.rounds)} of ${o.rounds}</p>` : ''; },
    draft: () => ({ declarer: null, game: null, matadors: 1, mWith: true, hand: false, schneider: false, schneiderAnn: false, schwarz: false, schwarzAnn: false, ouvert: false, bidIdx: 0, won: null }),
    entry: (st, d, H) => ({ declarer: d.declarer, game: d.game, matadors: d.matadors, hand: !!d.hand, schneider: !!d.schneider, schneiderAnn: !!d.schneiderAnn, schwarz: !!d.schwarz, schwarzAnn: !!d.schwarzAnn, ouvert: !!d.ouvert, bid: H.L.skat.BIDS[d.bidIdx], won: d.won === 'won' ? true : d.won === 'lost' ? false : null }),
    form: (st, r, H) => {
      const d = H.draft(st);
      const S = H.L.skat;
      const isNull = d.game && !S.BASE[d.game];
      const sw = (k, label) => `<label class="rs-blind"><input type="checkbox" data-check="${k}" ${d[k] ? 'checked' : ''}> ${label}</label>`;
      let value = '';
      if (d.game) {
        const e = EXT.skat.entry(st, d, H);
        const v = S.value(Object.assign({}, e, { won: true }));
        value = `Game value <strong>${v.value}</strong>${v.overbid ? ` — <span class="rs-warn">overbid (bid ${e.bid}): counts as lost</span>` : ''}${!isNull ? ` <span class="muted small">= ${S.BASE[d.game]} × ${S.multiplier(e)}</span>` : ''}`;
      }
      return `<h2>The game</h2>
        <p class="rs-label">Declarer</p>${playerChips(H, st, 'declarer', d.declarer, 'Declarer')}
        <p class="rs-label">Winning bid</p><div class="rs-row1">
          <div class="rs-step"><button type="button" class="btn btn-secondary" data-step="bidIdx" data-d="-1" data-min="0" data-max="${S.BIDS.length - 1}" ${d.bidIdx <= 0 ? 'disabled' : ''} aria-label="Lower bid">−</button>
          <output>${S.BIDS[d.bidIdx]}</output>
          <button type="button" class="btn btn-secondary" data-step="bidIdx" data-d="1" data-min="0" data-max="${S.BIDS.length - 1}" aria-label="Higher bid">+</button></div></div>
        <p class="rs-label">Game</p>${H.chips('game', d.game, SKAT_GAMES, 'Game')}
        ${d.game && !isNull ? `<p class="rs-label">Matadors</p>
          <div class="rs-row1">${H.chips('mWith', d.mWith, [[true, 'With'], [false, 'Without']], 'With or without')}${H.stepper('matadors', d.matadors, 1, d.game === 'G' ? 4 : 11, 'Matadors')}</div>
          <p class="rs-label">Extras</p><div class="sk-extras">${sw('hand', 'Hand')}${sw('schneider', 'Schneider (90+)')}${sw('schwarz', 'Schwarz (all tricks)')}${d.hand ? sw('schneiderAnn', 'Schneider announced') + sw('schwarzAnn', 'Schwarz announced') + sw('ouvert', 'Ouvert') : ''}</div>` : ''}
        ${value ? `<p class="rs-hint">${value}</p>` : ''}
        <p class="rs-label">Result</p>${H.chips('won', d.won, [['won', 'Declarer won'], ['lost', 'Declarer lost (−2 × value)']], 'Result')}
        <button type="button" class="btn rs-gap" data-act="save">Save game</button>`;
    },
    label: (st, row, i, H) => { const e = st.entries[i]; const g = (SKAT_GAMES.find((x) => x[0] === e.game) || ['', e.game])[1].replace(/ \d+$/, ''); return `${esc(H.pname(st, e.declarer))} ${esc(g)} ${row.value}${row.lost ? ' <span class="rs-warn">lost</span>' : ' ✓'}${row.overbid ? ' <span class="muted small">overbid</span>' : ''}`; }
  };

  /* ======================= 1000 ======================= */
  EXT.thousand = {
    conf: { min: 3, max: 4, def: 3, teams: false },
    countNote: 'With four, the dealer sits out each hand.',
    setup: (st, o, { sw }) => [sw('zeroPenalty', 'Three zero hands cost 120')],
    draft: (st) => ({ declarer: null, bid: 100, points: zero(ids(st), ''), sitOut: null }),
    entry: (st, d, H) => ({ declarer: d.declarer, bid: d.bid, sitOut: st.players.length === 4 ? d.sitOut : null, points: Object.fromEntries(ids(st).map((p) => [p, d.points[p] === '' ? (p === d.sitOut ? 0 : NaN) : Number(d.points[p])])) }),
    form: (st, r, H) => {
      const d = H.draft(st);
      const T = H.L.thousand;
      return `<h2>The hand</h2>
        ${st.players.length === 4 ? `<p class="rs-label">Sitting out (dealer)</p>${playerChips(H, st, 'sitOut', d.sitOut, 'Sitting out')}` : ''}
        <p class="rs-label">Won the bidding</p>${playerChips(H, st, 'declarer', d.declarer, 'Declarer')}
        <p class="rs-label">Final bid</p><div class="rs-row1">${H.stepper('bid', d.bid, 100, 400, 'Bid', '–', 5)}</div>
        <p class="rs-label">Card points + marriages <span class="muted small">(cards total 120)</span></p>
        <ul class="cr-players">${st.players.filter((p) => p.id !== d.sitOut).map((p) => `<li class="cr-player"><div class="cr-phead"><strong>${esc(p.name)}</strong>${H.numInput('points.' + p.id, d.points[p.id], p.name + ' points')}</div>
          <div class="rs-quick">${T.MARRIAGES.map(([s, v]) => `<button type="button" class="btn btn-ghost" data-addto="points.${p.id}" data-amt="${v}">${s} +${v}</button>`).join('')}</div></li>`).join('')}</ul>
        <p class="muted small">The declarer scores the bid if they reach it, otherwise loses it. Opponents score their points rounded to 5.</p>
        <button type="button" class="btn" data-act="save">Save hand</button>`;
    },
    label: (st, row, i, H) => { const e = st.entries[i]; return `${esc(H.pname(st, e.declarer))} bid ${e.bid} ${row.made ? '✓' : '<span class="rs-warn">failed</span>'}${row.notes && row.notes.length ? ` <span class="muted small">${esc(row.notes.join(', '))}</span>` : ''}`; }
  };

  /* ======================= Sixty-Six / Schnapsen ======================= */
  EXT.sixtysix = {
    conf: { min: 2, max: 2, def: 2, teams: false },
    setup: (st, o, { sel }) => [sel('target', 'Play to', [[7, '7 game points'], [11, '11 game points']])],
    draft: () => ({ winner: null, pts: null }),
    entry: (st, d) => ({ winner: d.winner, pts: d.pts }),
    form: (st, r, H) => {
      const d = H.draft(st);
      return `<h2>The deal</h2>
        <p class="rs-label">Won the deal</p>${playerChips(H, st, 'winner', d.winner, 'Winner')}
        <p class="rs-label">The loser had…</p>${H.chips('pts', d.pts, [[1, '33 or more card points (1)'], [2, 'Under 33 — schneider (2)'], [3, 'No tricks — schwarz (3)']], 'Game points')}
        <p class="muted small">A false claim of 66, or failing after closing the stock, gives the opponent the points: choose the opponent as the winner.</p>
        <button type="button" class="btn rs-gap" data-act="save">Save deal</button>`;
    },
    label: (st, row, i, H) => { const e = st.entries[i]; return `${esc(H.pname(st, e.winner))} +${e.pts}`; }
  };

  /* ======================= French Tarot ======================= */
  EXT.tarot = {
    conf: { min: 3, max: 5, def: 4, teams: false },
    countNote: 'Five players: the taker calls a King to choose a secret partner.',
    setup: (st, o, { sel }) => [sel('rounds', 'Number of deals', [[0, 'No limit'], [8, '8'], [12, '12'], [16, '16'], [20, '20']])],
    info: (st, r, H) => { const o = H.optsOf(st); return `<p class="rs-info">Zero-sum: the taker wins (or loses) from each defender.${o.rounds ? ` Deal ${Math.min(st.entries.length + 1, o.rounds)} of ${o.rounds}.` : ''}</p>`; },
    draft: () => ({ taker: null, partner: null, contract: null, oudlers: null, points: '', petit: 'none', handful: '', slam: '' }),
    entry: (st, d) => ({ taker: d.taker, partner: st.players.length === 5 ? d.partner : null, contract: d.contract, oudlers: d.oudlers, points: d.points === '' ? NaN : Number(d.points), petit: d.petit, handful: d.handful || null, slam: d.slam || null }),
    form: (st, r, H) => {
      const d = H.draft(st);
      const T = H.L.tarot;
      let hint = '';
      if (d.oudlers != null) {
        const need = T.NEED[d.oudlers];
        hint = `Needs <strong>${need}</strong> with ${d.oudlers} oudler${d.oudlers === 1 ? '' : 's'}`;
        if (d.points !== '' && d.contract) { const h = T.handValue(EXT.tarot.entry(st, d)); hint += ` · ${h.made ? 'made' : 'failed'} by ${Math.abs(Number(d.points) - need)} → <strong>${H.fmtDelta(h.v)}</strong> per defender`; }
      }
      return `<h2>The deal</h2>
        <p class="rs-label">Taker</p>${playerChips(H, st, 'taker', d.taker, 'Taker')}
        ${st.players.length === 5 ? `<p class="rs-label">Called partner <span class="muted small">(choose the taker if they called themselves)</span></p>${playerChips(H, st, 'partner', d.partner, 'Partner')}` : ''}
        <p class="rs-label">Contract</p>${H.chips('contract', d.contract, [['petite', 'Petite ×1'], ['garde', 'Garde ×2'], ['sans', 'Garde sans ×4'], ['contre', 'Garde contre ×6']], 'Contract')}
        <p class="rs-label">Oudlers won by the taker’s side <span class="muted small">(Petit, 21, Excuse)</span></p>${H.chips('oudlers', d.oudlers, [0, 1, 2, 3].map((n) => [n, n]), 'Oudlers')}
        <p class="rs-label">Card points won by the taker’s side <span class="muted small">(0–91, halves allowed)</span></p>
        <input type="number" inputmode="decimal" step="0.5" min="0" max="91" class="rs-num" data-path="points" data-half="1" value="${esc(String(d.points))}" aria-label="Card points">
        ${hint ? `<p class="rs-hint">${hint}</p>` : ''}
        <p class="rs-label">Petit au bout <span class="muted small">(trump 1 wins the last trick: 10 × multiplier)</span></p>${H.chips('petit', d.petit, [['none', 'No'], ['taker', 'Taker’s side'], ['defence', 'Defence']], 'Petit au bout')}
        <p class="rs-label">Handful <span class="muted small">(goes to the side that wins the deal)</span></p>${H.chips('handful', d.handful, [['', 'None'], ['single', 'Single 20'], ['double', 'Double 30'], ['triple', 'Triple 40']], 'Handful')}
        <p class="rs-label">Slam</p>${H.chips('slam', d.slam, [['', 'None'], ['announced', 'Announced & made +400'], ['made', 'Made unannounced +200'], ['failed', 'Announced, failed −200']], 'Slam')}
        <button type="button" class="btn rs-gap" data-act="save">Save deal</button>`;
    },
    label: (st, row, i, H) => { const e = st.entries[i]; return `${esc(H.pname(st, e.taker))} ${{ petite: 'Petite', garde: 'Garde', sans: 'G. sans', contre: 'G. contre' }[e.contract]} ${row.made ? '✓' : '<span class="rs-warn">✗</span>'}`; }
  };

  CGR.roundSheetExt = EXT;
})();
