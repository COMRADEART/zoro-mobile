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
- `[ ]` **D1** Emoji-as-iconography: `✕ ★ ✓` in `ProfileScreen`, `✓` in
  `TrainingArcsScreen`, 1 in `SkillScreen` → replace with line-icon (extend
  `TabIcons.js`) or kanji. No banned pictographs (🔥👣🌙💀👑) remain.
- `[ ]` **D2** Repeated hero-metric template in `HomeScreen` `heroBand`
  (two giant serif numbers) → demote "today" to inline stat.
- `[ ]` **D3** Section-head inconsistency: `HomeScreen` reimplements its own
  `SectionHead` while `SectionLabel.js` exists → converge on one primitive.
- `[ ]` **D4** `letterSpacing` overrides fighting `DS.type` (`Dojo.loadingLabel`,
  `BreathingGuide.phaseSub`, `RankUpModal.rankUpEye`) → normalize.

### Accessibility (WCAG AA)
- `[ ]` **A1** No reduced-motion support; infinite loops in `AmbientBG`,
  `BreathingOrb`, `BreathingGuide`, `RankUpModal`, `BossHintModal` → shared
  `useReducedMotion` hook gating every auto/loop animation. (Keystone.)
- `[ ]` **A2** Sparse a11y semantics on most `Pressable`s → propagate
  `role/label/state` (pattern: `DojoTabBar`, `HomeScreen` header).
- `[ ]` **A3** Touch targets < 44pt (`ProfileScreen` star/close ≈ 30pt) →
  enforce 44pt minimum.
- `[ ]` **A4** Accent-as-text contrast (confirmed): sandai `#E52030` on
  `#0c0808` = **4.35:1**, fails AA for normal text, used at 11–12pt on the
  default theme's Home. wado `#D4A853` = 9.1:1 (passes). → audit 6 themes; fix
  accent text < 14pt-bold.

### Performance
- `[ ]` **P1** `HomeScreen` ~8 derived selectors recompute every render; effect
  deps on whole `progress` → `useMemo` + narrow dep.
- `[ ]` **P2** `AmbientBG` particle loops on JS driver (`useNativeDriver:false`)
  → native driver, gate by A1, cap particle count.
- `[ ]` **P3** `DojoTabBar.scaleAnim` / `Dojo.tabAnim` transforms on JS driver
  → native.
- `[ ]` **P4** `HomeScreen` recomputes `maxVol` inside the 7× week `.map` →
  hoist out.

## Drop / out of scope

Functional bug hunt, new features, the JS→TS migration, and any
`logic/progression` or persistence behavior change. Design edits are
visual/semantic only.
