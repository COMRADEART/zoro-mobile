# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Santoryu Fitness** — A React Native (Expo) mobile app themed around One Piece's Zoro. Users train in three disciplines (Wado/Mind, Sandai/Body, Shusui/Spirit) through exercise tracking with XP, ranks, skill trees, boss challenges, training arcs, and bounty missions.

Stack: React 19, React Native 0.81, Expo 54, AsyncStorage, react-native-reanimated, react-native-svg.

## Commands

```bash
npm start              # Start Expo (default)
npm run android        # Start Expo for Android
npm run ios            # Start Expo for iOS
npm run web            # Start Expo for web
npm run lint           # Run ESLint (eslint-config-expo)
```

## Architecture

### Entry Point
- `App.js` → renders `<Dojo />` (the root screen orchestrator)
- `index.js` → Expo entry point

### Dojo.js — Central Hub
`src/screens/Dojo.js` is the single root component. It:
- Owns all global state via `ProgressContext`
- Manages a 4-tab horizontal pager — Home, Train, Skills, Progress — gated by a `WelcomeScreen` sign-in. (Profile/Voyage/Config were consolidated into Progress's Story/Body/Settings segments.)
- Owns the toast via `useToast` (passed to `ProgressProvider` as `toastCallback`), plus rank-up/boss modals and theme-flash
- Runs `evaluateBountyMissions` and `evaluateArcWeekCompletion` on every session end

### State & Persistence
- `src/storage/progressStore.ts` — AsyncStorage read/write with v3→v4 migration + corrupt-state backup
- `src/context/ProgressContext.tsx` — React context exposing `{ progress, today, theme, t, handleUpdate, handleUpdateImmediate, showToast, handleSessionEnd, setTab, onReset, clearPendingEvents }`
- `src/logic/progression.ts` — Pure functions, no React. Handles all game logic. Date keys are **local** (`toDateKey`/`parseDateKey`), so streaks/weeks follow the user's wall clock.

### Game Data
`src/data/gameData.ts` — Single source of truth for all game constants:
- `SWORDS` — Three disciplines, each with exercises (id, name, unit, calorie rates)
- `RANKS` — XP thresholds and colors
- `REWARDS` — XP-gated technique unlocks
- `SKILL_TREES` — Per-discipline branches with exercise override unlocks
- `BOSS_CHALLENGES` — Weekly boss events with technique rewards
- `BOUNTY_MISSIONS` — Streak/calorie/discipline achievement missions
- `TRAINING_ARCS` — Multi-week story arcs with weekly targets
- `BREATHING_PROGRAMS`, `POWER_MEALS`, `SENSEI_PHRASES`

### Theming
- `src/theme/tokens.ts` — Surface colors, text colors, layout constants
- `src/theme/themes.js` — Seven **monochrome** themes (wado, sandai, shusui, hollow, solar, abyss, marimo). Pure grayscale (R=G=B); themes differ only by paper value. Category is carried by glyph/label/fill, never hue.
- `src/theme/designSystem.js` — `DS` spacing/radii/type/motion tokens.

### Screens (in `src/screens/`)
- `WelcomeScreen.js` — Local-only profile capture (no backend/OAuth); the launch gate
- `HomeScreen.js` — Daily recommendation, sword-sharpness gauge, rank rail, three-sword triptych
- `TrainScreen.js` — Session logging (idle → active → rest → done), breathing, resume-after-crash
- `SkillScreen.js` — Discipline skill trees with XP-gated unlocks
- `ProgressScreen.js` — Story / Body / Settings segments: rank, streaks, voyage chronicle, body signals, theme picker, reminders, reset
- `TrainingArcsScreen.js` — Multi-week story arcs (reached from Train)

### Shared Components
- `src/components/premium/PremiumUI.js` — primitives: `Panel`, `ScreenHeader`, `PrimaryButton`, `MetricTile`, `ProgressRail`, `SwordSelector`, `SoftDivider`, `SWORD_GLYPH`
- `src/components/shared/` — `GlassCard`, `Toast`, `RankUpModal`, `BossHintModal`, `AmbientBG`/`FloatingParticles`, `BreathingGuide`, `charts/SparkLine`, `ErrorBoundary`
- `src/components/ToastWrapper.js` (`useToast`), `src/components/DojoTabBar.js`
- Animation honors `useReducedMotion()`; background/particle/card loops are gated and use the native driver.

### Key Systems in progression.js

**Session flow:** `applySessionStart` → `applySessionEnd` (calories, XP, recovery cost, rank check, reward check, week completion, skill unlock)

**Recovery:** Drains on training (15/hour), restores on sleep (20/hour × quality). Below 20 recovery → rest recommended.

**Sword Sharpness:** Composite of recovery (50%), mood/energy (25%), sleep quality (25%). Logged daily.

**Three Sword Rings:** Daily targets — Wado 20min, Sandai 200reps, Shusui 15min. Computed from session exercises + breathing log.

**Skill unlocks:** `disciplineXPFor` credits sessions per discipline (via dayLog) to unlock branch nodes that override exercise base targets or add new exercises. Each day's contribution is capped (`MAX_DISCIPLINE_SESSIONS_PER_DAY`) so many tiny same-day sessions can't farm unlocks.

**Reminders:** Opt-in daily training reminder set in Progress → Settings. `notificationService.scheduleTrainingReminder` requests permission and schedules a `DAILY` trigger; the toggle only flips on if a reminder was actually scheduled.

**Arc/Bounty evaluation:** Called in `Dojo.js` after every session end; mutates progress and emits toast events.
