/* Drinking games without cards: Truth or Drink, Paranoia, Rule Roulette, Mexico (Mia).
 * Content: drink-data.js. Logic: drink-logic.js. Helpers: drink-common.js. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const L = CGR.drinkLogic;
  const DK = CGR.drink;
  const P = CGR.party;
  const DATA = CGR.drinkData;
  const esc = CGR.esc;
  const sips = DK.sips;
  const bar = (inner) => `<div class="action-bar"><div class="action-bar-inner">${inner}</div></div>`;
  const focus = (root) => P.focusHeading(root);
  /* A shuffled bag of indexes: every item once before repeats. */
  function bag(n) { let order = [], i = 0; return () => { if (i >= order.length) { order = L.shuffle(Array.from({ length: n }, (_, k) => k)); i = 0; } return order[i++]; }; }

  /* =====================================================================
   * Truth or Drink
   * =================================================================== */
  (function () {
    const KEY = 'dk-truth';
    let g = null;
    const PACKS = [['mild', 'Mild'], ['spicy', 'Spicy'], ['couples', 'Couples']];
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Truth or Drink', min: 2, max: 12, def: 4,
        intro: 'Read your question out loud. Answer it honestly — or drink and keep your secrets.',
        extra: (s) => { const p = Array.isArray(s.packs) && s.packs.length ? s.packs : ['mild']; return `<fieldset class="chip-group checks field"><legend>Question packs</legend>${PACKS.map(([k, n]) => `<label><input type="checkbox" name="td-pack" value="${k}" ${p.indexOf(k) !== -1 ? 'checked' : ''}><span>${n}</span></label>`).join('')}</fieldset>`; },
        readExtra: (form, s) => { const v = Array.from(form.querySelectorAll('input[name="td-pack"]:checked')).map((x) => x.value); s.packs = v.length ? v : ['mild']; },
        onStart: (s, names) => {
          const qs = [].concat(...(s.packs && s.packs.length ? s.packs : ['mild']).map((k) => DATA.truth[k]));
          g = { names, qs, next: bag(qs.length), p: 0, q: null, told: names.map(() => 0), drank: names.map(() => 0) };
          g.q = g.qs[g.next()];
          render(root);
        }
      });
    }
    function render(root) {
      root.innerHTML = `<div class="page-head"><p class="muted">Pass the phone</p><h1 tabindex="-1"><span class="imp-who">${esc(g.names[g.p])}</span></h1></div>
        <div class="pg-card"><p class="pg-lead">Truth or drink?</p><p class="pg-prompt">${esc(g.q)}</p></div>
        <div class="dk-answers"><button type="button" class="btn dk-ans" data-td="told">🗣 Told the truth</button><button type="button" class="btn dk-ans btn-secondary" data-td="drank">🍺 Drank</button></div>
        <div class="btn-row center"><button type="button" class="btn btn-ghost" data-td="skip">Different question</button></div>
        <ul class="dk-list">${g.names.map((n, i) => `<li><strong>${esc(n)}</strong> <span class="muted small">🗣 ${g.told[i]} · 🍺 ${g.drank[i]}</span></li>`).join('')}</ul>`;
      root.querySelectorAll('[data-td]').forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.td;
        if (a === 'told') g.told[g.p]++;
        if (a === 'drank') g.drank[g.p]++;
        if (a !== 'skip') g.p = (g.p + 1) % g.names.length;
        g.q = g.qs[g.next()];
        render(root);
      }));
      focus(root);
    }
    CGR.views['truth-or-drink'] = DK.view('Truth or Drink', 'td-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!g, reset: () => { g = null; } });
  })();

  /* =====================================================================
   * Paranoia
   * =================================================================== */
  (function () {
    const KEY = 'dk-paranoia';
    let g = null;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Paranoia', min: 3, max: 12, def: 5,
        intro: 'A secret question about the group goes to one player, who answers out loud with a name. The person named can drink to flip a coin — heads, everyone hears the question.',
        onStart: (s, names) => { g = { names, next: bag(DATA.paranoia.length), p: 0, phase: 'pass', q: null, coin: null }; g.q = DATA.paranoia[g.next()]; render(root); }
      });
    }
    function render(root) {
      const asker = g.names[g.p], answerer = g.names[(g.p + 1) % g.names.length];
      let html;
      if (g.phase === 'pass') {
        html = `<div class="imp-pass"><h1 tabindex="-1">Pass the phone to <span class="imp-who">${esc(answerer)}</span></h1>
          <p>Only ${esc(answerer)} looks. Hold to read the question, then answer out loud with a <strong>name</strong> from the group.</p></div>
          <button type="button" class="dk-peek big" id="pa-peek" data-label="${esc(answerer)}: hold to read">${esc(answerer)}: hold to read</button>
          ${bar('<button type="button" class="btn" id="pa-said">I’ve said a name ▶</button>')}`;
      } else {
        html = `<div class="page-head"><h1 tabindex="-1">Want to know the question?</h1>
          <p>The person named drinks ${sips(1)}, then flips the coin. Heads: the question is read out. Tails: it stays a secret.</p></div>
          ${g.coin ? DK.callout(g.coin === 'Heads' ? `🪙 Heads! The question was:<br><strong>${esc(g.q)}</strong>` : '🪙 Tails — the secret is safe.', g.coin === 'Heads' ? 'good' : '') : ''}
          ${bar(`${g.coin ? '' : '<button type="button" class="btn btn-secondary" id="pa-flip">🪙 Drink & flip</button>'}<button type="button" class="btn" id="pa-next">Next round ▶</button>`)}`;
      }
      root.innerHTML = html;
      const pk = root.querySelector('#pa-peek');
      if (pk) DK.peek(pk, () => `<span class="dk-secret">${esc(g.q)}</span>`);
      const said = root.querySelector('#pa-said'); if (said) said.addEventListener('click', () => { g.phase = 'coin'; g.coin = null; render(root); });
      const fl = root.querySelector('#pa-flip'); if (fl) fl.addEventListener('click', () => { g.coin = Math.random() < 0.5 ? 'Heads' : 'Tails'; P.vibrate(40); render(root); });
      const nx = root.querySelector('#pa-next'); if (nx) nx.addEventListener('click', () => { g.p = (g.p + 1) % g.names.length; g.q = DATA.paranoia[g.next()]; g.phase = 'pass'; g.coin = null; render(root); });
      void asker;
      focus(root);
    }
    CGR.views.paranoia = DK.view('Paranoia', 'pa-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!g, reset: () => { g = null; } });
  })();

  /* =====================================================================
   * Rule Roulette
   * =================================================================== */
  (function () {
    const KEY = 'dk-roulette';
    let g = null;
    let spinTimer = null;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Rule Roulette', min: 2, max: 12, def: 4,
        intro: 'Take turns to spin. You’ll get a challenge to do right now, or a rule that stays in play until someone removes it.',
        onStart: (s, names) => { g = { names, p: 0, last: null, cur: null, rules: [] }; render(root); }
      });
    }
    function render(root, spinning) {
      const it = g.cur != null ? DATA.roulette[g.cur] : null;
      root.innerHTML = `<div class="page-head"><p class="muted">Spinner</p><h1 tabindex="-1"><span class="imp-who">${esc(g.names[g.p])}</span></h1></div>
        <div class="pg-card rr${spinning ? ' spinning' : ''}">${it ? `<p class="pg-lead">${it[2] === 'rule' ? '📜 New rule' : '⚡ Right now'}</p><h2 class="cc-cat" id="rr-title">${esc(it[0])}</h2><p class="pg-prompt rr-text">${esc(it[1])}</p>` : '<p class="pg-prompt">Tap Spin!</p>'}</div>
        ${g.rules.length ? `<p class="rs-label">Rules in play</p><ol class="kg-rules">${g.rules.map((r, i) => `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)} <span class="muted small">(${esc(r.by)})</span> <button type="button" class="btn btn-ghost" data-rrdel="${i}" aria-label="Remove rule">✕</button></li>`).join('')}</ol>` : ''}
        ${bar(`<button type="button" class="btn" id="rr-spin" ${spinning ? 'disabled' : ''}>${it ? 'Next player — spin 🎡' : 'Spin 🎡'}</button>`)}`;
      const sp = root.querySelector('#rr-spin');
      if (sp) sp.addEventListener('click', () => {
        if (it) g.p = (g.p + 1) % g.names.length;
        let n = 0;
        P.unlockAudio();
        spinTimer = setInterval(() => {
          g.cur = Math.floor(Math.random() * DATA.roulette.length);
          render(root, true);
          P.beep(500 + n * 40, 40, 0.06);
          if (++n >= 12) {
            clearInterval(spinTimer); spinTimer = null;
            g.cur = L.spin(DATA.roulette, Math.random, g.last);
            g.last = g.cur;
            const pick = DATA.roulette[g.cur];
            if (pick[2] === 'rule') g.rules.push({ title: pick[0], text: pick[1], by: g.names[g.p] });
            P.vibrate(60);
            render(root);
          }
        }, 70);
      });
      root.querySelectorAll('[data-rrdel]').forEach((b) => b.addEventListener('click', () => { g.rules.splice(Number(b.dataset.rrdel), 1); render(root); }));
      if (!spinning) focus(root);
    }
    CGR.views['rule-roulette'] = DK.view('Rule Roulette', 'rr-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!g, reset: () => { g = null; }, unmount: () => { if (spinTimer) clearInterval(spinTimer); spinTimer = null; } });
  })();

  /* =====================================================================
   * Mexico (Mia)
   * =================================================================== */
  (function () {
    const KEY = 'dk-mexico';
    let g = null;
    function setup(root) {
      DK.setup(root, {
        key: KEY, title: 'Mexico', min: 2, max: 10, def: 4,
        intro: 'Roll two dice in secret and announce a score — the truth or a lie — that beats the last one. The next player believes you and rolls, or calls “Lie!”. Whoever is wrong drinks; Mexico (2-1) doubles it.',
        onStart: (s, names) => { g = { names, p: 0, claim: null, actual: null, phase: 'start', roll: null, last: null, history: [] }; render(root); }
      });
    }
    const die = (n) => `<span class="ds-die big" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i class="${({ 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] })[n].indexOf(i) !== -1 ? 'p' : ''}"></i>`).join('')}</span>`;
    function render(root) {
      const name = g.names[g.p], prev = g.names[(g.p - 1 + g.names.length) % g.names.length];
      let html;
      if (g.phase === 'start') {
        html = `<div class="page-head"><h1 tabindex="-1"><span class="imp-who">${esc(name)}</span>${g.claim ? `, ${esc(prev)} says <strong>${esc(L.mexicoName(g.claim))}</strong>` : ', start a new round'}</h1>
          ${g.history.length ? `<p class="muted small">This round: ${g.history.map((h) => esc(h)).join(' → ')}</p>` : ''}</div>
          ${g.last ? DK.callout(g.last.html, g.last.kind) : ''}
          ${bar(g.claim ? `<button type="button" class="btn btn-danger" id="mx-lie">🤥 Lie!</button><button type="button" class="btn" id="mx-believe">${g.claim === 21 ? 'Believe (drink 2)' : 'Believe & roll'}</button>` : '<button type="button" class="btn" id="mx-roll">🎲 Roll (secretly)</button>')}`;
      } else {
        const options = L.MEXICO_ORDER.filter((v) => !g.claim || L.mexicoRank(v) > L.mexicoRank(g.claim));
        html = `<div class="page-head"><h1 tabindex="-1"><span class="imp-who">${esc(name)}</span>, look and announce</h1>
          <p class="muted">Hide the screen! Hold to see your dice, then pick what you say out loud${g.claim ? ` — it must beat ${esc(L.mexicoName(g.claim))}` : ''}.</p></div>
          <button type="button" class="dk-peek big" id="mx-peek" data-label="Hold to see your dice">Hold to see your dice</button>
          <p class="rs-label">I say…</p><div class="mx-claims">${options.slice().reverse().map((v) => `<button type="button" class="kp-key" data-mx="${v}">${esc(L.mexicoName(v))}</button>`).join('')}</div>`;
      }
      root.innerHTML = html;
      const pk = root.querySelector('#mx-peek');
      if (pk) DK.peek(pk, () => `<span class="mx-dice">${die(g.roll[0])}${die(g.roll[1])}</span><span class="mx-val">${esc(L.mexicoName(L.mexicoValue(g.roll[0], g.roll[1])))}</span>`);
      const roll = () => { g.roll = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]; g.phase = 'claim'; P.vibrate(40); render(root); };
      const rb = root.querySelector('#mx-roll'); if (rb) rb.addEventListener('click', () => { g.last = null; roll(); });
      const bl = root.querySelector('#mx-believe');
      if (bl) bl.addEventListener('click', () => {
        if (g.claim === 21) { g.last = { html: `${esc(name)} believes the Mexico and drinks ${sips(2)}.`, kind: 'bad' }; g.claim = null; g.history = []; render(root); return; }
        g.last = null; roll();
      });
      const lie = root.querySelector('#mx-lie');
      if (lie) lie.addEventListener('click', () => {
        const mult = g.claim === 21 ? 2 : 1;
        const truth = L.mexicoRank(g.actual) >= L.mexicoRank(g.claim);
        g.last = truth
          ? { html: `${esc(prev)} really had ${esc(L.mexicoName(g.actual))}. <strong>${esc(name)}</strong> drinks ${sips(mult)}.`, kind: 'bad' }
          : { html: `Caught! ${esc(prev)} only had ${esc(L.mexicoName(g.actual))}. <strong>${esc(prev)}</strong> drinks ${sips(mult)}.`, kind: 'good' };
        g.claim = null; g.history = [];
        P.vibrate([80, 40, 80]);
        render(root);
      });
      root.querySelectorAll('[data-mx]').forEach((b) => b.addEventListener('click', () => {
        g.claim = Number(b.dataset.mx);
        g.actual = L.mexicoValue(g.roll[0], g.roll[1]);
        g.history.push(`${name}: ${L.mexicoName(g.claim)}`);
        g.roll = null; g.phase = 'start'; g.p = (g.p + 1) % g.names.length;
        g.last = { html: `${esc(name)} says <strong>${esc(L.mexicoName(g.claim))}</strong>. Pass the phone to ${esc(g.names[g.p])}.`, kind: '' };
        render(root);
      }));
      focus(root);
    }
    CGR.views.mexico = DK.view('Mexico', 'mx-root', { mount: (root) => (g ? render(root) : setup(root)), playing: () => !!g, reset: () => { g = null; } });
  })();
})();
