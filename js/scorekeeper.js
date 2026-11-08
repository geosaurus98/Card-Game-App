/* Score tracker: per-game players, round-by-round history, undo, target score.
 * State is saved to localStorage under "cgr:score:<gameId>" after every change. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

CGR.score = (function () {
  const esc = CGR.esc;
  const live = {};          // in-memory state per game (includes untouched new games)
  const MAX_UNDO = 300;
  const MAX_PLAYERS = 16;

  /* ---------- State ---------- */
  function key(id) { return 'score:' + id; }

  function defaultCount(game) {
    const sk = game.scorekeeper;
    const last = CGR.state && CGR.state.lastCount;
    if (!sk.teams && last && CGR.data.supports(game, last)) {
      const n = last === '5+' ? Math.max(5, sk.defaultPlayers) : Number(last);
      return Math.min(Math.max(n, game.players.min), game.players.max);
    }
    return sk.defaultPlayers;
  }

  function defaultName(game, i) {
    return game.scorekeeper.teams ? 'Team ' + String.fromCharCode(65 + i) : 'Player ' + (i + 1);
  }

  function create(game) {
    const n = defaultCount(game);
    const players = [];
    for (let i = 0; i < n; i++) players.push({ id: 'p' + (i + 1), name: defaultName(game, i) });
    return {
      v: 1,
      gameId: game.id,
      players,
      nextId: n + 1,
      rounds: [{}],
      undo: [],
      target: game.scorekeeper.target,
      direction: game.scorekeeper.direction,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      touched: false
    };
  }

  function valid(s) {
    return s && s.v === 1 && Array.isArray(s.players) && Array.isArray(s.rounds) && s.rounds.length > 0;
  }

  function load(game) {
    if (live[game.id]) return live[game.id];
    const saved = CGR.store.get(key(game.id), null);
    live[game.id] = valid(saved) ? Object.assign({ undo: [] }, saved) : create(game);
    return live[game.id];
  }

  function save(state) {
    state.touched = true;
    state.updatedAt = Date.now();
    if (state.undo.length > MAX_UNDO) state.undo.splice(0, state.undo.length - MAX_UNDO);
    CGR.store.set(key(state.gameId), state);
  }

  function hasSaved(id) {
    const s = live[id] || CGR.store.get(key(id), null);
    return !!(valid(s) && s.touched);
  }

  function savedGames() {
    return CGR.store.keys('score:').map((k) => {
      const id = k.slice('score:'.length);
      const state = live[id] || CGR.store.get(k, null);
      const game = CGR.data.get(id);
      return game && valid(state) && state.touched ? { game, state } : null;
    }).filter(Boolean).sort((a, b) => b.state.updatedAt - a.state.updatedAt);
  }

  function total(state, pid) {
    return state.rounds.reduce((sum, r) => sum + (r[pid] || 0), 0);
  }

  function currentRound(state) { return state.rounds[state.rounds.length - 1]; }

  /* Work out leader / game-over / eliminated players. */
  function status(state, game) {
    const totals = state.players.map((p) => ({ p, t: total(state, p.id) }));
    const hasScores = state.rounds.some((r) => Object.keys(r).length);
    const low = state.direction === 'low';
    const pickBest = (list) => {
      if (!list.length) return [];
      const best = low ? Math.min(...list.map((x) => x.t)) : Math.max(...list.map((x) => x.t));
      return list.filter((x) => x.t === best);
    };
    const res = { totals, leaders: [], out: [], over: false, winners: [] };
    if (!hasScores || state.players.length < 1) return res;

    const target = state.target;
    if (target != null && game.scorekeeper.endCondition === 'elimination') {
      res.out = totals.filter((x) => x.t >= target).map((x) => x.p.id);
      const remaining = totals.filter((x) => x.t < target);
      if (state.players.length > 1 && remaining.length <= 1) {
        res.over = true;
        res.winners = remaining.length ? remaining : pickBest(totals);
      }
      res.leaders = pickBest(remaining.length ? remaining : totals).map((x) => x.p.id);
    } else {
      res.leaders = pickBest(totals).map((x) => x.p.id);
      if (target != null && totals.some((x) => x.t >= target)) {
        res.over = true;
        res.winners = pickBest(totals);
      }
    }
    if (state.players.length < 2) res.leaders = [];
    return res;
  }

  /* ---------- Mutations (each records an undo entry) ---------- */
  function add(state, pid, amount) {
    const r = currentRound(state);
    r[pid] = (r[pid] || 0) + amount;
    state.undo.push({ t: 'add', pid, amount });
    save(state);
  }

  function nextRound(state) {
    state.rounds.push({});
    state.undo.push({ t: 'round' });
    save(state);
  }

  function addPlayer(state, name) {
    const id = 'p' + state.nextId++;
    state.players.push({ id, name });
    state.undo.push({ t: 'addPlayer', pid: id });
    save(state);
  }

  function rename(state, pid, name) {
    const p = state.players.find((x) => x.id === pid);
    state.undo.push({ t: 'rename', pid, from: p.name });
    p.name = name;
    save(state);
  }

  function removePlayer(state, pid) {
    const index = state.players.findIndex((x) => x.id === pid);
    const player = state.players[index];
    const values = state.rounds.map((r) => r[pid]);
    state.players.splice(index, 1);
    state.rounds.forEach((r) => { delete r[pid]; });
    state.undo.push({ t: 'remove', player, index, values });
    save(state);
  }

  function undo(state) {
    const a = state.undo.pop();
    if (!a) return null;
    const name = (pid) => (state.players.find((p) => p.id === pid) || {}).name || 'player';
    let msg = 'Undone';
    switch (a.t) {
      case 'add': {
        // The add happened in the round that was current at the time; since
        // undo is strictly LIFO that is still the current round.
        const r = currentRound(state);
        r[a.pid] = (r[a.pid] || 0) - a.amount;
        if (r[a.pid] === 0) delete r[a.pid];
        msg = `Undid ${fmtDelta(a.amount)} for ${name(a.pid)}`;
        break;
      }
      case 'round':
        if (state.rounds.length > 1) state.rounds.pop();
        msg = `Back to round ${state.rounds.length}`;
        break;
      case 'addPlayer':
        msg = `Removed ${name(a.pid)}`;
        state.players = state.players.filter((p) => p.id !== a.pid);
        state.rounds.forEach((r) => { delete r[a.pid]; });
        break;
      case 'rename': {
        const p = state.players.find((x) => x.id === a.pid);
        if (p) { msg = `Name changed back to ${a.from}`; p.name = a.from; }
        break;
      }
      case 'remove':
        state.players.splice(a.index, 0, a.player);
        a.values.forEach((v, i) => { if (v != null && state.rounds[i]) state.rounds[i][a.player.id] = v; });
        msg = `Restored ${a.player.name}`;
        break;
    }
    save(state);
    return msg;
  }

  function describe(a, state) {
    if (!a) return '';
    const p = state.players.find((x) => x.id === a.pid);
    switch (a.t) {
      case 'add': return `${fmtDelta(a.amount)} for ${p ? p.name : 'player'}`;
      case 'round': return 'new round';
      case 'addPlayer': return `adding ${p ? p.name : 'player'}`;
      case 'rename': return 'rename';
      case 'remove': return `removing ${a.player.name}`;
    }
    return '';
  }

  function fmtDelta(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toLocaleString(); }
  function fmt(n) { return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString(); }

  /* ---------- Share / export ---------- */
  // Players sorted best-first, with tied players sharing a rank (1, 1, 3 …).
  function standings(state) {
    const low = state.direction === 'low';
    const rows = state.players.map((p) => ({ name: p.name, total: total(state, p.id) }))
      .sort((a, b) => (low ? a.total - b.total : b.total - a.total));
    rows.forEach((r, i) => { r.rank = i > 0 && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1; });
    return rows;
  }

  // Rounds that actually have scores (the empty "current" round is skipped).
  function playedRounds(state) {
    return state.rounds.filter((r, i) => Object.keys(r).length || i < state.rounds.length - 1);
  }

  function resultsText(game, state) {
    const st = status(state, game);
    const rows = standings(state);
    const rounds = playedRounds(state);
    const unit = game.scorekeeper.unit || 'points';
    const lines = [];
    lines.push(`${game.name} — ${st.over ? 'final scores' : 'scores so far'} (${new Date().toLocaleDateString()})`);
    lines.push(`${state.direction === 'low' ? 'Lowest' : 'Highest'} wins${state.target != null ? ' · target ' + state.target.toLocaleString() : ''} · ${rounds.length} ${rounds.length === 1 ? 'round' : 'rounds'}`);
    lines.push('');
    rows.forEach((r) => {
      const medal = r.rank === 1 ? (st.over ? '🏆' : '⭐') : `${r.rank}.`;
      lines.push(`${medal} ${r.name} — ${fmt(r.total)} ${unit}`);
    });
    if (st.over && st.winners.length) {
      lines.push('');
      lines.push(`Winner: ${st.winners.map((w) => w.p.name).join(' & ')}`);
    }
    if (rounds.length) {
      lines.push('');
      lines.push('Round by round:');
      rounds.forEach((r, i) => {
        lines.push(`${i + 1}: ` + state.players.map((p) => `${p.name} ${r[p.id] == null ? '0' : fmtDelta(r[p.id])}`).join(', '));
      });
    }
    lines.push('');
    lines.push('Scored with Card Rules');
    return lines.join('\n');
  }

  function csvCell(v) {
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function resultsCSV(game, state) {
    const rows = [['Round'].concat(state.players.map((p) => p.name))];
    playedRounds(state).forEach((r, i) => rows.push([i + 1].concat(state.players.map((p) => (r[p.id] == null ? 0 : r[p.id])))));
    rows.push(['Total'].concat(state.players.map((p) => total(state, p.id))));
    return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback for browsers without the async clipboard API.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function downloadCSV(game, state) {
    const blob = new Blob(['\ufeff' + resultsCSV(game, state)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.id}-scores-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareResults(game, state) {
    const text = resultsText(game, state);
    const canShare = typeof navigator.share === 'function';
    const actions = [{ label: 'Close', value: 'cancel', style: 'secondary' },
      { label: 'Download CSV', value: 'csv', style: 'secondary' },
      { label: 'Copy', value: 'copy', style: canShare ? 'secondary' : '', primary: !canShare }];
    if (canShare) actions.push({ label: 'Share…', value: 'share', primary: true });
    const r = await CGR.ui.dialog({ title: 'Share results', message: text, pre: true, actions });
    if (r.action === 'share') {
      try { await navigator.share({ title: `${game.name} scores`, text }); }
      catch (e) { if (e && e.name !== 'AbortError' && await copyText(text)) CGR.ui.toast('Copied to clipboard'); }
    } else if (r.action === 'copy') {
      CGR.ui.toast((await copyText(text)) ? 'Copied to clipboard' : 'Couldn’t copy — try Share or Download');
    } else if (r.action === 'csv') {
      downloadCSV(game, state);
      CGR.ui.toast('Scores downloaded as CSV');
    }
  }

  /* ---------- Rendering ---------- */
  function bodyHTML(game, state) {
    const sk = game.scorekeeper;
    const st = status(state, game);
    const roundNo = state.rounds.length;
    const cur = currentRound(state);
    const quick = [1].concat((sk.quickAdd || []).filter((q) => q !== 1));
    const unit = sk.unit || 'points';

    let banner = '';
    if (st.over) {
      const names = st.winners.map((x) => esc(x.p.name)).join(' & ');
      const score = st.winners[0] ? fmt(st.winners[0].t) : '';
      banner = `<div class="gameover" role="status">
        <span class="trophy" aria-hidden="true">🏆</span> Game over! ${st.winners.length > 1 ? 'Tie: ' : ''}${names} ${st.winners.length > 1 ? 'share the win' : 'wins'} with ${score}.
        <div class="btn-row" style="margin-top:.75rem">
          <button type="button" class="btn" data-act="share" data-key="share-over">📤 Share results</button>
          <button type="button" class="btn btn-secondary" data-act="new">New game</button>
        </div>
      </div>`;
    } else if (st.out.length) {
      const names = state.players.filter((p) => st.out.indexOf(p.id) !== -1).map((p) => esc(p.name)).join(', ');
      banner = `<div class="gameover" role="status">${names} ${st.out.length > 1 ? 'are' : 'is'} out.</div>`;
    }

    const players = state.players.map((p) => {
      const t = total(state, p.id);
      const r = cur[p.id] || 0;
      const isLeader = st.leaders.indexOf(p.id) !== -1;
      const isOut = st.out.indexOf(p.id) !== -1;
      const btns = [`<button type="button" class="btn minus" data-act="add" data-pid="${p.id}" data-amt="-1" data-key="${p.id}:-1" aria-label="Subtract 1 from ${esc(p.name)}">−1</button>`]
        .concat(quick.map((q) => `<button type="button" class="btn plus" data-act="add" data-pid="${p.id}" data-amt="${q}" data-key="${p.id}:${q}" aria-label="Add ${q} to ${esc(p.name)}">+${q}</button>`))
        .concat([`<button type="button" class="btn custom" data-act="custom" data-pid="${p.id}" data-key="${p.id}:custom" aria-label="Custom amount for ${esc(p.name)}">±#</button>`]);
      return `<li class="player${isLeader ? ' leader' : ''}${isOut ? ' out' : ''}">
        <div class="player-top">
          <button type="button" class="player-name" data-act="rename" data-pid="${p.id}" data-key="${p.id}:name" aria-label="Rename or remove ${esc(p.name)}">${esc(p.name)}<span class="pencil" aria-hidden="true">✎</span></button>
          ${isLeader && !st.over ? '<span class="tag">Leading</span>' : ''}
          ${st.over && st.winners.some((w) => w.p.id === p.id) ? '<span class="tag">Winner</span>' : ''}
          ${isOut ? '<span class="tag out">Out</span>' : ''}
          <div>
            <div class="player-total" aria-label="${esc(p.name)} total ${t} ${esc(unit)}">${fmt(t)}</div>
            <div class="player-round">${r ? 'round: ' + fmtDelta(r) : '&nbsp;'}</div>
          </div>
        </div>
        <div class="score-btns">${btns.join('')}</div>
      </li>`;
    }).join('');

    const rows = state.rounds.map((r, i) => {
      const isCur = i === state.rounds.length - 1;
      if (isCur && !Object.keys(r).length && i > 0) return '';
      return `<tr class="${isCur ? 'current' : ''}"><td>${i + 1}${isCur ? ' (now)' : ''}</td>${state.players.map((p) => {
        const v = r[p.id];
        return `<td class="${v < 0 ? 'neg' : ''}">${v == null ? '–' : fmtDelta(v)}</td>`;
      }).join('')}</tr>`;
    }).join('');
    const history = `<section class="section" aria-labelledby="hist-h">
      <h2 id="hist-h">Round history</h2>
      <div class="history-wrap" tabindex="0" role="region" aria-labelledby="hist-h">
        <table class="history">
          <thead><tr><th scope="col">Round</th>${state.players.map((p) => `<th scope="col">${esc(p.name)}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td>Total</td>${state.players.map((p) => `<td>${fmt(total(state, p.id))}</td>`).join('')}</tr></tfoot>
        </table>
      </div></section>`;

    const lastUndo = state.undo[state.undo.length - 1];
    return `
      ${banner}
      <p class="sk-sub" id="round-label"><strong>Round ${roundNo}</strong> · ${state.direction === 'low' ? 'Lowest' : 'Highest'} wins${state.target != null ? ` · ${sk.endCondition === 'elimination' ? 'out at' : 'target'} ${state.target.toLocaleString()}` : ' · no target'}</p>
      <ul class="players" style="list-style:none;padding:0;margin:0">${players}</ul>
      <div class="sk-manage">
        <button type="button" class="btn btn-secondary" data-act="addPlayer" data-key="addPlayer" ${state.players.length >= MAX_PLAYERS ? 'disabled' : ''}>＋ Add ${sk.teams ? 'team' : 'player'}</button>
        <button type="button" class="btn btn-secondary" data-act="new" data-key="new">New game</button>
        <button type="button" class="btn btn-danger" data-act="reset" data-key="reset">Reset</button>
        <button type="button" class="btn btn-secondary share" data-act="share" data-key="share">📤 Share / export scores</button>
      </div>
      ${history}
      <details class="sk-settings card">
        <summary>Scoring settings</summary>
        <label class="field"><span>Target score (leave blank for none)</span>
          <input type="number" inputmode="numeric" id="sk-target" value="${state.target == null ? '' : state.target}" placeholder="No target"></label>
        <label class="field"><span>Who wins?</span>
          <select id="sk-dir">
            <option value="high" ${state.direction === 'high' ? 'selected' : ''}>Highest score wins</option>
            <option value="low" ${state.direction === 'low' ? 'selected' : ''}>Lowest score wins</option>
          </select></label>
        <p class="muted small">Default for ${esc(game.name)}: ${sk.direction === 'low' ? 'lowest' : 'highest'} wins${sk.target != null ? ', target ' + sk.target.toLocaleString() : ', no target'}.</p>
        <button type="button" class="btn btn-secondary" data-act="defaults">Restore defaults</button>
      </details>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary" data-act="undo" data-key="undo" ${lastUndo ? '' : 'disabled'} aria-label="${lastUndo ? 'Undo ' + esc(describe(lastUndo, state)) : 'Nothing to undo'}">↶ Undo</button>
        <button type="button" class="btn" data-act="round" data-key="round">Next round ›</button>
      </div></div>`;
  }

  function view(id) {
    const game = CGR.data.get(id);
    if (!game) return CGR.views.notFound();
    const state = load(game);
    const sk = game.scorekeeper;

    return {
      title: 'Score: ' + game.name,
      back: '#/game/' + game.id,
      html: `<div class="page-head">
          <h1 tabindex="-1">Scorekeeper</h1>
          <p class="muted"><a href="#/game/${esc(game.id)}">${esc(game.name)} rules</a>${sk.hint ? ' · ' + esc(sk.hint) : ''}</p>
        </div>
        <div id="sk-body">${bodyHTML(game, state)}</div>`,
      onMount(root) {
        const body = root.querySelector('#sk-body');
        let wasOver = status(state, game).over;

        function refresh() {
          const active = document.activeElement;
          const k = active && active.dataset ? active.dataset.key : null;
          const openSettings = body.querySelector('details.sk-settings');
          const settingsOpen = openSettings && openSettings.open;
          body.innerHTML = bodyHTML(game, state);
          if (settingsOpen) body.querySelector('details.sk-settings').open = true;
          if (k) {
            const el = body.querySelector(`[data-key="${CSS.escape(k)}"]`);
            if (el && !el.disabled) el.focus({ preventScroll: true });
          }
          const st = status(state, game);
          if (st.over && !wasOver) {
            CGR.ui.announce(`Game over. ${st.winners.map((w) => w.p.name).join(' and ')} ${st.winners.length > 1 ? 'tie' : 'wins'}.`);
            if (navigator.vibrate) { try { navigator.vibrate(120); } catch (e) { /* ignore */ } }
          }
          wasOver = st.over;
        }

        const nameOf = (pid) => state.players.find((p) => p.id === pid).name;

        body.addEventListener('click', async (e) => {
          const el = e.target.closest('[data-act]');
          if (!el || el.disabled) return;
          const pid = el.dataset.pid;
          switch (el.dataset.act) {
            case 'add': {
              const amt = Number(el.dataset.amt);
              add(state, pid, amt);
              refresh();
              CGR.ui.announce(`${nameOf(pid)} ${fmtDelta(amt)}, total ${total(state, pid)}`);
              break;
            }
            case 'custom': {
              const r = await CGR.ui.dialog({
                title: `Custom amount for ${nameOf(pid)}`,
                input: { label: 'Amount', type: 'number', inputmode: 'numeric', value: '' },
                actions: [
                  { label: 'Cancel', value: 'cancel', style: 'secondary' },
                  { label: '− Subtract', value: 'sub', style: 'secondary' },
                  { label: '+ Add', value: 'add', primary: true }
                ]
              });
              const n = Number(String(r.value).replace(',', '.'));
              if ((r.action === 'add' || r.action === 'sub') && r.value !== '' && isFinite(n) && n !== 0) {
                const amt = r.action === 'sub' ? -n : n;
                add(state, pid, amt);
                refresh();
                CGR.ui.announce(`${nameOf(pid)} ${fmtDelta(amt)}, total ${total(state, pid)}`);
              }
              break;
            }
            case 'rename': {
              const actions = [{ label: 'Cancel', value: 'cancel', style: 'secondary' }];
              if (state.players.length > 1) actions.push({ label: 'Remove', value: 'remove', style: 'danger' });
              actions.push({ label: 'Save', value: 'save', primary: true });
              const r = await CGR.ui.dialog({
                title: sk.teams ? 'Team name' : 'Player name',
                input: { label: 'Name', type: 'text', value: nameOf(pid), maxlength: 30 },
                actions
              });
              if (r.action === 'save' && r.value.trim() && r.value.trim() !== nameOf(pid)) {
                rename(state, pid, r.value.trim());
                refresh();
              } else if (r.action === 'remove') {
                const name = nameOf(pid);
                if (await CGR.ui.confirm(`Remove ${name}?`, `${name} and their scores will be removed. You can undo this.`, 'Remove', true)) {
                  removePlayer(state, pid);
                  refresh();
                  CGR.ui.announce(`${name} removed`);
                }
              }
              break;
            }
            case 'addPlayer': {
              const r = await CGR.ui.dialog({
                title: sk.teams ? 'Add team' : 'Add player',
                input: { label: 'Name', type: 'text', value: defaultName(game, state.players.length), maxlength: 30 },
                actions: [{ label: 'Cancel', value: 'cancel', style: 'secondary' }, { label: 'Add', value: 'add', primary: true }]
              });
              if (r.action === 'add' && r.value.trim()) {
                addPlayer(state, r.value.trim());
                refresh();
                CGR.ui.announce(`${r.value.trim()} added`);
              }
              break;
            }
            case 'round': {
              if (!Object.keys(currentRound(state)).length) {
                CGR.ui.announce('Nothing scored this round yet');
                await CGR.ui.dialog({ title: 'Nothing scored yet', message: `Add some scores to round ${state.rounds.length} before starting the next round.`, actions: [{ label: 'OK', value: 'ok', primary: true }] });
                break;
              }
              nextRound(state);
              refresh();
              CGR.ui.announce(`Round ${state.rounds.length}`);
              break;
            }
            case 'undo': {
              const msg = undo(state);
              refresh();
              if (msg) CGR.ui.announce(msg);
              break;
            }
            case 'new': {
              if (await CGR.ui.confirm('Start a new game?', 'All scores and history will be cleared. Players and settings are kept.', 'New game', true)) {
                state.rounds = [{}];
                state.undo = [];
                save(state);
                wasOver = false;
                refresh();
                window.scrollTo(0, 0);
                CGR.ui.announce('New game started');
              }
              break;
            }
            case 'reset': {
              if (await CGR.ui.confirm('Reset scorekeeper?', `This removes all players, scores and settings for ${game.name} and cannot be undone.`, 'Reset', true)) {
                CGR.store.remove(key(game.id));
                live[game.id] = create(game);
                CGR.router.render();
                CGR.ui.announce('Scorekeeper reset');
              }
              break;
            }
            case 'share': {
              await shareResults(game, state);
              break;
            }
            case 'defaults': {
              state.target = sk.target;
              state.direction = sk.direction;
              save(state);
              refresh();
              break;
            }
          }
        });

        body.addEventListener('change', (e) => {
          if (e.target.id === 'sk-target') {
            const v = e.target.value.trim();
            const n = Number(v);
            state.target = v === '' || !isFinite(n) ? null : n;
            save(state);
            refresh();
          } else if (e.target.id === 'sk-dir') {
            state.direction = e.target.value === 'low' ? 'low' : 'high';
            save(state);
            refresh();
          }
        });
      }
    };
  }

  CGR.views.score = view;
  return { hasSaved, savedGames, status, total, resultsText, resultsCSV, _create: create };
})();
