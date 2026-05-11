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
- Manages tab navigation (Home, Train, Skill, Profile, Voyage, Config)
- Handles theme auto-switching, toast notifications, rank-up modals
- Runs `evaluateBountyMissions` and `evaluateArcWeekCompletion` on every session end

### State & Persistence
- `src/storage/progressStore.js` — AsyncStorage read/write with v3→v4 migration
- `src/context/ProgressContext.js` — React context exposing `{ progress, today, theme, t, handleUpdate, showToast, handleSessionEnd, setTab, onReset }`
- `src/logic/progression.js` — Pure functions, no React. Handles all game logic.

### Game Data
`src/data/gameData.js` — Single source of truth for all game constants:
- `SWORDS` — Three disciplines, each with exercises (id, name, unit, calorie rates)
- `RANKS` — XP thresholds and colors
- `REWARDS` — XP-gated technique unlocks
- `SKILL_TREES` — Per-discipline branches with exercise override unlocks
- `BOSS_CHALLENGES` — Weekly boss events with technique rewards
- `BOUNTY_MISSIONS` — Streak/calorie/discipline achievement missions
- `TRAINING_ARCS` — Multi-week story arcs with weekly targets
- `BREATHING_PROGRAMS`, `POWER_MEALS`, `SENSEI_PHRASES`

### Theming
- `src/theme/tokens.js` — Surface colors, text colors, layout constants
- `src/theme/themes.js` — Six themes (wado, sandai, shusui, hollow, solar, abyss) with bg/accent/particle colors

### Screens (in `src/screens/`)
- `HomeScreen.js` — Daily recommendation, sword sharpness, week view, rings
- `TrainScreen.js` — Session logging with exercise tracking
- `SkillScreen.js` — Discipline skill trees with XP-gated unlocks
- `ProfileScreen.js` — User stats, ranks, unlocked rewards
- `VoyageLogScreen.js` — Monthly narrative summaries
- `ConfigScreen.js` — Settings (theme, auto-theme, reminders, reset)

### Shared Components (`src/components/shared/`)
Charts (BarChart, LineChart, SparkLine), BreathingOrb, BreathingGuide, ThreeSwordRings, CircularProgress, GlassCard, ShimmerXPBar, RankUpModal, Toast, AmbientBG, SectionLabel.

### Key Systems in progression.js

**Session flow:** `applySessionStart` → `applySessionEnd` (calories, XP, recovery cost, rank check, reward check, week completion, skill unlock)

**Recovery:** Drains on training (15/hour), restores on sleep (20/hour × quality). Below 20 recovery → rest recommended.

**Sword Sharpness:** Composite of recovery (50%), mood/energy (25%), sleep quality (25%). Logged daily.

**Three Sword Rings:** Daily targets — Wado 20min, Sandai 200reps, Shusui 15min. Computed from session exercises + breathing log.

**Skill unlocks:** XP spent in discipline (via dayLog) unlocks branch nodes that override exercise base targets or add new exercises.

**Arc/Bounty evaluation:** Called in `Dojo.js` after every session end; mutates progress and emits toast events.
