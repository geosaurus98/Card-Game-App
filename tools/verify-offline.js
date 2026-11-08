/* End-to-end offline check with Playwright (Chromium).
 *
 *   1. Serve the app from a subpath, like GitHub Pages does. From the folder
 *      that CONTAINS Card-Game-App:
 *        python3 -m http.server 8081 --bind 127.0.0.1
 *   2. node Card-Game-App/tools/verify-offline.js http://127.0.0.1:8081/Card-Game-App/ [screenshot-dir]
 *
 * Requires Playwright (npm i -D playwright && npx playwright install chromium).
 * Loads the app online, waits for the service worker to take control, then
 * switches the browser offline and exercises every screen.
 */
const { chromium, devices } = require('playwright');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:8081/Card-Game-App/';
const SHOTS = process.argv[3] || null;
let failures = 0;
const until = async (page, fn, arg) => { try { await page.waitForFunction(fn, arg, { timeout: 3000 }); return true; } catch (e) { return false; } };
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (name, p) => { if (SHOTS) await (p || page).screenshot({ path: path.join(SHOTS, name + '.png') }); };

  // ---- Online first load ----
  await page.goto(BASE);
  await page.waitForSelector('.count-btn');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 });
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const keys = await caches.keys();
    const cache = await caches.open(keys[0]);
    const urls = (await cache.keys()).map((r) => new URL(r.url).pathname);
    return { scope: reg.scope, keys, urls };
  });
  ok(sw.scope === new URL(BASE).href, `service worker registered with scope ${sw.scope}`);
  ok(sw.keys.length === 1 && sw.keys[0].startsWith('card-rules-'), `one versioned cache: ${sw.keys.join(', ')}`);
  ok(sw.urls.some((u) => u.endsWith('/games.json')), `games.json precached (${sw.urls.length} files cached)`);

  // ---- Go offline ----
  await context.setOffline(true);
  const offlineFetchFails = await page.evaluate(() => fetch('https://example.com', { mode: 'no-cors' }).then(() => false, () => true));
  ok(offlineFetchFails, 'network is really offline');
  errors.length = 0; // that deliberate failed fetch logs an expected console error

  await page.reload();
  await page.waitForSelector('.count-btn');
  ok((await page.locator('.count-btn').count()) === 5, 'home: five player-count buttons render offline');
  await shot('01-home');

  // Search
  await page.fill('#q', 'trick');
  const searchN = await page.locator('#search-results .game-item').count();
  ok(searchN >= 8, `search "trick" finds ${searchN} games`);
  await shot('01b-search');
  await page.fill('#q', 'zzzz');
  ok(await page.locator('#search-results .empty').isVisible(), 'search with no results shows a message');
  await page.fill('#q', '');

  // Browse
  for (const c of ['1', '2', '3', '4', '5+']) {
    await page.goto(BASE + '#/players/' + encodeURIComponent(c));
    await page.waitForSelector('.game-item');
    ok((await page.locator('.game-item').count()) >= 5, `browse ${c}: ${await page.locator('.game-item').count()} games`);
  }
  await page.goto(BASE + '#/players/3');
  await page.waitForSelector('.game-item');
  await shot('02-list-3');
  ok(await page.locator('.game-item', { hasText: 'Hearts (3-player)' }).count() === 1, 'Hearts (3-player) listed under 3');
  ok(await page.locator('.game-item', { hasText: 'Oh Hell' }).count() === 1, 'Oh Hell listed under 3');
  await page.goto(BASE + '#/players/5%2B');
  await page.waitForSelector('.game-item');
  ok(await page.locator('.game-item', { hasText: 'Oh Hell' }).count() === 1, 'Oh Hell also listed under 5+');

  // Game page + favourites
  await page.click('.game-item a:has-text("Oh Hell")');
  await page.waitForSelector('article.rules h1');
  const sections = await page.locator('article.rules h2').allTextContents();
  ok(['Equipment', 'Objective', 'Setup & dealing', 'Gameplay', 'Scoring & winning', 'Common variations'].every((s) => sections.includes(s)), 'game page has all rule sections');
  await shot('03-game');
  await page.click('#fav-btn');
  ok((await page.getAttribute('#fav-btn', 'aria-pressed')) === 'true', 'favourite toggled on');
  await page.click('#back-btn');
  await page.waitForSelector('#fav-filter');
  ok(page.url().endsWith('#/players/5%2B'), 'back button returns to the list');
  await page.click('#fav-filter');
  ok((await page.locator('.game-item').count()) === 1, 'favourites filter shows only the starred game');
  await page.goto(BASE + '#/favourites');
  await page.waitForSelector('.game-item');
  ok((await page.locator('.game-item').count()) === 1, 'favourites page lists the starred game');

  // Scorekeeper (Hearts: lowest wins, target 100, 4 players by default)
  await page.goto(BASE + '#/game/hearts');
  await page.waitForSelector('article.rules');
  await page.click('a:has-text("Start scorekeeper")');
  await page.waitForSelector('.player');
  ok((await page.locator('.player').count()) === 4, 'Hearts scorekeeper pre-set to 4 players');
  const p = (i) => page.locator('.player').nth(i);
  await p(0).locator('button[data-amt="13"]').click();
  await p(1).locator('button[data-amt="5"]').click();
  await p(1).locator('button[data-amt="1"]').click();
  await page.click('[data-act="round"]');
  ok((await page.textContent('#round-label')).includes('Round 2'), 'next round advances to round 2');
  await p(2).locator('button[data-amt="26"]').click();
  await page.click('[data-act="undo"]');
  ok((await page.getAttribute('[data-act="undo"]', 'aria-label')).startsWith('Undo'), 'undo button describes the next undo');
  ok((await p(2).locator('.player-total').textContent()).trim() === '0', 'undo removes the last score');
  // Rename
  await p(0).locator('.player-name').click();
  await page.fill('#ui-dialog-input', 'Alice');
  await page.click('#ui-dialog-actions button[value="save"]');
  ok(await until(page, () => document.querySelector('.player .player-name').textContent.includes('Alice')), 'rename player');
  // Custom amount
  await p(0).locator('[data-act="custom"]').click();
  await page.fill('#ui-dialog-input', '90');
  await page.click('#ui-dialog-actions button[value="add"]');
  ok(await until(page, () => document.querySelector('.player .player-total').textContent.trim() === '103'), 'custom amount added (13 + 90 = 103)');
  ok(await page.locator('.gameover').isVisible(), 'game over banner when target reached');
  const banner = (await page.textContent('.gameover')).trim().replace(/\s+/g, ' ');
  ok(/Player 3 & Player 4 share the win/.test(banner), `lowest score wins: "${banner}"`);
  await shot('04-score');
  // Add player
  await page.click('[data-act="addPlayer"]');
  await page.click('#ui-dialog-actions button[value="add"]');
  ok(await until(page, () => document.querySelectorAll('.player').length === 5), 'add player');
  // Persistence across reload (still offline)
  await page.reload();
  await page.waitForSelector('.player');
  ok((await p(0).locator('.player-total').textContent()).trim() === '103' && (await page.locator('.player').count()) === 5, 'scores survive reload');
  await page.locator('.history').scrollIntoViewIfNeeded();
  await shot('04b-history');
  // New game (with confirmation)
  await page.click('.sk-manage [data-act="new"]');
  await page.click('#ui-dialog-actions button[value="ok"]');
  ok(await until(page, () => document.querySelector('.player .player-total').textContent.trim() === '0' && document.querySelectorAll('.player').length === 5), 'new game clears scores, keeps players');
  // Reset
  await page.click('[data-act="reset"]');
  await page.click('#ui-dialog-actions button[value="ok"]');
  ok(await until(page, () => document.querySelectorAll('.player').length === 4), 'reset restores defaults');

  // Elimination game (Spoons: out at 6 letters)
  await page.goto(BASE + '#/score/spoons');
  await page.waitForSelector('.player');
  for (let i = 0; i < 6; i++) await p(0).locator('button[data-amt="1"]').click();
  ok(await until(page, () => (document.querySelector('.gameover') || { textContent: '' }).textContent.includes('is out')), 'Spoons: player reaching 6 letters is out');

  // Picker
  await page.goto(BASE + '#/');
  await page.waitForSelector('.pick-btn');
  await page.click('.pick-btn');
  await page.waitForSelector('#pick-form');
  await page.click('label:has(input[name="count"][value="1"])');
  await page.click('label:has(input[name="difficulty"][value="hard"])');
  await page.click('#pick-go');
  ok((await page.textContent('#pick-name')) === 'Spider Solitaire', 'picker: 1 player + hard = Spider Solitaire');
  await shot('05-picker');
  await page.click('#pick-go');
  ok((await page.textContent('#pick-name')) === 'Spider Solitaire', 'pick again works with a single match');
  await page.click('label:has(input[name="time"][value="long"])');
  ok(await page.locator('text=No matching games').isVisible(), 'picker: zero-match message shown');
  await shot('06-picker-none');
  await page.click('[data-clear="time"]');
  ok(await page.locator('#pick-name').isVisible(), 'picker: loosening a filter recovers a pick');
  await page.click('label:has(input[name="count"][value="5+"])');
  await page.click('label:has(input[name="difficulty"][value=""])');
  const n5 = await page.evaluate(() => CGR.data.filter({ count: '5+', type: 'cards' }).length);
  const seen = new Set();
  for (let i = 0; i < n5; i++) { await page.click('#pick-go'); seen.add(await page.textContent('#pick-name')); }
  ok(seen.size === n5, `picker cycles through all ${n5} card games for 5+ without repeats (${seen.size})`);
  await page.click('.pick-result a:has-text("Read the rules")');
  await page.waitForSelector('article.rules');
  ok(true, 'picker link opens the rules');

  // Dice games
  await page.goto(BASE + '#/');
  await page.waitForSelector('.type-tabs');
  await page.click('.type-tabs a[href="#/dice"]');
  await page.waitForSelector('.count-grid.four');
  ok((await page.locator('.count-btn').count()) === 4, 'dice home: four player-count buttons (no solo dice games)');
  await shot('09-dice-home');
  await page.click('.count-btn:has-text("3")');
  await page.waitForURL('**/#/dice/players/3');
  await page.waitForSelector('.filter-bar');
  ok(page.url().endsWith('#/dice/players/3') && await page.locator('.game-item', { hasText: 'Beetle' }).count() === 1, 'dice list for 3 players includes Beetle');
  ok(await page.locator('.game-item', { hasText: 'Hearts' }).count() === 0, 'dice list contains no card games');
  await page.click('.game-item a:has-text("Craps")');
  await page.waitForSelector('article.rules');
  ok(await page.locator('.badge:has-text("Dice game")').count() === 1, 'dice game page shows a dice badge');
  await shot('10-dice-game');
  await page.click('#back-btn');
  await page.waitForSelector('.filter-bar');
  ok(page.url().endsWith('#/dice/players/3'), 'back from a dice game returns to the dice list');
  await page.goto(BASE + '#/dice');
  await page.waitForSelector('.pick-btn');
  await page.click('.pick-btn');
  await page.waitForSelector('#pick-form');
  ok(await page.isChecked('input[name="type"][value="dice"]'), 'picker opened from dice home defaults to dice');
  await page.click('label:has(input[name="count"][value="1"])');
  ok(await page.locator('text=No matching games').isVisible(), 'picker: no solo dice games → zero-match message');
  await page.click('[data-clear="type"]');
  ok(await page.locator('#pick-name').isVisible(), 'picker: switching to "Either" finds a game');
  await page.goto(BASE + '#/');
  await page.waitForSelector('#q');
  await page.fill('#q', 'dice');
  const nd = await page.locator('#search-results .game-item').count();
  ok(nd >= 12, `search "dice" finds the dice games (${nd})`);
  await page.fill('#q', '');

  // Deep link in a brand-new tab while offline
  const page2 = await context.newPage();
  await page2.goto(BASE + '#/game/cribbage');
  await page2.waitForSelector('article.rules h1');
  ok((await page2.textContent('article.rules h1')) === 'Cribbage', 'deep link opens offline in a new tab');
  await page2.goto(BASE + 'some/unknown/path');
  await page2.waitForSelector('.count-btn');
  ok(await page2.locator('.count-btn').count() === 5 && page2.url() === BASE, 'unknown path offline redirects to the cached app');
  await page2.goto(BASE + 'index.html?utm_source=test#/pick');
  await page2.waitForSelector('#pick-form');
  ok(true, 'index.html with a query string works offline');

  // Dark mode toggle + font size
  await page.goto(BASE + '#/game/bridge');
  await page.waitForSelector('article.rules');
  await page.click('#theme-btn');
  ok((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'manual dark-mode toggle');
  await shot('07-game-dark');
  await page.goto(BASE + '#/');
  await page.waitForSelector('.count-btn');
  await shot('07b-home-dark');
  await page.click('#settings-btn');
  await page.click('#font-up');
  ok((await page.textContent('#font-value')) === '115%', 'font size adjuster');
  await shot('08-settings');
  await page.click('#settings-dialog button[value="close"]');

  // Layout: no horizontal page scroll at phone width
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!overflow, 'no horizontal scrolling at phone width');

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll offline checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
