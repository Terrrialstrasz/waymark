# Waymark Android APK Release

## Purpose

Build Waymark as a standalone Android APK that installs directly on a device and runs without Expo Go, `exp+` links, or a Metro server.

## Current Identity

- App name: `Waymark`
- Slug: `waymark`
- Version: `1.0.0`
- Android package: `com.waymark.lifeos`
- Build output target: standalone `.apk`

## Build Profiles

`eas.json` keeps the existing profiles and adds a dedicated standalone APK profile:

- `development`
  - `developmentClient: true`
  - Internal APK for native debugging only
- `preview`
  - Internal APK
- `apk-preview`
  - `distribution: internal`
  - `android.buildType: apk`
  - No `developmentClient`
  - No Metro dependency after install
- `production`
  - Preserved as-is

## Build Commands

Install dependencies:

```bash
npm install
```

Validate Expo configuration:

```bash
npx expo-doctor
```

Build the standalone Android APK:

```bash
npm run build:android:apk
```

Equivalent direct command:

```bash
npx eas build --platform android --profile apk-preview
```

## Install The APK

If you download the generated artifact locally, install it with:

```bash
adb install -r path/to/waymark.apk
```

Expected result:

- Artifact format is `.apk`
- Build is standalone
- App opens without Expo Go
- App does not require a running Metro server

## Weekly Coding Release Rule

Weekly Coding may propose app upgrades, but every upgrade must stay small, testable, and tied to real usage.

Each Weekly Coding session should produce at most `1-3` upgrade candidates.

Every upgrade candidate must be classified before coding:

1. Seed/data/content update
2. UI/UX JavaScript-only update
3. Domain logic update
4. Native capability update
5. Architecture/entity/data-contract change

Rules:

- Category `1-2` can be implemented during normal Weekly Coding.
- Category `3` requires explicit acceptance criteria and test cases before coding.
- Category `4` requires a new APK build after implementation.
- Category `5` must not be implemented directly during Weekly Coding; create a design note first.

## Upgrade Template

For each proposed upgrade, record:

- Problem observed
- Screen/component affected
- User value
- Proposed change
- Data impact
- Architecture impact
- Acceptance criteria
- Test cases
- Rollback plan
- Whether APK rebuild is required

## Release Checklist

After every Weekly Coding implementation:

1. Run typecheck and lint if available.
2. Run the app locally.
3. Test the affected screen on Android.
4. Build a fresh APK.
5. Install the APK on a device.
6. Smoke test:
   - App opens
   - Today screen loads
   - Planned Marks display
   - Pack Checks display
   - Capture opens
   - Close the Trail opens
   - No Metro server required
7. Record:
   - APK filename
   - version
   - build date
   - features changed
   - known issues

## Release Record Template

Use this format for each Weekly Coding release:

```md
## APK Release Record

- APK filename:
- Version:
- Build date:
- Build profile: `apk-preview`
- Features changed:
- Known issues:
- Standalone confirmed: yes/no
- Metro required: yes/no
```
