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
- `[ ]` **P1** `HomeScreen` ~8 derived selectors recompute every render; effect
  deps on whole `progress` → `useMemo` + narrow dep.
- `[done]` **P2** `AmbientBG` particle loops on JS driver
  (`useNativeDriver:false`) → native driver, gated by A1, capped at 16.
- `[done]` **P3** `DojoTabBar.scaleAnim` / `Dojo.tabAnim` transforms on JS
  driver → native.
- `[ ]` **P4** `HomeScreen` recomputes `maxVol` inside the 7× week `.map` →
  hoist out.

## Drop / out of scope

Functional bug hunt, new features, the JS→TS migration, and any
`logic/progression` or persistence behavior change. Design edits are
visual/semantic only.
