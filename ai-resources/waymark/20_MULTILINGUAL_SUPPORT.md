# Multilingual Support

## Purpose

Waymark must support English and Vietnamese naturally.

> The user should be able to walk the path in the language that feels natural today.

## Core rules

| Rule | Meaning |
|---|---|
| English and Vietnamese are first-class | Both use full UI resources |
| Page-by-page localization | No half-translated visible pages |
| Stable IDs | Data uses IDs, not translated labels |
| Label snapshots | Marks preserve label shown at creation |
| User content unchanged | Do not auto-translate notes/captions |
| Future search bilingual | Later, search raw text and localized labels |

## Locale types

```ts
export type WaymarkLocale = "en" | "vi";

export type LocalizedText = {
  en: string;
  vi: string;
};

export function t(text: LocalizedText, locale: WaymarkLocale): string {
  return text[locale] ?? text.en;
}
```

## Page localization readiness

```ts
export type ScreenLocalizationStatus = {
  screenId: string;
  readyLocales: WaymarkLocale[];
};
```

A page can render in a locale only if that locale is listed as ready.

## Copy required per page

| Copy type | Example |
|---|---|
| Screen title | Today / Hôm nay |
| Section headers | Marks to Leave / Dấu mốc hôm nay |
| Buttons | Done / Hoàn thành |
| Status labels | Postponed / Dời lại |
| Empty states | No marks yet / Chưa có dấu mốc |
| Error states | Could not save / Chưa lưu được |
| Confirmation | Marked / Đã đánh dấu |
| Ritual copy | Today is marked. Rest. / Hôm nay đã có dấu mốc. Nghỉ ngơi thôi. |

## Suggested Vietnamese vocabulary

| English | Vietnamese suggestion |
|---|---|
| Waymark | Waymark |
| Path | Con đường |
| Mark | Dấu mốc |
| Journal | Nhật ký |
| Map | Bản đồ, internal only |
| Pack Check | Kiểm tra trước khi đi |
| Close the Trail | Khép lại ngày |
| Expedition | Chặng lớn |
| Backlog | Việc để sau / Hộp chờ |
| Weekly Coding Report | Báo cáo tuần |
| Signal | Tín hiệu |
| Today | Hôm nay |
| Capture | Ghi nhanh |
| Paths | Con đường |
| Me | Tôi |

## Data snapshot rule

When creating a Mark, store the displayed label in the current locale.

```ts
labelSnapshot: {
  locale: "vi",
  pathName: "Sức khỏe & Thân thể",
  quickMarkLabel: "Tập sức mạnh Ngày A"
}
```

Old marks remain understandable even if:

- The user switches language.
- Map copy changes.
- Vietnamese labels improve later.

## User content language

| Content | Behavior |
|---|---|
| Mark note | Store exactly as written |
| Memory caption | Store exactly as written |
| Tomorrow first step | Store exactly as written |
| Reflection | Store exactly as written |
| Auto-translation | Not MVP |

## Language switch placement

| Location | Reason |
|---|---|
| Me → Language | Permanent preference |
| Today header or overflow | Fast switch only if page is fully localized |
| Capture | User may capture in current thinking language |
| Close Trail | Reflection language may change |

## Acceptance criteria

| Test | Expected |
|---|---|
| App set to English | Visible pages show English |
| App set to Vietnamese | Visible pages show Vietnamese |
| Page missing Vietnamese copy | Hidden or blocked in Vietnamese |
| Tap QuickMark in Vietnamese | Label snapshot stores Vietnamese |
| Switch to English later | Existing Mark snapshot remains Vietnamese |
| User writes mixed note | Text stored exactly |
| Signal scheduled after language change | Future signal uses current language |
