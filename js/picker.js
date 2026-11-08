/* "Pick a game for us": filter by players (+ optional difficulty / play time)
 * and show a random match. Cycles through all matches before repeating. */
window.CGR = window.CGR || {};
CGR.views = CGR.views || {};

CGR.views.pick = function (params) {
  const esc = CGR.esc;
  const saved = CGR.store.get('picker', {});
  const typeParam = params.get('type');
  const f = {
    type: typeParam !== null ? typeParam : (saved.type != null ? saved.type : (CGR.state.lastType || 'cards')),
    count: params.get('players') || saved.count || CGR.state.lastCount || '4',
    difficulty: saved.difficulty || '',
    time: saved.time || ''
  };
  if (CGR.data.COUNTS.indexOf(f.count) === -1) f.count = '4';
  if (['', 'cards', 'dice'].indexOf(f.type) === -1) f.type = 'cards';

  let bag = [];       // shuffled ids not yet shown for the current filters
  let current = null;

  const radios = (name, legend, options) => `
    <fieldset class="chip-group">
      <legend>${legend}</legend>
      ${options.map(([v, label]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${f[name] === v ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}
    </fieldset>`;

  const html = `
    <div class="page-head"><h1 tabindex="-1">Pick a game for us</h1>
      <p class="muted">Choose your group size, and optionally narrow it down.</p></div>
    <form id="pick-form" onsubmit="return false">
      ${radios('type', 'Game type', [['cards', '🃏 Cards'], ['dice', '🎲 Dice'], ['', 'Either']])}
      ${radios('count', 'Number of players', CGR.data.COUNTS.map((c) => [c, c]))}
      ${radios('difficulty', 'Difficulty <span class="muted small">(optional)</span>', [['', 'Any'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']])}
      ${radios('time', 'Play time <span class="muted small">(optional)</span>', [['', 'Any'], ['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']])}
      <p class="muted small">Short is under 15 minutes, medium 15–45, long 45+.</p>
    </form>
    <p class="match-count" id="match-count" aria-live="polite"></p>
    <div id="pick-result"></div>
    <div class="action-bar"><div class="action-bar-inner">
      <button type="button" class="btn" id="pick-go">🎲 Pick a game</button>
    </div></div>`;

  function matches() { return CGR.data.filter(f); }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return {
    title: 'Pick a game',
    back: f.type === 'dice' ? '#/dice' : '#/',
    html,
    onMount(root) {
      const form = root.querySelector('#pick-form');
      const result = root.querySelector('#pick-result');
      const countEl = root.querySelector('#match-count');
      const go = root.querySelector('#pick-go');

      function updateCount() {
        const n = matches().length;
        countEl.textContent = n === 0 ? 'No games match these filters.' : `${n} ${n === 1 ? 'game matches' : 'games match'}.`;
        go.textContent = current ? '🎲 Pick again' : '🎲 Pick a game';
      }

      function renderNone() {
        const tips = [];
        if (f.type) tips.push('<button type="button" class="btn btn-secondary" data-clear="type">Cards or dice</button>');
        if (f.difficulty) tips.push('<button type="button" class="btn btn-secondary" data-clear="difficulty">Any difficulty</button>');
        if (f.time) tips.push('<button type="button" class="btn btn-secondary" data-clear="time">Any play time</button>');
        result.innerHTML = `<div class="card pop" role="status">
          <h2>No matching games</h2>
          <p>None of our ${f.type === 'dice' ? 'dice games' : f.type === 'cards' ? 'card games' : 'games'} fit ${esc(CGR.data.countLabel(f.count))}${f.difficulty ? ', ' + esc(f.difficulty) : ''}${f.time ? ', ' + esc(f.time) + ' play time' : ''}. Try loosening a filter:</p>
          <div class="btn-row">${tips.join('')}</div>
          <p class="small" style="margin-top:.75rem"><a href="${CGR.data.base(f.type === 'dice' ? 'dice' : 'cards')}players/${encodeURIComponent(f.count)}">See all ${f.type === 'dice' ? 'dice' : 'card'} games for ${esc(CGR.data.countLabel(f.count))}</a></p>
        </div>`;
        result.querySelectorAll('[data-clear]').forEach((b) => b.addEventListener('click', () => {
          f[b.dataset.clear] = '';
          const input = form.querySelector(`input[name="${b.dataset.clear}"][value=""]`);
          if (input) input.checked = true;
          persist();
          pick();
        }));
        CGR.ui.announce('No games match these filters');
      }

      function pick() {
        const list = matches();
        if (!list.length) { current = null; bag = []; updateCount(); renderNone(); return; }
        const ids = list.map((g) => g.id);
        bag = bag.filter((id) => ids.indexOf(id) !== -1);
        if (!bag.length) {
          bag = shuffle(ids.slice());
          // Avoid showing the same game twice in a row when refilling the bag.
          if (bag.length > 1 && current && bag[bag.length - 1] === current.id) bag.unshift(bag.pop());
        }
        current = CGR.data.get(bag.pop());
        const g = current;
        result.innerHTML = `<article class="card pick-result pop" aria-labelledby="pick-name">
          <p class="muted small">How about${CGR.data.typeOf(g) === 'dice' ? ' this dice game' : ''}…</p>
          <h2 id="pick-name">${esc(g.name)}</h2>
          <ul class="badges">
            <li class="badge">👥 ${esc(CGR.data.playersLabel(g))}</li>
            <li class="badge">⏱ ${esc(CGR.data.timeLabel(g))}</li>
            <li class="badge ${esc(g.difficulty)}">${esc(g.difficulty[0].toUpperCase() + g.difficulty.slice(1))}</li>
          </ul>
          <p style="margin-top:.75rem">${esc(g.objective)}</p>
          <div class="btn-row">
            <a class="btn" href="#/game/${esc(g.id)}">Read the rules</a>
            <a class="btn btn-secondary" href="#/score/${esc(g.id)}">Keep score</a>
          </div>
        </article>`;
        updateCount();
        CGR.ui.announce('Picked ' + g.name);
      }

      function persist() { CGR.store.set('picker', { type: f.type, count: f.count, difficulty: f.difficulty, time: f.time }); }

      form.addEventListener('change', (e) => {
        if (!e.target.name) return;
        f[e.target.name] = e.target.value;
        if (e.target.name === 'count') CGR.state.lastCount = f.count;
        if (e.target.name === 'type' && f.type) CGR.state.lastType = f.type;
        persist();
        bag = [];
        current = null;
        result.innerHTML = '';
        updateCount();
        if (!matches().length) renderNone();
      });
      go.addEventListener('click', () => {
        pick();
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      CGR.state.lastCount = f.count; // so "Keep score" pre-sets this many players
      updateCount();
      if (!matches().length) renderNone();
    }
  };
};
