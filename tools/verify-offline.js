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
  for (const [q, expect] of [['yahtzee', 'Yacht'], ['uno', 'Crazy Eights'], ['phase 10', 'Contract Rummy'], ['skip-bo', 'Spite and Malice'], ['dutch blitz', 'Racing Demon'], ['left center right', 'Aces to the Centre'], ['nertz', 'Racing Demon'], ['thirty-one', 'Blitz'], ['goofspiel', 'GOPS'], ['tien len', 'Tiến Lên'], ['yaniv', 'Jhyap'], ['fight the landlord', 'Dou Dizhu'], ['bela', 'Klaberjass'], ['shithead', 'Palace'], ['agurk', 'Cucumber'], ['chase the pig', 'Gong Zhu'], ['thousand', '1000'], ['parlett penguin', 'Penguin'], ['seahaven', 'Seahaven Towers'], ['toby ord', 'Autumn Leaves'], ['old patience', 'Sir Tommy'], ['magic square', 'Diamond Heist']]) {
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
  ok(await page.isVisible('a:has-text("Start scorekeeper")'), 'game page has a Start scorekeeper button');
  await page.goto(BASE + '#/score/hearts?simple=1'); // the plain tracker (Hearts' own button opens its scorecard)
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
  // Choose a play time with no hard one-player card games, so the zero-match message appears
  const emptyTime = await page.evaluate(() => ['short', 'medium', 'long'].find((time) => CGR.data.filter({ count: '1', difficulty: 'hard', time, type: 'cards' }).length === 0));
  ok(!!emptyTime, `some play time has no hard 1-player card games (${emptyTime})`);
  await page.click(`label:has(input[name="time"][value="${emptyTime}"])`);
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
  ok((await page.locator('.party-list .game-item').count()) === 26, 'Party tab lists 26 party games (12 in the drinking section)');
  await shot('16-party-home');
  await page.click('.party-list a[href="#/impostor"]');
  await page.waitForSelector('#imp-setup');
  ok((await page.locator('.imp-name input').count()) === 4, 'impostor: setup defaults to 4 players');
  const impNames = ['Ann', 'Ben', 'Cat', 'Dan'];
  for (let i = 0; i < 4; i++) await page.fill(`[data-name="${i}"]`, impNames[i]);
  await page.selectOption('#imp-cat', 'Animals');
  await page.selectOption('#imp-timer', '1');
  ok((await page.inputValue('#imp-hint')) === 'shortlist-6', 'impostor: default hint is a 6-word shortlist');
  await shot('12-impostor-setup');
  await page.click('#imp-start');
  await page.waitForSelector('.imp-pass');
  ok((await page.textContent('.imp-pass h1')).includes('Ann'), 'impostor: "Pass to Ann" first');
  const animals = await page.evaluate(() => CGR.impostorWords.Animals);
  const rootText = () => page.evaluate(() => document.getElementById('imp-root').innerText);
  const roles = [];
  let impShortlist = [];
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
    if (heldNow.includes('IMPOSTOR')) impShortlist = await page.locator('.imp-shortlist span').allTextContents();
    roles.push(heldNow);
    await page.mouse.up();
    const after = await rootText();
    ok(after.includes('Hold to reveal') && !animals.some((w) => after.includes(w)) && !after.includes('IMPOSTOR'), `impostor: player ${i + 1}'s role disappears on release`);
    await page.click('#imp-done');
  }
  const impCount = roles.filter((t) => t.includes('YOU ARE THE IMPOSTOR')).length;
  const words = roles.filter((t) => !t.includes('IMPOSTOR')).map((t) => t.replace('The secret word is', '').trim());
  ok(impCount === 1, 'impostor: exactly one impostor');
  ok(roles.filter((t) => t.includes('IMPOSTOR')).every((t) => t.includes('Category: Animals')), 'impostor: impostor sees the category');
  ok(words.length === 3 && words.every((w) => w === words[0]) && animals.includes(words[0]), `impostor: everyone else sees the same Animals word (${words[0]})`);
  const impName = impNames[roles.findIndex((t) => t.includes('IMPOSTOR'))];
  ok(impShortlist.length === 6 && impShortlist.includes(words[0]) && impShortlist.every((w) => animals.includes(w)), `impostor: shortlist of 6 animals includes the real word (${impShortlist.join(', ')})`);

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
  ok((await page.inputValue('[data-name="0"]')) === 'Ann' && (await page.inputValue('#imp-cat')) === 'Animals' && (await page.inputValue('#imp-timer')) === '1' && (await page.inputValue('#imp-hint')) === 'shortlist-6', 'impostor: names and settings are remembered');

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

  // ---------- Forehead Guess (tilt + taps, sideways word) ----------
  await page.goto(BASE + '#/forehead');
  await page.waitForSelector('#fh-setup');
  await page.click('#fh-start');
  await page.waitForSelector('#fh-ready');
  ok((await page.textContent('h1')).includes('Player 1'), 'forehead: first guesser is up');
  await page.click('#fh-ready');
  await page.waitForSelector('#fh-word:not(.fh-count)', { timeout: 6000 });
  const tilt = (z) => page.evaluate((zz) => window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 0, y: 9.8, z: zz } })), z);
  const fw1 = await page.textContent('#fh-word');
  await tilt(0); await tilt(-9);   // upright, then nod down = got it
  await tilt(0); await tilt(9);    // upright, then tip back = pass
  await page.click('#fh-got');     // tap the "got it" half
  ok((await page.textContent('.fh-hint')).includes('2 ✓') && (await page.textContent('#fh-word')) !== fw1, 'forehead: nod and tap score, tip back passes');
  const rot = await page.evaluate(() => getComputedStyle(document.querySelector('.fh-rot')).transform);
  ok(rot && rot !== 'none', 'forehead: word is turned sideways on a portrait phone');
  await shot('23-forehead');
  await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 200000; });
  await page.waitForSelector('#fh-continue', { timeout: 5000 });
  ok((await page.textContent('.page-head')).includes('got 2') && (await page.locator('.gg-got .buzzed').count()) === 1, 'forehead: turn summary lists got and passed words');
  await page.click('#fh-continue');
  await page.waitForSelector('#fh-ready');
  ok((await page.textContent('h1')).includes('Player 2'), 'forehead: next guesser');
  await page.reload();

  // ---------- Forbidden Words ----------
  await page.goto(BASE + '#/forbidden');
  await page.waitForSelector('#gg-setup');
  ok(await page.isChecked('#gg-penalty'), 'forbidden: buzz penalty on by default');
  await page.click('#gg-next');
  await page.waitForSelector('#gg-go');
  ok((await page.textContent('.page-head')).includes('Team B watches'), 'forbidden: the other team watches for banned words');
  await page.click('#gg-go');
  await page.waitForSelector('.fw-banned');
  ok((await page.locator('.fw-banned li').count()) === 4, 'forbidden: card shows four banned words');
  await shot('24-forbidden');
  await page.click('#gg-got');
  await page.click('#gg-got');
  await page.click('#gg-buzz');
  await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 200000; });
  await page.waitForSelector('#gg-continue', { timeout: 5000 });
  ok((await page.locator('.gg-got .buzzed').count()) === 1 && (await page.textContent('.gg-scores li:first-child strong')).trim() === '1', 'forbidden: buzz loses the card and a point');
  await page.reload();

  // ---------- Song Hum-Along ----------
  await page.goto(BASE + '#/hum');
  await page.waitForSelector('#gg-setup');
  ok((await page.locator('input[name="gg-deck"]').count()) === 4, 'hum: four song decks');
  await page.click('#gg-next');
  await page.click('#gg-go');
  await page.waitForSelector('.hum-artist');
  await page.click('#gg-got');
  ok((await page.textContent('.gg-live')).includes('1 so far'), 'hum: shows title and artist, Got it scores');
  await page.goto(BASE + '#/party');
  await page.waitForSelector('.party-list');

  // ---------- Categories Countdown ----------
  await page.goto(BASE + '#/categories');
  await page.waitForSelector('#cc-setup');
  await page.click('#cc-go');
  await page.waitForSelector('#cc-begin');
  ok((await page.textContent('.cc-cat')).length > 2, 'categories: shows a category');
  await page.click('#cc-begin');
  await page.waitForSelector('#cc-next');
  const who1 = await page.textContent('.cc-who');
  await page.click('#cc-next');
  ok((await page.textContent('.cc-who')) !== who1, 'categories: answering passes to the next player');
  await shot('25-categories');
  await page.click('#cc-bad');
  await page.waitForSelector('#cc-new');
  ok((await page.textContent('.imp-pass')).includes('loses a life'), 'categories: a bad answer costs a life');
  await page.click('#cc-new');
  await page.click('#cc-begin');
  await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 60000; });
  await page.waitForSelector('#cc-new', { timeout: 5000 });
  ok((await page.textContent('h1')).includes('Time’s up'), 'categories: running out of time costs a life');
  await page.reload();

  // ---------- Most Likely To ----------
  await page.goto(BASE + '#/most-likely');
  await page.waitForSelector('#ml-setup');
  await page.click('#ml-start');
  await page.waitForSelector('.pg-person');
  const ml1 = await page.textContent('.pg-prompt');
  await page.click('.pg-person >> nth=1');
  await page.click('.pg-person >> nth=1');
  await page.click('#ml-undo');
  ok((await page.textContent('.pg-person >> nth=1')).includes('1'), 'most likely: tap to vote, undo works');
  await page.click('#ml-next');
  ok((await page.textContent('.pg-prompt')) !== ml1, 'most likely: next question is different');
  await page.click('#ml-board');
  ok((await page.textContent('.pg-board li')).includes('Player 2'), 'most likely: leaderboard');
  await shot('26-most-likely');

  // ---------- Would You Rather (secret vote) ----------
  await page.goto(BASE + '#/would-you-rather');
  await page.waitForSelector('#wr-setup');
  await page.check('#wr-secret');
  await page.waitForSelector('[data-step="voters"]');
  await page.click('[data-step="voters"][data-d="-1"]');
  await page.click('[data-step="voters"][data-d="-1"]');
  await page.click('#wr-start');
  await page.click('#wr-vote');
  await page.click('.wr-choice.a');
  await page.waitForSelector('#wr-ready');
  ok(!(await page.textContent('#wr-root')).includes('%'), 'would you rather: votes stay secret between voters');
  await page.click('#wr-ready');
  await page.click('.wr-choice.b');
  await page.waitForSelector('.wr-result');
  ok((await page.textContent('.wr-bar.a')).includes('50%') && (await page.textContent('.wr-bar.b')).includes('50%'), 'would you rather: reveal shows the split');
  await shot('27-would-you-rather');

  // ---------- Never Have I Ever ----------
  await page.goto(BASE + '#/never');
  await page.waitForSelector('#nv-setup');
  await page.click('[data-step="lives"][data-d="-1"]');
  await page.click('[data-step="lives"][data-d="-1"]');
  await page.click('#nv-start');
  await page.waitForSelector('.pg-person');
  await page.click('[data-i="0"]');
  await page.click('#nv-undo');
  ok((await page.locator('[data-i="0"] .nv-lives i.on').count()) === 3, 'never: tap loses a life, undo restores it');
  for (const i of [0, 1, 2]) for (let k = 0; k < 3; k++) await page.click(`[data-i="${i}"]`);
  await page.waitForSelector('#nv-again');
  ok((await page.textContent('h1')).includes('Player 4 wins'), 'never: last player with lives wins');
  await shot('28-never');

  // ---------- Yacht / Yahtzee-style scorecard ----------
  await page.goto(BASE + '#/game/yacht');
  await page.click('a.btn[href="#/score/yacht"]');
  await page.waitForSelector('#ds-setup');
  await page.fill('[data-pid="p1"]', 'Ann');
  await page.fill('[data-pid="p2"]', 'Ben');
  await page.click('#ds-start');
  await page.waitForSelector('.ds-table');
  ok((await page.locator('.ds-table tbody .ds-cell[data-pid="p1"][data-cat]').count()) === 13, 'scorecard: 13 Yahtzee-style boxes per player');
  const roll = async (dice) => { for (const f of dice) await page.click(`.ds-face[data-face="${f}"]`); };
  await roll([3, 3, 3, 5, 5]);
  ok((await page.textContent('[data-pid="p1"][data-cat="full"]')).trim() === '25' && (await page.textContent('[data-pid="p1"][data-cat="three"]')).trim() === '19', 'scorecard: entering dice previews every box');
  await page.click('[data-pid="p1"][data-cat="full"]');
  ok((await page.textContent('.ds-turn')).includes('Ben'), 'scorecard: placing a roll passes the turn');
  await roll([4, 4, 4, 4, 4]);
  await page.click('[data-pid="p2"][data-cat="yahtzee"]');
  await roll([6, 6, 6, 6, 6]);
  await page.click('[data-pid="p1"][data-cat="yahtzee"]');
  await roll([4, 4, 4, 4, 4]);
  ok((await page.locator('.ds-cell.preview[data-pid="p2"]').count()) === 1 && (await page.locator('.ds-cell.blocked[data-pid="p2"]').count()) === 11, 'scorecard: joker rule forces the matching upper box');
  await page.click('[data-pid="p2"][data-cat="fours"]');
  ok((await page.textContent('.ds-total td:nth-child(3)')).trim() === '170', 'scorecard: extra five of a kind earns the 100 bonus (50 + 20 + 100)');
  await page.click('[data-pid="p1"][data-cat="chance"]');
  await page.fill('#ui-dialog-input', '31');
  await page.click('#ui-dialog-actions button[value="ok"]');
  ok((await page.textContent('[data-pid="p1"][data-cat="chance"]')).trim() === '', 'scorecard: impossible typed scores are refused');
  await page.click('[data-pid="p1"][data-cat="chance"]');
  await page.fill('#ui-dialog-input', '22');
  await page.click('#ui-dialog-actions button[value="ok"]');
  await page.waitForFunction(() => document.querySelector('[data-pid="p1"][data-cat="chance"]').textContent.trim() !== '', null, { timeout: 3000 }).catch(() => {});
  ok((await page.textContent('[data-pid="p1"][data-cat="chance"]')).trim() === '22', 'scorecard: a score can be typed in by hand');
  await page.click('[data-act="undo"]');
  ok((await page.textContent('[data-pid="p1"][data-cat="chance"]')).trim() === '', 'scorecard: undo');
  await page.click('[data-pid="p1"][data-cat="sixes"]');
  await page.click('#ui-dialog-actions button[value="v24"]');
  await page.waitForFunction(() => document.querySelector('.ds-bonus td:nth-child(2)').textContent.includes('+6'), null, { timeout: 3000 }).catch(() => {});
  ok((await page.textContent('.ds-bonus td:nth-child(2)')).includes('+6'), 'scorecard: upper bonus pace shown (+6 with four sixes)');
  await shot('29-scorecard');
  await page.reload();
  await page.waitForSelector('.ds-table');
  ok((await page.textContent('.ds-total td:nth-child(2)')).trim() === '99', 'scorecard: survives a reload');
  await page.goto(BASE + '#/dice');
  await page.waitForSelector('#resume-h');
  ok((await page.textContent('.section')).includes('Yacht') && (await page.textContent('.section')).includes('turn'), 'scorecard: listed under Scores in progress');
  await page.goto(BASE + '#/score/yacht?simple=1');
  await page.waitForSelector('#sk-body');
  ok(true, 'scorecard: the simple tracker is still available');

  // ---------- Hand-by-hand scorecards ----------
  const rsOpen = async (id) => {
    await page.goto(BASE + '#/score/' + id);
    await page.waitForSelector('[data-act="start"], .rs-stand');
    if (await page.$('[data-act="start"]')) await page.click('[data-act="start"]');
    await page.waitForSelector('.rs-stand');
  };
  const rsStep = async (path, d, times) => { for (let i = 0; i < times; i++) await page.click(`[data-step="${path}"][data-d="${d}"]`); };
  const rsTotals = async () => (await page.$$eval('.rs-stand .rs-total', (xs) => xs.map((x) => x.textContent.trim()))).join(',');
  const rsSet = (path, val) => page.click(`[data-set="${path}"][data-val='${JSON.stringify(val)}']`);

  await rsOpen('oh-hell');
  ok((await page.textContent('.rs-info')).includes('10 cards each'), 'oh hell: first hand is 10 cards, dealer shown');
  await rsStep('bids.p2', 1, 3); await rsStep('bids.p3', 1, 2); await rsStep('bids.p4', 1, 4); await rsStep('bids.p1', 1, 1);
  await page.click('[data-act="bids-done"]');
  ok(await page.isVisible('[data-act="bids-done"]'), 'oh hell: hook rule stops the dealer making the bids add up');
  await rsStep('bids.p1', 1, 1);
  await page.click('[data-act="bids-done"]');
  await rsStep('tricks.p2', 1, 3); await rsStep('tricks.p3', 1, 2); await rsStep('tricks.p4', 1, 4); await rsStep('tricks.p1', 1, 1);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '0,13,12,14', 'oh hell: exact bids score 10 + bid, misses 0');
  await shot('30-oh-hell');

  await rsOpen('spades');
  await rsStep('bids.p1', 1, 4); await rsStep('bids.p2', -1, 1); await rsStep('bids.p3', 1, 3); await rsStep('bids.p4', 1, 4);
  await page.click('[data-act="bids-done"]');
  await rsStep('tricks.p1', 1, 5); await rsStep('tricks.p3', 1, 3); await rsStep('tricks.p4', 1, 5);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '71,141' && (await page.textContent('.rs-info')).includes('1/10'), 'spades: team contracts, nil bonus and bags');

  await rsOpen('five-hundred');
  await rsSet('bidder', 'p1'); await rsSet('contract.suit', 'H'); await rsSet('contract.tricks', 7);
  await rsStep('tricks.p1', 1, 7); await rsStep('tricks.p2', 1, 2); await rsStep('tricks.p3', 1, 1);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '200,20,10', '500: 7♥ made is 200, defenders 10 per trick');

  await rsOpen('bridge');
  await rsSet('decl', 'A'); await rsSet('level', 4); await rsSet('denom', 'S');
  await rsStep('taken', 1, 10);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '120,0' && (await page.textContent('.rs-info')).includes('vulnerable'), 'bridge: 4♠ made is game and makes We vulnerable');
  await shot('31-bridge');

  await rsOpen('farkle');
  for (const f of [5, 5]) await page.click(`[data-fface="${f}"]`);
  await page.click('[data-act="f-add"]');
  ok(await page.isDisabled('[data-act="f-bank"]'), 'farkle: can’t bank 100 before reaching the 500 opening minimum');
  for (const f of [1, 1, 1]) await page.click(`[data-fface="${f}"]`);
  await page.click('[data-act="f-add"]');
  await page.click('[data-act="f-bank"]');
  ok((await rsTotals()) === '1100,0,0' && (await page.textContent('.rs-info')).includes('Player 2'), 'farkle: dice scored and banked; next player');

  await rsOpen('contract-rummy');
  ok((await page.textContent('.cr-name')).includes('Two sets') && (await page.locator('.cr-now > .cr-melds .cr-meld.set').count()) === 2 && (await page.textContent('.cr-min')).includes('6 cards'),
    'contract rummy: round 1 shows two SET blocks, 6 cards minimum');
  await rsSet('out', 'p1');
  await rsStep('cards.p2.joker', 1, 1); await rsStep('cards.p2.high', 1, 1);     // 25 + 10
  await rsStep('cards.p3.low', 1, 3); await rsStep('cards.p3.ace', 1, 1);       // 15 + 15
  await page.click('[data-crtype="p4"]');
  await page.fill('#ui-dialog-input', '15');
  await page.click('#ui-dialog-actions button[value="ok"]');
  await page.waitForFunction(() => document.querySelector('#rs-preview').textContent.includes('+15'));
  await shot('33-contract-rummy');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '0,35,30,15', 'contract rummy: penalties counted from cards left (or typed)');
  ok((await page.textContent('.cr-name')).includes('One set and one run') && (await page.textContent('.rs-hist')).includes('★ out'), 'contract rummy: next contract shown; history marks who went out');

  await rsOpen('canasta');
  await rsStep('A.natural', 1, 1); await rsStep('A.red3', 1, 1);
  await page.fill('[data-path="A.meld"]', '230'); await rsSet('A.out', 'out');
  await page.fill('[data-path="B.meld"]', '150'); await page.fill('[data-path="B.hand"]', '45');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '930,105', 'canasta: canastas, red 3s, going out and card points');

  await rsOpen('cribbage');
  for (let i = 0; i < 10; i++) await page.click('[data-peg="p1"][data-amt="12"]');
  await page.click('[data-peg="p2"][data-amt="8"]');
  await page.click('[data-peg="p1"][data-amt="1"]');
  await page.waitForSelector('.gameover');
  ok((await rsTotals()) === '121,8' && (await page.textContent('.gameover')).includes('double skunk'), 'cribbage: pegging to 121 wins, skunk shown');
  await shot('32-cribbage');

  await rsOpen('hearts');
  await page.click('[data-act="moon"]');
  await page.click('#ui-dialog-actions button[value="p2"]');
  await page.waitForFunction(() => document.querySelector('#rs-preview').textContent.includes('moon'));
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '26,0,26,26', 'hearts: shooting the moon gives everyone else 26');
  await page.click('[data-act="undo"]');
  ok((await rsTotals()) === '0,0,0,0', 'hearts: undo removes the hand');

  // ---------- More scorecards ----------
  const kp = async (field, vals) => { await page.click(`[data-kpfocus="${field}"]`); for (const v of vals) await page.click(`[data-kp="${v}"]`); };

  await rsOpen('gin-rummy');
  await rsSet('type', 'knock'); await rsSet('by', 'p1');
  await kp('dw.p1', [3, 1]); await kp('dw.p2', [10, 10, 7]);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '23,0', 'gin: knock with 4 v 27 deadwood scores 23 (cards tapped on the keypad)');
  await rsSet('type', 'knock'); await rsSet('by', 'p1');
  await kp('dw.p1', [8]); await kp('dw.p2', [5]);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '23,28', 'gin: undercut gives the opponent the difference + 25');
  await shot('34-gin');

  await rsOpen('euchre');
  await rsSet('makers', 'A'); await rsSet('result', 'march');
  await page.click('[data-act="save"]');
  await rsSet('makers', 'A'); await rsSet('result', 'euchred');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '2,2', 'euchre: march 2, euchred gives the defenders 2');

  await rsOpen('euchre-3');
  await rsSet('maker', 'p2'); await rsSet('result', 'euchred');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '2,0,2', 'three-handed euchre: euchred = 2 to each opponent');

  await rsOpen('six-card-golf');
  await page.click('[data-gfslot="p1:0"]');
  for (const r of ['5', 'K', '2', '5', 'J', 'A']) await page.click(`[data-gfrank="${r}"]`);   // fills p1, moves on
  for (let p = 2; p <= 4; p++) { await page.click(`[data-gftype="p${p}"]`); await page.fill('#ui-dialog-input', String(p * 3)); await page.click('#ui-dialog-actions button[value="ok"]'); await page.waitForSelector(`[data-gfuntype="p${p}"]`); }
  ok((await page.locator('.gf-slot.pair').count()) === 2, 'golf: a column pair is highlighted');
  await shot('35-golf');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '9,6,9,12', 'golf: column pair cancels (5/5), 2 = −2, K = 0');

  await rsOpen('pinochle');
  await rsSet('bidder', 'A');
  await rsStep('bid', 10, 5);  // 250 → 300 in steps of 10
  await page.click('[data-addto="meld.A"][data-amt="150"]'); await page.click('[data-addto="meld.A"][data-amt="40"]');
  await page.fill('[data-path="counters.A"]', '170');
  await page.click('[data-addto="meld.B"][data-amt="100"]');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '360,180', 'pinochle: meld + counters, partner counters fill in to 250');

  await rsOpen('rummy-500');
  await kp('melded.p1', [15, 10, 10, 10]); await kp('hand.p2', [9, 5]); await kp('melded.p3', [4, 5, 6]);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '45,-14,15,0', 'rummy 500: melded minus left in hand');

  await rsOpen('auction-pitch');
  await rsSet('pitcher', 'p1'); await rsSet('bid', 3);
  await rsSet('high', 'p1'); await rsSet('low', 'p2'); await rsSet('jack', 'p1'); await rsSet('game', 'p3');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '-3,1,1,0', 'pitch: pitcher short of the bid is set back');

  await rsOpen('bid-whist');
  await rsSet('bidder', 'B'); await rsSet('bid', 4); await rsSet('type', 'nt');
  await rsStep('books', 1, 11);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '0,10', 'bid whist: 11 books on a no-trump 4 bid scores 5 × 2');

  await rsOpen('whist');
  await rsStep('tricksA', 1, 9); await rsSet('honours', 'A:2');
  await page.click('[data-act="save"]');
  ok((await page.textContent('.rs-info')).includes('5') && (await rsTotals()) === '1,0', 'whist: 3 tricks over + 2 honours wins a game of 5');

  await rsOpen('skat');
  await rsSet('declarer', 'p1');
  await rsSet('game', 'C');
  await rsStep('matadors', 1, 1);
  ok((await page.textContent('.rs-form')).includes('Game value 36'), 'skat: clubs with 2 = 36 shown before saving');
  await rsSet('won', 'won');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '36,0,0', 'skat: declarer scores the game value');
  ok((await page.locator('.rs-chip.on[data-set="game"]').count()) === 0, 'skat: the next game starts with nothing selected');
  await shot('36-skat');

  await rsOpen('thousand');
  await rsSet('declarer', 'p1');
  await rsStep('bid', 5, 4); // 100 → 120 in steps of 5
  await page.fill('[data-path="points.p1"]', '60'); await page.click('[data-addto="points.p1"][data-amt="80"]');
  await page.fill('[data-path="points.p2"]', '33'); await page.fill('[data-path="points.p3"]', '27');
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '120,35,25', '1000: bid made with a marriage; opponents rounded to 5');

  await rsOpen('schnapsen');
  await rsSet('winner', 'p2'); await rsSet('pts', 2);
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '0,2', 'schnapsen: 2 game points for a schneider');

  await rsOpen('french-tarot');
  await rsSet('taker', 'p1'); await rsSet('contract', 'garde'); await rsSet('oudlers', 2);
  await page.fill('[data-path="points"]', '49');
  await page.waitForFunction(() => document.querySelector('#rs-preview').textContent.includes('+198'));
  await page.click('[data-act="save"]');
  ok((await rsTotals()) === '198,-66,-66,-66', 'french tarot: Garde made by 8 with 2 oudlers, zero-sum');
  await shot('37-tarot');

  await page.goto(BASE + '#/score/generala');
  await page.waitForSelector('#ds-setup');
  ok((await page.locator('input[name="ds-rules"]').count()) === 2, 'generala: its own rule sets');
  await page.click('#ds-start');
  await page.waitForSelector('.ds-table');
  for (const f of [4, 4, 4, 4, 4]) await page.click(`.ds-face[data-face="${f}"]`);
  await page.check('#ds-served');
  await page.click('[data-pid="p1"][data-cat="generala"]');
  await page.waitForSelector('.gameover');
  ok((await page.textContent('.gameover')).includes('wins outright'), 'generala: a served Generala wins outright');
  await page.goto(BASE + '#/');
  await page.waitForSelector('#resume-h');
  ok((await page.textContent('.section')).includes('Oh Hell') && (await page.textContent('.section')).includes('hand 2 of 19'), 'hand-by-hand scorecards appear under Scores in progress');

  // ---------- Drinking games ----------
  await page.goto(BASE + '#/kings');
  await page.waitForSelector('#dk-age-ok');
  ok((await page.textContent('.dk-gate')).includes('legal drinking age'), 'drinking: age check before the first drinking game');
  await page.click('#dk-age-ok');
  await page.waitForSelector('#dk-start');
  await page.click('#dk-start');
  for (let i = 0; i < 3; i++) await page.click('#kg-draw');
  ok((await page.locator('.pc.big').count()) === 1 && (await page.textContent('.kg-side')).includes('49 cards left'), 'kings: draws cards and shows the rule');
  await page.goto(BASE + '#/ride-the-bus');
  await page.waitForSelector('#dk-start');
  ok(!(await page.$('#dk-age-ok')), 'drinking: age check is only asked once');
  await page.click('[data-step="count"][data-d="-1"]'); await page.click('[data-step="count"][data-d="-1"]');
  await page.click('#dk-start');
  for (let i = 0; i < 8; i++) await page.locator('[data-rb]').first().click();
  await page.click('#rb-next');
  for (let i = 0; i < 10; i++) await page.click('#rb-flip');
  await page.click('#rb-next');
  ok((await page.textContent('h1')).includes('rides the bus'), 'ride the bus: questions, pyramid, then someone rides the bus');
  await page.goto(BASE + '#/horse-race');
  await page.waitForSelector('#dk-start'); await page.click('#dk-start');
  for (let i = 0; i < 4; i++) await page.click(`[data-hrb="${i}:${'CDHS'[i]}"]`);
  await page.click('#hr-go');
  for (let n = 0; n < 80 && !(await page.$('#hr-again')); n++) await page.click('#hr-step');
  ok((await page.textContent('.dk-call')).includes('win!'), 'horse race: runs to a winner and settles the bets');
  await shot('38-horse-race');
  await page.goto(BASE + '#/mexico');
  await page.waitForSelector('#dk-start'); await page.click('#dk-start');
  await page.click('#mx-roll'); await page.click('[data-mx="21"]');
  await page.click('#mx-lie');
  ok((await page.textContent('.dk-call')).includes('2 sips'), 'mexico: calling a Mexico costs double');
  await page.goto(BASE + '#/never');
  await page.waitForSelector('#nv-drink'); await page.check('#nv-drink');
  await page.waitForSelector('#nv-start'); await page.click('#nv-start');
  await page.click('[data-i="1"]'); await page.click('[data-i="1"]');
  ok((await page.textContent('[data-i="1"]')).includes('🍺 2'), 'never have I ever: drinking mode counts sips instead of lives');
  await page.goto(BASE + '#/game/kings-cup');
  await page.waitForSelector('article.rules');
  ok(await page.isVisible('a.btn[href="#/kings"]') && (await page.textContent('.tags, article.rules')).includes('Drinking'), 'rules page: Drinking tag and a Play on this phone button');

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
