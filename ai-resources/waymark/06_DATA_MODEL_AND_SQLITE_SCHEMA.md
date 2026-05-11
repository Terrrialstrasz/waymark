# Data Model and SQLite Schema

## Data model principle

> Marks are proof only. They do not own planning, workout, memory, pack check, expedition, or closure logic.

## Core entities

| Group | Entities |
|---|---|
| Planning | BacklogItem, WeeklyCodingRun, DailyPlan, PlannedMark |
| Proof | Mark |
| Expedition | Expedition, ExpeditionRouteItem |
| Health | WorkoutSessionRun, WorkoutExerciseRun, ExerciseProgressionState |
| Memory | Memory, MediaAsset, MemoryCollection, MemoryPathLink, MemoryCollectionLink, MemoryPlace, MemoryCalendarEntry |
| Pack Check | PackCheckRun |
| Close Trail | DailyClosure with CharacterEvidence JSON |
| Support | Signal, ToolSession, Review |

## Relationship overview

```text
BacklogItem
  ├─ converts to PlannedMark
  ├─ converts to Expedition
  └─ converts to ExpeditionRouteItem

Expedition
  └─ has many ExpeditionRouteItem
        └─ WeeklyCodingRun pulls into PlannedMark

DailyPlan
  └─ has many PlannedMark

PlannedMark
  ├─ may reference Expedition
  ├─ may reference ExpeditionRouteItem
  ├─ may open WorkoutSessionRun if Health
  └─ when done creates Mark

QuickMarkTemplate
  └─ creates Mark

Memory
  ├─ has many MediaAsset
  ├─ links to many paths
  └─ quick memory creates Mark

PackCheckRun
  └─ may create Mark based on PackCheckConfig

WorkoutSessionRun
  ├─ has many WorkoutExerciseRun for Workout A/B
  ├─ updates ExerciseProgressionState
  └─ creates Mark when completed

DailyClosure
  ├─ reads DailyPlan, PlannedMarks, Marks, PackCheckRuns, Memories, Expeditions
  └─ creates Character Mark
```

## Shared TypeScript types

```ts
export type LifePathId =
  | "career_craft"
  | "snag_golf_vietnam"
  | "health_body"
  | "family_home"
  | "character_stoicism"
  | "golf_craft"
  | "culture_class_romance";

export type PrivacyScope = "private" | "private_sensitive" | "family";

export type MarkSource =
  | "planned"
  | "quick"
  | "memory"
  | "pack_check"
  | "daily_closure"
  | "workout_session"
  | "tool_session"
  | "review";

export type PlannedMarkStatus =
  | "planned"
  | "completed"
  | "postponed"
  | "substituted"
  | "missed"
  | "cancelled"
  | "blocked"
  | "converted";
```

## SQLite conventions

| Convention | Decision |
|---|---|
| IDs | `TEXT PRIMARY KEY` UUID |
| Dates | ISO strings as `TEXT` |
| Boolean | `INTEGER` 0/1 |
| JSON | `TEXT` containing JSON |
| Soft delete | `deleted_at TEXT NULL` |
| Foreign keys | `PRAGMA foreign_keys = ON` |
| Config | TypeScript files, not tables |

## Tables

### backlog_items

```sql
CREATE TABLE backlog_items (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_text TEXT,
  source TEXT NOT NULL,
  candidate_path_ids_json TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  suggested_conversion TEXT,
  converted_entity_type TEXT,
  converted_entity_id TEXT,
  privacy TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL,
  processed_at TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### weekly_coding_runs

```sql
CREATE TABLE weekly_coding_runs (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  week_end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  reviewed_backlog_item_ids_json TEXT,
  created_daily_plan_ids_json TEXT,
  created_planned_mark_ids_json TEXT,
  created_expedition_ids_json TEXT,
  pulled_route_item_ids_json TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

### daily_plans

```sql
CREATE TABLE daily_plans (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  date TEXT NOT NULL UNIQUE,
  weekly_coding_run_id TEXT,
  anchor_path_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (weekly_coding_run_id) REFERENCES weekly_coding_runs(id)
);
```

### planned_marks

```sql
CREATE TABLE planned_marks (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  daily_plan_id TEXT,
  date TEXT NOT NULL,
  path_id TEXT NOT NULL,
  title TEXT NOT NULL,
  template_id TEXT,
  quick_mark_template_id TEXT,
  slot_id TEXT,
  timing_type TEXT NOT NULL,
  planned_start TEXT,
  planned_end TEXT,
  time_window_id TEXT,
  done_condition TEXT,
  status TEXT NOT NULL,
  expedition_id TEXT,
  expedition_route_item_id TEXT,
  source_backlog_item_id TEXT,
  actual_mark_id TEXT,
  substitute_mark_id TEXT,
  postponed_to_planned_mark_id TEXT,
  postpone_reason TEXT,
  block_reason TEXT,
  label_snapshot_json TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (daily_plan_id) REFERENCES daily_plans(id),
  FOREIGN KEY (expedition_id) REFERENCES expeditions(id),
  FOREIGN KEY (expedition_route_item_id) REFERENCES expedition_route_items(id),
  FOREIGN KEY (source_backlog_item_id) REFERENCES backlog_items(id)
);
```

### marks

```sql
CREATE TABLE marks (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  path_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  source TEXT NOT NULL,
  level TEXT NOT NULL,
  privacy TEXT NOT NULL DEFAULT 'private',
  planned_mark_id TEXT,
  quick_mark_template_id TEXT,
  expedition_id TEXT,
  memory_id TEXT,
  pack_check_run_id TEXT,
  daily_closure_id TEXT,
  workout_session_run_id TEXT,
  tool_session_id TEXT,
  review_id TEXT,
  value_json TEXT,
  label_snapshot_json TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### expeditions

```sql
CREATE TABLE expeditions (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  kind TEXT NOT NULL,
  path_id TEXT NOT NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  why_it_matters TEXT,
  definition_of_done TEXT,
  status TEXT NOT NULL,
  intensity TEXT NOT NULL DEFAULT 'normal',
  protected_path_ids_json TEXT,
  arrival_target_date TEXT,
  last_safe_date TEXT,
  visibility_json TEXT,
  metadata_json TEXT,
  closed_at TEXT,
  closed_by_daily_closure_id TEXT,
  recovery_mark_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### expedition_route_items

```sql
CREATE TABLE expedition_route_items (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  expedition_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  sequence INTEGER,
  target_date TEXT,
  source_backlog_item_id TEXT,
  created_planned_mark_ids_json TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (expedition_id) REFERENCES expeditions(id),
  FOREIGN KEY (source_backlog_item_id) REFERENCES backlog_items(id)
);
```

### workout_session_runs

```sql
CREATE TABLE workout_session_runs (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  planned_mark_id TEXT NOT NULL,
  session_type TEXT NOT NULL,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  walk_target_steps INTEGER,
  walk_actual_steps INTEGER,
  walk_completed INTEGER,
  stretch_completed INTEGER,
  generated_mark_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (planned_mark_id) REFERENCES planned_marks(id)
);
```

### workout_exercise_runs

```sql
CREATE TABLE workout_exercise_runs (
  id TEXT PRIMARY KEY,
  workout_session_run_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  planned_value REAL NOT NULL,
  actual_value REAL NOT NULL,
  unit TEXT NOT NULL,
  target_sets INTEGER,
  target_reps INTEGER,
  completed_sets INTEGER,
  completed_reps INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workout_session_run_id) REFERENCES workout_session_runs(id)
);
```

### exercise_progression_states

```sql
CREATE TABLE exercise_progression_states (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL UNIQUE,
  current_target_value REAL NOT NULL,
  unit TEXT NOT NULL,
  consecutive_completions INTEGER NOT NULL DEFAULT 0,
  last_completed_workout_session_run_id TEXT,
  last_completed_at TEXT,
  updated_at TEXT NOT NULL
);
```

### memories

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  title TEXT,
  caption TEXT,
  why_it_matters TEXT,
  feeling TEXT,
  occurred_at TEXT NOT NULL,
  privacy TEXT NOT NULL DEFAULT 'private',
  created_mark_id TEXT,
  source_mark_id TEXT,
  primary_media_asset_id TEXT,
  place_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### media_assets

```sql
CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  memory_id TEXT,
  mark_id TEXT,
  kind TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  thumbnail_uri TEXT,
  cloud_path TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local_only',
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### memory_path_links

```sql
CREATE TABLE memory_path_links (
  memory_id TEXT NOT NULL,
  path_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (memory_id, path_id),
  FOREIGN KEY (memory_id) REFERENCES memories(id)
);
```

### memory_collections

```sql
CREATE TABLE memory_collections (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  expedition_id TEXT,
  cover_memory_id TEXT,
  privacy TEXT NOT NULL DEFAULT 'private',
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### memory_collection_links

```sql
CREATE TABLE memory_collection_links (
  memory_collection_id TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  sequence INTEGER,
  created_at TEXT NOT NULL,
  PRIMARY KEY (memory_collection_id, memory_id),
  FOREIGN KEY (memory_collection_id) REFERENCES memory_collections(id),
  FOREIGN KEY (memory_id) REFERENCES memories(id)
);
```

### memory_places

```sql
CREATE TABLE memory_places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  parent_place_id TEXT,
  province_legacy_code TEXT,
  latitude REAL,
  longitude REAL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### memory_calendar_entries

```sql
CREATE TABLE memory_calendar_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  recurrence_rule TEXT,
  memory_id TEXT,
  memory_collection_id TEXT,
  path_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### pack_check_runs

```sql
CREATE TABLE pack_check_runs (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  pack_check_config_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  completed_item_ids_json TEXT,
  skipped_item_ids_json TEXT,
  related_planned_mark_id TEXT,
  related_expedition_id TEXT,
  created_mark_id TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### daily_closures

```sql
CREATE TABLE daily_closures (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  date TEXT NOT NULL UNIQUE,
  daily_plan_id TEXT,
  status TEXT NOT NULL,
  anchor_path_id TEXT,
  actual_dominant_path_id TEXT,
  deviated_from_anchor INTEGER,
  consumed_path_id TEXT,
  path_needing_attention_id TEXT,
  completed_planned_mark_ids_json TEXT,
  missed_planned_mark_ids_json TEXT,
  postponed_planned_mark_ids_json TEXT,
  substituted_planned_mark_ids_json TEXT,
  character_evidence_json TEXT,
  character_result TEXT,
  pressure_source TEXT,
  repair_needed INTEGER,
  repair_mark_id TEXT,
  generated_character_mark_id TEXT,
  tomorrow_first_step TEXT,
  memory_prompt_accepted INTEGER,
  closed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### signals

```sql
CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  kind TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  expires_at TEXT,
  status TEXT NOT NULL,
  related_path_id TEXT,
  related_planned_mark_id TEXT,
  related_pack_check_config_id TEXT,
  related_expedition_id TEXT,
  related_tool_session_id TEXT,
  related_date TEXT,
  local_notification_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### tool_sessions

```sql
CREATE TABLE tool_sessions (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  tool_category_id TEXT NOT NULL,
  purpose TEXT,
  related_path_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_mark_id TEXT,
  created_backlog_item_id TEXT,
  created_memory_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### reviews

```sql
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  map_version TEXT NOT NULL,
  kind TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  path_id TEXT,
  expedition_id TEXT,
  daily_closure_id TEXT,
  summary TEXT,
  notes TEXT,
  created_mark_id TEXT,
  created_backlog_item_ids_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Recommended indexes

```sql
CREATE INDEX idx_marks_completed_at ON marks(completed_at DESC);
CREATE INDEX idx_marks_path_completed ON marks(path_id, completed_at DESC);
CREATE INDEX idx_marks_expedition ON marks(expedition_id);
CREATE INDEX idx_planned_marks_date_status ON planned_marks(date, status);
CREATE INDEX idx_planned_marks_path_date ON planned_marks(path_id, date);
CREATE INDEX idx_planned_marks_expedition_status ON planned_marks(expedition_id, status);
CREATE INDEX idx_backlog_status_created ON backlog_items(status, created_at DESC);
CREATE INDEX idx_expeditions_status_path ON expeditions(status, path_id);
CREATE INDEX idx_route_items_expedition_status ON expedition_route_items(expedition_id, status, sequence);
CREATE INDEX idx_memories_occurred_at ON memories(occurred_at DESC);
CREATE INDEX idx_memory_path_links_path ON memory_path_links(path_id, memory_id);
CREATE INDEX idx_pack_runs_date_config ON pack_check_runs(date, pack_check_config_id);
CREATE INDEX idx_workout_sessions_date_type ON workout_session_runs(date, session_type);
CREATE INDEX idx_workout_exercise_runs_exercise ON workout_exercise_runs(exercise_id, created_at);
CREATE INDEX idx_signals_status_time ON signals(status, scheduled_for);
```
