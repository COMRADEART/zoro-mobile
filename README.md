# Santoryu Fitness

A React Native (Expo) mobile fitness app that turns daily training into a progression RPG themed around One Piece's Zoro. Users train across three disciplines — Wado (Mind), Sandai (Body), and Shusui (Spirit) — earning XP, climbing ranks, unlocking skill trees, completing boss challenges, and following multi-week training arcs. The central engineering challenge was layering a stateful game loop (XP, recovery, streaks, mission evaluation) on top of a real fitness tracker, with fully offline persistence and live-migratable save data.

## Screens

| Screen | Purpose |
|--------|---------|
| **Home** | Daily recommendation engine, Sword Sharpness composite score, week-at-a-glance, activity rings |
| **Train** | Session logging — discipline select, 16 exercises across 3 disciplines, live calorie estimate, session commit |
| **Skill** | Per-discipline skill trees; nodes unlock on XP spend, not just XP total |
| **Profile** | Cumulative stats, rank timeline, unlocked technique rewards |
| **Voyage** | Monthly narrative summaries, training trends, activity heatmaps |
| **Config** | Theme selection, auto-theme rules, reminder settings, data reset |

## Key Systems

### Three Sword Discipline System
Three disciplines each have their own exercise pool, calorie rates, daily ring targets, and skill tree. Disciplines are deliberately asymmetric: Wado targets minutes of mind work, Sandai targets rep counts, Shusui targets endurance minutes. This asymmetry forces training across all three disciplines rather than grinding a single mode.

### XP & Rank Progression
Six ranks from *East Blue Rookie* to *King of Hell*, each with an XP threshold and color token. Rank-up emits a `ProgressionEvent` that `useSessionEvaluator` translates into a rank-up modal. Because rank logic lives in a pure function, it is unit-testable without mounting any component.

### Recovery System
Recovery is a 0–100 resource. Training costs 15 points per hour; sleep restores 20 points per hour scaled by logged quality. Falling below 20 triggers a "rest recommended" flag on the Home screen. This creates a real tension between grinding XP and protecting recovery — the core game loop.

### Sword Sharpness
A composite daily readiness score derived from three signals: recovery (50%), mood + energy (25%), and sleep quality (25%). Logged once per day to `swordSharpnessLog` and rendered as the primary readiness indicator on Home.

### Three Sword Rings
Apple-style daily activity rings, each mapped to a discipline target:
- **Wado ring** — 20 min of mind training
- **Sandai ring** — 200 reps
- **Shusui ring** — 15 min of endurance/spirit work

Progress is derived at read time from the session and breathing logs. Nothing is double-written, keeping the saved object minimal and migrations straightforward.

### Skill Trees
Per-discipline branches gated on XP *spent in that discipline*, not XP total. Spend-gating forces active use of each sword rather than passive accumulation — a player who only trains Sandai can't unlock Wado nodes by accident. Unlocked nodes override an exercise's base target or add new exercises to the training pool. Evaluated in `evaluateSkillUnlock` after every session commit.

### Boss Challenges, Training Arcs & Bounty Missions
All three are long-horizon systems evaluated on session end by `useSessionEvaluator`. Boss Challenges are weekly events with technique rewards. Training Arcs are multi-week story beats with per-week targets. Bounty Missions are achievement missions with six requirement types: `streak`, `all_disciplines`, `weekly_kcal`, `discipline_streak`, `sharpness_streak`, and `hydration_streak`.

## Architecture

```
App.js → <Dojo />                Root orchestrator, tab navigation, toast/modal host
  ProgressContext                Global state + persistence binding
  progressStore.ts               AsyncStorage read/write — debounced, versioned
  progression.ts                 Pure game logic — no React, no side effects
  gameData.ts                    Single source of truth for all constants
  useSessionEvaluator            Post-session hook: arc, bounty, skill evaluation
  src/screens/                   6 screens, each reads from ProgressContext
  src/components/shared/         Reusable chart, animation, and UI primitives
```

**Why `ProgressContext` instead of Redux or Zustand?**
The app has a single `Progress` object that is read and written atomically. There are no cross-cutting slice dependencies that would justify a normalized store. `ProgressContext` with a single `handleUpdate` function keeps the data flow explicit and eliminates boilerplate. A context re-render is acceptable here because screens only re-render at session boundaries, not on every keystroke.

**Why pure functions in `progression.ts`?**
All game mechanics live in one file with zero React or AsyncStorage imports. This makes the entire game loop unit-testable without mounting components, portable to a web version, and auditable — the source of any XP or recovery value traces through a plain call stack with no mocked dependencies.

**State flow:**
`applySessionStart` (opens session) → user logs exercises → `applySessionEnd` (calculates calories, XP, recovery cost, rank check, reward check, week completion, skill unlock) → `useSessionEvaluator` receives `ProgressionEvent[]` and triggers toasts/modals.

## Persistence & Data Migration

Saves are debounced at 500 ms to avoid write-thrashing during rapid state updates. On load, `progressStore.ts` checks for a `v4` key first, then falls back to migrating a `v3` record — adding 9 new fields (`hydrationLog`, `foodLog`, `bodyComposition`, `breathingLog`, `arcProgress`, `bountyMissions`, `swordSharpnessLog`, `dreamArchetypeLog`, `voyageChronicles`). After migration the v3 key is deleted. `normalizeProgress` then fills any remaining gaps from `defaultProgress`, so the app always operates on a fully-shaped object regardless of save age.

### Optional cloud backup (Android Auto Backup)

Progress is stored locally in an AsyncStorage SQLite database (`RKStorage`). On Android, that database is **optionally** backed up to the user's own Google Drive through [Android Auto Backup](https://developer.android.com/identity/data/autobackup) (delivered via Google Play services) and restored automatically on reinstall or new-device setup.

This is opt-in **on the user's side**, not the app's: it only runs when the user is signed into a Google account with "Back up to Google Drive" enabled in Android Settings. There is a ~25 MB per-app cap and **no API keys, OAuth, or sign-in code** — it is pure manifest configuration:

- `app.json` → `android.allowBackup: true` (declared explicitly so it survives `expo prebuild`)
- `android/app/src/main/res/xml/data_extraction_rules.xml` (Android 12+) and `backup_rules.xml` (≤ Android 11), referenced from the manifest `<application>` tag

The rule files intentionally declare **no `<include>` elements** — any `<include>` would switch Android to allow-list mode and could silently drop the `RKStorage` database if its filename changes across `react-native-async-storage` or new-architecture upgrades. Leaving them permissive keeps the progress store covered by the default "back up all eligible app data" behavior.

## Testing

Unit tests cover the pure-logic layer directly — no component mounting required. 143 test cases across 3 files:

| File | What it covers |
|------|----------------|
| `tests/progression.test.js` (75 cases) | XP, recovery, rank transitions, sharpness, ring progress, streak logic, arc/bounty evaluation |
| `tests/gameData.test.js` (44 cases) | Shape and referential integrity of all game constants |
| `tests/storage.test.js` (24 cases) | v3→v4 migration path, normalization, reset |

Because `progression.ts` has no side effects, tests construct arbitrary `Progress` objects with `defaultProgress()` + overrides and call any function directly.

## Performance

- **`useNativeDriver: true`** on all non-layout animations keeps the UI thread unblocked.
- **`React.memo`** on `ThreeSwordRings`, `CircularProgress`, `GlassCard`, and `ShimmerXPBar` — the most computationally expensive render paths.

## Theming

Six themes (wado, sandai, shusui, hollow, solar, abyss), each a set of background, accent, and particle color tokens defined in `themes.ts`. Auto-theme rules in `ConfigScreen` can switch the active theme based on time of day or active discipline. Theme state lives inside `ProgressContext` and propagates to all screens without a separate ThemeProvider.

## Setup & Commands

```bash
npm install
npm start
```

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Android target |
| `npm run ios` | iOS target |
| `npm run web` | Web target |
| `npm run lint` | ESLint (eslint-config-expo) |
| `npm run typecheck` | TypeScript type check |

## Stack

- React 19, React Native 0.81, Expo 54
- TypeScript for all source modules (logic, storage, context, screens); entry point and tests in JavaScript
- AsyncStorage for offline-first persistence
- react-native-reanimated for animations
- react-native-svg for charts and activity rings

## Future Work

- **Live multi-device sync** — single-device backup/restore is already covered by Android Auto Backup (see Persistence & Data Migration). The remaining gap is real-time sync across devices, which would replace the AsyncStorage layer with a backend-backed store; the `Progress` type and `normalizeProgress` already act as a schema contract that would survive the swap.
- **Wearable integration** — the activity ring goals (`MOVE_GOAL`, `EXERCISE_GOAL`, `STAND_GOAL`) are already constants; feeding real step/HR data from a Health API would require only a new ingestion path, not a logic rewrite.
- **Social layer** — boss challenges already define week requirements and technique rewards; leaderboard-style competition would fit naturally into the existing `ProgressionEvent` system.
