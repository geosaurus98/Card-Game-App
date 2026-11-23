# Card Game Rulebook

An offline-first Progressive Web App (PWA) with card and dice game rules organised by number of players (1, 2, 3, 4, 5+). It also has a per-game score tracker and a "pick a game for us" button.

- 254 games (230 card games, including 72 one-player solitaires, and 24 dice games), each with equipment, objective, setup, gameplay, scoring and variations
- Searching a brand name such as Yahtzee, Uno, Phase 10, Skip-Bo or Dutch Blitz finds the traditional game it is based on
- Separate **Card games** and **Dice games** sections on the home screen. Search and Favourites cover both, with dice games marked 🎲
- A **🎉 Party** tab with twenty-six pass-the-phone games and tools, including a 🍻 Drinking section (18+): Impostor, Werewolf / Mafia, Hot Potato, Charades, Fishbowl, Forehead Guess, Forbidden Words, Song Hum-Along, Categories Countdown, Most Likely To, Would You Rather, Never Have I Ever, a finger chooser and a party toolkit (dice, coin, scoreboard); plus Kings, Ride the Bus, Higher or Lower, Pyramid, Horse Race, Beat the Dealer, Up and Down the River, Bust! (21 / 7½), Truth or Drink, Paranoia, Rule Roulette and Mexico
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

## Scorecards

Twenty-five games open a purpose-built scorecard from **Start scorekeeper** instead of the plus/minus tracker. **Options → Simple tracker** (`#/score/<id>?simple=1`) still opens the plain tracker for any of them. Scorecards are saved under `sheet:<id>` and listed under **Scores in progress**.

**Five-dice category scorecard** (`js/dice-sheet-logic.js`, `js/dice-sheet.js`):

- **Yacht**: rule sets Yahtzee-style (13 boxes, 35 bonus at 63+, +100 for each extra five of a kind with the joker rule), Yacht (classic, 12 boxes) and Yatzy (Nordic, 15 boxes, 50 bonus).
- **Generala**: 10 boxes (or 11 with Double Generala); a **Served** switch adds the +5 first-roll bonus, and a served Generala wins outright.
- One column per player (1–8). Tap the five dice you rolled and every open box shows what it would score; tap one to place it. Or tap a box and pick/type the score (impossible scores are refused). Undo, totals, upper-bonus pace, winner and sharing are automatic.

**Hand-by-hand scorecards** (`js/round-sheet-logic.js`, `js/round-sheet.js`): enter what happened in each hand and every score is worked out. Only the raw entries are stored; totals are replayed from them, so undo removes the last entry.

| Game | You enter | Worked out for you |
|---|---|---|
| Oh Hell | Bids, then tricks | 10 + bid for exact (or tricks + 10), hook rule for the dealer, hand sizes (down/up), dealer rotation |
| Spades | Bids (nil, blind nil), then tricks | Team contracts, nil ±100/±200, bags and the 10-bag −100 penalty, 500 to win / −200 to lose |
| 500 | Bidder, contract, tricks | Avondale bid values, misère, slam = 250, defenders 10 per trick (capped at 490), ±500 |
| Contract Bridge | Declarer, contract, doubling, tricks taken, honours | Rubber scoring: below/above the line, games, vulnerability, over/undertricks, insult, slams, 700/500 rubber bonus |
| Farkle | The dice you set aside each roll; Bank or Farkle | Dice combinations, hot dice, opening minimum, the final round after someone reaches the target |
| Contract Rummy | Who went out, and each other player’s cards left by type (2–9, 10–K, Aces, Jokers) — or a typed total | Each round’s contract shown as SET 3+ / RUN 4+ blocks with example cards, minimum cards and deal size; all seven contracts with progress; penalties (Ace 15/20, Joker 25/50 options); lowest total wins |
| Canasta | Canastas, red 3s, going out, meld and hand points per team | Hand score, unmelded red-3 penalty, each team’s minimum first meld, 5,000 to win |
| Cribbage | Pegs (+1 … +12, or any amount) | Peg board with back peg, win at 121 (or 61), skunk / double skunk |
| Hearts | Hearts per player, who took the Q♠ (and J♦ for Omnibus) | 26-point check, shooting the moon (others +26 or shooter −26), lowest wins at 100 |
| Gin Rummy | Knock / gin / big gin / draw, and deadwood tapped in on a card keypad | Knock difference, undercut (+25), gin (+25) and big gin (+31), first to 100, box and game bonuses (shutout doubles) |
| Euchre / Three-Handed Euchre | Makers, result (3–4 tricks, march, euchred), going alone | 1 / 2 / 4 points, euchre 2 to the defenders (each opponent in three-handed; march 3), defending alone option, to 10 |
| Six-Card Golf | Each player’s six cards (or a typed score) | Card values (A 1, 2 −2, J/Q 10, K 0), column pairs cancel, 9 or 18 holes, lowest wins |
| Pinochle | Bid, meld (quick meld buttons) and counters per team | Meld kept only with a counter, set by the bid if short, partner’s counters fill in to 250, bidders count out first at 1,500 |
| Rummy 500 | Cards melded and left in hand, tapped in per player | Melded − hand (Ace 15 or 1 low), first to 500 |
| Auction Pitch | Pitcher, bid (or Smudge), who took High, Low, Jack, Game | Set back by the bid, smudge wins, count-out order pitcher → High → Low → Jack → Game |
| Bid Whist | Bid, uptown / downtown / no trump, books won | Books over six, set by the bid, no trump doubles, ±7 |
| Whist | Tricks and honours | Tricks over six, honours (not from game − 1), games of 5/7/10, best-of-three rubber |
| Skat | Declarer, bid, game, matadors, hand / schneider / schwarz / announcements / ouvert, result | Game value (shown live), null values, lost = −2 × value, overbid rule |
| 1000 | Declarer, bid, card points with marriage buttons (♥100 ♦80 ♣60 ♠40) | Bid made or lost, opponents rounded to 5, three zero hands −120, to 1,000 |
| Sixty-Six / Schnapsen | Winner, and whether the loser had 33+, under 33 or no tricks | 1 / 2 / 3 game points, to 7 |
| French Tarot | Taker (and called partner with 5), contract, oudlers, card points, petit au bout, handful, slam | Points needed, (25 + difference) × multiplier, bonuses, zero-sum shares for 3, 4 or 5 players |

Unit tests: `node tools/test-dice-sheet.js` and `node tools/test-round-sheet.js`. A game opts in with `"sheet"` in its `scorekeeper` (`yacht`, `generala`, `ohhell`, `spades`, `fivehundred`, `bridge`, `farkle`, `crummy`, `canasta`, `cribbage`, `hearts`, `gin`, `euchre`, `euchre3`, `golf`, `pinochle`, `rummy500`, `pitch`, `bidwhist`, `whist`, `skat`, `thousand`, `sixtysix`, `tarot`). The newer games’ forms live in `js/round-sheet-more.js`.

## Drinking games

The Party tab’s **🍻 Drinking games** section has twelve games for adults of legal drinking age, played with a virtual deck or dice on one phone: Kings (editable rule for every rank; Kings or Ring of Fire presets), Ride the Bus (with an optional Bus Driver pyramid), Higher or Lower, Pyramid (secret hands and bluff-calling), Horse Race (bets in sips), Beat the Dealer, Up and Down the River, Bust! (21 or 7½), Truth or Drink (mild, spicy and couples packs), Paranoia, Rule Roulette and Mexico (Mia).

- The first drinking game asks once whether the player is of legal drinking age (stored on the device). Every game counts **sips**, says any drink works, and offers a water-break reminder every 20 minutes.
- Never Have I Ever, Most Likely To, Would You Rather and Hot Potato have an optional **🍺 Drinking mode** switch (same age check).
- Rules pages tagged **Drinking game** cover the same games plus Card Blowing and Hepp Hepp Hepp; drinking twists are listed under President, Cheat, Blitz (31), Blackjack and Mexico.

Code: `js/drink-logic.js` (pure logic, `node tools/test-drink-logic.js`), `js/drink-data.js` (rules and questions), `js/drink-common.js` (age check, cards, setup, water reminder), `js/drink-cards.js` and `js/drink-talk.js` (screens).

## Party games

The **🎉 Party** tab (`#/party`) lists the party games. Each one's scripts load only when it is opened, which keeps app start-up fast; the service worker precaches them, so they all work offline. The list of games and the files each one needs is `CGR.PARTY_GAMES` in `js/app.js`.

| Game | Route | What it does |
|---|---|---|
| Impostor | `#/impostor` | Secret-word bluffing game (details below). |
| Werewolf / Mafia | `#/werewolf` | 5–18 players plus a narrator. Deals roles with the hold-to-reveal card (Werewolf/Mafia, Villager, Seer/Detective, Doctor, optional Hunter), then gives the narrator a step-by-step night script, a day checklist, and a player list for marking eliminations. It detects the winner automatically. |
| Hot Potato | `#/hot-potato` | Shows a prompt ("Name a fruit", optionally "…starting with B"). A hidden random fuse ticks, speeding up near the end; when it goes off, record who was holding the phone. |
| Charades | `#/charades` | Teams take timed turns acting out things from chosen decks (Actions plus word-list categories). Got it / Skip, scores, a set number of rounds. |
| Fishbowl | `#/fishbowl` | Players secretly add words, or add random ones. Three rounds with the same words (describe, one word, act it out); leftover time carries over when the bowl empties. |
| Finger chooser | `#/chooser` | Everyone touches the screen; it picks one player or splits players into 2–4 teams. |
| Forehead Guess | `#/forehead` | One player holds the phone on their forehead while the others give clues. Nod down for “got it”, tip back to pass (motion sensor, with an option to swap directions), or tap either half of the screen. The word is drawn sideways because the installed app is locked to portrait. 1–10 guessers; decks include famous people, characters, songs and the word-list categories. |
| Forbidden Words | `#/forbidden` | Teams describe a word without saying it or any of four banned words; the next team taps **Buzz** (card lost, optionally −1 point). 120+ cards. |
| Song Hum-Along | `#/hum` | Teams hum a song title (no lyrics) for their team to guess. Decks: Films & kids, Classics, Pop hits, Christmas. Titles only, no audio. |
| Categories Countdown | `#/categories` | Name something in the category (optionally starting with a letter), tap **Next player** and pass on. The answer time drops by a second each lap; running out or a bad answer costs a life. Last player standing wins. |
| Most Likely To | `#/most-likely` | “Who’s most likely to…?” with a 3-2-1 countdown, then everyone points. Optional tally and leaderboard. Family and grown-up packs. |
| Would You Rather | `#/would-you-rather` | Two choices; discuss openly or pass the phone for a secret vote and reveal the split. Family and grown-up packs. |
| Never Have I Ever | `#/never` | Tap anyone who has done it to take one of their lives (3–10); undo available. Last player with lives wins. Family and grown-up packs. |
| Party toolkit | `#/toolkit` | 1–10 dice (d4–d20), coin flip with tally, and a saved scoreboard. |

Party-game code follows the same pattern as Impostor: pure logic modules (`js/werewolf-logic.js`, `js/guess-logic.js`, `js/party-logic.js`) separate from the screens (`js/werewolf.js`, `js/hot-potato.js`, `js/guess-games.js`, `js/party-tools.js`). Shared screen helpers, such as the hold-to-reveal card, the timer and beeps, are in `js/party-common.js`, the Charades actions and Hot Potato prompts are in `js/party-words.js`, and the second wave of decks (forbidden-word cards, prompt packs, categories, song titles, famous people and characters) is in `js/party-decks.js`. Forehead Guess, Categories Countdown and the prompt games use `js/party-more-logic.js` (no-repeat decks, tilt detection, lives, the shrinking clock), with screens in `js/forehead.js`, `js/categories.js` and `js/prompt-games.js`; Forbidden Words and Song Hum-Along are extra modes of `js/guess-games.js`. Unit tests: `node tools/test-party-logic.js`.

Timed turns pause, and hide the word, if the phone locks or the app goes to the background.

## Impostor word game

Route `#/impostor` (on the Party tab). Fully offline: the words are bundled in the app.

1. **Setup:** 3–12 players with optional names, number of impostors (always a minority), category or Random, how much help the impostor gets (by default the category plus a shortlist of 6 possible words, one of which is right; also 4 or 10 words, the first letter, the category only, or nothing), and an optional discussion timer (off by default). Names and settings are remembered (`cgr:impostor`). The current round is kept in memory only, so secrets are never saved.
2. **Reveal:** for each player it shows "Pass to [Name]", then **Ready**. The player presses and holds the card to see the word, or "YOU ARE THE IMPOSTOR" plus the hint. Releasing hides it at once. **Done** stays disabled until the card has been held. If the app goes to the background or the screen locks, the role is hidden and the game returns to "Pass to…".
3. **Start:** shows a random starting player and the turn order as a circle, with a clockwise/anticlockwise toggle.
4. **Discussion:** optional countdown timer, then **Reveal impostor** (with confirmation) shows who it was and the secret word. **Play again** keeps the same players with a new word and roles; recent words are avoided. **Back to menu** ends the game. The header back button asks before quitting a round.

Code layout:

| File | What it holds |
|---|---|
| `js/impostor-words.js` | Word list: 15 categories × 100 words (1,500 in total). Edit freely; keep each category's words unique. |
| `js/impostor-logic.js` | Pure game logic, no DOM: settings validation, names, word picking, impostor assignment, turn order. Randomness is injectable for tests. |
| `js/impostor.js` | The screens and the hold-to-reveal gesture. |
| `tools/test-impostor-logic.js` | Unit tests: `node tools/test-impostor-logic.js` (no dependencies). |

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
| `tags` | string[] | no | Shown as chips on the game page and used by the list filter and picker. Allowed values: `kids`, `party`, `trick-taking`, `rummy`, `patience`, `shedding`, `bluffing`, `betting`, `real-time`, `partnership`, `push-your-luck`, `multi-deck`, `special-equipment`, `drinking`. To add a new tag, also give it a label in `TAG_LABELS` in `js/data.js`. `kids` drives the picker's "Good for kids" option; `special-equipment` (anything beyond standard cards, dice, pen and counters) drives "No special equipment". |
| `play` | string | no | A route in the app where the game can be played on one phone (e.g. `"#/kings"`). The game page then shows **▶ Play on this phone** instead of **Start scorekeeper** (the score tracker stays linked under the rules). |
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
| `scorekeeper.sheet` | string | no | Opens a purpose-built scorecard instead of the plus/minus tracker (see **Scorecards** for the values). |
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


Games marked as invented (for example the solitaires from Pagat.com's invented-games section, Brian Stovel's Twenty or David Parlett's Penguin) credit their designer in the objective. The rules are summarised in the app's own words; a few loosely written originals (Lockout, Twist Solitaire) are given as a cleaned-up reading. **Spiralling Shape** was left out because its rules survive only on an archived page that this project's network can't reach, and Pagat's links to externally hosted games (Boardwalk, Byzantium, Elemental and similar) and to commercially published games such as Sid Sackson's Bowling Solitaire were not copied.

The rules follow the most widely played version of each game. Where common versions differ (scoring schemes, pass limits, house rules), the alternatives are listed under **Common variations**, or noted inline.
