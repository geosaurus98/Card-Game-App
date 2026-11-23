/* Drinking card games played with a virtual deck on one phone:
 * Kings, Ride the Bus (+ Bus Driver pyramid), Higher or Lower, Pyramid, Horse Race,
 * Beat the Dealer, Up and Down the River, Bust! (21 / 7.5).
 * Logic: drink-logic.js. Helpers: drink-common.js, party-common.js. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const L = CGR.drinkLogic;
  const DK = CGR.drink;
  const P = CGR.party;
  const DATA = CGR.drinkData;
  const esc = CGR.esc;
  const card = DK.card;
  const sips = DK.sips;
  const focus = (root) => P.focusHeading(root);
  const bar = (inner) => `<div class="action-bar"><div class="action-bar-inner">${inner}</div></div>`;
  const pickPlayer = (names, attr, label, cur) => `<div class="rs-chips" role="group" aria-label="${esc(label)}">${names.map((n, i) => `<button type="button" class="rs-chip${cur === i ? ' on' : ''}" data-${attr}="${i}">${esc(n)}</button>`).join('')}</div>`;

  /* =====================================================================
   * Kings / Ring of Fire
   * =================================================================== */
  (function () {
    const KEY = 'dk-kings';
    let g = null;
    const ruleSet = (s) => Object.assign({}, DATA.kings[s.rules || 'kings'], s.custom || {});
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Kings', min: 2, max: 12, def: 4,
        intro: 'Draw a card, do what it says. Every rank has a rule; the 4th King finishes the cup.',
        extra: (s) => {
          const set = ruleSet(s);
          return `<label class="field"><span>Rules</span><select id="kg-rules">${Object.keys(DATA.kings).map((k) => `<option value="${k}" ${(s.rules || 'kings') === k ? 'selected' : ''}>${esc(DATA.kings[k].name)}</option>`).join('')}</select></label>
            <label class="switch-row field"><input type="checkbox" role="switch" id="kg-cup" ${s.cup !== false ? 'checked' : ''}><span><strong>King’s Cup</strong><br><span class="muted small">The 4th King drinks the cup and ends the game.</span></span></label>
            <details class="field kg-edit"><summary>Edit the rules for each card</summary>${L.RANKS.map((r) => `<label class="kg-rule"><span class="kg-rank">${r}</span>
              <input type="text" data-kt="${r}" value="${esc(set[r][0])}" maxlength="24" aria-label="${r} title">
              <input type="text" data-kx="${r}" value="${esc(set[r][1])}" maxlength="160" aria-label="${r} rule"></label>`).join('')}
              <button type="button" class="btn btn-ghost" id="kg-reset">Reset to the standard rules</button></details>`;
        },
        readExtra: (form, s) => {
          const rs = form.querySelector('#kg-rules'); if (rs) { if (s.rules !== rs.value) s.custom = {}; s.rules = rs.value; }
          s.cup = form.querySelector('#kg-cup').checked;
          const base = DATA.kings[s.rules || 'kings'];
          const custom = {};
          L.RANKS.forEach((r) => {
            const ti = form.querySelector(`[data-kt="${r}"]`), tx = form.querySelector(`[data-kx="${r}"]`);
            if (!ti) return;
            const t = [ti.value.trim() || base[r][0], tx.value.trim() || base[r][1]];
            if (t[0] !== base[r][0] || t[1] !== base[r][1]) custom[r] = t;
          });
          s.custom = custom;
        },
        onStart: (s, names) => {
          g = { names, deck: L.newDeck(), drawn: [], turn: 0, kings: 0, rules: [], mates: [], master: {}, cur: null, over: false, s };
          render(root);
        }
      });
      const rs = root.querySelector('#kg-rules');
      if (rs) rs.addEventListener('change', () => { const s = CGR.store.get(KEY, {}); s.rules = rs.value; s.custom = {}; CGR.store.set(KEY, s); setup(root); });
      const reset = root.querySelector('#kg-reset');
      if (reset) reset.addEventListener('click', () => { const s = CGR.store.get(KEY, {}); s.custom = {}; CGR.store.set(KEY, s); setup(root); });
    }
    function render(root) {
      const set = ruleSet(g.s);
      const c = g.cur;
      const r = c ? L.rankOf(c) : null;
      const who = g.names[g.turn % g.names.length];
      const cupOn = g.s.cup !== false;
      let body;
      if (!c) body = `<div class="dk-stage"><p class="dk-up"><span class="imp-who">${esc(who)}</span>, draw the first card.</p>${card(null, { back: true })}</div>`;
      else {
        const rule = set[r];
        const fourth = r === 'K' && g.kings === 4 && cupOn;
        body = `<div class="dk-stage"><p class="dk-up"><span class="imp-who">${esc(g.names[(g.turn - 1 + g.names.length) % g.names.length])}</span> drew</p>
          ${card(c, { cls: 'big' })}
          <h2 class="dk-rule-title">${esc(fourth ? 'The 4th King!' : rule[0])}</h2>
          <p class="dk-rule-text">${esc(fourth ? 'Drink the King’s Cup! 🍺 Game over.' : rule[1])}</p>
          ${r === '8' && !fourth ? `<p class="rs-label">Pick a mate</p>${pickPlayer(g.names, 'kgmate', 'Mate')}` : ''}
          ${r === 'J' && !fourth ? '<button type="button" class="btn btn-secondary" id="kg-addrule">✍️ Write the new rule</button>' : ''}</div>`;
      }
      const left = g.deck.length;
      const side = `<div class="kg-side">
        <p><strong>${cupOn ? `Kings: ${'👑'.repeat(g.kings)}${'·'.repeat(4 - g.kings)}` : `Kings drawn: ${g.kings}`}</strong> · ${left} cards left</p>
        ${Object.keys(g.master).length ? `<p>${Object.keys(g.master).map((k) => `${esc(k)}: <strong>${esc(g.master[k])}</strong>`).join(' · ')}</p>` : ''}
        ${g.mates.length ? `<p>Mates: ${g.mates.map((m) => esc(m)).join(' · ')}</p>` : ''}
        ${g.rules.length ? `<p class="rs-label">Rules in play</p><ol class="kg-rules">${g.rules.map((x, i) => `<li>${esc(x)} <button type="button" class="btn btn-ghost" data-kgdel="${i}" aria-label="Remove rule">✕</button></li>`).join('')}</ol>` : ''}</div>`;
      root.innerHTML = `<div class="page-head"><h1 tabindex="-1">Kings</h1></div>${body}${side}
        ${bar(g.over ? '<button type="button" class="btn btn-secondary" id="kg-menu">Back to menu</button><button type="button" class="btn" id="kg-again">Play again</button>'
          : `<button type="button" class="btn dk-draw" id="kg-draw">Draw a card${c ? ` — ${esc(who)}` : ''}</button>`)}`;
      wire(root);
    }
    function wire(root) {
      const draw = root.querySelector('#kg-draw');
      if (draw) draw.addEventListener('click', () => {
        const c = g.deck.shift();
        g.cur = c; g.drawn.push(c); g.turn++;
        const r = L.rankOf(c);
        const set = ruleSet(g.s);
        if (r === 'K') g.kings++;
        if (r === 'Q' && /question/i.test(set.Q[0])) g.master['Question master'] = g.names[(g.turn - 1) % g.names.length];
        if (r === '5' && /thumb/i.test(set['5'][0])) g.master['Thumb master'] = g.names[(g.turn - 1) % g.names.length];
        if ((r === 'K' && g.kings === 4 && g.s.cup !== false) || !g.deck.length) g.over = true;
        P.vibrate(30);
        render(root);
      });
      root.querySelectorAll('[data-kgmate]').forEach((b) => b.addEventListener('click', () => {
        const me = g.names[(g.turn - 1) % g.names.length], mate = g.names[Number(b.dataset.kgmate)];
        if (me !== mate) { g.mates = g.mates.filter((m) => !m.startsWith(me + ' ')); g.mates.push(`${me} ↔ ${mate}`); }
        render(root);
      }));
      const add = root.querySelector('#kg-addrule');
      if (add) add.addEventListener('click', async () => {
        const res = await CGR.ui.dialog({ title: 'New rule', input: { label: 'The rule (e.g. “No first names”)', type: 'text', maxlength: 80 } });
        if (res.action === 'ok' && res.value.trim()) { g.rules.push(res.value.trim()); render(root); }
      });
      root.querySelectorAll('[data-kgdel]').forEach((b) => b.addEventListener('click', () => { g.rules.splice(Number(b.dataset.kgdel), 1); render(root); }));
      const again = root.querySelector('#kg-again');
      if (again) again.addEventListener('click', () => { g = Object.assign(g, { deck: L.newDeck(), drawn: [], turn: 0, kings: 0, rules: [], mates: [], master: {}, cur: null, over: false }); render(root); });
      const menu = root.querySelector('#kg-menu');
      if (menu) menu.addEventListener('click', () => { g = null; location.hash = '#/party'; });
      focus(root);
    }
    CGR.views.kings = DK.view('Kings', 'kg-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!(g && !g.over && g.drawn.length), reset: () => { g = null; } });
  })();

  /* =====================================================================
   * Ride the Bus (+ Bus Driver pyramid)
   * =================================================================== */
  (function () {
    const KEY = 'dk-bus';
    let g = null;
    const ANS = [
      [['red', '🟥 Red'], ['black', '⬛ Black']],
      [['higher', '⬆ Higher'], ['lower', '⬇ Lower']],
      [['inside', '↔ Inside'], ['outside', '⟷ Outside']],
      [['C', '♣'], ['D', '♦'], ['H', '♥'], ['S', '♠']]
    ];
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Ride the Bus', min: 2, max: 8, def: 4,
        intro: 'Everyone answers four questions about their cards. Wrong answers drink. Then the unlucky one rides the bus until they get all four right in a row.',
        extra: (s) => `<label class="switch-row field"><input type="checkbox" role="switch" id="rb-pyr" ${s.pyramid !== false ? 'checked' : ''}><span><strong>Pyramid round (Bus Driver)</strong><br><span class="muted small">Between the questions and the bus: flip a 10-card pyramid and give out sips for matching cards. Whoever has the most cards left rides the bus.</span></span></label>
          <label class="switch-row field"><input type="checkbox" role="switch" id="rb-give" ${s.give !== false ? 'checked' : ''}><span><strong>Right answers give sips</strong><br><span class="muted small">Question 1 = 1 sip, 2 = 2, 3 = 3, 4 = 4 — wrong drinks it, right hands it out.</span></span></label>`,
        readExtra: (form, s) => { s.pyramid = form.querySelector('#rb-pyr').checked; s.give = form.querySelector('#rb-give').checked; },
        onStart: (s, names) => {
          g = { s, names, deck: L.newDeck(), phase: 'q', p: 0, step: 0, hands: names.map(() => []), wrong: names.map(() => 0), last: null, pyr: null, rider: null, bus: null };
          render(root);
        }
      });
    }
    const draw = () => { if (!g.deck.length) g.deck = L.newDeck(); return g.deck.shift(); };
    function render(root) {
      let html = '';
      if (g.phase === 'q') {
        const name = g.names[g.p];
        const hand = g.hands[g.p];
        html = `<div class="page-head"><p class="muted">Round 1 · question ${g.step + 1} of 4</p><h1 tabindex="-1"><span class="imp-who">${esc(name)}</span>: ${esc(L.BUS_STEPS[g.step])}</h1></div>
          <div class="dk-hand">${hand.map((c) => card(c)).join('')}${card(null, { back: true })}</div>
          ${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
          <div class="dk-answers">${ANS[g.step].map(([v, t]) => `<button type="button" class="btn dk-ans" data-rb="${v}">${esc(t)}</button>`).join('')}</div>`;
      } else if (g.phase === 'qdone') {
        html = `<div class="page-head"><h1 tabindex="-1">Round 1 done</h1></div>${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
          <ul class="dk-list">${g.names.map((n, i) => `<li><strong>${esc(n)}</strong> <span class="dk-hand sm">${g.hands[i].map((c) => card(c, { small: true })).join('')}</span> <span class="muted small">${g.wrong[i]} wrong</span></li>`).join('')}</ul>
          ${bar(`<button type="button" class="btn" id="rb-next">${g.s.pyramid !== false ? 'On to the pyramid ▶' : 'Who rides the bus? ▶'}</button>`)}`;
      } else if (g.phase === 'pyr') {
        const pr = g.pyr;
        const rows = [4, 3, 2, 1];
        let k = 0;
        const grid = rows.map((n, ri) => { const cells = []; for (let i = 0; i < n; i++) { const idx = k++; cells.push(idx < pr.flipped ? card(pr.cards[idx], { small: true }) : card(null, { back: true, small: true })); } return `<div class="dk-prow"><span class="dk-pval">${ri + 1}</span>${cells.join('')}</div>`; }).reverse().join('');
        html = `<div class="page-head"><h1 tabindex="-1">The pyramid</h1><p class="muted">Each flip: anyone holding that rank gives out sips (the row number) per card, and lays the card down.</p></div>
          <div class="dk-pyr">${grid}</div>${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
          <ul class="dk-list">${g.names.map((n, i) => `<li><strong>${esc(n)}</strong> <span class="dk-hand sm">${g.hands[i].map((c) => card(c, { small: true })).join('')}</span></li>`).join('')}</ul>
          ${bar(pr.flipped < 10 ? '<button type="button" class="btn" id="rb-flip">Flip the next card</button>' : '<button type="button" class="btn" id="rb-next">Who rides the bus? ▶</button>')}`;
      } else if (g.phase === 'rider') {
        html = `<div class="page-head dk-center"><p class="dk-emoji" aria-hidden="true">🚌</p><h1 tabindex="-1"><span class="imp-who">${esc(g.names[g.rider])}</span> rides the bus!</h1>
          <p>${esc(g.riderWhy)}</p><p>Get all four questions right in a row. Any wrong answer: drink and start again.</p></div>
          ${bar('<button type="button" class="btn" id="rb-board">All aboard ▶</button>')}`;
      } else if (g.phase === 'bus') {
        const b = g.bus;
        html = `<div class="page-head"><p class="muted">The bus · attempt ${b.tries} · ${b.drinks} sips so far</p><h1 tabindex="-1"><span class="imp-who">${esc(g.names[g.rider])}</span>: ${esc(L.BUS_STEPS[b.step])}</h1></div>
          <div class="dk-hand">${b.cards.map((c) => card(c)).join('')}${card(null, { back: true })}</div>
          ${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
          <div class="dk-answers">${ANS[b.step].map(([v, t]) => `<button type="button" class="btn dk-ans" data-bus="${v}">${esc(t)}</button>`).join('')}</div>`;
      } else {
        html = `<div class="page-head dk-center"><p class="dk-emoji" aria-hidden="true">🎉</p><h1 tabindex="-1">${esc(g.names[g.rider])} got off the bus!</h1>
          <p>It took ${g.bus.tries} attempt${g.bus.tries === 1 ? '' : 's'} and ${sips(g.bus.drinks)}.</p></div>
          ${bar('<button type="button" class="btn btn-secondary" id="rb-menu">Back to menu</button><button type="button" class="btn" id="rb-again">Play again</button>')}`;
      }
      root.innerHTML = html;
      wire(root);
      focus(root);
    }
    function wire(root) {
      root.querySelectorAll('[data-rb]').forEach((b) => b.addEventListener('click', () => {
        const c = draw();
        const hand = g.hands[g.p];
        const ok = L.busAnswer(g.step, hand, c, b.dataset.rb);
        const n = g.step + 1;
        hand.push(c);
        const name = g.names[g.p];
        if (!ok) g.wrong[g.p]++;
        g.last = { html: `${card(c, { small: true })} ${ok ? `Right! ${esc(name)} ${g.s.give !== false ? 'gives out ' + sips(n) : 'is safe'}.` : `Wrong — ${esc(name)} drinks ${sips(n)}.`}`, kind: ok ? 'good' : 'bad' };
        P.vibrate(ok ? 30 : [80, 40, 80]);
        g.step++;
        if (g.step === 4) { g.step = 0; g.p++; if (g.p >= g.names.length) g.phase = 'qdone'; }
        render(root);
      }));
      const next = root.querySelector('#rb-next');
      if (next) next.addEventListener('click', () => {
        g.last = null;
        if (g.phase === 'qdone' && g.s.pyramid !== false) { g.pyr = { cards: Array.from({ length: 10 }, draw), flipped: 0 }; g.phase = 'pyr'; }
        else {
          // Rider: most cards left (pyramid) or most wrong answers; ties broken at random.
          const score = g.s.pyramid !== false ? g.hands.map((h) => h.length) : g.wrong;
          const top = Math.max.apply(null, score);
          const cands = score.map((v, i) => (v === top ? i : -1)).filter((i) => i >= 0);
          g.rider = cands[Math.floor(Math.random() * cands.length)];
          g.riderWhy = g.s.pyramid !== false ? `Most cards left (${top}).` : `Most wrong answers (${top}).`;
          if (cands.length > 1) g.riderWhy += ' It was a tie — the app picked at random.';
          g.phase = 'rider';
        }
        render(root);
      });
      const flip = root.querySelector('#rb-flip');
      if (flip) flip.addEventListener('click', () => {
        const pr = g.pyr;
        const c = pr.cards[pr.flipped];
        const row = pr.flipped < 4 ? 1 : pr.flipped < 7 ? 2 : pr.flipped < 9 ? 3 : 4;
        pr.flipped++;
        const hits = [];
        g.hands.forEach((h, i) => {
          const m = h.filter((x) => L.rankOf(x) === L.rankOf(c));
          if (m.length) { hits.push(`<strong>${esc(g.names[i])}</strong> gives ${sips(row * m.length)}`); g.hands[i] = h.filter((x) => L.rankOf(x) !== L.rankOf(c)); }
        });
        g.last = { html: `${card(c, { small: true })} Row ${row}: ${hits.length ? hits.join(' · ') : 'nobody has it.'}`, kind: hits.length ? 'good' : '' };
        render(root);
      });
      const board = root.querySelector('#rb-board');
      if (board) board.addEventListener('click', () => { g.bus = { step: 0, cards: [], tries: 1, drinks: 0 }; g.last = null; g.phase = 'bus'; render(root); });
      root.querySelectorAll('[data-bus]').forEach((b) => b.addEventListener('click', () => {
        const bus = g.bus;
        const c = draw();
        const ok = L.busAnswer(bus.step, bus.cards, c, b.dataset.bus);
        if (ok) {
          bus.cards.push(c); bus.step++;
          g.last = { html: `${card(c, { small: true })} Right!`, kind: 'good' };
          if (bus.step === 4) g.phase = 'done';
        } else {
          bus.drinks += bus.step + 1;
          g.last = { html: `${card(c, { small: true })} Wrong — drink ${sips(bus.step + 1)} and start again.`, kind: 'bad' };
          bus.step = 0; bus.cards = []; bus.tries++;
          P.vibrate([80, 40, 80]);
        }
        render(root);
      }));
      const again = root.querySelector('#rb-again');
      if (again) again.addEventListener('click', () => { const s = g.s, names = g.names; g = { s, names, deck: L.newDeck(), phase: 'q', p: 0, step: 0, hands: names.map(() => []), wrong: names.map(() => 0), last: null }; render(root); });
      const menu = root.querySelector('#rb-menu');
      if (menu) menu.addEventListener('click', () => { g = null; location.hash = '#/party'; });
    }
    CGR.views['ride-the-bus'] = DK.view('Ride the Bus', 'rb-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!(g && g.phase !== 'done'), reset: () => { g = null; } });
  })();

  /* =====================================================================
   * Higher or Lower (chain)
   * =================================================================== */
  (function () {
    const KEY = 'dk-hilo';
    let g = null;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Higher or Lower', min: 2, max: 12, def: 4,
        intro: 'Guess if the next card is higher or lower. Keep the streak alive — whoever breaks it drinks a sip for every card in the streak.',
        extra: (s) => `<label class="switch-row field"><input type="checkbox" role="switch" id="hl-eq" ${s.equalSafe ? 'checked' : ''}><span><strong>A tie is safe</strong><br><span class="muted small">Otherwise the same rank counts as wrong.</span></span></label>`,
        readExtra: (form, s) => { s.equalSafe = form.querySelector('#hl-eq').checked; },
        onStart: (s, names) => { const deck = L.newDeck(); g = { s, names, deck, cur: deck.shift(), streak: 0, p: 0, last: null, longest: 0 }; render(root); }
      });
    }
    function render(root) {
      const name = g.names[g.p];
      root.innerHTML = `<div class="page-head"><p class="muted">Streak: <strong>${g.streak}</strong> · best ${g.longest} · ${g.deck.length} cards left</p><h1 tabindex="-1"><span class="imp-who">${esc(name)}</span>, higher or lower?</h1></div>
        <div class="dk-stage">${card(g.cur, { cls: 'big' })}</div>
        ${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
        <div class="dk-answers"><button type="button" class="btn dk-ans" data-hl="higher">⬆ Higher</button><button type="button" class="btn dk-ans" data-hl="lower">⬇ Lower</button></div>
        ${g.streak ? `<div class="btn-row center"><button type="button" class="btn btn-ghost" id="hl-pass">Pass it on (keep the streak) ▶</button></div>` : ''}`;
      root.querySelectorAll('[data-hl]').forEach((b) => b.addEventListener('click', () => {
        if (!g.deck.length) g.deck = L.newDeck().filter((c) => c !== g.cur);
        const next = g.deck.shift();
        const ok = L.higherLower(g.cur, next, b.dataset.hl, g.s.equalSafe);
        if (ok) { g.streak++; g.longest = Math.max(g.longest, g.streak); g.last = { html: `Right! Streak ${g.streak}. Keep going or pass it on.`, kind: 'good' }; }
        else { g.last = { html: `${card(next, { small: true })} Wrong — <strong>${esc(name)}</strong> drinks ${sips(Math.max(1, g.streak))}.`, kind: 'bad' }; g.streak = 0; g.p = (g.p + 1) % g.names.length; P.vibrate([80, 40, 80]); }
        g.cur = next;
        render(root);
      }));
      const pass = root.querySelector('#hl-pass');
      if (pass) pass.addEventListener('click', () => { g.p = (g.p + 1) % g.names.length; g.last = { html: `Over to ${esc(g.names[g.p])} — streak ${g.streak}.`, kind: '' }; render(root); });
      focus(root);
    }
    CGR.views['higher-lower'] = DK.view('Higher or Lower', 'hl-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!g, reset: () => { g = null; } });
  })();

  /* =====================================================================
   * Pyramid (with bluffing)
   * =================================================================== */
  (function () {
    const KEY = 'dk-pyramid';
    const ROWS = [5, 4, 3, 2, 1];
    let g = null;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Pyramid', min: 2, max: 8, def: 4,
        intro: 'Everyone gets four secret cards. Flip the pyramid row by row: claim a match to make someone drink the row’s value. They can drink — or call your bluff.',
        extra: (s) => `<label class="switch-row field"><input type="checkbox" role="switch" id="py-mem" ${s.memory !== false ? 'checked' : ''}><span><strong>Memory mode</strong><br><span class="muted small">Look at your cards only before the first flip — then you have to remember them.</span></span></label>`,
        readExtra: (form, s) => { s.memory = form.querySelector('#py-mem').checked; },
        onStart: (s, names) => {
          const deck = L.newDeck();
          g = { s, names, hands: names.map(() => deck.splice(0, 4)), pyr: deck.splice(0, 15), flipped: 0, claim: null, last: null, peeked: {} };
          render(root);
        }
      });
    }
    function rowOf(idx) { let k = 0; for (let r = 0; r < ROWS.length; r++) { k += ROWS[r]; if (idx < k) return r + 1; } return ROWS.length; }
    function render(root) {
      let k = 0;
      const grid = ROWS.map((n, ri) => { const cells = []; for (let i = 0; i < n; i++) { const idx = k++; cells.push(idx < g.flipped ? card(g.pyr[idx], { small: true, cls: idx === g.flipped - 1 ? 'hot' : '' }) : card(null, { back: true, small: true })); } return `<div class="dk-prow"><span class="dk-pval">${ri + 1}</span>${cells.join('')}</div>`; }).reverse().join('');
      const canPeek = !(g.s.memory !== false && g.flipped > 0);
      const cur = g.flipped ? g.pyr[g.flipped - 1] : null;
      const row = g.flipped ? rowOf(g.flipped - 1) : 0;
      let claimUI = '';
      if (cur && g.claim) {
        const c = g.claim;
        if (c.target == null) claimUI = `<p class="rs-label">${esc(g.names[c.from])} claims a ${esc(L.rankOf(cur))}. Who drinks ${sips(row)}?</p>${pickPlayer(g.names.filter((_, i) => i !== c.from), 'pytgt', 'Target')}`;
        else claimUI = `<p class="rs-label">${esc(g.names[c.target])}: drink ${sips(row)}, or call the bluff? <span class="muted small">(wrong call = drink double)</span></p>
          <div class="btn-row"><button type="button" class="btn btn-secondary" id="py-drink">🍺 Drink</button><button type="button" class="btn" id="py-call">🤨 Call bluff</button></div>`;
      } else if (cur) {
        claimUI = `<p class="rs-label">Got a ${esc(L.rankOf(cur))}? Tap your name to claim it:</p>${pickPlayer(g.names, 'pyclaim', 'Claim')}`;
      }
      root.innerHTML = `<div class="page-head"><h1 tabindex="-1">Pyramid</h1><p class="muted">Row 1 = 1 sip … top = 5 sips.</p></div>
        <div class="dk-pyr">${grid}</div>
        ${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
        <section class="rs-form">${claimUI || '<p>Look at your cards, then flip the first card.</p>'}</section>
        ${canPeek ? `<p class="rs-label">Peek at your cards <span class="muted small">(hold — others look away)</span></p>
          <div class="dk-peeks">${g.names.map((n, i) => `<button type="button" class="dk-peek" data-pypeek="${i}" data-label="${esc(n)}: hold to see">${esc(n)}: hold to see</button>`).join('')}</div>` : '<p class="muted small">Memory mode: no more peeking!</p>'}
        ${bar(g.flipped < 15 ? `<button type="button" class="btn" id="py-flip">${g.flipped ? 'Next card' : 'Flip the first card'}</button>` : '<button type="button" class="btn btn-secondary" id="py-show">Show all hands</button><button type="button" class="btn" id="py-again">Play again</button>')}`;
      // Hold-to-reveal for each player's hand.
      root.querySelectorAll('[data-pypeek]').forEach((el) => DK.peek(el, () => `<span class="dk-hand sm">${g.hands[Number(el.dataset.pypeek)].map((c) => card(c, { small: true })).join('')}</span>`));
      root.querySelectorAll('[data-pyclaim]').forEach((b) => b.addEventListener('click', () => { g.claim = { from: Number(b.dataset.pyclaim), target: null }; render(root); }));
      root.querySelectorAll('[data-pytgt]').forEach((b) => b.addEventListener('click', () => {
        const others = g.names.map((_, i) => i).filter((i) => i !== g.claim.from);
        g.claim.target = others[Number(b.dataset.pytgt)];
        render(root);
      }));
      const drink = root.querySelector('#py-drink');
      if (drink) drink.addEventListener('click', () => { g.last = { html: `<strong>${esc(g.names[g.claim.target])}</strong> drinks ${sips(row)}.`, kind: 'bad' }; g.claim = null; render(root); });
      const call = root.querySelector('#py-call');
      if (call) call.addEventListener('click', () => {
        const c = g.claim;
        const has = g.hands[c.from].some((x) => L.rankOf(x) === L.rankOf(cur));
        g.last = has ? { html: `It was true! ${esc(g.names[c.from])} had a ${esc(L.rankOf(cur))}. <strong>${esc(g.names[c.target])}</strong> drinks ${sips(row * 2)}.`, kind: 'bad' }
          : { html: `Bluff! <strong>${esc(g.names[c.from])}</strong> drinks ${sips(row * 2)}.`, kind: 'good' };
        g.claim = null;
        P.vibrate([60, 40, 60]);
        render(root);
      });
      const flip = root.querySelector('#py-flip');
      if (flip) flip.addEventListener('click', () => { g.flipped++; g.claim = null; g.last = { html: `Row ${rowOf(g.flipped - 1)}: ${card(g.pyr[g.flipped - 1], { small: true })} — worth ${sips(rowOf(g.flipped - 1))}.`, kind: '' }; render(root); });
      const show = root.querySelector('#py-show');
      if (show) show.addEventListener('click', () => { g.last = { html: g.names.map((n, i) => `<strong>${esc(n)}</strong> ${g.hands[i].map((c) => card(c, { small: true })).join('')}`).join('<br>'), kind: '' }; render(root); });
      const again = root.querySelector('#py-again');
      if (again) again.addEventListener('click', () => { const deck = L.newDeck(); g = Object.assign(g, { hands: g.names.map(() => deck.splice(0, 4)), pyr: deck.splice(0, 15), flipped: 0, claim: null, last: null }); render(root); });
      focus(root);
    }
    CGR.views['pyramid-drink'] = DK.view('Pyramid', 'py-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!(g && g.flipped && g.flipped < 15), reset: () => { g = null; } });
  })();

  /* =====================================================================
   * Horse Race
   * =================================================================== */
  (function () {
    const KEY = 'dk-horse';
    let g = null;
    let auto = null;
    const SUITS = L.SUITS;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Horse Race', min: 2, max: 12, def: 4,
        intro: 'The four Aces race. Everyone bets sips on a suit. Winners hand their bet out; everyone else drinks theirs.',
        extra: (s) => `<label class="field"><span>Track length</span><select id="hr-len">${[5, 7, 9].map((n) => `<option value="${n}" ${(s.len || 7) === n ? 'selected' : ''}>${n} cards</option>`).join('')}</select></label>`,
        readExtra: (form, s) => { s.len = Number(form.querySelector('#hr-len').value); },
        onStart: (s, names) => { g = { s, names, phase: 'bets', bets: names.map(() => ({ suit: null, sips: 2 })), race: null }; render(root); }
      });
    }
    function stopAuto() { if (auto) clearInterval(auto); auto = null; }
    function render(root) {
      if (g.phase === 'bets') {
        root.innerHTML = `<div class="page-head"><h1 tabindex="-1">Place your bets</h1><p class="muted">Pick a suit and how many sips you’re betting.</p></div>
          <ul class="cr-players">${g.names.map((n, i) => `<li class="cr-player"><div class="cr-phead"><strong>${esc(n)}</strong>
            <div class="rs-step"><button type="button" class="btn btn-secondary" data-hrs="${i}" data-d="-1" ${g.bets[i].sips <= 1 ? 'disabled' : ''} aria-label="Fewer sips">−</button><output>${g.bets[i].sips}</output><button type="button" class="btn btn-secondary" data-hrs="${i}" data-d="1" ${g.bets[i].sips >= 10 ? 'disabled' : ''} aria-label="More sips">+</button></div></div>
            <div class="rs-chips">${SUITS.map((s) => `<button type="button" class="rs-chip hr-suit ${s === 'H' || s === 'D' ? 'red' : ''}${g.bets[i].suit === s ? ' on' : ''}" data-hrb="${i}:${s}" aria-label="${L.SUIT_NAME[s]}">${L.SUIT_SYM[s]}</button>`).join('')}</div></li>`).join('')}</ul>
          ${bar('<button type="button" class="btn" id="hr-go">And they’re off! 🏇</button>')}`;
        root.querySelectorAll('[data-hrb]').forEach((b) => b.addEventListener('click', () => { const [i, s] = b.dataset.hrb.split(':'); g.bets[i].suit = s; render(root); }));
        root.querySelectorAll('[data-hrs]').forEach((b) => b.addEventListener('click', () => { const bt = g.bets[b.dataset.hrs]; bt.sips = Math.max(1, Math.min(10, bt.sips + Number(b.dataset.d))); render(root); }));
        root.querySelector('#hr-go').addEventListener('click', () => {
          if (g.bets.some((b) => !b.suit)) { CGR.ui.toast('Everyone needs to pick a suit'); return; }
          g.race = L.createRace(Math.random, g.s.len || 7); g.phase = 'race'; render(root);
        });
        focus(root);
        return;
      }
      const r = g.race;
      const lanes = SUITS.map((s) => `<div class="hr-lane"><span class="hr-name ${s === 'H' || s === 'D' ? 'red' : ''}">${L.SUIT_SYM[s]}</span>
        <div class="hr-track" style="--n:${r.length + 2}">${Array.from({ length: r.length + 2 }, (_, i) => `<span class="hr-cell${i === r.length + 1 ? ' finish' : ''}">${r.pos[s] === i ? card('A' + s, { small: true, cls: r.winner === s ? 'hot' : '' }) : ''}</span>`).join('')}</div></div>`).join('');
      const side = `<div class="hr-side"><span class="muted small">Track:</span>${r.side.map((c, i) => (i < r.flipped ? card(c, { small: true }) : card(null, { back: true, small: true }))).join('')}</div>`;
      let result = '';
      if (r.winner) {
        const res = L.settleRace(g.bets.map((b, i) => ({ pid: i, suit: b.suit, sips: b.sips })), r.winner);
        result = DK.callout(`<strong>${L.SUIT_SYM[r.winner]} ${L.SUIT_NAME[r.winner]} win!</strong><br>${res.give.length ? 'Give out: ' + res.give.map((x) => `${esc(g.names[x.pid])} ${sips(x.sips)}`).join(', ') : 'Nobody backed the winner!'}<br>${res.drink.length ? 'Drink: ' + res.drink.map((x) => `${esc(g.names[x.pid])} ${sips(x.sips)}`).join(', ') : ''}`, 'good');
      } else if (r.last) {
        result = `<p class="dk-up">${card(r.last, { small: true })} ${L.SUIT_SYM[L.suitOf(r.last)]} moves up${r.events.filter((e) => e.type === 'back').map((e) => ` · side card ${card(e.card, { small: true })} — ${L.SUIT_SYM[e.suit]} back one!`).join('')}</p>`;
      }
      root.innerHTML = `<div class="page-head"><h1 tabindex="-1">${r.winner ? 'We have a winner!' : 'The race'}</h1></div>
        <div class="hr">${lanes}</div>${side}${result}
        ${bar(r.winner ? '<button type="button" class="btn btn-secondary" id="hr-menu">Back to menu</button><button type="button" class="btn" id="hr-again">Race again</button>'
          : `<button type="button" class="btn btn-secondary" id="hr-auto">${auto ? '⏸ Pause' : '▶ Auto'}</button><button type="button" class="btn" id="hr-step">Next card</button>`)}`;
      const step = () => { L.raceStep(r); if (r.winner) { stopAuto(); P.vibrate([100, 50, 100]); } render(root); };
      const st = root.querySelector('#hr-step'); if (st) st.addEventListener('click', step);
      const au = root.querySelector('#hr-auto'); if (au) au.addEventListener('click', () => { if (auto) stopAuto(); else auto = setInterval(step, 800); render(root); });
      const ag = root.querySelector('#hr-again'); if (ag) ag.addEventListener('click', () => { g.phase = 'bets'; g.race = null; render(root); });
      const mn = root.querySelector('#hr-menu'); if (mn) mn.addEventListener('click', () => { g = null; location.hash = '#/party'; });
    }
    CGR.views['horse-race'] = DK.view('Horse Race', 'hr-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!(g && g.phase === 'race' && !g.race.winner), reset: () => { stopAuto(); g = null; }, unmount: stopAuto });
  })();

  /* =====================================================================
   * Beat the Dealer
   * =================================================================== */
  (function () {
    const KEY = 'dk-dealer';
    let g = null;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Beat the Dealer', min: 3, max: 10, def: 4,
        intro: 'Guess the dealer’s next card in two tries. Get it and the dealer drinks; miss and you drink the difference. Three misses in a row and the dealer gets a break — the next player deals.',
        onStart: (s, names) => { g = { s, names, deck: L.newDeck(), dealer: 0, guesser: 1, misses: 0, g1: null, seen: [], last: null, over: false }; render(root); }
      });
    }
    const nextGuesser = () => { do { g.guesser = (g.guesser + 1) % g.names.length; } while (g.guesser === g.dealer); };
    function render(root) {
      const counts = {}; g.seen.forEach((c) => { const r = L.rankOf(c); counts[r] = (counts[r] || 0) + 1; });
      root.innerHTML = `<div class="page-head"><p class="muted">Dealer: <strong>${esc(g.names[g.dealer])}</strong> · ${g.deck.length} cards left · misses in a row: ${g.misses}/3</p>
          <h1 tabindex="-1">${g.over ? 'Deck finished!' : `<span class="imp-who">${esc(g.names[g.guesser])}</span>, ${g.g1 ? 'second guess' : 'guess the card'}`}</h1>
          ${g.g1 ? `<p class="dk-hint">It’s <strong>${g.hint === 'higher' ? 'higher ⬆' : 'lower ⬇'}</strong> than ${esc(g.g1)}.</p>` : ''}</div>
        ${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
        ${g.over ? '' : `<div class="dk-ranks">${L.RANKS.map((r) => `<button type="button" class="kp-key" data-bd="${r}" ${counts[r] >= 4 ? 'disabled' : ''}>${r}</button>`).join('')}</div>`}
        <p class="rs-label">Cards gone</p><div class="dk-seen">${L.RANKS.map((r) => `<span class="dk-seen-r${counts[r] >= 4 ? ' out' : ''}"><strong>${r}</strong>${'•'.repeat(counts[r] || 0)}</span>`).join('')}</div>
        <p class="muted small">Ace is low (1). Right first time: dealer drinks 5. Second time: dealer drinks 3. Miss: you drink the difference.</p>
        ${g.over ? bar('<button type="button" class="btn btn-secondary" id="bd-menu">Back to menu</button><button type="button" class="btn" id="bd-again">New deck</button>') : ''}`;
      root.querySelectorAll('[data-bd]').forEach((b) => b.addEventListener('click', () => {
        const c = g.deck[0];
        if (!g.g1) {
          const r = L.dealerResult(c, b.dataset.bd, null);
          if (r.hint) { g.g1 = b.dataset.bd; g.hint = r.hint; g.last = null; render(root); return; }
          finish(r, c);
        } else finish(L.dealerResult(c, g.g1, b.dataset.bd), c);
        render(root);
      }));
      const ag = root.querySelector('#bd-again'); if (ag) ag.addEventListener('click', () => { g.deck = L.newDeck(); g.seen = []; g.over = false; g.last = null; render(root); });
      const mn = root.querySelector('#bd-menu'); if (mn) mn.addEventListener('click', () => { g = null; location.hash = '#/party'; });
      focus(root);
    }
    function finish(r, c) {
      g.deck.shift(); g.seen.push(c); g.g1 = null;
      const gname = g.names[g.guesser], dname = g.names[g.dealer];
      if (r.who === 'dealer') { g.last = { html: `${card(c, { small: true })} Got it${r.tries === 2 ? ' on the second try' : ''}! Dealer <strong>${esc(dname)}</strong> drinks ${sips(r.sips)}.`, kind: 'good' }; g.misses = 0; }
      else {
        g.misses++;
        g.last = { html: `${card(c, { small: true })} Missed — <strong>${esc(gname)}</strong> drinks ${sips(r.sips)}.`, kind: 'bad' };
        if (g.misses >= 3) { g.dealer = (g.dealer + 1) % g.names.length; g.misses = 0; g.guesser = g.dealer; g.last.html += ` Three misses: <strong>${esc(g.names[g.dealer])}</strong> is the new dealer.`; }
      }
      nextGuesser();
      if (!g.deck.length) g.over = true;
      P.vibrate(r.who === 'dealer' ? 40 : [80, 40, 80]);
    }
    CGR.views['beat-the-dealer'] = DK.view('Beat the Dealer', 'bd-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!(g && !g.over && g.seen.length), reset: () => { g = null; } });
  })();

  /* =====================================================================
   * Up and Down the River
   * =================================================================== */
  (function () {
    const KEY = 'dk-river';
    let g = null;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Up and Down the River', min: 2, max: 8, def: 4,
        intro: 'Everyone gets four cards. Ten river cards flip: going up, holders of a matching rank drink 1 to 5; coming down, they give 1 to 5.',
        onStart: (s, names) => { const deck = L.newDeck(); g = { s, names, hands: names.map(() => deck.splice(0, 4)), river: deck.splice(0, 10), flipped: 0, last: null }; render(root); }
      });
    }
    function render(root) {
      const cells = g.river.map((c, i) => `<div class="rv-cell"><span class="rv-lab">${i < 5 ? '⬆ ' + (i + 1) : '⬇ ' + (i - 4)}</span>${i < g.flipped ? card(c, { small: true, cls: i === g.flipped - 1 ? 'hot' : '' }) : card(null, { back: true, small: true })}</div>`).join('');
      root.innerHTML = `<div class="page-head"><h1 tabindex="-1">Up and Down the River</h1><p class="muted">⬆ Up: holders drink · ⬇ Down: holders give</p></div>
        <div class="rv">${cells}</div>
        ${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
        <ul class="dk-list">${g.names.map((n, i) => `<li><strong>${esc(n)}</strong> <span class="dk-hand sm">${g.hands[i].map((c) => card(c, { small: true })).join('')}</span></li>`).join('')}</ul>
        ${bar(g.flipped < 10 ? `<button type="button" class="btn" id="rv-flip">Flip card ${g.flipped + 1} of 10</button>` : '<button type="button" class="btn btn-secondary" id="rv-menu">Back to menu</button><button type="button" class="btn" id="rv-again">Deal again</button>')}`;
      const fl = root.querySelector('#rv-flip');
      if (fl) fl.addEventListener('click', () => {
        const i = g.flipped++;
        const up = i < 5, n = up ? i + 1 : i - 4;
        const hands = Object.fromEntries(g.names.map((_, k) => [k, g.hands[k]]));
        const calls = L.riverCall(hands, g.river[i], n, up ? 'up' : 'down');
        g.last = { html: `${card(g.river[i], { small: true })} ${calls.length ? calls.map((x) => `<strong>${esc(g.names[x.pid])}</strong> ${x.action === 'drink' ? 'drinks' : 'gives'} ${sips(x.sips)}`).join(' · ') : 'Nobody has it.'}`, kind: calls.length ? (up ? 'bad' : 'good') : '' };
        render(root);
      });
      const ag = root.querySelector('#rv-again'); if (ag) ag.addEventListener('click', () => { const deck = L.newDeck(); g = Object.assign(g, { hands: g.names.map(() => deck.splice(0, 4)), river: deck.splice(0, 10), flipped: 0, last: null }); render(root); });
      const mn = root.querySelector('#rv-menu'); if (mn) mn.addEventListener('click', () => { g = null; location.hash = '#/party'; });
      focus(root);
    }
    CGR.views.river = DK.view('Up and Down the River', 'rv-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!(g && g.flipped && g.flipped < 10), reset: () => { g = null; } });
  })();

  /* =====================================================================
   * Bust! (21 or 7.5)
   * =================================================================== */
  (function () {
    const KEY = 'dk-bust';
    let g = null;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Bust!', min: 2, max: 8, def: 4,
        intro: 'Take cards to get as close to the target as you dare. Go over and you drink; the closest hand gives out sips — hit it exactly and give out double.',
        extra: (s) => `<fieldset class="field"><legend>Game</legend><div class="segmented two">
          <label><input type="radio" name="bu-mode" value="21" ${(s.mode || '21') === '21' ? 'checked' : ''}><span>21 (Blackjack)</span></label>
          <label><input type="radio" name="bu-mode" value="7.5" ${s.mode === '7.5' ? 'checked' : ''}><span>7½ (Sette e mezzo)</span></label></div></fieldset>`,
        readExtra: (form, s) => { const m = form.querySelector('input[name="bu-mode"]:checked'); s.mode = m ? m.value : '21'; },
        onStart: (s, names) => { g = { s, names, mode: Number(s.mode || 21), round: 0 }; newRound(); render(root); }
      });
    }
    function newRound() {
      const mode = g.mode;
      g.deck = L.newDeck(Math.random, { ranks: L.BUST[mode].ranks });
      g.hands = g.names.map(() => g.deck.splice(0, mode === 21 ? 2 : 1));
      g.p = 0; g.done = false; g.round++; g.result = null;
    }
    const val = (i) => L.handValue(g.hands[i], g.mode);
    function render(root) {
      const t = L.BUST[g.mode].target;
      if (g.done) {
        const values = Object.fromEntries(g.names.map((_, i) => [i, val(i)]));
        const r = L.bustResults(values, g.mode);
        root.innerHTML = `<div class="page-head"><h1 tabindex="-1">Round ${g.round} results</h1></div>
          <ul class="dk-list">${g.names.map((n, i) => `<li><strong>${esc(n)}</strong> <span class="dk-hand sm">${g.hands[i].map((c) => card(c, { small: true })).join('')}</span> <strong>${values[i]}</strong>${r.busted.indexOf(String(i)) !== -1 ? ' <span class="rs-warn">bust</span>' : ''}</li>`).join('')}</ul>
          ${DK.callout(`${r.busted.length ? 'Drink 2: ' + r.busted.map((i) => esc(g.names[i])).join(', ') + '<br>' : ''}${r.perfect.length ? `Exactly ${t}! Give out 4: ` + r.perfect.map((i) => esc(g.names[i])).join(', ') : r.best.length ? 'Closest — give out 2: ' + r.best.map((i) => esc(g.names[i])).join(', ') : 'Everyone bust! Everyone drinks.'}`, 'good')}
          ${bar('<button type="button" class="btn btn-secondary" id="bu-menu">Back to menu</button><button type="button" class="btn" id="bu-next">Next round</button>')}`;
        root.querySelector('#bu-next').addEventListener('click', () => { newRound(); render(root); });
        root.querySelector('#bu-menu').addEventListener('click', () => { g = null; location.hash = '#/party'; });
        focus(root);
        return;
      }
      const v = val(g.p);
      const bust = v > t;
      root.innerHTML = `<div class="page-head"><p class="muted">Round ${g.round} · target ${t} · ${L.BUST[g.mode].deckNote}</p><h1 tabindex="-1"><span class="imp-who">${esc(g.names[g.p])}</span>: ${v}${bust ? ' — bust!' : ''}</h1></div>
        <div class="dk-hand">${g.hands[g.p].map((c) => card(c)).join('')}</div>
        ${bust ? DK.callout(`Over ${t}! ${esc(g.names[g.p])} is out this round.`, 'bad') : ''}
        ${bar(bust || v === t ? '<button type="button" class="btn" id="bu-pass">Next player ▶</button>' : '<button type="button" class="btn btn-secondary" id="bu-stand">Stand</button><button type="button" class="btn" id="bu-hit">Hit me</button>')}`;
      const hit = root.querySelector('#bu-hit'); if (hit) hit.addEventListener('click', () => { g.hands[g.p].push(g.deck.shift()); if (val(g.p) > t) P.vibrate([80, 40, 80]); render(root); });
      const next = () => { g.p++; if (g.p >= g.names.length) g.done = true; render(root); };
      const st = root.querySelector('#bu-stand'); if (st) st.addEventListener('click', next);
      const ps = root.querySelector('#bu-pass'); if (ps) ps.addEventListener('click', next);
      focus(root);
    }
    CGR.views.bust = DK.view('Bust!', 'bu-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!g, reset: () => { g = null; } });
  })();
})();
