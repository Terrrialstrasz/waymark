# Tools Gateway

## Purpose

Tools Gateway helps the user use other phone apps intentionally.

> Other apps are tools for the path. They should not become the path.

Waymark does not block apps.

## Tool categories

| Category | Examples |
|---|---|
| Communicate | Phone, SMS, Zalo, Messenger, Gmail |
| Capture | Camera, Gallery, Voice Recorder |
| Navigate | Maps, Calendar, Grab |
| Work | Gmail, Drive, Docs, Chat, banking apps |
| Learn / Research | Browser, YouTube, ChatGPT, Kindle |
| Finance / Admin | Banking, bills, documents |
| Emergency / Utility | Phone, authenticator, health apps |

## ToolSession flow

```text
Open Tools
  → choose tool
  → optional purpose
  → external app opens
  → return to Waymark
  → prompt: Did this leave a mark?
  → create Mark / BacklogItem / Memory / nothing
  → close ToolSession
```

## ToolSession outputs

| Output | Entity |
|---|---|
| Meaningful proof | Mark |
| Future idea | BacklogItem |
| Life moment | Memory + Mark |
| Nothing useful | ToolSession closes without output |

## ToolSession fields

| Field | Meaning |
|---|---|
| toolId | Config ID |
| toolCategoryId | Category |
| purpose | Optional intention |
| relatedPathId | Path served |
| startedAt | Open time |
| endedAt | Return/end time |
| createdMarkId | Optional proof |
| createdBacklogItemId | Optional future idea |
| createdMemoryId | Optional memory |

## UI placement

Tools should not be a main tab. Add later through:

| Location | Reason |
|---|---|
| Me | Settings/control |
| Capture | Tool result capture |
| Today | Only if a specific ToolSession Signal/return is active |

## Do not build

| Avoid | Reason |
|---|---|
| App blocking | Not required |
| Accessibility blockers | Too invasive |
| Punishment flow | Wrong tone |
| Usage shame | Not Waymark |
| Full launcher early | Overkill |

## Acceptance criteria

| Test | Expected |
|---|---|
| Open tool | ToolSession starts |
| State purpose | Purpose saved |
| Return to Waymark | Return prompt appears |
| Create Mark | Mark linked to ToolSession |
| Create BacklogItem | BacklogItem linked |
| Choose nothing | ToolSession closes cleanly |
