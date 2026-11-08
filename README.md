# Card Game Rulebook

An offline-first Progressive Web App (PWA) with card and dice game rules organised by number of players (1, 2, 3, 4, 5+). It also has a per-game score tracker and a "pick a game for us" button.

- 119 games (95 card games and 24 dice games), each with equipment, objective, setup, gameplay, scoring and variations
- Searching a brand name such as Yahtzee, Uno, Phase 10, Skip-Bo or Dutch Blitz finds the traditional game it is based on
- Separate **Card games** and **Dice games** sections on the home screen. Search and Favourites cover both, with dice games marked 🎲
- A three-line **Quick start** summary at the top of every rules page, for teaching a game at the table
- Score tracker with quick-add buttons, custom amounts, round history, undo, target score and a winner banner. **Share / export scores** sends the final standings through the phone's share sheet, copies them as text, or downloads a CSV for spreadsheets
- Tags (Good for kids, Party, Trick-taking, Patience, Betting…) shown on each game and usable as a filter on every list
- Game picker filtered by game type (cards, dice or either), players, difficulty, play time, "Good for kids" and "No special equipment"
- Search, favourites, dark mode (follows the system setting, with a manual toggle) and a text-size control
- Works fully offline after the first visit, and can be installed on Android

Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no backend.

## Project structure

```
Card-Game-App/
├── index.html              App shell (single page, hash-based routing)
├── manifest.webmanifest    PWA manifest (name, colours, icons, start_url/scope "./")
├── sw.js                   Service worker: precaches everything, versioned cache
├── games.json              ALL game data (rules + scorekeeper/picker settings)
├── .nojekyll               Tells GitHub Pages to serve files as they are
├── css/
│   └── styles.css          Mobile-first styles, light/dark themes
├── js/
│   ├── storage.js          localStorage wrapper (try/catch), favourites, settings
│   ├── data.js             Loads games.json; filter, search, formatting helpers
│   ├── scorekeeper.js      Score tracker view and state
│   ├── picker.js           "Pick a game for us" view
│   └── app.js              Router, home/list/game views, dialogs, SW registration
├── icons/                  192/512 icons, maskable icons, apple-touch-icon, favicon
└── tools/
    ├── make_icons.py       Regenerates the placeholder icons (needs Pillow)
    └── verify-offline.js   Playwright script that tests every screen offline
```

Screens (URL hash routes): `#/` card games home · `#/players/3` card games for a player count · `#/all` all card games · `#/dice`, `#/dice/players/3`, `#/dice/all` the same for dice games · `#/favourites` · `#/game/<id>` rules · `#/score/<id>` scorekeeper · `#/pick` picker (`#/pick?type=dice` starts on dice).

All paths are relative (`./games.json`, `css/styles.css`, …) and the service worker lives at the project root, so its scope is the folder the app is served from. That is why it works from a GitHub Pages subpath such as `https://<user>.github.io/<repo>/`.

## Running locally

A service worker only runs over `http://localhost` / `127.0.0.1` or HTTPS, so use a local web server rather than opening `index.html` directly:

```bash
cd Card-Game-App
python3 -m http.server 8080
```

Then open <http://localhost:8080/>. Any static server works, e.g. `npx serve .`.

To test it exactly as GitHub Pages serves it (from a subpath), serve the **parent** folder and open `http://localhost:8080/Card-Game-App/`.

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g. `card-rules`). It can be public, or private if your plan includes Pages for private repos.
2. Push this folder's contents to the `main` branch:

   ```bash
   git init
   git add .
   git commit -m "Card Game Rulebook"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

3. On GitHub, open the repository's **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose branch **main** and folder **/ (root)**, then click **Save**.
5. Wait a minute or two. The site will be live at `https://<user>.github.io/<repo>/` (the URL is shown at the top of the Pages settings).

GitHub Pages serves over HTTPS, which the service worker and the install prompt both need. No other configuration is required.

> **Hosting several apps on the same `github.io` site?** Chrome identifies an installed app by the manifest's `id`, resolved against the site root. Each app needs a different `id` (this one uses `"id": "card-game-rulebook"`), otherwise Chrome reports the app as "already installed".

## Installing on Android (Chrome)

1. Open the GitHub Pages URL in Chrome on your phone and let the home screen load once. This saves the app for offline use.
2. Tap the **⋮** menu (top right) and choose **Install app** (on some versions it's **Add to Home screen**, then **Install**). Chrome may also show an install banner on its own.
3. Launch it from the home screen icon. It opens full-screen, without the browser bar, and works with no connection.

To check it's ready for offline use, tap **Aa** (settings) in the app. It shows "✓ Saved for offline use".

## Adding a new game

Add an object to the `games` array in `games.json`. The order doesn't matter (lists are sorted A–Z). Then **bump the cache version** (see below).

```json
{
  "id": "blackjack",
  "name": "Blackjack",
  "type": "cards",
  "aliases": ["Twenty-One", "Pontoon (related)"],
  "keywords": ["casino", "21", "banking"],
  "tags": ["betting"],
  "players": { "min": 2, "max": 7 },
  "playerCounts": ["2", "3", "4", "5+"],
  "playTime": { "minutes": [10, 30], "category": "short" },
  "difficulty": "easy",
  "equipment": ["One standard 52-card deck", "Chips or counters"],
  "objective": "Beat the dealer by getting closer to 21 without going over.",
  "quickStart": ["Goal: …", "On your turn: …", "To win: …"],
  "setup": ["Step one…", "Step two…"],
  "gameplay": ["Step one…", "Step two…"],
  "scoring": ["Point one…", "Point two…"],
  "variations": ["Variation one…"],
  "scorekeeper": {
    "direction": "high",
    "target": null,
    "defaultPlayers": 4,
    "teams": false,
    "quickAdd": [1, 5, 10],
    "unit": "chips",
    "endCondition": "target",
    "hint": "Optional tip shown at the top of the scorekeeper."
  }
}
```

### Schema

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique, URL-safe slug (lowercase, hyphens). Used in `#/game/<id>` and as the storage key for scores. Don't change it later, or saved scores and favourites for that game are lost. |
| `name` | string | yes | Display name. |
| `type` | `"cards"` \| `"dice"` | no (default `"cards"`) | Which section the game appears in. Dice games are listed under **Dice games** and marked 🎲. |
| `aliases` | string[] | no | Other names. Shown on the game page and searchable. |
| `keywords` | string[] | no | Extra search terms (e.g. "trick taking", "kids"). |
| `tags` | string[] | no | Shown as chips on the game page and used by the list filter and picker. Allowed values: `kids`, `party`, `trick-taking`, `rummy`, `patience`, `shedding`, `bluffing`, `betting`, `real-time`, `partnership`, `push-your-luck`, `multi-deck`, `special-equipment`. To add a new tag, also give it a label in `TAG_LABELS` in `js/data.js`. `kids` drives the picker's "Good for kids" option; `special-equipment` (anything beyond standard cards, dice, pen and counters) drives "No special equipment". |
| `players.min` / `players.max` | number | yes | Supported player range, shown as "3–7 players". Also limits the scorekeeper's pre-set player count. |
| `playerCounts` | string[] | yes | Which home-screen buttons list the game: any of `"1"`, `"2"`, `"3"`, `"4"`, `"5+"`. A count button only appears when at least one game of that type uses it. Set explicitly, so a game can be left out of a count it technically supports (e.g. Hearts has a separate 3-player entry). Also used by the picker's player filter. |
| `playTime.minutes` | [number, number] | yes | Typical range in minutes, shown as "20–45 min". |
| `playTime.category` | `"short"` \| `"medium"` \| `"long"` | yes | Picker filter. Convention: short < 15 min, medium 15–45, long 45+. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | yes | Badge on the game page and a picker filter. |
| `quickStart` | string[] | yes | Three short lines (goal, how a turn works, how to win), shown in the Quick start box at the top of the rules page. |
| `equipment` | string[] | yes | Bulleted list. |
| `objective` | string | yes | One paragraph. Also shown on the picker result. |
| `setup` | string[] | yes | Numbered steps. |
| `gameplay` | string[] | yes | Numbered steps. |
| `scoring` | string[] | yes | Bulleted list. |
| `variations` | string[] | no | Bulleted list. Omit or leave empty to hide the section. |
| `scorekeeper.direction` | `"high"` \| `"low"` | yes | Whether the highest or lowest total wins. |
| `scorekeeper.target` | number \| null | yes | Score that ends the game (e.g. Hearts 100, Cribbage 121), or `null` for none. |
| `scorekeeper.endCondition` | `"target"` \| `"elimination"` | no (default `"target"`) | `target`: the game ends when anyone reaches the target, and the winner is decided by `direction`. `elimination`: players reaching the target are "out", and the game ends when one player is left (Spoons letters, Ninety-Nine lives). |
| `scorekeeper.defaultPlayers` | number | yes | How many players (or teams) the scorekeeper starts with. If the user arrived from a player-count list the game supports, that count is used instead. |
| `scorekeeper.teams` | boolean | yes | `true` names the rows "Team A", "Team B"… (partnership games). |
| `scorekeeper.quickAdd` | number[] | yes | Quick-add buttons. `+1`, `−1` and a custom-amount button are always shown. |
| `scorekeeper.unit` | string | no | Word used for screen-reader totals ("points", "wins", "books"). |
| `scorekeeper.hint` | string | no | Short tip shown under the scorekeeper title. |

Text is plain text (HTML is escaped). Unicode suit symbols ♠ ♥ ♦ ♣ are fine. Run a JSON validator (or `python3 -m json.tool games.json`) before deploying, because one stray comma stops the app loading.

## Forcing an update after editing content

Installed copies serve everything from the service-worker cache, so they won't see your edits until the cache version changes. After changing **any** file (`games.json`, CSS, JS, icons…):

1. Open `sw.js` and bump the version string:

   ```js
   const CACHE_VERSION = 'v1.0.1';   // was 'v1.0.0'
   ```

2. If you added a **new file**, also add it to the `PRECACHE` list in `sw.js`.
3. Commit and push. GitHub Pages redeploys in a minute or two.

The next time someone opens the app online, the new version downloads in the background and an **"A new version is available — Update"** banner appears. Tapping it reloads into the new version, and the old cache is deleted. Saved scores, favourites and settings are kept, because they live in `localStorage` and not in the cache.

## Storage

Everything is saved in `localStorage` (all access is wrapped in try/catch, so private browsing still works, just without persistence):

| Key | Contents |
|---|---|
| `cgr:favs` | Array of favourite game ids |
| `cgr:settings` | `{ theme: "system" \| "light" \| "dark", fontScale }` |
| `cgr:picker` | Last picker filters |
| `cgr:score:<id>` | In-progress scorekeeper state for that game (players, rounds, undo stack, target, direction) |

## Verifying offline behaviour

### Manually in Chrome DevTools

1. Serve the app locally (see above) and open it in Chrome.
2. DevTools → **Application → Service workers**: `sw.js` should show as *activated and is running*, with the scope set to the app's folder. **Application → Cache storage** should list `card-rules-v…` containing every file, including `games.json`.
3. DevTools → **Network** → set throttling to **Offline** (or tick *Offline* in Application → Service workers).
4. Reload and go through every screen: home, a player-count list, search, a game page, favourites, the scorekeeper (add scores, next round, undo, reload to check they persist) and the picker (including a filter combination with no matches).

### Automated (Playwright)

`tools/verify-offline.js` runs the same checks headlessly on a Pixel 7-sized viewport. It serves from a subpath like GitHub Pages and fails on any console error:

```bash
cd ..                                   # the folder that contains Card-Game-App
python3 -m http.server 8081 --bind 127.0.0.1 &
node Card-Game-App/tools/verify-offline.js http://127.0.0.1:8081/Card-Game-App/
```

(Requires Playwright with Chromium: `npm i playwright && npx playwright install chromium`.)

### Lighthouse

Lighthouse 12 dropped the PWA category, so use version 11 for the installability audit:

```bash
npx lighthouse@11 http://localhost:8080/ --only-categories=pwa,accessibility,best-practices,performance --view
```

In Chrome itself, **DevTools → Application → Manifest** shows any installability problems.

## Regenerating icons

The icons are simple generated placeholders. To redraw them, run `python3 tools/make_icons.py` (needs `pip install pillow`), or drop in your own PNGs with the same file names and sizes. Maskable icons should keep important content inside the central 80% circle. Bump the cache version afterwards.

## A note on the rules

Some games from common rule-book contents pages were left out because their rules differ too much between sources to describe one standard version: **Tower of Pisa** (patience), **American Brag**, **Honest John** and **Straight Shooter** (dice). They can be added later in `games.json` using the schema above.


The rules follow the most widely played version of each game. Where common versions differ (scoring schemes, pass limits, house rules), the alternatives are listed under **Common variations**, or noted inline.
