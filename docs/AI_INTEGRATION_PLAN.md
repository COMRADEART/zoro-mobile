# On-device Gemini (ML Kit GenAI) integration — plan for sign-off

Status: **proposal — not started.** No code written yet. This document is the thing to approve before Phase 0.

## Decision recap

- **Runtime:** on-device only (your choice). Preserves the offline / no-network / no-API-key posture and keeps the just-committed privacy policy + Data Safety declaration technically accurate.
- **Features requested:** Sensei chat, smart recommendations, voyage-log narration, NL session logging — all four.

## Verified facts (Google docs, May 2026)

All ML Kit GenAI APIs run **fully on-device — no network, no API key** ("input, inference, and output processed locally"), foreground-only, with per-app AICore quotas.

| Thing | Verified value |
|---|---|
| Prompt API artifact | `com.google.mlkit:genai-prompt:1.0.0-beta2` (**beta**) |
| Min Android | **API 26** |
| Availability API | `generativeModel.checkStatus()` → `FeatureStatus { AVAILABLE, UNAVAILABLE, DOWNLOADING, DOWNLOADABLE }`; `download()` when downloadable |
| **Input limit** | < 4000 tokens (~3000 words) |
| **Output limit** | avoid > **256 tokens** output |
| **Structured output** | **none** — no JSON/schema mode |
| Language | validated English & Korean only |
| Device gate | AICore devices only (Pixel 9/10, Galaxy S25/S26, some OnePlus/OPPO; **varies by API**); unsupported on unlocked-bootloader devices |
| Other APIs | Summarization / Rewriting / Proofreading / Image Description / Speech Recognition — separate `com.google.mlkit:genai-*` artifacts; exact versions to be read off each API's page at implementation time, not guessed |

There is **no Expo or React Native module** for any of this → a **custom native Android (Kotlin) Expo module + config plugin** is mandatory.

## What the limits mean for each feature (honest)

| Feature | Best API | Reality under the constraints |
|---|---|---|
| Voyage-log narration | **Summarization** | Best fit. Feed the month's structured stats, get a short summary-style narrative. The 256-token ceiling means *short* prose, not long story — design copy around that. |
| Smart recommendations | Prompt | Short output suits this well (a recommendation is 1–2 sentences). Low risk. |
| Sensei chat | Prompt | Workable but replies must be **short** (≤256 tokens). No long coaching essays. Set expectations in UX. |
| **NL session logging** | Prompt | **Highest risk.** Needs structured JSON, but the API has *no* structured-output mode. Requires prompt-engineered constrained output + strict parser + validation + guaranteed fallback to manual entry. Treat as experimental. |

## Branch hygiene (do this first)

This work does **not** belong on `auto-backup-and-migration-fix` (a Play-hardening branch). Plan:
1. Land / open a PR for `auto-backup-and-migration-fix` as-is.
2. Branch `feat/on-device-gemini` off `master` (after the above merges) for all AI work.

## Architecture

```
screens/  ──>  src/services/aiService.ts        (JS abstraction; the only thing screens import)
                     │  capability state machine: unavailable | downloadable |
                     │  downloading | ready | error  → always a fallback value
                     ▼
              native module  expo-gemini-nano    (Kotlin, wraps com.google.mlkit:genai-*)
                     │
              plugins/withGeminiNano.js           (config plugin: Gradle dep, minSdk, prebuild-durable
                                                    — same pattern as withAndroidBackup.js)
```

Non-negotiables:
- Every feature has a **deterministic fallback that already exists today** (static `SENSEI_PHRASES`, rule-based recommendation, templated voyage log, manual session form). AI is an *enhancement layer*; removing it changes nothing functionally.
- Screens never call the native module directly and never branch on platform — they call `aiService`, which returns either an AI result or the fallback. Fallback is the **default path** (most devices, all iOS/web have no AICore).
- Capability state is resolved at runtime via `checkStatus()` and surfaced as explicit UI states (not-available / model-downloading / ready) — never assume a "supported" device has the model ready.

## Phased delivery

| Phase | Scope | Verifiable *here*? |
|---|---|---|
| **0 — Foundation** | `aiService` + capability state machine + fallback contract + native module skeleton + config plugin + Jest tests for the JS contract & every fallback branch. **Nothing user-visible changes.** | ✅ Yes (JS contract fully mockable & tested) |
| **1 — First feature** | Voyage-log narration via ML Kit **Summarization** (best API↔feature fit, bounded output, real value). | JS ✅ / on-device behavior ❌ needs a real AICore device |
| **2** | Smart recommendations + Sensei chat via Prompt API (short-output prompts). | JS ✅ / inference ❌ device-only |
| **3** | NL session logging (strict-parse + fallback). Highest risk; only after Phase 2 is proven on-device. | JS ✅ / accuracy ❌ device-only |

Each phase is its own PR. Phases 1–3 ship behind the capability gate, so merging them is safe even before on-device verification (they're inert without AICore).

## Verifiability boundary (important)

I **cannot** verify on-device inference from here — no AICore device in this environment, and the API is beta + device-gated. What I *can* deliver and prove here: the entire JS layer, the fallback behavior, the config plugin output (via `expo prebuild`), and the native module *compiling*. Actual model output quality/latency requires you to run a dev build on a supported device. The design deliberately puts the unverifiable part (native inference) behind a fully-tested JS contract so a failure there degrades to today's behavior, not a crash.

## Privacy / Play

On-device via ML Kit ⇒ not "data collection" under Google's definitions, so `store/privacy-policy.*` and `store/data-safety.md` stay technically accurate. **Action:** flag `store/data-safety.md` for a GenAI-specific disclosure re-check before submission (Play has been adding AI questions) — do **not** silently rewrite the committed docs.

## Open questions for you

1. OK to land/PR `auto-backup-and-migration-fix` first, then branch `feat/on-device-gemini`?
2. Approve the phased order (0 → 1 → 2 → 3), starting with **only Phase 0**?
3. Accept that NL session logging (Phase 3) is best-effort with mandatory manual fallback, given the API has no structured-output mode?
