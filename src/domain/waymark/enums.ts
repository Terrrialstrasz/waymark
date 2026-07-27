export enum PathStatus {
  Active = "active",
  Paused = "paused",
  Archived = "archived",
}

export enum ExpeditionStatus {
  Planned = "planned",
  Active = "active",
  Paused = "paused",
  Completed = "completed",
  Archived = "archived",
}

export enum MilestoneStatus {
  Planned = "planned",
  Active = "active",
  Completed = "completed",
  Missed = "missed",
  Archived = "archived",
}

export enum MarkTemplateType {
  Routine = "routine",
  OneOffBlueprint = "one_off_blueprint",
  Ritual = "ritual",
  Workout = "workout",
}

export enum MarkInstanceStatus {
  Planned = "planned",
  Ready = "ready",
  Blocked = "blocked",
  Active = "active",
  Completed = "completed",
  Skipped = "skipped",
  Rescheduled = "rescheduled",
  Substituted = "substituted",
  Expired = "expired",
  Cancelled = "cancelled",
}

export enum MarkInstanceOrigin {
  TemplateGenerated = "template_generated",
  WeeklyPlanned = "weekly_planned",
  QuickCapture = "quick_capture",
  ManualPlan = "manual_plan",
  BacklogConverted = "backlog_converted",
  Substitution = "substitution",
}

export enum PackCheckInstanceStatus {
  Scheduled = "scheduled",
  Available = "available",
  InProgress = "in_progress",
  Completed = "completed",
  PartiallyCompleted = "partially_completed",
  Skipped = "skipped",
  Expired = "expired",
  Cancelled = "cancelled",
}

export enum SignalTargetType {
  MarkInstance = "mark_instance",
  PackCheckInstance = "pack_check_instance",
  TrailDay = "trail_day",
}

export enum SignalStatus {
  Scheduled = "scheduled",
  Ringing = "ringing",
  Snoozed = "snoozed",
  Resolved = "resolved",
  Dismissed = "dismissed",
  Missed = "missed",
  Expired = "expired",
  Cancelled = "cancelled",
}

export enum BacklogItemStatus {
  Open = "open",
  Pulled = "pulled",
  Planned = "planned",
  Converted = "converted",
  Archived = "archived",
  Dropped = "dropped",
}

export enum BacklogItemType {
  MarkCandidate = "mark_candidate",
  PackCheckCandidate = "pack_check_candidate",
  MemorySeed = "memory_seed",
  Idea = "idea",
  Project = "project",
  Note = "note",
}

export enum BacklogItemHorizon {
  Near = "near",
  Someday = "someday",
  Unplanned = "unplanned",
}

export enum WeekPlanStatus {
  Draft = "draft",
  Active = "active",
  Closed = "closed",
  Archived = "archived",
}

export enum WeekPlanItemStatus {
  Pulled = "pulled",
  ConvertedToMark = "converted_to_mark",
  Removed = "removed",
  Done = "done",
}

export enum TrailDayStatus {
  Open = "open",
  ReadyToClose = "ready_to_close",
  Closed = "closed",
  Reopened = "reopened",
}

export enum MemoryPrivacy {
  Private = "private",
  SharedHousehold = "shared_household",
}

export enum MediaAssetOwnerType {
  MarkInstance = "mark_instance",
  Memory = "memory",
  Path = "path",
  Expedition = "expedition",
  BacklogItem = "backlog_item",
}

export enum MediaAssetKind {
  Image = "image",
  Video = "video",
}

export enum MediaAssetType {
  ProofPhoto = "proof_photo",
  ProofVideo = "proof_video",
  MemoryPhoto = "memory_photo",
  MemoryVideo = "memory_video",
  BacklogPhoto = "backlog_photo",
  BacklogVideo = "backlog_video",
  HeroImage = "hero_image",
  Attachment = "attachment",
  Thumbnail = "thumbnail",
}

export enum WorkoutRoutineType {
  Strength = "strength",
  Walk = "walk",
  Stretch = "stretch",
  Hybrid = "hybrid",
  GolfPractice = "golf_practice",
}

export enum WorkoutExercisePhase {
  Strength = "strength",
  Walk = "walk",
  Cooldown = "cooldown",
  Stretch = "stretch",
}

export enum WorkoutSessionStatus {
  NotStarted = "not_started",
  WarmingUp = "warming_up",
  Active = "active",
  ExerciseActive = "exercise_active",
  SetActive = "set_active",
  Resting = "resting",
  Cooldown = "cooldown",
  Completed = "completed",
  Abandoned = "abandoned",
}

export enum WorkoutSessionPhase {
  Strength = "strength",
  Cooldown = "cooldown",
  Complete = "complete",
}

export enum ExerciseTargetType {
  RepsLoad = "reps_load",
  RepsOnly = "reps_only",
  Timed = "timed",
  WalkDistance = "walk_distance",
  Steps = "steps",
}

export enum ExerciseCategory {
  Strength = "strength",
  Core = "core",
  Walk = "walk",
  Mobility = "mobility",
  Stretch = "stretch",
  Golf = "golf",
}

export enum SessionExerciseStatus {
  NotStarted = "not_started",
  Active = "active",
  Completed = "completed",
  Skipped = "skipped",
  Failed = "failed",
}

export enum ProgressionPolicyType {
  DoubleProgression = "double_progression",
  FixedIncrement = "fixed_increment",
  TimeIncrease = "time_increase",
  ManualCoach = "manual_coach",
}

export enum DependencyType {
  PackCheckCompleted = "pack_check_completed",
  MarkCompleted = "mark_completed",
  MarkResolved = "mark_resolved",
  ManualUnlock = "manual_unlock",
  SessionLevelPackCheck = "session_level_pack_check",
}

export enum DependencyRequiredEntityType {
  MarkInstance = "mark_instance",
  PackCheckInstance = "pack_check_instance",
}

export enum DependencyStatus {
  Pending = "pending",
  Satisfied = "satisfied",
  Waived = "waived",
  Failed = "failed",
  Cancelled = "cancelled",
}

export enum RecurrenceKind {
  Calendar = "calendar",
  Daily = "daily",
  Weekly = "weekly",
  CustomCycle = "custom_cycle",
  Manual = "manual",
  Contextual = "contextual",
}
