/* Five-dice scorecard screen (#/score/<id> for games whose scorekeeper has "sheet").
 * A real category scorecard: one column per player, every box, automatic bonuses and totals.
 * Optional dice entry: tap the five dice you rolled and every open box shows what it would score.
 * Logic: dice-sheet-logic.js. Saved in localStorage under "sheet:<gameId>". */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

(function () {
  const S = CGR.diceSheet;
  const esc = CGR.esc;
  const MAX_PLAYERS = 8;
  const MAX_UNDO = 100;
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  const live = {}; // per game id
  const key = (id) => 'sheet:' + id;

  function fresh(game, prev) {
    const players = prev ? prev.players : Array.from({ length: Math.min(MAX_PLAYERS, Math.max(1, game.scorekeeper.defaultPlayers || 2)) }, (_, i) => ({ id: 'p' + (i + 1), name: 'Player ' + (i + 1) }));
    const cards = {};
    players.forEach((p) => { cards[p.id] = S.emptyCard(); });
    return { v: 1, gameId: game.id, rules: prev ? prev.rules : S.rulesFor(game.scorekeeper.sheet)[0].id, players, cards, started: !!prev, undo: [], dice: [], served: false, touched: false, updatedAt: Date.now(), meta: '' };
  }
  function valid(s) { return s && s.v === 1 && Array.isArray(s.players) && s.cards && typeof s.cards === 'object'; }
  function load(game) {
    if (live[game.id]) return live[game.id];
    const saved = CGR.store.get(key(game.id), null);
    live[game.id] = valid(saved) ? Object.assign({ undo: [], dice: [] }, saved) : fresh(game);
    return live[game.id];
  }
  function save(st) {
    const r = S.rules(st.rules);
    const order = st.players.map((p) => p.id);
    const done = S.nextPlayer(r, order, st.cards) === null;
    st.meta = done ? 'finished' : `turn ${S.turnNumber(r, order, st.cards)} of ${r.cats.length}`;
    st.touched = st.started && st.players.some((p) => S.openCats(r, st.cards[p.id]).length < r.cats.length);
    st.updatedAt = Date.now();
    if (st.undo.length > MAX_UNDO) st.undo.splice(0, st.undo.length - MAX_UNDO);
    CGR.store.set(key(st.gameId), st);
  }
  function snapshot(st, label) {
    st.undo.push({ label, cards: JSON.parse(JSON.stringify(st.cards)) });
  }

  const nameOf = (st, pid) => (st.players.find((p) => p.id === pid) || {}).name || '';
  function dieHTML(n, cls) {
    const on = PIPS[n] || [];
    return `<span class="ds-die ${cls || ''}" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i class="${on.indexOf(i) !== -1 ? 'p' : ''}"></i>`).join('')}</span>`;
  }

  /* ---------------- Setup ---------------- */
  function setupHTML(game, st) {
    const opts = S.rulesFor(game.scorekeeper.sheet).map((r) => `<label><input type="radio" name="ds-rules" value="${r.id}" ${st.rules === r.id ? 'checked' : ''}>
      <span><strong>${esc(r.name)}</strong><br><span class="muted small">${esc(r.note)}</span></span></label>`).join('');
    return `<div class="page-head"><h1 tabindex="-1">${esc(game.name)} scorecard</h1>
        <p class="muted">A full scorecard: every box, bonuses and totals worked out for you. Optionally tap in your dice and it shows what each box would score.</p></div>
      <form id="ds-setup" onsubmit="return false">
        <fieldset class="field"><legend>Players</legend>
          <div class="stepper">
            <button type="button" class="btn btn-secondary" data-step="-1" aria-label="Fewer players" ${st.players.length <= 1 ? 'disabled' : ''}>−</button>
            <output aria-live="polite">${st.players.length}</output>
            <button type="button" class="btn btn-secondary" data-step="1" aria-label="More players" ${st.players.length >= MAX_PLAYERS ? 'disabled' : ''}>+</button>
          </div></fieldset>
        <fieldset class="field"><legend>Names</legend><div class="imp-names">${st.players.map((p, i) => `<label class="imp-name">
          <span class="imp-name-num" aria-hidden="true">${i + 1}</span>
          <span class="visually-hidden">Player ${i + 1} name</span>
          <input type="text" data-pid="${p.id}" value="${esc(p.name)}" maxlength="16" autocomplete="off" autocapitalize="words"></label>`).join('')}</div></fieldset>
        <fieldset class="field ds-rules"><legend>Rules</legend>${opts}</fieldset>
      </form>
      <div class="action-bar"><div class="action-bar-inner"><button type="button" class="btn" id="ds-start">Start scorecard</button></div></div>`;
  }

  /* ---------------- Card ---------------- */
  function cardHTML(game, st) {
    const r = S.rules(st.rules);
    const order = st.players.map((p) => p.id);
    const cur = S.nextPlayer(r, order, st.cards);
    const diceReady = S.validDice(st.dice);
    const totals = {};
    order.forEach((pid) => { totals[pid] = S.totals(r, st.cards[pid]); });

    let banner = '';
    if (cur === null) {
      const rank = S.standings(r, order, st.cards, Object.fromEntries(st.players.map((p) => [p.id, p.name])));
      const best = rank[0].total;
      const winners = rank.filter((x) => x.total === best).map((x) => esc(x.name));
      banner = `<div class="gameover" role="status"><span class="trophy" aria-hidden="true">🏆</span>
        ${rank[0].outright ? `${esc(rank[0].name)} wins outright with a served ${esc(S.cat(r, r.fiveId).name)}!`
          : order.length === 1 ? `Final score: <strong>${best}</strong>` : `${winners.join(' & ')} ${winners.length > 1 ? 'share the win' : 'wins'} with <strong>${best}</strong>!`}
        <div class="btn-row" style="margin-top:.75rem">
          <button type="button" class="btn" data-act="share">📤 Share results</button>
          <button type="button" class="btn btn-secondary" data-act="again">New game</button></div></div>`;
    }

    const head = `<tr><th scope="col" class="ds-cat">${esc(r.name)}</th>${st.players.map((p) => `<th scope="col" class="${p.id === cur ? 'cur' : ''}"><span class="ds-pname">${esc(p.name)}</span></th>`).join('')}</tr>`;

    const allowed = {};
    if (cur && diceReady) S.allowed(r, st.cards[cur], st.dice).forEach((id) => { allowed[id] = true; });

    function row(c) {
      const cells = st.players.map((p) => {
        const card = st.cards[p.id];
        const has = Object.prototype.hasOwnProperty.call(card.boxes, c.id);
        const label = `${c.name} for ${p.name}`;
        if (has) return `<td><button type="button" class="ds-cell filled${card.boxes[c.id] === 0 ? ' zero' : ''}" data-pid="${p.id}" data-cat="${c.id}" aria-label="${esc(label)}: ${card.boxes[c.id]}. Change">${card.boxes[c.id] === 0 ? '–' : card.boxes[c.id]}</button></td>`;
        if (p.id === cur && diceReady) {
          if (!allowed[c.id]) return `<td><button type="button" class="ds-cell blocked" data-pid="${p.id}" data-cat="${c.id}" aria-label="${esc(label)}: not allowed with this roll">·</button></td>`;
          const v = S.scoreFor(r, card, c.id, st.dice, st.served);
          return `<td><button type="button" class="ds-cell preview${v ? '' : ' zero'}" data-pid="${p.id}" data-cat="${c.id}" aria-label="${esc(label)}: would score ${v}">${v}</button></td>`;
        }
        return `<td><button type="button" class="ds-cell open${p.id === cur ? ' cur' : ''}" data-pid="${p.id}" data-cat="${c.id}" aria-label="${esc(label)}: empty"></button></td>`;
      }).join('');
      return `<tr><th scope="row" class="ds-cat"><span class="ds-cname">${esc(c.name)}</span><span class="ds-hint">${esc(c.hint)}</span></th>${cells}</tr>`;
    }
    const sumRow = (label, fn, cls, sub) => `<tr class="${cls || 'ds-sum'}"><th scope="row" class="ds-cat">${label}${sub ? `<span class="ds-hint">${sub}</span>` : ''}</th>${order.map((pid) => `<td>${fn(pid)}</td>`).join('')}</tr>`;

    const upper = r.cats.filter((c) => c.section === 'upper').map(row).join('');
    const lower = r.cats.filter((c) => c.section === 'lower').map(row).join('');
    const ub = r.upperBonus;
    const paceText = (t) => {
      if (!ub) return '';
      if (t.bonus) return '<span class="ds-ok">✓</span>';
      if (t.bonusLost) return '<span class="ds-bad">✗</span>';
      return `<span class="ds-pace ${t.pace >= 0 ? 'ahead' : 'behind'}">${t.pace > 0 ? '+' : ''}${t.pace}</span>`;
    };
    const bonusRows = ub
      ? sumRow('Upper total', (pid) => totals[pid].upper) +
        sumRow(`Bonus <span class="muted small">(${ub.need}+ = ${ub.score})</span>`, (pid) => totals[pid].bonus ? `<strong>${totals[pid].bonus}</strong>` : paceText(totals[pid]), 'ds-sum ds-bonus', 'vs. three of each')
      : '';
    const fiveRow = r.fiveBonus ? `<tr class="ds-sum"><th scope="row" class="ds-cat">Five-of-a-kind bonus<span class="ds-hint">+${r.fiveBonus} for each extra one</span></th>
      ${st.players.map((p) => `<td><button type="button" class="ds-cell bonus5" data-pid="${p.id}" data-five="1" aria-label="Extra five-of-a-kind bonus for ${esc(p.name)}: ${st.cards[p.id].bonusFives || 0}">${st.cards[p.id].bonusFives ? '+' + totals[p.id].fiveBonus : ''}</button></td>`).join('')}</tr>` : '';

    const diceSlots = Array.from({ length: 5 }, (_, i) => st.dice[i]
      ? `<button type="button" class="ds-slot" data-slot="${i}" aria-label="Die ${i + 1}: ${st.dice[i]}. Remove">${dieHTML(st.dice[i])}</button>`
      : `<span class="ds-slot empty" aria-hidden="true"></span>`).join('');

    const lastUndo = st.undo[st.undo.length - 1];
    return `${banner}
      ${cur ? `<section class="ds-roll" aria-label="Enter a roll">
        <p class="ds-turn"><span class="imp-who">${esc(nameOf(st, cur))}</span>’s turn · ${S.turnNumber(r, order, st.cards)} of ${r.cats.length}</p>
        <div class="ds-slots">${diceSlots}${st.dice.length ? '<button type="button" class="btn btn-ghost ds-clear" data-act="clear">Clear</button>' : ''}</div>
        <div class="ds-faces" role="group" aria-label="Add a die">${[1, 2, 3, 4, 5, 6].map((f) => `<button type="button" class="ds-face" data-face="${f}" aria-label="Add a ${f}" ${st.dice.length >= 5 ? 'disabled' : ''}>${dieHTML(f)}</button>`).join('')}</div>
        ${r.servedBonus ? `<label class="switch-row ds-served"><input type="checkbox" id="ds-served" role="switch" ${st.served ? 'checked' : ''}>
          <span><strong>Served</strong> <span class="muted small">— made on the first roll (+${r.servedBonus}; a served ${esc(S.cat(r, r.fiveId).name)} wins)</span></span></label>` : ''}
        <p class="muted small ds-tip">${diceReady ? 'Tap a box in the highlighted column to score this roll.' + (S.jokerActive(r, st.cards[cur], st.dice) ? ' <strong>Joker roll</strong>: the matching upper box first, otherwise any lower box at full value.' : '') : 'Tap your final dice to see what each box scores — or just tap a box and type the score.'}</p>
      </section>` : ''}
      <div class="ds-wrap"><table class="ds-table${order.length > 4 ? ' many' : ''}">
        <thead>${head}</thead>
        <tbody>${upper}${bonusRows}${lower}${fiveRow}
          ${sumRow('<strong>Total</strong>', (pid) => `<strong>${totals[pid].total}</strong>`, 'ds-sum ds-total')}</tbody>
      </table></div>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" data-act="undo" ${lastUndo ? '' : 'disabled'} aria-label="${lastUndo ? 'Undo ' + esc(lastUndo.label) : 'Nothing to undo'}">↶ Undo</button>
        <button type="button" class="btn btn-secondary" data-act="menu">⋯ Options</button>
      </div></div>`;
  }

  /* ---------------- Actions ---------------- */
  async function manual(game, st, pid, cid, refresh) {
    const r = S.rules(st.rules);
    const c = S.cat(r, cid);
    const card = st.cards[pid];
    const has = Object.prototype.hasOwnProperty.call(card.boxes, cid);
    const values = S.possible(r, cid);
    const title = `${c.name} — ${nameOf(st, pid)}`;
    let res;
    if (values.length <= 7) {
      const actions = [{ label: 'Cancel', value: 'cancel', style: 'secondary' }];
      if (has) actions.push({ label: 'Clear box', value: 'clear', style: 'danger' });
      values.forEach((v) => actions.push({ label: v === 0 ? '0 (scratch)' : String(v), value: 'v' + v, style: v === 0 ? 'secondary' : '', primary: v === values[values.length - 1] }));
      res = await CGR.ui.dialog({ title, message: c.hint, actions });
      if (res.action.charAt(0) === 'v') res = { action: 'ok', value: res.action.slice(1) };
    } else {
      const actions = [{ label: 'Cancel', value: 'cancel', style: 'secondary' }];
      if (has) actions.push({ label: 'Clear box', value: 'clear', style: 'danger' });
      actions.push({ label: '0 (scratch)', value: 'zero', style: 'secondary' }, { label: 'Save', value: 'ok', primary: true });
      res = await CGR.ui.dialog({ title, message: c.hint, input: { label: 'Score', type: 'number', inputmode: 'numeric', value: has ? card.boxes[cid] : '' }, actions });
      if (res.action === 'zero') res = { action: 'ok', value: '0' };
    }
    if (res.action === 'clear') {
      snapshot(st, `clearing ${c.name}`);
      delete card.boxes[cid];
    } else if (res.action === 'ok') {
      const n = Number(String(res.value).trim());
      if (String(res.value).trim() === '' || !S.validManual(r, cid, n)) { CGR.ui.toast(`${c.name} can’t score ${String(res.value).trim() || 'nothing'}`); return; }
      snapshot(st, `${c.name} ${n} for ${nameOf(st, pid)}`);
      card.boxes[cid] = n;
    } else return;
    st.dice = [];
    save(st);
    refresh();
  }

  async function fiveBonus(st, pid, refresh) {
    const r = S.rules(st.rules);
    const card = st.cards[pid];
    const res = await CGR.ui.dialog({
      title: `Extra ${S.cat(r, r.fiveId).name.toLowerCase()} bonus — ${nameOf(st, pid)}`,
      message: `Currently ${card.bonusFives || 0} × ${r.fiveBonus}. Scoring a roll with the dice entry adds this automatically.`,
      actions: [{ label: 'Cancel', value: 'cancel', style: 'secondary' }, { label: `− ${r.fiveBonus}`, value: 'minus', style: 'secondary' }, { label: `+ ${r.fiveBonus}`, value: 'plus', primary: true }]
    });
    if (res.action === 'cancel' || (res.action === 'minus' && !card.bonusFives)) return;
    snapshot(st, 'bonus change for ' + nameOf(st, pid));
    card.bonusFives = Math.max(0, (card.bonusFives || 0) + (res.action === 'plus' ? 1 : -1));
    save(st);
    refresh();
  }

  function resultsText(game, st) {
    const r = S.rules(st.rules);
    const order = st.players.map((p) => p.id);
    const rank = S.standings(r, order, st.cards, Object.fromEntries(st.players.map((p) => [p.id, p.name])));
    const lines = rank.map((x, i) => `${i + 1}. ${x.name} — ${x.total}`);
    return `${game.name} (${r.name}) — ${new Date().toLocaleDateString()}\n${lines.join('\n')}`;
  }
  async function share(game, st) {
    const text = resultsText(game, st);
    const canShare = typeof navigator.share === 'function';
    const actions = [{ label: 'Close', value: 'cancel', style: 'secondary' }, { label: 'Copy', value: 'copy', style: canShare ? 'secondary' : '', primary: !canShare }];
    if (canShare) actions.push({ label: 'Share…', value: 'share', primary: true });
    const res = await CGR.ui.dialog({ title: 'Share results', message: text, pre: true, actions });
    if (res.action === 'share') { try { await navigator.share({ title: game.name + ' scores', text }); } catch (e) { /* cancelled */ } }
    else if (res.action === 'copy') {
      try { await navigator.clipboard.writeText(text); CGR.ui.toast('Copied to clipboard'); } catch (e) { CGR.ui.toast('Couldn’t copy'); }
    }
  }

  async function menu(game, st, root, rerender) {
    const res = await CGR.ui.dialog({
      title: 'Scorecard options',
      actions: [
        { label: 'Close', value: 'cancel', style: 'secondary' },
        { label: 'Simple tracker', value: 'simple', style: 'secondary' },
        { label: 'Players & rules', value: 'setup', style: 'secondary' },
        { label: 'Share', value: 'share', style: 'secondary' },
        { label: 'New game', value: 'again', primary: true }
      ]
    });
    if (res.action === 'share') share(game, st);
    else if (res.action === 'again') { if (await CGR.ui.confirm('Start a new game?', 'All boxes are cleared. Players and rules stay the same.', 'New game', true)) newGame(game, st, rerender); }
    else if (res.action === 'setup') {
      if (st.touched && !(await CGR.ui.confirm('Change players or rules?', 'This clears the current scorecard.', 'Continue', true))) return;
      const next = fresh(game, st); next.started = false;
      live[game.id] = next; save(next); rerender();
    } else if (res.action === 'simple') location.hash = '#/score/' + game.id + '?simple=1';
  }
  function newGame(game, st, rerender) {
    const next = fresh(game, st);
    live[game.id] = next;
    save(next);
    rerender();
  }

  /* ---------------- View ---------------- */
  CGR.views.diceSheet = function (id) {
    const game = CGR.data.get(id);
    if (!game) return CGR.views.notFound();
    return {
      title: 'Score: ' + game.name,
      back: '#/game/' + game.id,
      html: `<div id="ds-root" class="ds"></div>`,
      onMount(v) {
        const root = v.querySelector('#ds-root');
        const render = () => {
          const st = load(game);
          root.innerHTML = st.started ? `<div class="page-head ds-head"><h1 tabindex="-1">${esc(game.name)} scorecard</h1>
              <p class="muted small"><a href="#/game/${esc(game.id)}">Rules</a> · ${esc(S.rules(st.rules).name)}</p></div>` + cardHTML(game, st)
            : setupHTML(game, st);
          (st.started ? wireCard : wireSetup)(st);
        };
        const refresh = () => {
          const k = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset : {};
          const sel = k.cat ? `[data-pid="${k.pid}"][data-cat="${k.cat}"]` : k.face ? `[data-face="${k.face}"]` : k.act ? `[data-act="${k.act}"]` : null;
          render();
          const again = sel && root.querySelector(sel);
          if (again && !again.disabled) again.focus({ preventScroll: true });
        };

        function wireSetup(st) {
          const form = root.querySelector('#ds-setup');
          const read = () => {
            form.querySelectorAll('[data-pid]').forEach((inp) => {
              const p = st.players.find((x) => x.id === inp.dataset.pid);
              if (p) p.name = inp.value.trim().slice(0, 16) || p.name;
            });
            const r = form.querySelector('input[name="ds-rules"]:checked');
            if (r) st.rules = r.value;
          };
          form.addEventListener('change', () => { read(); save(st); });
          form.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
            read();
            if (Number(b.dataset.step) > 0 && st.players.length < MAX_PLAYERS) {
              let n = st.players.length + 1;
              while (st.players.some((p) => p.id === 'p' + n)) n++;
              st.players.push({ id: 'p' + n, name: 'Player ' + (st.players.length + 1) });
              st.cards['p' + n] = S.emptyCard();
            } else if (Number(b.dataset.step) < 0 && st.players.length > 1) {
              const gone = st.players.pop();
              delete st.cards[gone.id];
            }
            save(st);
            render();
          }));
          root.querySelector('#ds-start').addEventListener('click', () => {
            read();
            st.players.forEach((p, i) => { if (!p.name.trim()) p.name = 'Player ' + (i + 1); });
            st.started = true;
            save(st);
            render();
            window.scrollTo(0, 0);
            const h1 = root.querySelector('h1'); if (h1) h1.focus({ preventScroll: true });
          });
        }

        function wireCard(st) {
          root.querySelectorAll('.ds-face').forEach((b) => b.addEventListener('click', () => {
            if (st.dice.length < 5) st.dice.push(Number(b.dataset.face));
            save(st); refresh();
          }));
          root.querySelectorAll('.ds-slot[data-slot]').forEach((b) => b.addEventListener('click', () => {
            st.dice.splice(Number(b.dataset.slot), 1);
            save(st); refresh();
          }));
          const clear = root.querySelector('[data-act="clear"]');
          if (clear) clear.addEventListener('click', () => { st.dice = []; st.served = false; save(st); refresh(); });
          const served = root.querySelector('#ds-served');
          if (served) served.addEventListener('change', () => { st.served = served.checked; save(st); refresh(); });

          root.querySelectorAll('.ds-cell[data-cat]').forEach((b) => b.addEventListener('click', () => {
            const r = S.rules(st.rules);
            const order = st.players.map((p) => p.id);
            const cur = S.nextPlayer(r, order, st.cards);
            const pid = b.dataset.pid;
            const cid = b.dataset.cat;
            if (b.classList.contains('preview')) {
              snapshot(st, `${S.cat(r, cid).name} for ${nameOf(st, pid)}`);
              const res = S.place(r, st.cards[pid], cid, st.dice, st.served);
              if (!res.ok) { st.undo.pop(); return; }
              st.dice = [];
              st.served = false;
              save(st);
              CGR.ui.toast(res.outright ? `${nameOf(st, pid)}: served ${S.cat(r, cid).name} — wins the game! 🎉`
                : `${nameOf(st, pid)}: ${S.cat(r, cid).name} ${res.score}${res.bonus ? ` + ${r.fiveBonus} bonus! 🎉` : ''}`);
              const next = S.nextPlayer(r, order, st.cards);
              render();
              if (next === null) { window.scrollTo(0, 0); CGR.ui.announce('Game over'); }
              else CGR.ui.announce(`${nameOf(st, next)}’s turn`);
              return;
            }
            if (b.classList.contains('blocked')) {
              CGR.ui.toast('Joker rule: this roll must go in the highlighted boxes');
              return;
            }
            manual(game, st, pid, cid, refresh);
          }));
          root.querySelectorAll('.ds-cell[data-five]').forEach((b) => b.addEventListener('click', () => fiveBonus(st, b.dataset.pid, refresh)));
          root.querySelector('[data-act="undo"]').addEventListener('click', () => {
            const u = st.undo.pop();
            if (!u) return;
            st.cards = u.cards;
            save(st);
            CGR.ui.toast('Undid ' + u.label);
            refresh();
          });
          root.querySelector('[data-act="menu"]').addEventListener('click', () => menu(game, st, root, render));
          const sh = root.querySelector('[data-act="share"]');
          if (sh) sh.addEventListener('click', () => share(game, st));
          const again = root.querySelector('[data-act="again"]');
          if (again) again.addEventListener('click', () => newGame(game, st, render));
        }

        render();
      }
    };
  };

  CGR.diceSheetSaved = function (id) {
    const s = live[id] || CGR.store.get(key(id), null);
    return valid(s) && s.touched ? s : null;
  };
})();
