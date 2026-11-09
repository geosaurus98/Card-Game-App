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
  const context = await browser.newContext({ ...devices['Pixel 7'], acceptDownloads: true });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
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
  // Brand names lead to the traditional equivalent
  for (const [q, expect] of [['yahtzee', 'Yacht'], ['uno', 'Crazy Eights'], ['phase 10', 'Contract Rummy'], ['skip-bo', 'Spite and Malice'], ['dutch blitz', 'Racing Demon'], ['left center right', 'Aces to the Centre']]) {
    await page.fill('#q', q);
    const names = await page.locator('#search-results .game-item .name').allTextContents();
    ok(names.some((n) => n.startsWith(expect)), `search "${q}" finds ${expect}`);
  }
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
  ok((await page.locator('.quick-start li').count()) === 3, 'game page shows a 3-line quick start');
  ok(['Quick start', 'Equipment', 'Objective', 'Setup & dealing', 'Gameplay', 'Scoring & winning', 'Common variations'].every((s) => sections.includes(s)), 'game page has all rule sections');
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
  // Share / export results
  await page.click('.gameover [data-act="share"]');
  await page.waitForSelector('#ui-dialog[open]');
  const shareText = await page.textContent('#ui-dialog-message');
  ok(shareText.includes('Hearts — final scores') && shareText.includes('🏆') && shareText.includes('Alice — 103'), 'share dialog shows final standings');
  await shot('04c-share');
  await page.click('#ui-dialog-actions button[value="copy"]');
  await page.waitForSelector('.toast.show');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok(clip === shareText, 'Copy puts the results on the clipboard');
  await page.click('.sk-manage [data-act="share"]');
  await page.waitForSelector('#ui-dialog[open]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#ui-dialog-actions button[value="csv"]')]);
  const csv = require('fs').readFileSync(await dl.path(), 'utf8');
  ok(dl.suggestedFilename().startsWith('hearts-scores-') && /Round,Alice,Player 2/.test(csv) && /Total,103,6,0,0/.test(csv), `CSV export downloads (${dl.suggestedFilename()})`);
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
  const hardSolo = await page.evaluate(() => CGR.data.filter({ count: '1', difficulty: 'hard', type: 'cards' }).map((g) => g.name).sort());
  await page.click('#pick-go');
  const p1 = await page.textContent('#pick-name');
  ok(hardSolo.includes(p1), `picker: 1 player + hard picks one of ${hardSolo.join(', ')} (${p1})`);
  await shot('05-picker');
  await page.click('#pick-go');
  const p2 = await page.textContent('#pick-name');
  ok(hardSolo.length < 2 ? p2 === p1 : p2 !== p1, 'pick again shows a different game when there is one');
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
  await page.waitForSelector('.type-tabs a[href="#/dice"][aria-current="page"]');
  const diceCounts = await page.evaluate(() => CGR.data.COUNTS.filter((c) => CGR.data.forCount(c, 'dice').length).length);
  ok((await page.locator('.count-btn').count()) === diceCounts, `dice home: ${diceCounts} player-count buttons`);
  await shot('09-dice-home');
  await page.click('.count-btn[href="#/dice/players/3"]');
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
  await page.click('label:has(input[name="difficulty"][value="hard"])');
  ok(await page.locator('text=No matching games').isVisible(), 'picker: no hard solo dice games → zero-match message');
  await page.click('[data-clear="type"]');
  ok(await page.locator('#pick-name').isVisible(), 'picker: switching to "Either" finds a game');
  await page.click('label:has(input[name="difficulty"][value=""])');
  await page.click('label:has(input[name="count"][value="4"])');
  await page.click('label:has(input[name="kids"])');
  for (let i = 0; i < 5; i++) {
    await page.click('#pick-go');
    const nm = await page.textContent('#pick-name');
    const isKids = await page.evaluate((n) => CGR.data.all().find((g) => g.name === n).tags.includes('kids'), nm);
    if (!isKids) { ok(false, `"Good for kids" picked a non-kids game: ${nm}`); break; }
    if (i === 4) ok(true, '"Good for kids" option only picks kids games');
  }
  await page.click('label:has(input[name="kids"])');

  // Tag filter on a list
  await page.goto(BASE + '#/players/4');
  await page.waitForSelector('.chip-tag');
  await page.click('.chip-tag[data-tag="trick-taking"]');
  const nTrick = await page.evaluate(() => CGR.data.forCount('4', 'cards').filter((g) => g.tags.includes('trick-taking')).length);
  ok((await page.locator('.game-item').count()) === nTrick && (await page.getAttribute('.chip-tag[data-tag="trick-taking"]', 'aria-pressed')) === 'true', `tag filter: Trick-taking shows ${nTrick} four-player games`);
  await shot('11-tag-filter');
  await page.click('.chip-tag[data-tag="trick-taking"]');
  const n4 = await page.evaluate(() => CGR.data.forCount('4', 'cards').length);
  ok((await page.locator('.game-item').count()) === n4, 'tapping the tag again clears the filter');
  await page.goto(BASE + '#/game/scopa');
  await page.waitForSelector('article.rules');
  await page.goto(BASE + '#/game/shut-the-box');
  await page.waitForSelector('article.rules .tags');
  ok((await page.textContent('article.rules .tags')).includes('Special equipment'), 'game page shows tags');
  await page.goto(BASE + '#/');
  await page.waitForSelector('#q');
  await page.fill('#q', 'dice');
  const nd = await page.locator('#search-results .game-item').count();
  ok(nd >= 12, `search "dice" finds the dice games (${nd})`);
  await page.fill('#q', '');

  // ---------- Impostor word game (offline) ----------
  await page.goto(BASE + '#/');
  await page.waitForSelector('.type-tabs a[href="#/party"]');
  ok(await page.evaluate(() => !CGR.views.impostor && !CGR.views.werewolf), 'party games are not loaded at start-up (lazy loading)');
  await page.click('.type-tabs a[href="#/party"]');
  await page.waitForSelector('.party-list');
  ok((await page.locator('.party-list .game-item').count()) === 7, 'Party tab lists 7 party games');
  await shot('16-party-home');
  await page.click('.party-list a[href="#/impostor"]');
  await page.waitForSelector('#imp-setup');
  ok((await page.locator('.imp-name input').count()) === 4, 'impostor: setup defaults to 4 players');
  const impNames = ['Ann', 'Ben', 'Cat', 'Dan'];
  for (let i = 0; i < 4; i++) await page.fill(`[data-name="${i}"]`, impNames[i]);
  await page.selectOption('#imp-cat', 'Animals');
  await page.selectOption('#imp-timer', '1');
  await shot('12-impostor-setup');
  await page.click('#imp-start');
  await page.waitForSelector('.imp-pass');
  ok((await page.textContent('.imp-pass h1')).includes('Ann'), 'impostor: "Pass to Ann" first');
  const animals = await page.evaluate(() => CGR.impostorWords.Animals);
  const rootText = () => page.evaluate(() => document.getElementById('imp-root').innerText);
  const roles = [];
  for (let i = 0; i < 4; i++) {
    await page.click('#imp-ready');
    await page.waitForSelector('#imp-card');
    ok(await page.isDisabled('#imp-done'), `impostor: player ${i + 1}'s Done is disabled until the card is held`);
    const box = await page.locator('#imp-card').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const held = await page.textContent('#imp-card');
    if (i === 0) await shot('13-impostor-held');
    if (i === 1) {
      // App goes to background while the card is held → role hidden, back to "Pass to".
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      });
      await page.mouse.up();
      await page.waitForSelector('.imp-pass');
      const t = await rootText();
      ok(t.includes('Pass to') && !animals.some((w) => t.includes(w)) && !t.includes('IMPOSTOR'), 'impostor: going to background hides the role and returns to "Pass to"');
      await page.click('#imp-ready');
      await page.waitForSelector('#imp-card');
      const b2 = await page.locator('#imp-card').boundingBox();
      await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
      await page.mouse.down();
    }
    const heldNow = await page.textContent('#imp-card');
    roles.push(heldNow);
    await page.mouse.up();
    const after = await rootText();
    ok(after.includes('Hold to reveal') && !animals.some((w) => after.includes(w)) && !after.includes('IMPOSTOR'), `impostor: player ${i + 1}'s role disappears on release`);
    await page.click('#imp-done');
  }
  const impCount = roles.filter((t) => t.includes('YOU ARE THE IMPOSTOR')).length;
  const words = roles.filter((t) => !t.includes('IMPOSTOR')).map((t) => t.replace('The secret word is', '').trim());
  ok(impCount === 1, 'impostor: exactly one impostor');
  ok(roles.filter((t) => t.includes('IMPOSTOR')).every((t) => t.includes('Hint: Animals')), 'impostor: impostor sees the category hint');
  ok(words.length === 3 && words.every((w) => w === words[0]) && animals.includes(words[0]), `impostor: everyone else sees the same Animals word (${words[0]})`);
  const impName = impNames[roles.findIndex((t) => t.includes('IMPOSTOR'))];

  await page.waitForSelector('.imp-circle');
  ok((await page.textContent('h1')).includes('starts') && (await page.locator('.imp-seat').count()) === 4, 'impostor: shows who starts and a 4-seat circle');
  const cw = await page.textContent('.imp-order');
  await page.click('label:has(input[value="anticlockwise"])');
  const acw = await page.textContent('.imp-order');
  const orderNames = (t) => t.split('→').map((x) => x.trim());
  ok(orderNames(cw)[0] === orderNames(acw)[0] && orderNames(cw)[1] === orderNames(acw)[3], `impostor: direction toggle reverses the order (${cw} / ${acw})`);
  await shot('14-impostor-start');
  await page.click('#imp-discuss');
  await page.waitForSelector('#imp-time');
  ok((await page.textContent('#imp-time')) === '1:00', 'impostor: 1-minute timer shown');
  await page.click('#imp-timer-toggle');
  await page.waitForTimeout(1300);
  ok((await page.textContent('#imp-time')) !== '1:00', 'impostor: timer counts down');
  await page.click('#imp-reveal-imp');
  await page.click('#ui-dialog-actions button[value="ok"]');
  await page.waitForSelector('.imp-result-names');
  ok((await page.textContent('.imp-result-names')).includes(impName) && (await page.textContent('.imp-word')) === words[0], 'impostor: reveal shows the impostor and the secret word');
  await shot('15-impostor-result');
  await page.click('#imp-again');
  await page.waitForSelector('.imp-pass');
  ok((await page.textContent('.imp-pass h1')).includes('Ann'), 'impostor: Play again keeps players and restarts the reveal');
  await page.click('#back-btn');
  await page.waitForSelector('#ui-dialog[open]');
  await page.click('#ui-dialog-actions button[value="cancel"]');
  ok(await page.locator('.imp-pass').isVisible(), 'impostor: cancelling quit keeps the game');
  await page.click('#back-btn');
  await page.click('#ui-dialog-actions button[value="ok"]');
  await page.waitForSelector('.party-list');
  ok(true, 'impostor: quitting returns to the party menu');
  await page.goto(BASE + '#/impostor');
  await page.reload();
  await page.waitForSelector('#imp-setup');
  ok((await page.inputValue('[data-name="0"]')) === 'Ann' && (await page.inputValue('#imp-cat')) === 'Animals' && (await page.inputValue('#imp-timer')) === '1', 'impostor: names and settings are remembered');

  // ---------- Werewolf ----------
  await page.goto(BASE + '#/werewolf');
  await page.waitForSelector('#ww-setup');
  await page.click('[data-step="playerCount"][data-d="-1"]');
  await page.click('[data-step="playerCount"][data-d="-1"]');
  ok((await page.locator('#ww-setup .imp-name input').count()) === 5, 'werewolf: player stepper (down to 5)');
  await page.click('#ww-start');
  const wwRoles = [];
  for (let i = 0; i < 5; i++) {
    await page.click('#ww-ready');
    await page.waitForSelector('#ww-card');
    ok(await page.isDisabled('#ww-done'), `werewolf: player ${i + 1}'s Done locked until the card is held`);
    const b = await page.locator('#ww-card').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    wwRoles.push(await page.textContent('#ww-card'));
    if (i === 0) await shot('17-werewolf-role');
    await page.mouse.up();
    if (i === 0) ok((await page.textContent('#ww-card')).trim() === 'Hold to reveal', 'werewolf: role hidden on release');
    await page.click('#ww-done');
  }
  ok(wwRoles.filter((t) => t.includes('Werewolf')).length === 1 && wwRoles.every((t) => t.includes('You are')), 'werewolf: 5 players get 1 werewolf plus village roles');
  await page.click('#ww-narrate');
  await page.waitForSelector('.ww-script');
  ok((await page.textContent('.ww-line')).startsWith('Night 1'), 'werewolf: narrator script starts at night 1');
  while (await page.locator('#ww-next').count()) await page.click('#ww-next');
  ok((await page.textContent('h1')).includes('Day 1'), 'werewolf: stepping through the night leads to day');
  await page.click('label:has(#ww-show-roles)');
  await shot('18-werewolf-day');
  const wolfIdx = await page.evaluate(() => [...document.querySelectorAll('.ww-player')].findIndex((b) => b.textContent.includes('Werewolf')));
  await page.click(`[data-player="${wolfIdx}"]`);
  await page.click('#ui-dialog-actions button[value="ok"]');
  await page.waitForSelector('#ww-again');
  ok((await page.textContent('h1')).includes('village wins'), 'werewolf: eliminating the only wolf → village wins');

  // ---------- Hot Potato ----------
  await page.goto(BASE + '#/hot-potato');
  await page.waitForSelector('#hp-setup');
  await page.click('#hp-start');
  await page.waitForSelector('.hp-prompt');
  ok((await page.textContent('.hp-prompt')).startsWith('Name'), 'hot potato: shows a prompt');
  await page.evaluate(() => { CGR.partyLogic.fuseSeconds = () => 1.2; }); // short fuse for the test
  await page.click('#hp-go');
  await page.waitForSelector('.hp-live');
  ok(!(await page.textContent('.hp-live')).match(/\d:\d\d/), 'hot potato: fuse time is hidden');
  await page.waitForSelector('.hp-boom', { timeout: 5000 });
  await shot('19-hot-potato-boom');
  await page.click('[data-loser="0"]');
  await page.waitForSelector('.hp-scores');
  ok((await page.textContent('.hp-scores')).includes('💥'), 'hot potato: BOOM, loser recorded on the scoreboard');

  // ---------- Charades ----------
  await page.goto(BASE + '#/charades');
  await page.waitForSelector('#gg-setup');
  await page.click('#gg-next');
  await page.waitForSelector('#gg-go');
  ok((await page.textContent('h1')).includes('Team A'), 'charades: Team A goes first');
  await page.click('#gg-go');
  await page.waitForSelector('.gg-word');
  const w1 = await page.textContent('.gg-word');
  await page.click('#gg-got');
  await page.click('#gg-got');
  await page.click('#gg-skip');
  ok(w1.length > 0 && (await page.textContent('.gg-live')).includes('2 so far'), 'charades: Got it scores, Skip does not');
  await shot('20-charades-live');
  await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 120000; });
  await page.waitForSelector('#gg-continue', { timeout: 5000 });
  ok((await page.textContent('.page-head')).includes('got 2'), 'charades: turn ends when the timer runs out');
  await page.click('#gg-continue');
  await page.waitForSelector('#gg-go');
  ok((await page.textContent('h1')).includes('Team B'), 'charades: next team’s turn');
  await page.click('#back-btn');
  await page.click('#ui-dialog-actions button[value="ok"]');
  await page.reload(); // restore the real clock

  // ---------- Fishbowl ----------
  await page.goto(BASE + '#/fishbowl');
  await page.waitForSelector('#gg-setup');
  await page.click('#gg-next');
  await page.waitForSelector('#gg-word');
  for (const w of ['Eiffel Tower', 'Pizza', 'Dracula', 'Rainbow', 'Pizza', 'Kangaroo']) { await page.fill('#gg-word', w); await page.press('#gg-word', 'Enter'); }
  ok((await page.textContent('#gg-count')).startsWith('5 words'), 'fishbowl: words added, duplicates ignored');
  ok(!(await page.textContent('#gg-root')).includes('Dracula'), 'fishbowl: added words stay hidden');
  await page.click('#gg-play');
  await page.click('#gg-go');
  for (let i = 0; i < 5; i++) await page.click('#gg-got');
  await page.waitForSelector('#gg-continue');
  ok((await page.textContent('h1')).includes('Bowl empty'), 'fishbowl: round ends when the bowl is empty');
  await page.click('#gg-continue');
  await page.waitForSelector('.gg-rule');
  ok((await page.textContent('.page-head')).includes('Round 2 of 3') && (await page.textContent('.gg-rule')).includes('single word'), 'fishbowl: round 2 is one-word clues, same team continues');
  await page.click('#back-btn');
  await page.click('#ui-dialog-actions button[value="ok"]');
  await page.waitForFunction(() => !location.hash.includes('fishbowl'));

  // ---------- Finger chooser (multi-touch) ----------
  await page.goto(BASE + '#/chooser');
  await page.waitForSelector('#ch-area');
  const cdp = await context.newCDPSession(page);
  const ab = await page.locator('#ch-area').boundingBox();
  const pts = [[60, 80], [200, 150], [120, 260]].map(([x, y], i) => ({ x: ab.x + x, y: ab.y + y, id: i + 1 }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
  await page.waitForSelector('.ch-dot.winner', { timeout: 6000 });
  ok((await page.locator('.ch-dot').count()) === 3 && (await page.locator('.ch-dot.winner').count()) === 1, 'chooser: three fingers, one chosen');
  await shot('21-chooser');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => !document.querySelector('.ch-dot'), null, { timeout: 4000 });
  ok(true, 'chooser: resets after fingers lift');

  // ---------- Toolkit ----------
  await page.goto(BASE + '#/toolkit');
  await page.waitForSelector('#tk-roll');
  await page.click('#tk-roll');
  ok((await page.locator('.tk-die').count()) === 2, 'toolkit: rolls two dice');
  await page.click('#tk-flip');
  ok(['Heads', 'Tails'].includes((await page.textContent('#tk-coin')).trim()), 'toolkit: coin flip');
  await page.click('[data-add="0"][data-amt="5"]');
  ok((await page.textContent('.tk-score')).trim() === '5', 'toolkit: scoreboard +5');
  await shot('22-toolkit');

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
