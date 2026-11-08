/* Safe localStorage wrapper. Every access is wrapped in try/catch so the app
 * still works (without persistence) in private mode or when storage is full. */
window.CGR = window.CGR || {};

CGR.store = (function () {
  const PREFIX = 'cgr:';
  let memory = {}; // fallback when localStorage is unavailable

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
    }
  }

  function set(key, value) {
    memory[key] = value;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function remove(key) {
    delete memory[key];
    try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }

  function keys(prefix) {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(PREFIX + prefix) === 0) out.push(k.slice(PREFIX.length));
      }
    } catch (e) {
      Object.keys(memory).forEach((k) => { if (k.indexOf(prefix) === 0) out.push(k); });
    }
    return out;
  }

  return { get, set, remove, keys };
})();

/* Favourites */
CGR.favs = {
  all() { return CGR.store.get('favs', []); },
  has(id) { return this.all().indexOf(id) !== -1; },
  toggle(id) {
    const list = this.all();
    const i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    CGR.store.set('favs', list);
    return i === -1;
  }
};

/* Settings: theme ('system' | 'light' | 'dark') and font scale */
CGR.settings = {
  defaults: { theme: 'system', fontScale: 1 },
  get() { return Object.assign({}, this.defaults, CGR.store.get('settings', {})); },
  update(patch) {
    const next = Object.assign(this.get(), patch);
    CGR.store.set('settings', next);
    this.apply(next);
    return next;
  },
  apply(s) {
    const root = document.documentElement;
    if (s.theme === 'light' || s.theme === 'dark') root.dataset.theme = s.theme;
    else delete root.dataset.theme;
    root.style.setProperty('--font-scale', s.fontScale);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', this.isDark(s) ? '#0f2a20' : '#156546');
  },
  isDark(s) {
    s = s || this.get();
    if (s.theme === 'dark') return true;
    if (s.theme === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
};
