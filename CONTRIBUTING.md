# Contributing to Santoryu Fitness

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## Code Style

- Use **ESLint** with `eslint-config-expo` (run `npm run lint`)
- Use **TypeScript** for new files (`.ts`/`.tsx`)
- Add type annotations to function parameters and return types
- Add **JSDoc** comments to all exported functions
- Prefer `const` over `let`, avoid `var`
- Use named exports for utilities, default exports for components

## Running Tests

```bash
npm run lint    # ESLint
npm run typecheck  # TypeScript check
```

## Adding New Exercises

1. Add the exercise to the appropriate discipline in `src/data/gameData.js`:
   ```javascript
   { id: 'sandai-new', name: 'New Exercise', unit: 'reps', base: 50, caloriePerRep: 0.3 }
   ```

2. If adding a new discipline, update `src/types.ts` with the new discipline type:
   ```typescript
   export type Discipline = 'wado' | 'sandai' | 'shusui' | 'new-discipline';
   ```

3. Update `SKILL_TREES` if the exercise should be affected by skill unlocks

## Adding New Ranks

Edit `RANKS` array in `src/data/gameData.js`:
```javascript
{ name: 'NEW RANK', min: 20000, max: Infinity, color: '#ff0000' }
```

## Adding New Boss Challenges

Edit `BOSS_CHALLENGES` array in `src/data/gameData.js`:
```javascript
{
  id: 'new-boss',
  name: 'New Boss',
  kanji: '新規',
  discipline: 'sandai',
  exercises: [{ name: 'Push-ups', reps: 500 }],
  xpReward: 5000,
  techniqueReward: 'ashura',
  weeksRequired: 4,
}
```

## Adding New Bounty Missions

Edit `BOUNTY_MISSIONS` array in `src/data/gameData.js` with requirement types:
- `streak`: Train N consecutive days
- `all_disciplines`: Log all three disciplines in a day
- `weekly_kcal`: Burn N calories in a week
- `discipline_streak`: Train one discipline N days in a row
- `sharpness_streak`: Maintain sharpness above N for M days
- `hydration_streak`: Log N cups for M days

## Adding Training Arcs

Edit `TRAINING_ARCS` array in `src/data/gameData.js`:
```javascript
{
  id: 'arc-new',
  name: 'New Arc',
  kanji: '新規',
  discipline: 'sandai',
  durationWeeks: 4,
  color: '#ff0000',
  requiredRank: 2,
  weeks: [
    { week: 1, title: 'Week 1', objective: '...', targets: { sessions: 3 } },
  ],
  xpReward: 3000,
  techniqueReward: 'oni-giri',
}
```

## Best Practices

- **Performance**: Use `React.memo` for expensive components (ThreeSwordRings, CircularProgress, GlassCard, ShimmerXPBar)
- **Lists**: Use `FlatList` instead of `ScrollView` + `map` for long lists
- **Animations**: Prefer `useNativeDriver: true` for non-layout animations
- **State**: Use `useCallback`/`useMemo` for expensive computations in components
- **AsyncStorage**: Never store secrets or sensitive data