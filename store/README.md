# Play Store submission pack

Reference artifacts for publishing **Santoryu Fitness** (`com.santoryu.fitness`) to Google Play.

These are the things that can't be assessed from source code alone — drafted here from the app's *actual* behavior (offline, no accounts, no analytics, local storage + optional OS-level Auto Backup). They are starting points you fill into the Play Console UI / host yourself, **not** legal advice.

## Contents

| File | What it is | How you use it |
|---|---|---|
| `privacy-policy.md` / `.html` | A privacy policy reflecting this app's real data practices | Host the `.html` somewhere public (GitHub Pages, etc.); paste the URL into Play Console → Store presence → Privacy Policy |
| `data-safety.md` | Exact answers for the Data Safety form | Transcribe into Play Console → App content → Data safety |
| `content-rating.md` | Recommended IARC questionnaire answers | Transcribe into Play Console → App content → Content rating |
| `store-listing.md` | Title, short/full description, categorization, + asset spec | Paste copy into Store listing; produce the graphics to the listed specs |
| `signing-and-build.md` | Keystore generation + signed-AAB build steps | Follow on your machine — **no keys are committed** |

## Pre-submission checklist

Code / config:
- [x] **Removed `SCHEDULE_EXACT_ALARM`** from `app.json` permissions (reminders are inexact daily notifications — the permission was unjustified and a known rejection trigger). Confirm reminder delivery in on-device QA.
- [x] Android Auto Backup is prebuild-durable (`plugins/withAndroidBackup.js`, tested).
- [ ] Bump `android.versionCode` for each upload (currently `1`).
- [x] **Suppressed unused `RECORD_AUDIO`** — `expo-audio` is playback-only; configured `recordAudioAndroid: false` so the microphone permission is no longer declared. (`MODIFY_AUDIO_SETTINGS` remains — a normal, unscrutinized playback permission.)
- [x] **Declared `ACTIVITY_RECOGNITION`** in `app.json` (it is NOT auto-added by `expo-sensors`) and added the runtime request in `useStepCounter.js`, so step counting works on Android 10+. Confirm on-device QA.

Console / listing (use the docs in this folder):
- [ ] Privacy policy hosted at a public URL and linked.
- [ ] Data Safety form completed (see `data-safety.md`).
- [ ] Content rating questionnaire completed (see `content-rating.md`).
- [ ] Store listing text + graphics uploaded (see `store-listing.md`).
- [ ] Signed AAB built and uploaded to a testing track first (see `signing-and-build.md`).
- [ ] App access: declare "no login required" (whole app is usable without an account).

## ⚠️ Biggest non-code risk: intellectual property

The app is themed around **One Piece** (character "Zoro", the named swords *Wado Ichimonji / Sandai Kitetsu / Shusui*, the three-sword style). One Piece is an active trademark/copyright of Eiichiro Oda / Shueisha / Toei. Shipping an unlicensed app that trades on that IP is a **realistic Play Store takedown / rejection risk — likely larger than any permission issue.** None of the documents in this folder fix that. Options to consider before launch: (a) obtain a license, (b) re-skin to original naming/lore and remove direct references, or (c) accept the takedown risk knowingly. This is a product/legal decision, not something I can resolve in code — flagging it so it's an explicit choice, not an oversight.

## Disclaimer

I am not a lawyer. `privacy-policy.md` and the rating/data-safety guidance are accurate to the app's technical behavior but are **not legal advice**. Have them reviewed if the app handles real users at scale or you are unsure about the IP question above.
