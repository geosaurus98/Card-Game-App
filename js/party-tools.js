/* Finger chooser (#/chooser) and Party toolkit (#/toolkit) — screens.
 * Logic: party-logic.js. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const PL = CGR.partyLogic;
  const P = CGR.party;
  const esc = CGR.esc;
  const COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#ffe119', '#469990', '#9a6324', '#800000'];
  const TEAM_COLORS = ['#e6194b', '#4363d8', '#3cb44b', '#f58231'];

  /* ======================= Finger chooser ======================= */
  CGR.views.chooser = function () {
    let fingers = new Map(); // pointerId -> { x, y, color, el }
    let settleTimer = null;
    let countTimer = null;
    let chosen = false;
    let mode = CGR.store.get('chooser-mode', '1');

    function area() { return document.getElementById('ch-area'); }
    function status(text) { const el = document.getElementById('ch-status'); if (el) el.textContent = text; }

    function clearTimers() {
      clearTimeout(settleTimer); clearInterval(countTimer);
      settleTimer = null; countTimer = null;
      const a = area(); if (a) a.classList.remove('counting');
    }

    function reset() {
      clearTimers();
      chosen = false;
      fingers.clear();
      const a = area();
      if (a) a.querySelectorAll('.ch-dot').forEach((el) => el.remove()); // includes lifted fingers
      status('Everyone put one finger on the screen');
    }

    function choose() {
      clearTimers();
      chosen = true;
      const ids = Array.from(fingers.keys());
      if (mode === '1') {
        const win = PL.chooseOne(ids, Math.random);
        fingers.forEach((f, id) => f.el.classList.add(id === win ? 'winner' : 'loser'));
        status('Chosen! Lift your fingers to go again.');
        CGR.ui.announce('One player chosen');
      } else {
        const teams = PL.splitTeams(ids, Number(mode), Math.random);
        fingers.forEach((f, id) => {
          f.el.style.background = TEAM_COLORS[teams[id]];
          f.el.style.borderColor = TEAM_COLORS[teams[id]];
          f.el.dataset.team = String(teams[id] + 1);
          f.el.classList.add('teamed');
        });
        status(`${mode} teams — match colours! Lift your fingers to go again.`);
        CGR.ui.announce(`${mode} teams chosen`);
      }
      P.vibrate(150);
      P.beep(880, 120, 0.12);
    }

    function changed() {
      if (chosen) return;
      clearTimers();
      const need = mode === '1' ? 2 : Number(mode);
      if (fingers.size < need) { status(fingers.size ? `Waiting for more fingers… (need ${need})` : 'Everyone put one finger on the screen'); return; }
      status('Hold still…');
      settleTimer = setTimeout(() => {
        let n = 3;
        status(String(n));
        area().classList.add('counting');
        countTimer = setInterval(() => {
          n -= 1;
          if (n > 0) { status(String(n)); P.beep(600, 60, 0.08); } else choose();
        }, 700);
      }, 900);
    }

    function place(e) {
      const a = area();
      const r = a.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    return {
      title: 'Finger chooser',
      back: '#/party',
      html: `<div class="page-head ch-head"><h1 tabindex="-1">Finger chooser</h1>
          <div class="segmented ch-modes" role="radiogroup" aria-label="Mode">
            ${[['1', 'Pick one'], ['2', '2 teams'], ['3', '3 teams'], ['4', '4 teams']].map(([v, l]) => `<label><input type="radio" name="ch-mode" value="${v}" ${mode === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
          </div></div>
        <div id="ch-area" class="ch-area" aria-describedby="ch-status">
          <p id="ch-status" class="ch-status" aria-live="polite">Everyone put one finger on the screen</p>
        </div>`,
      onMount(view) {
        P.unlockAudio();
        const a = view.querySelector('#ch-area');
        view.querySelectorAll('input[name="ch-mode"]').forEach((r) => r.addEventListener('change', () => {
          mode = r.value; CGR.store.set('chooser-mode', mode); reset();
        }));
        a.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (chosen) return;
          P.unlockAudio();
          try { a.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          const p = place(e);
          const el = document.createElement('div');
          el.className = 'ch-dot';
          const color = COLORS[fingers.size % COLORS.length];
          el.style.background = color;
          el.style.borderColor = color;
          el.style.left = p.x + 'px';
          el.style.top = p.y + 'px';
          a.appendChild(el);
          fingers.set(e.pointerId, { el });
          changed();
        });
        a.addEventListener('pointermove', (e) => {
          const f = fingers.get(e.pointerId);
          if (!f) return;
          const p = place(e);
          f.el.style.left = p.x + 'px';
          f.el.style.top = p.y + 'px';
        });
        const up = (e) => {
          const f = fingers.get(e.pointerId);
          if (!f) return;
          if (chosen) {
            fingers.delete(e.pointerId);
            f.el.classList.add('lifted');
            if (!fingers.size) setTimeout(() => { if (!fingers.size) reset(); }, 1200);
            return;
          }
          f.el.remove();
          fingers.delete(e.pointerId);
          changed();
        };
        ['pointerup', 'pointercancel'].forEach((ev) => a.addEventListener(ev, up));
        a.addEventListener('contextmenu', (e) => e.preventDefault());
      },
      onUnmount() { clearTimers(); }
    };
  };

  /* ======================= Party toolkit ======================= */
  CGR.views.toolkit = function () {
    const KEY = 'toolkit';
    const st = Object.assign({ diceCount: 2, sides: 6, history: [], heads: 0, tails: 0, board: [{ name: 'Team A', score: 0 }, { name: 'Team B', score: 0 }] }, CGR.store.get(KEY, {}));
    const save = () => CGR.store.set(KEY, st);
    const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    function diceHTML(values) {
      return values.map((v) => `<span class="tk-die" aria-label="${v}">${st.sides === 6 ? `<span class="tk-face" aria-hidden="true">${FACES[v]}</span>` : ''}<span class="tk-num">${v}</span></span>`).join('');
    }
    function boardHTML() {
      return st.board.map((t, i) => `<li class="tk-team">
        <button type="button" class="tk-name" data-rename="${i}" aria-label="Rename ${esc(t.name)}">${esc(t.name)} <span class="pencil" aria-hidden="true">✎</span></button>
        <strong class="tk-score" aria-live="polite">${t.score}</strong>
        <div class="tk-btns">
          <button type="button" class="btn btn-secondary" data-add="${i}" data-amt="-1" aria-label="${esc(t.name)} minus 1">−1</button>
          <button type="button" class="btn" data-add="${i}" data-amt="1" aria-label="${esc(t.name)} plus 1">+1</button>
          <button type="button" class="btn" data-add="${i}" data-amt="5" aria-label="${esc(t.name)} plus 5">+5</button>
        </div></li>`).join('');
    }

    function html() {
      const last = st.history[0];
      return `<div class="page-head"><h1 tabindex="-1">Party toolkit</h1><p class="muted">Dice, a coin and a quick scoreboard.</p></div>
        <section class="card tk-section" aria-labelledby="tk-dice-h">
          <h2 id="tk-dice-h">🎲 Dice</h2>
          <div class="tk-row">
            ${P.stepperHTML('diceCount', st.diceCount, 1, 10, 'dice')}
            <label class="tk-sides"><span class="visually-hidden">Sides</span>
              <select id="tk-sides">${PL.DICE_SIDES.map((s) => `<option value="${s}" ${st.sides === s ? 'selected' : ''}>d${s}</option>`).join('')}</select></label>
          </div>
          <div class="tk-dice" id="tk-dice" aria-live="polite">${last ? diceHTML(last.values) : '<span class="muted">Tap Roll</span>'}</div>
          <p class="tk-total" id="tk-total">${last && last.values.length > 1 ? 'Total: ' + last.values.reduce((a, b) => a + b, 0) : ''}</p>
          <button type="button" class="btn btn-block" id="tk-roll">Roll ${st.diceCount}d${st.sides}</button>
          ${st.history.length > 1 ? `<p class="muted small tk-hist">Earlier: ${st.history.slice(1, 6).map((h) => h.values.join('+')).join(' · ')}</p>` : ''}
        </section>
        <section class="card tk-section" aria-labelledby="tk-coin-h">
          <h2 id="tk-coin-h">🪙 Coin</h2>
          <p class="tk-coin" id="tk-coin" aria-live="polite">${st.lastCoin || '—'}</p>
          <button type="button" class="btn btn-block" id="tk-flip">Flip</button>
          <p class="muted small">Heads ${st.heads} · Tails ${st.tails} <button type="button" class="btn btn-ghost btn-small" id="tk-coin-reset">Reset</button></p>
        </section>
        <section class="card tk-section" aria-labelledby="tk-board-h">
          <h2 id="tk-board-h">🏆 Scoreboard</h2>
          <ul class="tk-board">${boardHTML()}</ul>
          <div class="btn-row">
            <button type="button" class="btn btn-secondary" id="tk-add-team">＋ Add</button>
            <button type="button" class="btn btn-secondary" id="tk-zero">Reset scores</button>
          </div>
        </section>`;
    }

    return {
      title: 'Party toolkit',
      back: '#/party',
      html: '<div id="tk-root" class="imp"></div>',
      onMount(view) {
        const root = view.querySelector('#tk-root');
        const render = (focusSel) => {
          root.innerHTML = html();
          wire();
          if (focusSel) { const el = root.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); }
        };
        function wire() {
          P.wireSteppers(root, (key, d) => { st.diceCount = P.clamp(st.diceCount + d, 1, 10); save(); render(); });
          root.querySelector('#tk-sides').addEventListener('change', (e) => { st.sides = Number(e.target.value); save(); render('#tk-sides'); });
          root.querySelector('#tk-roll').addEventListener('click', () => {
            st.history.unshift({ values: PL.rollDice(st.diceCount, st.sides, Math.random) });
            st.history = st.history.slice(0, 10);
            save(); render('#tk-roll');
          });
          root.querySelector('#tk-flip').addEventListener('click', () => {
            st.lastCoin = PL.flipCoin(Math.random);
            st[st.lastCoin === 'Heads' ? 'heads' : 'tails'] += 1;
            save(); render('#tk-flip');
          });
          root.querySelector('#tk-coin-reset').addEventListener('click', () => { st.heads = 0; st.tails = 0; st.lastCoin = ''; save(); render('#tk-flip'); });
          root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
            const i = Number(b.dataset.add);
            st.board[i].score += Number(b.dataset.amt);
            save(); render(`[data-add="${i}"][data-amt="${b.dataset.amt}"]`);
          }));
          root.querySelectorAll('[data-rename]').forEach((b) => b.addEventListener('click', async () => {
            const i = Number(b.dataset.rename);
            const actions = [{ label: 'Cancel', value: 'cancel', style: 'secondary' }];
            if (st.board.length > 1) actions.push({ label: 'Remove', value: 'remove', style: 'danger' });
            actions.push({ label: 'Save', value: 'save', primary: true });
            const r = await CGR.ui.dialog({ title: 'Name', input: { label: 'Name', value: st.board[i].name, maxlength: 20 }, actions });
            if (r.action === 'save' && r.value.trim()) st.board[i].name = r.value.trim();
            else if (r.action === 'remove' && await CGR.ui.confirm(`Remove ${st.board[i].name}?`, '', 'Remove', true)) st.board.splice(i, 1);
            save(); render();
          }));
          root.querySelector('#tk-add-team').addEventListener('click', () => {
            st.board.push({ name: (st.board.length < 26 ? 'Team ' + String.fromCharCode(65 + st.board.length) : 'Player ' + (st.board.length + 1)), score: 0 });
            save(); render('#tk-add-team');
          });
          root.querySelector('#tk-zero').addEventListener('click', async () => {
            if (await CGR.ui.confirm('Reset all scores to 0?', 'Names are kept.', 'Reset', true)) { st.board.forEach((t) => { t.score = 0; }); save(); render(); }
          });
        }
        render();
      }
    };
  };
})();
