/* Card Game Rulebook — router, views and app shell. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};
CGR.state = { query: '', favOnly: false, lastCount: null, lastType: 'cards' };

const esc = CGR.esc;

/* ---------------------------------------------------------------------------
 * UI helpers: modal dialog + screen-reader announcements
 * ------------------------------------------------------------------------- */
CGR.ui = {
  /* Show a modal dialog. Resolves to { action, value }.
   * opts: { title, message, input: { label, type, value, inputmode }, actions: [{ label, value, style, primary }] } */
  dialog(opts) {
    const dlg = document.getElementById('ui-dialog');
    const title = document.getElementById('ui-dialog-title');
    const msg = document.getElementById('ui-dialog-message');
    const field = document.getElementById('ui-dialog-field');
    const label = document.getElementById('ui-dialog-label');
    const input = document.getElementById('ui-dialog-input');
    const actions = document.getElementById('ui-dialog-actions');

    title.textContent = opts.title || '';
    msg.textContent = opts.message || '';
    msg.hidden = !opts.message;
    msg.classList.toggle('pre', !!opts.pre);
    field.hidden = !opts.input;
    if (opts.input) {
      label.textContent = opts.input.label || '';
      input.type = opts.input.type || 'text';
      input.value = opts.input.value == null ? '' : opts.input.value;
      input.setAttribute('inputmode', opts.input.inputmode || (input.type === 'number' ? 'decimal' : 'text'));
      if (opts.input.maxlength) input.maxLength = opts.input.maxlength; else input.removeAttribute('maxlength');
    }
    const list = opts.actions || [{ label: 'Cancel', value: 'cancel', style: 'secondary' }, { label: 'OK', value: 'ok', primary: true }];
    actions.innerHTML = list.map((a) =>
      `<button class="btn ${a.style ? 'btn-' + a.style : ''}" value="${esc(a.value)}">${esc(a.label)}</button>`).join('');
    const primary = list.find((a) => a.primary) || list[list.length - 1];

    return new Promise((resolve) => {
      const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); dlg.close(primary.value); }
      };
      input.addEventListener('keydown', onKey);
      dlg.addEventListener('close', function onClose() {
        dlg.removeEventListener('close', onClose);
        input.removeEventListener('keydown', onKey);
        resolve({ action: dlg.returnValue || 'cancel', value: input.value });
      });
      dlg.returnValue = '';
      dlg.showModal();
      if (opts.input) { input.focus(); input.select(); }
      else { const b = actions.querySelector(`button[value="${CSS.escape(primary.value)}"]`); if (b) b.focus(); }
    });
  },

  async confirm(title, message, okLabel, danger) {
    const r = await this.dialog({
      title, message,
      actions: [
        { label: 'Cancel', value: 'cancel', style: 'secondary' },
        { label: okLabel || 'OK', value: 'ok', style: danger ? 'danger' : '', primary: true }
      ]
    });
    return r.action === 'ok';
  },

  /* Brief on-screen confirmation, also announced to screen readers. */
  toast(text) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
  },

  announce(text) {
    const el = document.getElementById('announcer');
    el.textContent = '';
    setTimeout(() => { el.textContent = text; }, 30);
  }
};

/* ---------------------------------------------------------------------------
 * On-demand script loading for party games (keeps app start-up fast).
 * The service worker precaches these files, so this works offline.
 * ------------------------------------------------------------------------- */
CGR.loadScripts = (function () {
  const loaded = {};
  return function (files) {
    return files.reduce((p, f) => p.then(() => loaded[f] || (loaded[f] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = f;
      s.onload = resolve;
      s.onerror = () => { delete loaded[f]; reject(new Error('Failed to load ' + f)); };
      document.head.appendChild(s);
    }))), Promise.resolve());
  };
})();

const PC = 'js/party-common.js';
CGR.PARTY_GAMES = [
  { id: 'impostor', emoji: '🕵️', name: 'Impostor', players: '3–12 players', desc: 'Everyone gets the secret word except the impostor. Give clues and find the bluffer.',
    files: ['js/impostor-words.js', 'js/impostor-logic.js', 'js/impostor.js'] },
  { id: 'werewolf', emoji: '🐺', name: 'Werewolf / Mafia', players: '5–18 players + narrator', desc: 'Secret roles, night and day. The app deals roles and guides the narrator.',
    files: [PC, 'js/werewolf-logic.js', 'js/werewolf.js'] },
  { id: 'hot-potato', emoji: '🥔', name: 'Hot Potato', players: '2–16 players', desc: 'Answer the prompt and pass the phone before the hidden fuse goes off.',
    files: [PC, 'js/party-logic.js', 'js/party-words.js', 'js/hot-potato.js'] },
  { id: 'charades', emoji: '🎭', name: 'Charades', players: '4+ players in teams', desc: 'Act it out with no talking. Beat the clock for points.',
    files: [PC, 'js/impostor-words.js', 'js/party-words.js', 'js/guess-logic.js', 'js/guess-games.js'] },
  { id: 'fishbowl', emoji: '🐟', name: 'Fishbowl', players: '4+ players in teams', desc: 'Everyone adds words; guess them all three times: describe, one word, act.',
    files: [PC, 'js/impostor-words.js', 'js/party-words.js', 'js/guess-logic.js', 'js/guess-games.js'] },
  { id: 'chooser', emoji: '👆', name: 'Finger chooser', players: 'Any group', desc: 'Everyone touches the screen; it picks a player or splits you into teams.',
    files: [PC, 'js/party-logic.js', 'js/party-tools.js'] },
  { id: 'toolkit', emoji: '🧰', name: 'Party toolkit', players: 'Any group', desc: 'Dice roller, coin flip and a quick scoreboard.',
    files: [PC, 'js/party-logic.js', 'js/party-tools.js'] }
];

/* Return the view if its scripts are loaded; otherwise load them, then re-render. */
function lazyView(id) {
  const def = CGR.PARTY_GAMES.find((g) => g.id === id);
  if (CGR.views[id]) return CGR.views[id]();
  return {
    title: def.name, back: '#/party',
    html: '<p class="loading">Loading…</p>',
    onMount(view) {
      const hash = location.hash;
      CGR.loadScripts(def.files).then(() => { if (location.hash === hash) CGR.router.render(); }).catch(() => {
        view.innerHTML = `<div class="page-head"><h1 tabindex="-1">Couldn’t load ${CGR.esc(def.name)}</h1></div>
          <p>Connect to the internet once so the app can save this game for offline use.</p>
          <button class="btn" onclick="location.reload()">Try again</button>`;
      });
    }
  };
}

/* ---------------------------------------------------------------------------
 * Shared view fragments
 * ------------------------------------------------------------------------- */
const DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

function gameListHTML(list, emptyHTML) {
  if (!list.length) return `<div class="empty">${emptyHTML || 'No games found.'}</div>`;
  return `<ul class="game-list">${list.map((g) => {
    const fav = CGR.favs.has(g.id);
    const inProgress = CGR.score && CGR.score.hasSaved(g.id);
    return `<li class="game-item"><a href="#/game/${esc(g.id)}">
      <span class="name">${esc(g.name)}${fav ? '<span class="star" aria-label="favourite">★</span>' : ''}</span>
      <span class="meta">${CGR.data.typeOf(g) === 'dice' ? '🎲 Dice · ' : ''}${esc(CGR.data.playersLabel(g))} · ${esc(CGR.data.timeLabel(g))} · ${DIFF_LABEL[g.difficulty]}</span>
      ${inProgress ? '<span class="resume">● Score in progress</span>' : ''}
    </a></li>`;
  }).join('')}</ul>`;
}

/* ---------------------------------------------------------------------------
 * Views. Each returns { title, html, back, onMount }.
 * ------------------------------------------------------------------------- */
function typeTabsHTML(type) {
  const tab = (href, t, emoji, label, n) => `<a href="${href}" ${type === t ? 'aria-current="page"' : ''}><span aria-hidden="true">${emoji}</span> ${label} <span class="n">${n}</span></a>`;
  return `<nav class="type-tabs three" aria-label="Game type">
      ${tab('#/', 'cards', '🃏', 'Cards', CGR.data.ofType('cards').length)}
      ${tab('#/dice', 'dice', '🎲', 'Dice', CGR.data.ofType('dice').length)}
      ${tab('#/party', 'party', '🎉', 'Party', CGR.PARTY_GAMES.length)}
    </nav>`;
}

CGR.views.party = function () {
  CGR.state.lastCount = null;
  return {
    title: 'Party games',
    back: null,
    html: `${typeTabsHTML('party')}
      <div class="page-head"><h1 tabindex="-1">Party games</h1>
        <p class="muted">Play on one phone — pass it round. Everything works offline.</p></div>
      <ul class="game-list party-list">${CGR.PARTY_GAMES.map((g) => `<li class="game-item"><a href="#/${g.id}">
        <span class="name"><span aria-hidden="true">${g.emoji}</span> ${CGR.esc(g.name)}</span>
        <span class="meta">${CGR.esc(g.players)}</span>
        <span class="party-desc">${CGR.esc(g.desc)}</span>
      </a></li>`).join('')}</ul>`
  };
};

CGR.views.home = function (type) {
  type = type === 'dice' ? 'dice' : 'cards';
  CGR.state.lastType = type;
  CGR.state.lastCount = null;
  CGR.state.favOnly = false; // list filters are per browsing session from home
  CGR.state.tag = null;
  const base = CGR.data.base(type);
  // Only show player counts that have at least one game of this type
  // (no dice game is played solo, so dice has no "1" button).
  const counts = CGR.data.COUNTS.map((c) => {
    const n = CGR.data.forCount(c, type).length;
    if (!n) return '';
    return `<a class="count-btn" href="${base}players/${encodeURIComponent(c)}">
      <span class="num">${esc(c)}</span><span class="lbl">${c === '1' ? 'player' : 'players'} · ${n} games</span></a>`;
  }).join('');
  const nCards = CGR.data.ofType('cards').length;
  const nDice = CGR.data.ofType('dice').length;
  const tabs = typeTabsHTML(type);

  const saved = CGR.score.savedGames();
  const resume = saved.length ? `<section class="section" aria-labelledby="resume-h">
      <h2 id="resume-h">Scores in progress</h2>
      <ul class="game-list">${saved.map(({ game, state }) => `<li class="game-item"><a href="#/score/${esc(game.id)}">
        <span class="name">${esc(game.name)}</span>
        <span class="meta">${state.players.length} ${state.players.length === 1 ? 'player' : 'players'} · round ${state.rounds.length} · updated ${esc(new Date(state.updatedAt).toLocaleDateString())}</span>
      </a></li>`).join('')}</ul></section>` : '';

  const favCount = CGR.favs.all().filter((id) => CGR.data.get(id)).length;

  return {
    title: type === 'dice' ? 'Dice games' : 'Card Rules',
    back: null,
    html: `
      ${tabs}
      <div class="page-head"><h1 tabindex="-1">${type === 'dice' ? 'Dice games: how many players?' : 'How many players?'}</h1></div>
      <div class="search" role="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 9.5 16a6.5 6.5 0 0 0 4.2-1.6l.3.3v.8l5 5 1.5-1.5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>
        <input type="search" id="q" placeholder="Search games or keywords" aria-label="Search all games by name or keyword" autocomplete="off" enterkeyhint="search" value="${esc(CGR.state.query)}">
      </div>
      <div id="search-results" aria-live="polite"></div>
      <div id="home-main">
        <nav class="count-grid${CGR.data.COUNTS.filter((c) => CGR.data.forCount(c, type).length).length === 4 ? ' four' : ''}" aria-label="Browse ${type === 'dice' ? 'dice' : 'card'} games by number of players">${counts}</nav>
        <a class="btn btn-block pick-btn" href="#/pick?type=${type}">🎲 Pick a game for us</a>
        <div class="home-links">
          <a class="btn btn-secondary" href="#/favourites">★ Favourites (${favCount})</a>
          <a class="btn btn-secondary" href="${base}all">All ${type === 'dice' ? 'dice' : 'card'} games (${type === 'dice' ? nDice : nCards})</a>
        </div>
        ${resume}
      </div>`,
    onMount(root) {
      const input = root.querySelector('#q');
      const results = root.querySelector('#search-results');
      const main = root.querySelector('#home-main');
      const update = () => {
        CGR.state.query = input.value;
        const q = input.value.trim();
        if (!q) { results.innerHTML = ''; main.hidden = false; return; }
        const found = CGR.data.search(q);
        main.hidden = true;
        results.innerHTML = `<p class="muted">${found.length} ${found.length === 1 ? 'game' : 'games'} matching “${esc(q)}”</p>` +
          gameListHTML(found, `No games match “${esc(q)}”. Try a different word, like “trick”, “kids” or “rummy”.`);
      };
      input.addEventListener('input', update);
      if (CGR.state.query) update();
    }
  };
};

function listView({ title, subtitle, list, emptyHTML, allowFavFilter, back }) {
  const favOnly = allowFavFilter && CGR.state.favOnly;
  // Tag filter: only offer tags that appear in this list.
  const present = Object.keys(CGR.data.TAG_LABELS).filter((t) => list.some((g) => CGR.data.tagsOf(g).indexOf(t) !== -1));
  const tag = present.indexOf(CGR.state.tag) !== -1 ? CGR.state.tag : null;
  const shown = list.filter((g) => (!favOnly || CGR.favs.has(g.id)) && (!tag || CGR.data.tagsOf(g).indexOf(tag) !== -1));
  const subtitleText = tag || favOnly ? `${shown.length} of ${subtitle}` : subtitle;
  return {
    title,
    back: back || '#/',
    html: `
      <div class="page-head"><h1 tabindex="-1">${esc(title)}</h1><p class="muted" id="list-count">${esc(subtitleText)}</p></div>
      ${allowFavFilter || present.length > 1 ? `<div class="filter-bar" role="group" aria-label="Filter games">
        ${allowFavFilter ? `<button type="button" class="chip" id="fav-filter" aria-pressed="${favOnly}">★ Favourites only</button>` : ''}
        ${present.length > 1 ? present.map((t) => `<button type="button" class="chip chip-tag" data-tag="${esc(t)}" aria-pressed="${t === tag}">${esc(CGR.data.TAG_LABELS[t])}</button>`).join('') : ''}
      </div>` : ''}
      ${gameListHTML(shown, favOnly && !shown.length ? 'None of these games are favourites yet. Tap ☆ on a game page to add one.' : tag ? 'No games match this filter.' : emptyHTML)}`,
    onMount(root) {
      const b = root.querySelector('#fav-filter');
      if (b) b.addEventListener('click', () => { CGR.state.favOnly = !CGR.state.favOnly; CGR.router.render({ keepScroll: true }); });
      const active = root.querySelector('.chip-tag[aria-pressed="true"]');
      if (active) {
        const bar = active.parentElement;
        bar.scrollLeft = Math.max(0, active.offsetLeft - bar.clientWidth / 2 + active.offsetWidth / 2);
      }
      root.querySelectorAll('.chip-tag').forEach((c) => c.addEventListener('click', () => {
        CGR.state.tag = CGR.state.tag === c.dataset.tag ? null : c.dataset.tag;
        CGR.router.render({ keepScroll: true });
        const again = document.querySelector(`.chip-tag[data-tag="${CSS.escape(c.dataset.tag)}"]`);
        if (again) again.focus({ preventScroll: true });
      }));
    }
  };
}

CGR.views.players = function (count, type) {
  type = type === 'dice' ? 'dice' : 'cards';
  if (CGR.data.COUNTS.indexOf(count) === -1) return CGR.views.notFound();
  CGR.state.lastCount = count;
  CGR.state.lastType = type;
  const list = CGR.data.forCount(count, type);
  const kind = type === 'dice' ? 'dice games' : 'card games';
  return listView({
    title: (type === 'dice' ? 'Dice: ' : '') + CGR.data.countLabel(count),
    subtitle: `${list.length} ${kind}${count === '5+' ? ' for five or more players' : ''}`,
    list, allowFavFilter: true, back: type === 'dice' ? '#/dice' : '#/',
    emptyHTML: `No ${kind} for ${esc(CGR.data.countLabel(count))}.`
  });
};

CGR.views.all = function (type) {
  type = type === 'dice' ? 'dice' : 'cards';
  CGR.state.lastCount = null;
  CGR.state.lastType = type;
  const list = CGR.data.ofType(type);
  return listView({
    title: type === 'dice' ? 'All dice games' : 'All card games',
    subtitle: `${list.length} games, A–Z`, list, allowFavFilter: true, back: type === 'dice' ? '#/dice' : '#/'
  });
};

CGR.views.favourites = function () {
  CGR.state.lastCount = null;
  const list = CGR.data.all().filter((g) => CGR.favs.has(g.id));
  return listView({
    title: 'Favourites', subtitle: `${list.length} saved`, list,
    emptyHTML: 'No favourites yet. Open any game and tap <strong>☆ Favourite</strong> to save it here.'
  });
};

CGR.views.game = function (id) {
  const g = CGR.data.get(id);
  if (!g) return CGR.views.notFound();
  const fav = CGR.favs.has(g.id);
  const inProgress = CGR.score.hasSaved(g.id);
  const sk = g.scorekeeper;
  const ol = (arr) => `<ol>${arr.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
  const ul = (arr) => `<ul>${arr.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
  const scoreHint = [
    sk.direction === 'low' ? 'Lowest score wins' : 'Highest score wins',
    sk.target ? `game ends at ${sk.target.toLocaleString()}` : null
  ].filter(Boolean).join(', ');

  const gType = CGR.data.typeOf(g);
  const gBase = CGR.data.base(gType);
  return {
    title: g.name,
    back: CGR.state.lastCount ? gBase + 'players/' + encodeURIComponent(CGR.state.lastCount) : (gType === 'dice' ? '#/dice' : '#/'),
    html: `
      <article class="rules">
        <div class="page-head">
          <h1 tabindex="-1">${esc(g.name)}</h1>
          <ul class="badges" aria-label="Game details">
            ${gType === 'dice' ? '<li class="badge">🎲 Dice game</li>' : ''}
            <li class="badge">👥 ${esc(CGR.data.playersLabel(g))}</li>
            <li class="badge">⏱ ${esc(CGR.data.timeLabel(g))}</li>
            <li class="badge ${esc(g.difficulty)}">${DIFF_LABEL[g.difficulty]}</li>
          </ul>
          ${CGR.data.tagsOf(g).length ? `<ul class="tags" aria-label="Tags">${CGR.data.tagsOf(g).map((t) => `<li>${esc(CGR.data.TAG_LABELS[t])}</li>`).join('')}</ul>` : ''}
          ${g.aliases && g.aliases.length ? `<p class="aliases">Also known as: ${esc(g.aliases.join(', '))}</p>` : ''}
        </div>

        ${g.quickStart && g.quickStart.length ? `<section class="quick-start" aria-labelledby="qs-h">
          <h2 id="qs-h">Quick start</h2>${ul(g.quickStart)}
        </section>` : ''}

        <h2>Equipment</h2>${ul(g.equipment)}
        <h2>Objective</h2><p>${esc(g.objective)}</p>
        <h2>Setup &amp; dealing</h2>${ol(g.setup)}
        <h2>Gameplay</h2>${ol(g.gameplay)}
        <h2>Scoring &amp; winning</h2>${ul(g.scoring)}
        <p class="muted small">Score tracker: ${esc(scoreHint)}.</p>
        ${g.variations && g.variations.length ? `<h2>Common variations</h2>${ul(g.variations)}` : ''}

        <p class="also muted">Listed under: ${g.playerCounts.map((c) =>
          `<a href="${gBase}players/${encodeURIComponent(c)}">${esc(CGR.data.countLabel(c))}</a>`).join(' · ')}${gType === 'dice' ? ' (dice games)' : ''}</p>
      </article>
      <div class="action-bar"><div class="action-bar-inner">
        <button type="button" class="btn btn-secondary fav-btn" id="fav-btn" aria-pressed="${fav}">
          <span class="star-icon" aria-hidden="true">${fav ? '★' : '☆'}</span><span>${fav ? 'Favourite' : 'Favourite'}</span>
        </button>
        <a class="btn" href="#/score/${esc(g.id)}">${inProgress ? 'Resume scorekeeper' : 'Start scorekeeper'}</a>
      </div></div>`,
    onMount(root) {
      const btn = root.querySelector('#fav-btn');
      btn.addEventListener('click', () => {
        const on = CGR.favs.toggle(g.id);
        btn.setAttribute('aria-pressed', String(on));
        btn.querySelector('.star-icon').textContent = on ? '★' : '☆';
        CGR.ui.announce(on ? `${g.name} added to favourites` : `${g.name} removed from favourites`);
      });
    }
  };
};

CGR.views.notFound = function () {
  return {
    title: 'Not found', back: '#/',
    html: `<div class="page-head"><h1 tabindex="-1">Page not found</h1></div>
      <p>That page doesn’t exist.</p><a class="btn" href="#/">Go to home</a>`
  };
};

/* ---------------------------------------------------------------------------
 * Router (hash based, so it works on any static host and subpath)
 * ------------------------------------------------------------------------- */
CGR.router = (function () {
  const view = document.getElementById('view');
  const backBtn = document.getElementById('back-btn');
  let current = null;
  let depth = 0; // how many in-app history entries deep we are

  function parse() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [path, query] = hash.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(query || '');
    return { parts, params };
  }

  function resolve() {
    const { parts, params } = parse();
    switch (parts[0]) {
      case undefined: return CGR.views.home('cards');
      case 'dice':
        if (parts[1] === undefined) return CGR.views.home('dice');
        if (parts[1] === 'players') return CGR.views.players(parts[2], 'dice');
        if (parts[1] === 'all') return CGR.views.all('dice');
        return CGR.views.notFound();
      case 'players': return CGR.views.players(parts[1], 'cards');
      case 'all': return CGR.views.all('cards');
      case 'favourites': return CGR.views.favourites();
      case 'game': return CGR.views.game(parts[1]);
      case 'score': return CGR.views.score(parts[1], params);
      case 'pick': return CGR.views.pick(params);
      case 'party': return CGR.views.party();
      default:
        if (CGR.PARTY_GAMES.some((g) => g.id === parts[0])) return lazyView(parts[0]);
        return CGR.views.notFound();
    }
  }

  function render(opts) {
    const keepScroll = opts && opts.keepScroll;
    const y = window.scrollY;
    if (current && current.onUnmount) current.onUnmount(); // let the old screen clean up
    current = resolve();
    view.innerHTML = current.html;
    document.title = current.title === 'Card Rules' ? 'Card & Dice Rulebook' : current.title + ' · Card Rules';
    backBtn.hidden = !current.back;
    if (current.onMount) current.onMount(view);
    if (keepScroll) { window.scrollTo(0, y); return; }
    window.scrollTo(0, 0);
    const h1 = view.querySelector('h1');
    if (h1 && opts && opts.focus) h1.focus({ preventScroll: true });
  }

  function onHashChange() {
    // Tag each history entry with its depth so the Back button knows whether
    // there is an in-app page to go back to (vs. a deep link opened directly).
    if (history.state && typeof history.state.depth === 'number') depth = history.state.depth;
    else { depth += 1; history.replaceState({ depth }, ''); }
    render({ focus: true });
  }

  async function back() {
    // A screen can ask before leaving (e.g. a game in progress).
    if (current && current.confirmLeave && !(await current.confirmLeave())) return;
    if (depth > 0) history.back();
    else location.hash = current && current.back ? current.back : '#/';
  }

  function start() {
    if (!history.state || typeof history.state.depth !== 'number') history.replaceState({ depth: 0 }, '');
    depth = history.state.depth;
    window.addEventListener('hashchange', onHashChange);
    backBtn.addEventListener('click', back);
    render();
  }

  return { start, render };
})();

/* ---------------------------------------------------------------------------
 * Settings: theme toggle, settings sheet, font size
 * ------------------------------------------------------------------------- */
(function settingsUI() {
  const FONT_STEPS = [0.85, 1, 1.15, 1.3, 1.5, 1.75];
  const dlg = document.getElementById('settings-dialog');
  const out = document.getElementById('font-value');

  CGR.settings.apply(CGR.settings.get());

  function sync() {
    const s = CGR.settings.get();
    dlg.querySelectorAll('input[name="theme"]').forEach((r) => { r.checked = r.value === s.theme; });
    out.textContent = Math.round(s.fontScale * 100) + '%';
    document.getElementById('font-down').disabled = s.fontScale <= FONT_STEPS[0];
    document.getElementById('font-up').disabled = s.fontScale >= FONT_STEPS[FONT_STEPS.length - 1];
    const ready = navigator.serviceWorker && navigator.serviceWorker.controller;
    document.getElementById('offline-status').textContent = ready
      ? '✓ Saved for offline use.' : 'Offline use will be ready after this first visit finishes loading.';
  }

  function stepFont(dir) {
    const s = CGR.settings.get();
    let i = FONT_STEPS.findIndex((v) => Math.abs(v - s.fontScale) < 0.01);
    if (i === -1) i = 1;
    i = Math.max(0, Math.min(FONT_STEPS.length - 1, i + dir));
    CGR.settings.update({ fontScale: FONT_STEPS[i] });
    sync();
  }

  document.getElementById('settings-btn').addEventListener('click', () => { sync(); dlg.showModal(); });
  document.getElementById('font-down').addEventListener('click', () => stepFont(-1));
  document.getElementById('font-up').addEventListener('click', () => stepFont(1));
  dlg.querySelectorAll('input[name="theme"]').forEach((r) =>
    r.addEventListener('change', () => { CGR.settings.update({ theme: r.value }); }));

  document.getElementById('theme-btn').addEventListener('click', () => {
    const dark = CGR.settings.isDark();
    CGR.settings.update({ theme: dark ? 'light' : 'dark' });
    CGR.ui.announce(dark ? 'Light mode' : 'Dark mode');
  });

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => CGR.settings.apply(CGR.settings.get());
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
})();

/* ---------------------------------------------------------------------------
 * Service worker registration + update prompt
 * ------------------------------------------------------------------------- */
(function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const banner = document.getElementById('update-banner');
  let refreshing = false;

  function showUpdate(worker) {
    banner.hidden = false;
    document.getElementById('update-reload').onclick = () => {
      updateRequested = true;
      worker.postMessage('SKIP_WAITING');
    };
  }

  // Reload only when the user asked for the update. The first install also
  // fires controllerchange (via clients.claim) and must not reload the page.
  let updateRequested = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !updateRequested) return;
    refreshing = true;
    location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(nw);
        });
      });
      // Look for a new version whenever the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch((err) => console.warn('Service worker registration failed:', err));
  });
})();

/* ---------------------------------------------------------------------------
 * Boot
 * ------------------------------------------------------------------------- */
CGR.data.load().then(() => CGR.router.start()).catch((err) => {
  console.error(err);
  document.getElementById('view').innerHTML = `
    <div class="page-head"><h1>Couldn’t load the games</h1></div>
    <p>The game data could not be loaded. If this is your first visit, connect to the internet once so the app can save itself for offline use.</p>
    <button class="btn" onclick="location.reload()">Try again</button>`;
});
