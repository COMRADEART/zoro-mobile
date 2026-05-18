# Data Safety form — recommended answers

Play Console → App content → **Data safety**. Transcribe these answers. They reflect the verified app behavior: no network code, no analytics/ads SDKs, all data on-device, optional backup is OS-level to the user's own Google Drive.

> Google's definitions: **"Collected"** means user data transmitted off the device. **On-device-only** processing is *not* collection. Data backed up via **Android Auto Backup** to the user's own Google account is explicitly **not** considered collection by the developer (per Google Play Data Safety guidance).

## Section: Data collection and security

| Question | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **No** | No network requests exist in the app. Fitness data and step count are processed and stored only on the device. |
| Is all of the user data collected by your app encrypted in transit? | **N/A** (not shown if "No" above) | Nothing is transmitted. |
| Do you provide a way for users to request that their data be deleted? | **Yes** — describe: in-app reset, clearing app storage, or uninstalling removes all local data. | No server-side data exists; deletion is fully user-controlled on-device. |

Because the first answer is **No**, the per-data-type questionnaire (Location, Personal info, Financial info, Health & fitness, etc.) is **skipped entirely** — do not declare any data types.

## If Google asks about specific types anyway / for your records

- **Health & fitness (steps, workouts):** Used (entered by user / read from pedometer) but **on-device only, not collected** → not declared.
- **App activity / preferences:** Stored locally only → not collected.
- **No** personal identifiers, contacts, location, financial, messages, photos, audio, files, or device IDs are accessed or transmitted.
- **No** data shared with third parties (there are no third-party SDKs that transmit data).
- **No** advertising or analytics.

## Keep this true

This declaration is only valid while the app stays offline with no analytics/ads SDKs. **If a future version adds any network call, analytics, crash reporting, ads, or push tokens, the Data Safety form must be revised before that version is published.** (`expo-notifications` is local-only here — no push token is registered; do not enable remote push without updating this form.)
