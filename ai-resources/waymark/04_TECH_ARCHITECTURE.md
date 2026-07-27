# Waymark Technical Architecture

## Architecture principle

> Waymark Vault owns logical truth. Local SQLite is the working copy. Cloud storage protects and reconciles under the Vault contract. Code defines the Map. User data records the Marks.

## Recommended stack

| Layer | Choice |
|---|---|
| Mobile app | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router or React Navigation |
| Local database | SQLite |
| Local files | Expo FileSystem |
| Secure storage | SecureStore / native keychain |
| Notifications | Expo Notifications later |
| Structured reconciliation later | Turso, governed by the Waymark Vault contract |
| Media blob storage later | Google Drive, governed by the Waymark Vault contract |

## Module structure

```text
src/
  waymark-map/
    index.ts
    map-version.ts
    paths.ts
    quick-marks.ts
    planned-mark-templates.ts
    daily-finish-line.ts
    weekly-plan.ts
    pack-checks.ts
    workout-cycle.ts
    workout-exercises.ts
    progression-rules.ts
    expeditions.ts
    signals.ts
    copy.ts
    theme.ts
    icons.ts

  domain/
    types.ts
    mark-rules.ts
    planned-mark-rules.ts
    backlog-rules.ts
    weekly-coding-rules.ts
    expedition-rules.ts
    workout-cycle-rules.ts
    workout-progression-rules.ts
    pack-check-rules.ts
    memory-rules.ts
    daily-closure-rules.ts
    character-evidence.ts
    path-status.ts
    visibility-rules.ts

  storage/
    schema.ts
    migrations/
    db.ts
    repositories/

  services/
    media-service.ts
    signal-service.ts
    privacy-service.ts
    backup-service.ts
    app-gateway-service.ts

  assets/
    imageRegistry.ts
    imageUsage.ts

  components/
    primitives/
    domain/
    lab/

  screens/
    today/
    capture/
    journal/
    paths/
    me/

  navigation/
  theme/
```

## Local-first rules

| Rule | Requirement |
|---|---|
| Save locally first | Every Mark, PlannedMark, Memory, Closure saves locally first |
| Core offline | Today, Capture, Journal, Paths, Me work offline |
| Cloud later | Backup/sync is not required for MVP |
| Media local first | Save files locally before cloud backup |
| Private default | All records default private |

## Feature visibility architecture

Use a central feature registry.

```ts
export type FeatureVisibility =
  | "hidden"
  | "schema_only"
  | "domain_ready"
  | "internal_hidden"
  | "weekly_coding_only"
  | "today_visible"
  | "path_visible"
  | "fully_visible";

export type WaymarkFeatureId =
  | "quick_mark"
  | "planned_mark"
  | "backlog"
  | "weekly_coding_report"
  | "today_cockpit"
  | "journal"
  | "paths"
  | "close_trail"
  | "pack_checks"
  | "health_workout_engine"
  | "expeditions"
  | "memories"
  | "signals"
  | "tools_gateway"
  | "privacy_vault"
  | "backup";
```

Every screen and component entry point must check feature visibility.

## Repository rule

Screens must not call SQLite directly. Use repositories and domain services.

```text
Screen → view model composer → domain rules → repository → SQLite
```

## Generated views

Today Cockpit should not have its own database table. It should be composed from:

- DailyPlan
- PlannedMarks
- Marks
- PackCheckRuns
- WorkoutSessionRuns
- Expeditions
- DailyClosure
- Signals
- Map config

## Future cloud direction

```text
Create record locally
→ Encrypt payload on device
→ Upload ciphertext to cloud
→ Restore downloads ciphertext
→ Device decrypts locally
```

No plaintext diary, memory, or personal proof should be stored in cloud backup.

## Shared image asset architecture

All visual assets must flow through a single shared image system.

```text
Bundled asset or stored source
-> image registry entry
-> usage config
-> WaymarkImage primitive
-> feature/domain component
```

### Required image modules

| Module | Responsibility |
|---|---|
| `src/assets/imageRegistry.ts` | Canonical registry for icons, path icons, status seals, botanical motifs, logos, heroes, journal, memory, and expedition media |
| `src/assets/imageUsage.ts` | Maps UI usage to preferred variant, object fit, loading strategy, max width, and fallback behavior |
| `src/components/primitives/WaymarkImage.tsx` | Shared rendering guardrail with variant selection, fallback, and development warnings |
| `src/components/primitives/WaymarkSkinAsset.tsx` | Skin/icon wrapper built on top of `WaymarkImage` |
| `src/components/primitives/WaymarkLogoMark.tsx` | Logo wrapper built on top of `WaymarkImage` |

### Asset handling rules

| Rule | Requirement |
|---|---|
| No direct originals in UI | Original uploaded media may be stored but must not be rendered directly in cards, heroes, lists, or previews |
| Variant-driven rendering | Photo-like assets use `thumb`, `compact`, `card`, `hero`, `large`, `full` variants |
| Transparent asset handling | Icons, logos, seals, and motifs preserve transparency and stay tightly cropped |
| Bounded hero sizes | Hero assets should resolve to 1200-1600px variants; fullscreen previews cap at 2048px |
| Card safety | Compact cards must not use assets wider than 720px |
| Wrapper-only access | Screens and domain components should consume image asset IDs or `WaymarkImage`, not raw file paths |

### Development safeguards

- Warn if a direct source looks like an original upload path.
- Warn if a compact card uses an image wider than 720px.
- Warn if a hero uses an image wider than 2048px.
- Warn if an icon asset appears to have excessive transparent padding.
- Warn if alt text is missing unless the asset is decorative.
- Warn if a large image is marked priority outside above-the-fold contexts.
