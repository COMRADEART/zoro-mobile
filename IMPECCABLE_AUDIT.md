# Impeccable Audit — uncommitted design refresh

Triage of the large uncommitted working-tree diff (23 files, +765/−1001), an
`/impeccable` design-system implementation against `PRODUCT.md`.

## Verdict: KEEP as baseline

The refresh is sound and on-brand. No revert. Build on it; close the gaps below.

**Keep (verified good):**

- `theme/designSystem.js` `DS.type` presets + `theme/tokens.ts` `TXT1/2/3`
  AA-tiered text colors with documented contrast and an 11pt legibility floor.
- `GlassCard` rewrite with `card` / `flat` / `plain` variants — directly serves
  PRODUCT principle "earn the card."
- `XPBar` — intentionally static (reduced-motion-aware by design).
- `DojoTabBar` — line-icon `TabIcons` (no emoji), full
  `accessibilityRole/State/Label`.
- `progressStore.saveProgress` — 500ms-debounced writes (perf hygiene intact).
- `ShimmerXPBar` deletion is clean — no dangling references.

## Fix (gap → action)

Status legend: `[done]` `[ ]`

### Design / PRODUCT.md
- `[done]` **D1** Emoji-as-iconography → added check/close/star glyphs +
  `Icon` export to `TabIcons.js`; ProfileScreen/SkillScreen/TrainingArcs now
  use line-icons; save buttons drop the redundant glyph (kanji states it).
- `[done]` **D2** Repeated hero-metric template in `HomeScreen` `heroBand`
  → single Sword Sharpness focal; "today" demoted to a supporting clause.
- `[done]` **D3** Section-head inconsistency → `SectionLabel` extended with a
  `right` slot; `HomeScreen` converged. TrainScreen's ceremonial divider is
  intentionally distinct (left as-is).
- `[done]` **D4** `letterSpacing` overrides fighting `DS.type`
  (`Dojo.loadingLabel`, `BreathingGuide.phaseSub`, `RankUpModal.rankUpEye`)
  → normalized.

### Accessibility (WCAG AA)
- `[done]` **A1** No reduced-motion support; infinite loops in `AmbientBG`,
  `BreathingOrb`, `BreathingGuide`, `RankUpModal`, `BossHintModal` → shared
  `useReducedMotion` hook gating every auto/loop animation. (Keystone.)
- `[done]` **A2** Sparse a11y semantics → swept all screens + `GlassCard`
  centrally; role/label/state on every interactive element.
- `[done]` **A3** Touch targets < 44pt → small switches/chips/icons given
  44pt hit areas (min sizing or `hitSlop`).
- `[done]` **A4** Audited all 6 theme accents vs their bg: only **sandai**
  failed (#E52030 = 4.35:1; wado 9.07, shusui 8.16, hollow 5.02, solar 9.08,
  abyss 5.45 — all pass). Fixed at the single source: `THEMES.sandai.accent`
  → `#EE3A33` (5.02:1, same crimson), so every accent-text usage on the
  default theme now clears AA with zero call-site churn.
  Known follow-up (out of A4's named scope, not a blanket rework): the
  *sandai discipline* sword color (`SWORDS`/`'#DC143C'`-family) used as small
  text in SkillScreen/Profile is a separate, broader contrast item.

### Performance
- `[done]` **P1** `HomeScreen` ~8 derived selectors → single `useMemo` keyed
  on `[progress, today]`; sharpness-log effect dep narrowed to a primitive.
  (Spot-check: `SkillScreen` already memoizes its heavy `bossCards`/tier.)
- `[done]` **P2** `AmbientBG` particle loops on JS driver
  (`useNativeDriver:false`) → native driver, gated by A1, capped at 16.
- `[done]` **P3** `DojoTabBar.scaleAnim` / `Dojo.tabAnim` transforms on JS
  driver → native.
- `[done]` **P4** `HomeScreen` weekly-bar max hoisted out of the 7× `.map`
  into the memo.

## Verification status

All 12 items done. Static checks green after every commit:

- `npm run lint` (expo lint) — clean, no warnings.
- `npx tsc --noEmit -p tsconfig.json` — clean.
- `npm test` — 219/219 passed, 8/8 suites (no logic touched; the
  `console.error` lines in output are expected from the corruption-path
  tests, which pass).

### Device QA checklist (please run on a device/emulator)

Static analysis cannot exercise the runtime; verify these by hand:

1. **Reduced motion** — enable OS "Reduce Motion", open the app:
   AmbientBG settles to a static wash, no floating particles; the home
   orb and breathing orb are still (not pulsing); rank-up / boss-hint
   modals appear without zoom/rotate; tab switch is instant. The
   breathing-guide phase orb MUST still animate (it paces breathing).
   Toggle the setting off — motion returns without a reload.
2. **Screen reader** (TalkBack/VoiceOver) — every tab, save button,
   toggle, accordion, theme tile, star/cup/pip, arc card announces a
   role and label; toggles announce on/off; accordions announce
   expanded/collapsed; locked theme tiles announce "locked".
3. **Touch targets** — the sleep-quality stars, meal-remove, hydration
   cups, mood pips, Config switches and time chips are all comfortably
   tappable (no mis-taps on adjacent controls).
4. **Design** — no emoji glyphs anywhere (check ✕ ✓ ★ are now line
   icons / kanji); Home shows ONE big number (Sword Sharpness) with
   "today" as a small line, not two giant numbers; section headers look
   identical across Home and the other screens.
5. **Contrast** — switch through all 6 themes; accent-colored labels
   (the day/date on Home, "— SENSEI", week day letters) are clearly
   legible on the dark background, especially on the default Sandai
   theme.
6. **Smoke** — log a session, save sleep/mood/body, start an arc,
   change theme, reset: all still work (no behavior was changed).

## Drop / out of scope

Functional bug hunt, new features, the JS→TS migration, and any
`logic/progression` or persistence behavior change. Design edits are
visual/semantic only.
