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
- Hosts `ProgressProvider` and the tab pager (Home, Train, Skill, Profile, Voyage, Config)
- Handles theme auto-switching, toast notifications, rank-up modals
- Translates `_pendingEvents` (`ProgressionEvent[]`) into toasts/haptics/modals via `EVENT_HANDLERS`

### State & Persistence
- `src/storage/progressStore.ts` — AsyncStorage read/write; sequential `MIGRATIONS` ladder keyed by `schemaVersion`; corrupt blobs are backed up before reset; newer-schema blobs are preserved with saves disabled; debounced saves with background flush (`flushSave`)
- `src/context/ProgressContext.tsx` — React context exposing `{ progress, today, theme, t, handleUpdate, showToast, handleSessionEnd, setTab, onReset, clearPendingEvents }` (memoized; active tab lives in a separate `TabContext` via `useTab`). `handleSessionEnd` runs the post-session pipeline: boss evaluation/expiry, bounty assignment + evaluation, arc weeks, theme unlocks.
- `src/logic/progression.ts` — Pure functions, no React. Handles all game logic.
- `src/types.ts` — Shared TypeScript types (`Progress`, `ProgressionEvent`, …)

### Services & Hooks
- `src/services/aiService.ts` — On-device Gemini Nano (ML Kit) wrapper with deterministic fallbacks; capability lifecycle via `getCapability`/`ensureModel`
- `src/services/notificationService.js` — Typed-trigger reminders with stable identifiers
- `src/services/audioService.js`, `src/utils/haptics.js`, `src/hooks/useStepCounter.js`, `src/hooks/useAutoTheme.js`, `src/hooks/useReducedMotion.js`

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
- `src/theme/themes.js` — Six themes (wado, sandai, shusui, hollow, solar, abyss) with bg/accent/particle colors
- `src/theme/designSystem.js` — `DS` type presets, spacing, dividers

### Screens (in `src/screens/`)
- `HomeScreen.js` — Daily recommendation, sword sharpness, week view, rings, sensei chat entry
- `TrainScreen.js` — Session logging with exercise tracking; NL session hint; arcs sub-screen
- `TrainingArcsScreen.js` — Multi-week story arcs (start/track)
- `SkillScreen.js` — Discipline skill trees, boss challenge board, bounty board
- `ProfileScreen.js` — User stats, ranks, unlocked rewards, body/vitals logging
- `VoyageLogScreen.js` — Monthly narrative summaries
- `ConfigScreen.js` — Settings (theme, auto-theme, reminders, on-device AI status, reset)

### Shared Components (`src/components/shared/`)
Charts (BarChart, LineChart, SparkLine, SleepStagesChart), BreathingOrb, BreathingGuide, ThreeSwordRings, ActivityRings, CircularProgress, GlassCard, XPBar, RankUpModal, BossHintModal, SenseiChatModal, Toast, AmbientBG, SectionLabel, TabIcons.

### Key Systems in progression.ts

**Session flow:** `applySessionStart` → `applySessionEnd` (calories, XP, recovery cost, rank check, reward check, week completion, skill unlock)

**Recovery:** Drains on training (15/hour), restores on sleep (20/hour × quality). Below 20 recovery → rest recommended.

**Sword Sharpness:** Composite of recovery (50%), mood/energy (25%), sleep quality (25%). Logged daily.

**Three Sword Rings:** Daily targets — Wado 20min, Sandai 200reps, Shusui 15min. Computed from session exercises + breathing log.

**Skill unlocks:** XP spent in discipline (via dayLog) unlocks branch nodes that override exercise base targets or add new exercises.

**Week completion:** Non-overlapping 7-day windows — a new week needs 7+ days since the last credited one. Arc weeks are anchored to the arc's `startedAt` timeline.

**Boss/Arc/Bounty evaluation:** Runs in `ProgressContext.handleSessionEnd` after every session end; emits `ProgressionEvent`s that `Dojo.js` renders as toasts/modals.

## Verification

`npm run lint`, `npm run typecheck` (strict), and `npm test` must all pass; CI (.github/workflows/ci.yml) enforces them on every push/PR.
