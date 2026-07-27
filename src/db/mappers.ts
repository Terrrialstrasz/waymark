import {
  AppSetting,
  BacklogItem,
  ExerciseDefinition,
  ExerciseProgressState,
  ExerciseSetLog,
  Expedition,
  MarkDependency,
  MarkInstance,
  MarkPackCheckRule,
  MarkTemplate,
  MediaAsset,
  Memory,
  Milestone,
  PackCheckInstance,
  PackCheckItemInstance,
  PackCheckItemTemplate,
  PackCheckTemplate,
  Path,
  ReflectionEntry,
  RoutineExerciseTemplate,
  SessionExerciseSnapshot,
  Signal,
  TrailDay,
  UserProfile,
  WeekPlan,
  WeekPlanItem,
  WorkoutRoutineTemplate,
  WorkoutSessionInstance,
  DailyMediaUploadBatch,
} from "../domain/waymark";
import { PathStatus } from "../domain/waymark";
import {
  AppSettingRow,
  BacklogItemRow,
  DbSyncStatus,
  ExerciseDefinitionRow,
  ExerciseProgressStateRow,
  ExerciseSetLogRow,
  ExpeditionRow,
  MarkDependencyRow,
  MarkInstanceRow,
  MarkPackCheckRuleRow,
  MarkTemplateRow,
  MediaAssetRow,
  MemoryRow,
  MilestoneRow,
  MutableDbRow,
  PackCheckInstanceRow,
  PackCheckItemInstanceRow,
  PackCheckItemTemplateRow,
  PackCheckTemplateRow,
  PathRow,
  ReflectionEntryRow,
  RoutineExerciseTemplateRow,
  SessionExerciseSnapshotRow,
  SignalRow,
  TrailDayRow,
  UserProfileRow,
  WeekPlanItemRow,
  WeekPlanRow,
  WorkoutRoutineTemplateRow,
  WorkoutSessionInstanceRow,
  DailyMediaUploadBatchRow,
} from "./rows";

type MetadataTarget = {
  id: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  syncVersion?: number;
};

function toEpochMs(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const epoch = new Date(value).getTime();
  return Number.isNaN(epoch) ? null : epoch;
}

function fromEpochMs(value?: number | null): string | undefined {
  if (value == null) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function fromRequiredEpochMs(value?: number | null): string {
  return fromEpochMs(value) ?? "1970-01-01T00:00:00.000Z";
}

function isFloatingDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/.test(value);
}

function toFloatingEpochMs(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  if (!isFloatingDateTime(value)) {
    return toEpochMs(value);
  }

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [clockPart, millisPart = "000"] = timePart.split(".");
  const [hours, minutes, seconds] = clockPart.split(":").map(Number);
  const epoch = Date.UTC(year, month - 1, day, hours, minutes, seconds, Number(millisPart));
  return Number.isNaN(epoch) ? null : epoch;
}

function fromFloatingEpochMs(value?: number | null): string | undefined {
  if (value == null) {
    return undefined;
  }

  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${date.getUTCSeconds()}`.padStart(2, "0");
  const millis = `${date.getUTCMilliseconds()}`.padStart(3, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}`;
}

function toDbBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function fromDbBoolean(value: number): boolean {
  return value === 1;
}

function toDbJson(value: unknown): string {
  return JSON.stringify(value);
}

function fromDbJson<T>(value?: string | null): T | undefined {
  return value ? (JSON.parse(value) as T) : undefined;
}

function mapRowMetadata(row: MutableDbRow, target: MetadataTarget) {
  target.createdAt = fromRequiredEpochMs(row.created_at);
  target.updatedAt = fromRequiredEpochMs(row.updated_at);
  target.deletedAt = fromEpochMs(row.deleted_at);
  target.syncVersion = row.local_revision;
}

function baseMutableRow(record: MetadataTarget, syncStatus: DbSyncStatus = "local"): MutableDbRow {
  return {
    created_at: toEpochMs(record.createdAt) ?? Date.now(),
    updated_at: toEpochMs(record.updatedAt) ?? Date.now(),
    deleted_at: toEpochMs(record.deletedAt),
    sync_status: syncStatus,
    local_revision: record.syncVersion ?? 0,
  };
}

export function toUserProfileRow(profile: UserProfile): UserProfileRow {
  return {
    id: profile.id,
    user_id: profile.userId,
    display_name: profile.displayName ?? null,
    locale: profile.locale,
    timezone: profile.timezone,
    week_starts_on: profile.weekStartsOn,
    close_trail_prompt_time: profile.closeTrailPromptTime ?? null,
    ...baseMutableRow(profile),
  };
}

export function fromUserProfileRow(row: UserProfileRow): UserProfile {
  const profile: UserProfile = {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name ?? undefined,
    locale: row.locale,
    timezone: row.timezone,
    weekStartsOn: row.week_starts_on,
    closeTrailPromptTime: row.close_trail_prompt_time ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, profile);
  return profile;
}

export function toAppSettingRow(setting: AppSetting): AppSettingRow {
  return {
    id: setting.id,
    user_id: setting.userId,
    key: setting.key,
    value_json: toDbJson(setting.value),
    ...baseMutableRow(setting),
  };
}

export function fromAppSettingRow(row: AppSettingRow): AppSetting {
  const setting: AppSetting = {
    id: row.id,
    userId: row.user_id,
    key: row.key,
    value: fromDbJson<AppSetting["value"]>(row.value_json) ?? null,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, setting);
  return setting;
}

export function toPathRow(path: Path): PathRow {
  return {
    id: path.id,
    user_id: path.userId,
    name: path.title,
    subtitle: null,
    slug: path.slug,
    title: path.title,
    description: path.description ?? null,
    status: path.status,
    color_token: null,
    icon_key: null,
    sort_order: path.sortOrder,
    is_active: path.status === PathStatus.Active ? 1 : 0,
    hero_media_asset_id: path.heroMediaAssetId ?? null,
    ...baseMutableRow(path),
  };
}

export function fromPathRow(row: PathRow): Path {
  const path: Path = {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title ?? row.name,
    description: row.description ?? undefined,
    status: row.status as Path["status"],
    sortOrder: row.sort_order,
    heroMediaAssetId: row.hero_media_asset_id ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, path);
  return path;
}

export function toExpeditionRow(expedition: Expedition): ExpeditionRow {
  return {
    id: expedition.id,
    user_id: expedition.userId,
    path_id: expedition.pathId,
    title: expedition.title,
    purpose: expedition.description ?? null,
    description: expedition.description ?? null,
    status: expedition.status,
    sort_order: expedition.sortOrder,
    start_date: expedition.startDate ?? null,
    target_date: expedition.targetDate ?? null,
    started_at: toEpochMs(expedition.startedAt),
    target_end_at: toEpochMs(expedition.targetEndAt),
    completed_at: toEpochMs(expedition.completedAt),
    hero_media_asset_id: expedition.heroMediaAssetId ?? null,
    ...baseMutableRow(expedition),
  };
}

export function fromExpeditionRow(row: ExpeditionRow): Expedition {
  const expedition: Expedition = {
    id: row.id,
    userId: row.user_id,
    pathId: row.path_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as Expedition["status"],
    sortOrder: row.sort_order,
    startDate: row.start_date ?? undefined,
    targetDate: row.target_date ?? undefined,
    startedAt: fromEpochMs(row.started_at),
    targetEndAt: fromEpochMs(row.target_end_at),
    completedAt: fromEpochMs(row.completed_at),
    heroMediaAssetId: row.hero_media_asset_id ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, expedition);
  return expedition;
}

export function toMilestoneRow(milestone: Milestone): MilestoneRow {
  return {
    id: milestone.id,
    user_id: milestone.userId,
    expedition_id: milestone.expeditionId,
    title: milestone.title,
    description: milestone.description ?? null,
    status: milestone.status,
    start_date: null,
    target_date: milestone.targetDate ?? null,
    sort_order: milestone.sortOrder,
    order_index: milestone.orderIndex,
    completed_at: toEpochMs(milestone.completedAt),
    ...baseMutableRow(milestone),
  };
}

export function fromMilestoneRow(row: MilestoneRow): Milestone {
  const milestone: Milestone = {
    id: row.id,
    userId: row.user_id,
    expeditionId: row.expedition_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as Milestone["status"],
    targetDate: row.target_date ?? undefined,
    sortOrder: row.sort_order,
    orderIndex: row.order_index,
    completedAt: fromEpochMs(row.completed_at),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, milestone);
  return milestone;
}

export function toTrailDayRow(day: TrailDay): TrailDayRow {
  return {
    id: day.id,
    user_id: day.userId,
    local_date: day.date,
    status: day.status,
    anchor_path_id: day.anchorPathId ?? null,
    closed_at: toEpochMs(day.closedAt),
    reopened_at: toEpochMs(day.reopenedAt),
    close_summary: day.closeSummary ?? null,
    tomorrow_first_step: day.tomorrowFirstStep ?? null,
    character_result: day.characterResult ?? null,
    planned_mark_count: day.plannedMarkCount,
    completed_mark_count: day.completedMarkCount,
    skipped_mark_count: day.skippedMarkCount,
    memory_count: day.memoryCount,
    ...baseMutableRow(day),
  };
}

export function fromTrailDayRow(row: TrailDayRow): TrailDay {
  const day: TrailDay = {
    id: row.id,
    userId: row.user_id,
    date: row.local_date,
    status: row.status as TrailDay["status"],
    anchorPathId: row.anchor_path_id ?? undefined,
    closedAt: fromEpochMs(row.closed_at),
    reopenedAt: fromEpochMs(row.reopened_at),
    closeSummary: row.close_summary ?? undefined,
    tomorrowFirstStep: row.tomorrow_first_step ?? undefined,
    characterResult: row.character_result ?? undefined,
    plannedMarkCount: row.planned_mark_count,
    completedMarkCount: row.completed_mark_count,
    skippedMarkCount: row.skipped_mark_count,
    memoryCount: row.memory_count,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, day);
  return day;
}

export function toReflectionEntryRow(entry: ReflectionEntry, userId: string): ReflectionEntryRow {
  return {
    id: entry.id,
    user_id: userId,
    trail_day_id: entry.trailDayId,
    cluster: entry.cluster,
    text: entry.text,
    order_index: entry.orderIndex,
    ...baseMutableRow(entry),
  };
}

export function fromReflectionEntryRow(row: ReflectionEntryRow): ReflectionEntry {
  const entry: ReflectionEntry = {
    id: row.id,
    trailDayId: row.trail_day_id,
    cluster: row.cluster,
    text: row.text,
    orderIndex: row.order_index,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, entry);
  return entry;
}

export function toMarkTemplateRow(template: MarkTemplate): MarkTemplateRow {
  return {
    id: template.id,
    user_id: template.userId,
    path_id: template.pathId,
    title: template.title,
    description: template.description ?? null,
    template_type: template.templateType,
    recurrence_type: template.recurrenceRule.kind,
    recurrence_rule_json: toDbJson(template.recurrenceRule),
    default_duration_min: template.defaultDurationMin ?? null,
    default_signal_rule_json: template.defaultSignalRule ? toDbJson(template.defaultSignalRule) : null,
    is_active: toDbBoolean(template.isActive),
    ...baseMutableRow(template),
  };
}

export function fromMarkTemplateRow(row: MarkTemplateRow): MarkTemplate {
  const template: MarkTemplate = {
    id: row.id,
    userId: row.user_id,
    pathId: row.path_id,
    title: row.title,
    description: row.description ?? undefined,
    templateType: row.template_type as MarkTemplate["templateType"],
    recurrenceRule: fromDbJson<MarkTemplate["recurrenceRule"]>(row.recurrence_rule_json)!,
    defaultDurationMin: row.default_duration_min ?? undefined,
    defaultSignalRule: fromDbJson<MarkTemplate["defaultSignalRule"]>(row.default_signal_rule_json),
    isActive: fromDbBoolean(row.is_active),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, template);
  return template;
}

export function toMarkInstanceRow(mark: MarkInstance): MarkInstanceRow {
  return {
    id: mark.id,
    user_id: mark.userId,
    path_id: mark.pathId,
    trail_day_id: mark.trailDayId,
    template_id: mark.templateId ?? null,
    expedition_id: mark.expeditionId ?? null,
    milestone_id: mark.milestoneId ?? null,
    title: mark.title,
    description: mark.description ?? null,
    origin: mark.origin,
    status: mark.status,
    scheduled_start_at: toFloatingEpochMs(mark.scheduledStartAt),
    scheduled_end_at: toFloatingEpochMs(mark.scheduledEndAt),
    due_at: toFloatingEpochMs(mark.dueAt),
    completed_at: toEpochMs(mark.completedAt),
    skipped_at: toEpochMs(mark.skippedAt),
    expired_at: toEpochMs(mark.expiredAt),
    proof_note: mark.proofNote ?? null,
    completion_summary: mark.completionSummary ?? null,
    substituted_by_mark_id: mark.substitutedByMarkId ?? null,
    rescheduled_to_mark_id: mark.rescheduledToMarkId ?? null,
    source_backlog_item_id: mark.sourceBacklogItemId ?? null,
    generation_key: mark.generationKey ?? null,
    ...baseMutableRow(mark),
  };
}

export function fromMarkInstanceRow(row: MarkInstanceRow): MarkInstance {
  const mark: MarkInstance = {
    id: row.id,
    userId: row.user_id,
    pathId: row.path_id,
    trailDayId: row.trail_day_id,
    templateId: row.template_id ?? undefined,
    expeditionId: row.expedition_id ?? undefined,
    milestoneId: row.milestone_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    origin: row.origin as MarkInstance["origin"],
    status: row.status as MarkInstance["status"],
    scheduledStartAt: fromFloatingEpochMs(row.scheduled_start_at),
    scheduledEndAt: fromFloatingEpochMs(row.scheduled_end_at),
    dueAt: fromFloatingEpochMs(row.due_at),
    completedAt: fromEpochMs(row.completed_at),
    skippedAt: fromEpochMs(row.skipped_at),
    expiredAt: fromEpochMs(row.expired_at),
    proofNote: row.proof_note ?? undefined,
    completionSummary: row.completion_summary ?? undefined,
    proofMediaAssetIds: [],
    generationKey: row.generation_key ?? undefined,
    substitutedByMarkId: row.substituted_by_mark_id ?? undefined,
    rescheduledToMarkId: row.rescheduled_to_mark_id ?? undefined,
    sourceBacklogItemId: row.source_backlog_item_id ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, mark);
  return mark;
}

export function toMemoryRow(memory: Memory): MemoryRow {
  return {
    id: memory.id,
    user_id: memory.userId,
    trail_day_id: memory.trailDayId,
    path_id: memory.pathId ?? null,
    title: memory.title ?? null,
    body: memory.note ?? null,
    mood: null,
    note: memory.note ?? null,
    captured_at: toEpochMs(memory.capturedAt) ?? Date.now(),
    privacy: memory.privacy,
    latitude: memory.location?.latitude ?? null,
    longitude: memory.location?.longitude ?? null,
    ...baseMutableRow(memory),
  };
}

export function fromMemoryRow(row: MemoryRow): Memory {
  const memory: Memory = {
    id: row.id,
    userId: row.user_id,
    trailDayId: row.trail_day_id,
    pathId: row.path_id ?? undefined,
    title: row.title ?? "",
    note: row.note ?? row.body ?? undefined,
    capturedAt: fromEpochMs(row.captured_at)!,
    privacy: row.privacy as Memory["privacy"],
    location: row.latitude != null && row.longitude != null ? { latitude: row.latitude, longitude: row.longitude } : undefined,
    mediaAssetIds: [],
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, memory);
  return memory;
}

export function toBacklogItemRow(item: BacklogItem): BacklogItemRow {
  return {
    id: item.id,
    user_id: item.userId,
    path_id: item.pathId ?? null,
    title: item.title,
    description: item.description ?? null,
    item_type: item.itemType,
    horizon: item.horizon,
    status: item.status,
    source: null,
    horizon_label: item.horizonLabel ?? null,
    converted_mark_instance_id: item.convertedToMarkInstanceId ?? null,
    converted_pack_check_template_id: null,
    converted_to_mark_instance_id: item.convertedToMarkInstanceId ?? null,
    converted_to_expedition_id: item.convertedToExpeditionId ?? null,
    ...baseMutableRow(item),
  };
}

export function fromBacklogItemRow(row: BacklogItemRow): BacklogItem {
  const item: BacklogItem = {
    id: row.id,
    userId: row.user_id,
    pathId: row.path_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    itemType: row.item_type as BacklogItem["itemType"],
    horizon: row.horizon as BacklogItem["horizon"],
    status: row.status as BacklogItem["status"],
    horizonLabel: row.horizon_label ?? undefined,
    convertedToMarkInstanceId: row.converted_to_mark_instance_id ?? undefined,
    convertedToExpeditionId: row.converted_to_expedition_id ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, item);
  return item;
}

export function toWeekPlanRow(plan: WeekPlan): WeekPlanRow {
  return {
    id: plan.id,
    user_id: plan.userId,
    week_start_date: plan.weekStartDate,
    week_end_date: plan.weekEndDate,
    status: plan.status,
    summary: plan.note ?? null,
    note: plan.note ?? null,
    ...baseMutableRow(plan),
  };
}

export function fromWeekPlanRow(row: WeekPlanRow): WeekPlan {
  const plan: WeekPlan = {
    id: row.id,
    userId: row.user_id,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    status: row.status as WeekPlan["status"],
    note: row.note ?? row.summary ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, plan);
  return plan;
}

export function toWeekPlanItemRow(item: WeekPlanItem, userId: string): WeekPlanItemRow {
  return {
    id: item.id,
    user_id: userId,
    week_plan_id: item.weekPlanId,
    backlog_item_id: item.backlogItemId ?? null,
    status: item.status,
    local_date: item.localDate ?? null,
    start_time: item.startTime ?? null,
    end_time: item.endTime ?? null,
    title: item.title ?? null,
    path_id: item.pathId ?? null,
    template_id: item.templateId ?? null,
    expedition_id: item.expeditionId ?? null,
    milestone_id: item.milestoneId ?? null,
    expedition_context: item.expeditionContext ?? null,
    milestone_context: item.milestoneContext ?? null,
    description: item.description ?? null,
    note: item.note ?? null,
    origin: item.origin ?? null,
    block_key: item.blockKey ?? null,
    deterministic_import_key: item.deterministicImportKey ?? null,
    import_batch_id: item.importBatchId ?? null,
    created_mark_instance_id: item.createdMarkInstanceId ?? null,
    sort_order: item.sortOrder,
    order_index: item.orderIndex,
    ...baseMutableRow(item),
  };
}

export function fromWeekPlanItemRow(row: WeekPlanItemRow): WeekPlanItem {
  const item: WeekPlanItem = {
    id: row.id,
    weekPlanId: row.week_plan_id,
    backlogItemId: row.backlog_item_id ?? undefined,
    status: row.status as WeekPlanItem["status"],
    localDate: row.local_date ?? undefined,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    title: row.title ?? undefined,
    pathId: row.path_id ?? undefined,
    templateId: row.template_id ?? undefined,
    expeditionId: row.expedition_id ?? undefined,
    milestoneId: row.milestone_id ?? undefined,
    expeditionContext: row.expedition_context ?? undefined,
    milestoneContext: row.milestone_context ?? undefined,
    description: row.description ?? undefined,
    note: row.note ?? undefined,
    origin: (row.origin as WeekPlanItem["origin"] | null) ?? undefined,
    blockKey: (row.block_key as WeekPlanItem["blockKey"] | null) ?? undefined,
    deterministicImportKey: row.deterministic_import_key ?? undefined,
    createdMarkInstanceId: row.created_mark_instance_id ?? undefined,
    importBatchId: row.import_batch_id ?? undefined,
    sortOrder: row.sort_order,
    orderIndex: row.order_index,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, item);
  return item;
}

export function toPackCheckTemplateRow(template: PackCheckTemplate): PackCheckTemplateRow {
  return {
    id: template.id,
    user_id: template.userId,
    path_id: template.pathId ?? null,
    title: template.title,
    description: template.description ?? null,
    template_type: null,
    default_timing_rule_json: null,
    default_available_offset_min: template.defaultAvailableOffsetMin ?? null,
    default_due_offset_min: template.defaultDueOffsetMin ?? null,
    default_signal_rule_json: template.defaultSignalRule ? toDbJson(template.defaultSignalRule) : null,
    is_active: toDbBoolean(template.isActive),
    ...baseMutableRow(template),
  };
}

export function fromPackCheckTemplateRow(row: PackCheckTemplateRow): PackCheckTemplate {
  const template: PackCheckTemplate = {
    id: row.id,
    userId: row.user_id,
    pathId: row.path_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    defaultAvailableOffsetMin: row.default_available_offset_min ?? undefined,
    defaultDueOffsetMin: row.default_due_offset_min ?? undefined,
    defaultSignalRule: fromDbJson<PackCheckTemplate["defaultSignalRule"]>(row.default_signal_rule_json),
    isActive: fromDbBoolean(row.is_active),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, template);
  return template;
}

export function toPackCheckItemTemplateRow(item: PackCheckItemTemplate, userId: string): PackCheckItemTemplateRow {
  return {
    id: item.id,
    user_id: userId,
    pack_check_template_id: item.packCheckTemplateId,
    label: item.label,
    description: null,
    is_required: toDbBoolean(item.isRequired),
    sort_order: item.orderIndex,
    order_index: item.orderIndex,
    ...baseMutableRow(item),
  };
}

export function fromPackCheckItemTemplateRow(row: PackCheckItemTemplateRow): PackCheckItemTemplate {
  const item: PackCheckItemTemplate = {
    id: row.id,
    packCheckTemplateId: row.pack_check_template_id,
    label: row.label,
    isRequired: fromDbBoolean(row.is_required),
    orderIndex: row.order_index,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, item);
  return item;
}

export function toMarkPackCheckRuleRow(rule: MarkPackCheckRule, userId: string): MarkPackCheckRuleRow {
  return {
    id: rule.id,
    user_id: userId,
    mark_template_id: rule.markTemplateId,
    pack_check_template_id: rule.packCheckTemplateId,
    available_offset_min: rule.availableOffsetMin ?? null,
    due_offset_min: rule.dueOffsetMin ?? null,
    ...baseMutableRow(rule),
  };
}

export function fromMarkPackCheckRuleRow(row: MarkPackCheckRuleRow): MarkPackCheckRule {
  const rule: MarkPackCheckRule = {
    id: row.id,
    markTemplateId: row.mark_template_id,
    packCheckTemplateId: row.pack_check_template_id,
    availableOffsetMin: row.available_offset_min ?? undefined,
    dueOffsetMin: row.due_offset_min ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, rule);
  return rule;
}

export function toPackCheckInstanceRow(instance: PackCheckInstance): PackCheckInstanceRow {
  return {
    id: instance.id,
    user_id: instance.userId,
    template_id: instance.templateId ?? null,
    trail_day_id: instance.trailDayId,
    target_mark_instance_id: instance.targetMarkInstanceId ?? null,
    title: instance.title,
    description: instance.description ?? null,
    status: instance.status,
    available_from: toFloatingEpochMs(instance.availableFrom),
    due_at: toFloatingEpochMs(instance.dueAt),
    completed_at: toEpochMs(instance.completedAt),
    skipped_at: toEpochMs(instance.skippedAt),
    cancelled_at: toEpochMs(instance.cancelledAt),
    generation_key: instance.generationKey ?? null,
    ...baseMutableRow(instance),
  };
}

export function fromPackCheckInstanceRow(row: PackCheckInstanceRow): PackCheckInstance {
  const instance: PackCheckInstance = {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id ?? undefined,
    trailDayId: row.trail_day_id,
    targetMarkInstanceId: row.target_mark_instance_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as PackCheckInstance["status"],
    availableFrom: fromFloatingEpochMs(row.available_from),
    dueAt: fromFloatingEpochMs(row.due_at),
    completedAt: fromEpochMs(row.completed_at),
    skippedAt: fromEpochMs(row.skipped_at),
    cancelledAt: fromEpochMs(row.cancelled_at),
    generationKey: row.generation_key ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, instance);
  return instance;
}

export function toPackCheckItemInstanceRow(item: PackCheckItemInstance, userId: string): PackCheckItemInstanceRow {
  return {
    id: item.id,
    user_id: userId,
    pack_check_instance_id: item.packCheckInstanceId,
    template_item_id: item.templateItemId ?? null,
    label: item.label,
    is_required: toDbBoolean(item.isRequired),
    is_checked: toDbBoolean(item.isChecked),
    checked_at: toEpochMs(item.checkedAt),
    sort_order: item.orderIndex,
    order_index: item.orderIndex,
    ...baseMutableRow(item),
  };
}

export function fromPackCheckItemInstanceRow(row: PackCheckItemInstanceRow): PackCheckItemInstance {
  const item: PackCheckItemInstance = {
    id: row.id,
    packCheckInstanceId: row.pack_check_instance_id,
    templateItemId: row.template_item_id ?? undefined,
    label: row.label,
    isRequired: fromDbBoolean(row.is_required),
    isChecked: fromDbBoolean(row.is_checked),
    checkedAt: fromEpochMs(row.checked_at),
    orderIndex: row.order_index,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, item);
  return item;
}

export function toSignalRow(signal: Signal): SignalRow {
  return {
    id: signal.id,
    user_id: signal.userId,
    target_type: signal.targetType,
    target_id: signal.targetId,
    scheduled_at: toEpochMs(signal.scheduledAt) ?? Date.now(),
    status: signal.status,
    ringing_started_at: toEpochMs(signal.ringingStartedAt),
    snoozed_until: toEpochMs(signal.snoozedUntil),
    resolved_at: toEpochMs(signal.resolvedAt),
    dismissed_at: toEpochMs(signal.dismissedAt),
    expired_at: toEpochMs(signal.expiredAt),
    cancelled_at: toEpochMs(signal.cancelledAt),
    ...baseMutableRow(signal),
  };
}

export function fromSignalRow(row: SignalRow): Signal {
  const signal: Signal = {
    id: row.id,
    userId: row.user_id,
    targetType: row.target_type as Signal["targetType"],
    targetId: row.target_id,
    scheduledAt: fromEpochMs(row.scheduled_at)!,
    status: row.status as Signal["status"],
    ringingStartedAt: fromEpochMs(row.ringing_started_at),
    snoozedUntil: fromEpochMs(row.snoozed_until),
    resolvedAt: fromEpochMs(row.resolved_at),
    dismissedAt: fromEpochMs(row.dismissed_at),
    expiredAt: fromEpochMs(row.expired_at),
    cancelledAt: fromEpochMs(row.cancelled_at),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, signal);
  return signal;
}

export function toMarkDependencyRow(dependency: MarkDependency, userId: string): MarkDependencyRow {
  return {
    id: dependency.id,
    user_id: userId,
    dependent_mark_instance_id: dependency.dependentMarkInstanceId,
    dependency_type: dependency.dependencyType,
    required_entity_type: dependency.requiredEntityType,
    required_entity_id: dependency.requiredEntityId,
    is_required: toDbBoolean(dependency.isRequired),
    status: dependency.status,
    satisfied_at: toEpochMs(dependency.satisfiedAt),
    waived_at: toEpochMs(dependency.waivedAt),
    ...baseMutableRow(dependency),
  };
}

export function fromMarkDependencyRow(row: MarkDependencyRow): MarkDependency {
  const dependency: MarkDependency = {
    id: row.id,
    dependentMarkInstanceId: row.dependent_mark_instance_id,
    dependencyType: row.dependency_type as MarkDependency["dependencyType"],
    requiredEntityType: row.required_entity_type as MarkDependency["requiredEntityType"],
    requiredEntityId: row.required_entity_id,
    isRequired: fromDbBoolean(row.is_required),
    status: row.status as MarkDependency["status"],
    satisfiedAt: fromEpochMs(row.satisfied_at),
    waivedAt: fromEpochMs(row.waived_at),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, dependency);
  return dependency;
}

export function toMediaAssetRow(asset: MediaAsset): MediaAssetRow {
  return {
    id: asset.id,
    user_id: asset.userId,
    owner_type: asset.ownerType,
    owner_id: asset.ownerId,
    kind: asset.kind,
    asset_type: asset.assetType,
    local_uri: asset.storagePath,
    thumbnail_uri: asset.thumbnailPath ?? null,
    remote_uri: asset.backupPath ?? null,
    backup_status: asset.backupPath ? "uploaded" : "local_only",
    file_name: asset.fileName,
    mime_type: asset.mimeType ?? null,
    storage_path: asset.storagePath,
    thumbnail_path: asset.thumbnailPath ?? null,
    backup_path: asset.backupPath ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    duration_ms: asset.durationMs ?? null,
    size_bytes: asset.byteSize ?? null,
    byte_size: asset.byteSize ?? null,
    sort_index: asset.sortIndex,
    captured_at: toEpochMs(asset.capturedAt),
    local_date: asset.localDate ?? null,
    daily_batch_id: asset.dailyBatchId ?? null,
    upload_status: asset.uploadStatus ?? "local_only",
    local_status: asset.localStatus ?? "local_available",
    source_cleanup_status: asset.sourceCleanupStatus ?? "not_requested",
    original_picker_uri: asset.originalPickerUri ?? null,
    library_asset_id: asset.libraryAssetId ?? null,
    drive_file_id: asset.driveFileId ?? null,
    drive_folder_id: asset.driveFolderId ?? null,
    drive_root_folder_id: asset.driveRootFolderId ?? null,
    drive_web_view_link: asset.driveWebViewLink ?? null,
    drive_web_content_link: asset.driveWebContentLink ?? null,
    drive_mime_type: asset.driveMimeType ?? null,
    drive_size_bytes: asset.driveSizeBytes ?? null,
    drive_md5_checksum: asset.driveMd5Checksum ?? null,
    content_hash: asset.contentHash ?? null,
    content_hash_algorithm: asset.contentHashAlgorithm ?? null,
    thumbnail_drive_file_id: asset.thumbnailDriveFileId ?? null,
    thumbnail_content_hash: asset.thumbnailContentHash ?? null,
    thumbnail_content_hash_algorithm: asset.thumbnailContentHashAlgorithm ?? null,
    uploaded_at: toEpochMs(asset.uploadedAt),
    source_deleted_at: toEpochMs(asset.sourceDeletedAt),
    local_deleted_at: toEpochMs(asset.localDeletedAt),
    last_sync_error: asset.lastSyncError ?? null,
    ...baseMutableRow(asset),
  };
}

export function fromMediaAssetRow(row: MediaAssetRow): MediaAsset {
  const asset: MediaAsset = {
    id: row.id,
    userId: row.user_id,
    ownerType: row.owner_type as MediaAsset["ownerType"],
    ownerId: row.owner_id,
    kind: row.kind as MediaAsset["kind"],
    assetType: row.asset_type as MediaAsset["assetType"],
    fileName: row.file_name,
    mimeType: row.mime_type ?? undefined,
    storagePath: row.storage_path ?? row.local_uri ?? "",
    thumbnailPath: row.thumbnail_path ?? row.thumbnail_uri ?? undefined,
    backupPath: row.backup_path ?? row.remote_uri ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    byteSize: row.byte_size ?? row.size_bytes ?? undefined,
    sortIndex: row.sort_index ?? 0,
    capturedAt: fromEpochMs(row.captured_at),
    localDate: row.local_date ?? undefined,
    dailyBatchId: row.daily_batch_id ?? undefined,
    uploadStatus: row.upload_status as MediaAsset["uploadStatus"],
    localStatus: row.local_status as MediaAsset["localStatus"],
    sourceCleanupStatus: row.source_cleanup_status as MediaAsset["sourceCleanupStatus"],
    originalPickerUri: row.original_picker_uri ?? undefined,
    libraryAssetId: row.library_asset_id ?? undefined,
    driveFileId: row.drive_file_id ?? undefined,
    driveFolderId: row.drive_folder_id ?? undefined,
    driveRootFolderId: row.drive_root_folder_id ?? undefined,
    driveWebViewLink: row.drive_web_view_link ?? undefined,
    driveWebContentLink: row.drive_web_content_link ?? undefined,
    driveMimeType: row.drive_mime_type ?? undefined,
    driveSizeBytes: row.drive_size_bytes ?? undefined,
    driveMd5Checksum: row.drive_md5_checksum ?? undefined,
    contentHash: row.content_hash ?? undefined,
    contentHashAlgorithm: row.content_hash_algorithm ?? undefined,
    thumbnailDriveFileId: row.thumbnail_drive_file_id ?? undefined,
    thumbnailContentHash: row.thumbnail_content_hash ?? undefined,
    thumbnailContentHashAlgorithm: row.thumbnail_content_hash_algorithm ?? undefined,
    uploadedAt: fromEpochMs(row.uploaded_at),
    sourceDeletedAt: fromEpochMs(row.source_deleted_at),
    localDeletedAt: fromEpochMs(row.local_deleted_at),
    lastSyncError: row.last_sync_error ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, asset);
  return asset;
}

export function toDailyMediaUploadBatchRow(batch: DailyMediaUploadBatch): DailyMediaUploadBatchRow {
  return {
    id: batch.id,
    user_id: batch.userId,
    local_date: batch.localDate,
    timezone: batch.timezone,
    status: batch.status,
    media_count: batch.mediaCount,
    uploaded_count: batch.uploadedCount,
    failed_count: batch.failedCount,
    run_sequence: batch.runSequence,
    lock_owner: batch.lockOwner ?? null,
    lock_acquired_at: toEpochMs(batch.lockAcquiredAt),
    lock_expires_at: toEpochMs(batch.lockExpiresAt),
    sealed_at: toEpochMs(batch.sealedAt),
    started_at: toEpochMs(batch.startedAt),
    completed_at: toEpochMs(batch.completedAt),
    last_error: batch.lastError ?? null,
    ...baseMutableRow(batch),
  };
}

export function fromDailyMediaUploadBatchRow(row: DailyMediaUploadBatchRow): DailyMediaUploadBatch {
  const batch: DailyMediaUploadBatch = {
    id: row.id,
    userId: row.user_id,
    localDate: row.local_date,
    timezone: row.timezone,
    status: row.status as DailyMediaUploadBatch["status"],
    mediaCount: row.media_count,
    uploadedCount: row.uploaded_count,
    failedCount: row.failed_count,
    runSequence: row.run_sequence,
    lockOwner: row.lock_owner ?? undefined,
    lockAcquiredAt: fromEpochMs(row.lock_acquired_at),
    lockExpiresAt: fromEpochMs(row.lock_expires_at),
    sealedAt: fromEpochMs(row.sealed_at),
    startedAt: fromEpochMs(row.started_at),
    completedAt: fromEpochMs(row.completed_at),
    lastError: row.last_error ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, batch);
  return batch;
}

export function toExerciseDefinitionRow(exercise: ExerciseDefinition): ExerciseDefinitionRow {
  return {
    id: exercise.id,
    user_id: exercise.isSystem ? null : exercise.userId,
    path_id: exercise.pathId ?? null,
    name: exercise.title,
    title: exercise.title,
    canonical_slug: exercise.canonicalSlug,
    category: exercise.category,
    measurement_type: exercise.targetType,
    target_type: exercise.targetType,
    default_rest_sec: exercise.defaultRestSec ?? null,
    default_unit: exercise.defaultUnit ?? null,
    equipment: exercise.equipment ?? null,
    is_system: toDbBoolean(exercise.isSystem),
    description: exercise.description ?? null,
    ...baseMutableRow(exercise),
  };
}

export function fromExerciseDefinitionRow(row: ExerciseDefinitionRow): ExerciseDefinition {
  const exercise: ExerciseDefinition = {
    id: row.id,
    userId: row.user_id ?? "system",
    pathId: row.path_id ?? undefined,
    title: row.title ?? row.name,
    canonicalSlug: row.canonical_slug,
    category: row.category as ExerciseDefinition["category"],
    targetType: row.target_type as ExerciseDefinition["targetType"],
    defaultRestSec: row.default_rest_sec ?? undefined,
    defaultUnit: row.default_unit ?? undefined,
    equipment: row.equipment ?? undefined,
    isSystem: fromDbBoolean(row.is_system),
    description: row.description ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, exercise);
  return exercise;
}

export function toWorkoutRoutineTemplateRow(routine: WorkoutRoutineTemplate): WorkoutRoutineTemplateRow {
  return {
    id: routine.id,
    user_id: routine.userId,
    path_id: routine.pathId,
    mark_template_id: routine.markTemplateId ?? null,
    title: routine.title,
    routine_type: routine.routineType,
    description: routine.description ?? null,
    cycle_key: routine.cycleKey ?? null,
    estimated_duration_min: routine.estimatedDurationMin ?? null,
    is_active: toDbBoolean(routine.isActive),
    ...baseMutableRow(routine),
  };
}

export function fromWorkoutRoutineTemplateRow(row: WorkoutRoutineTemplateRow): WorkoutRoutineTemplate {
  const routine: WorkoutRoutineTemplate = {
    id: row.id,
    userId: row.user_id,
    pathId: row.path_id,
    markTemplateId: row.mark_template_id ?? undefined,
    title: row.title,
    routineType: row.routine_type as WorkoutRoutineTemplate["routineType"],
    description: row.description ?? undefined,
    cycleKey: row.cycle_key ?? undefined,
    estimatedDurationMin: row.estimated_duration_min ?? undefined,
    isActive: fromDbBoolean(row.is_active),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, routine);
  return routine;
}

export function toRoutineExerciseTemplateRow(item: RoutineExerciseTemplate, userId: string): RoutineExerciseTemplateRow {
  return {
    id: item.id,
    user_id: userId,
    workout_routine_template_id: item.workoutRoutineTemplateId,
    exercise_definition_id: item.exerciseDefinitionId,
    phase: item.phase,
    order_index: item.orderIndex,
    target_type: item.targetType,
    target_load_kg: item.targetLoadKg ?? null,
    target_reps: item.targetReps ?? null,
    target_sets: item.targetSets ?? null,
    target_duration_sec: item.targetDurationSec ?? null,
    target_distance_m: item.targetDistanceM ?? null,
    target_steps: item.targetSteps ?? null,
    rest_duration_sec: item.restDurationSec ?? null,
    progression_policy_json: item.progressionPolicy ? toDbJson(item.progressionPolicy) : null,
    ...baseMutableRow(item),
  };
}

export function fromRoutineExerciseTemplateRow(row: RoutineExerciseTemplateRow): RoutineExerciseTemplate {
  const item: RoutineExerciseTemplate = {
    id: row.id,
    workoutRoutineTemplateId: row.workout_routine_template_id,
    exerciseDefinitionId: row.exercise_definition_id,
    phase: row.phase as RoutineExerciseTemplate["phase"],
    orderIndex: row.order_index,
    targetType: row.target_type as RoutineExerciseTemplate["targetType"],
    targetLoadKg: row.target_load_kg ?? undefined,
    targetReps: row.target_reps ?? undefined,
    targetSets: row.target_sets ?? undefined,
    targetDurationSec: row.target_duration_sec ?? undefined,
    targetDistanceM: row.target_distance_m ?? undefined,
    targetSteps: row.target_steps ?? undefined,
    restDurationSec: row.rest_duration_sec ?? undefined,
    progressionPolicy: fromDbJson<RoutineExerciseTemplate["progressionPolicy"]>(row.progression_policy_json),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, item);
  return item;
}

export function toWorkoutSessionInstanceRow(session: WorkoutSessionInstance): WorkoutSessionInstanceRow {
  return {
    id: session.id,
    user_id: session.userId,
    mark_instance_id: session.markInstanceId,
    routine_template_id: session.routineTemplateId,
    status: session.status,
    phase: session.phase,
    started_at: toEpochMs(session.startedAt),
    completed_at: toEpochMs(session.completedAt),
    current_exercise_snapshot_id: session.currentExerciseSnapshotId ?? null,
    current_set_number: session.currentSetNumber ?? null,
    notes: session.notes ?? null,
    ...baseMutableRow(session),
  };
}

export function fromWorkoutSessionInstanceRow(row: WorkoutSessionInstanceRow): WorkoutSessionInstance {
  const session: WorkoutSessionInstance = {
    id: row.id,
    userId: row.user_id,
    markInstanceId: row.mark_instance_id,
    routineTemplateId: row.routine_template_id,
    status: row.status as WorkoutSessionInstance["status"],
    phase: row.phase as WorkoutSessionInstance["phase"],
    startedAt: fromEpochMs(row.started_at),
    completedAt: fromEpochMs(row.completed_at),
    currentExerciseSnapshotId: row.current_exercise_snapshot_id ?? undefined,
    currentSetNumber: row.current_set_number ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, session);
  return session;
}

export function toSessionExerciseSnapshotRow(snapshot: SessionExerciseSnapshot, userId: string): SessionExerciseSnapshotRow {
  return {
    id: snapshot.id,
    user_id: userId,
    workout_session_instance_id: snapshot.workoutSessionInstanceId,
    routine_exercise_template_id: snapshot.routineExerciseTemplateId ?? null,
    exercise_definition_id: snapshot.exerciseDefinitionId,
    exercise_name_snapshot: snapshot.exerciseNameSnapshot,
    phase: snapshot.phase,
    order_index: snapshot.orderIndex,
    target_type: snapshot.targetType,
    target_load_kg: snapshot.targetLoadKg ?? null,
    target_reps: snapshot.targetReps ?? null,
    target_sets: snapshot.targetSets ?? null,
    target_duration_sec: snapshot.targetDurationSec ?? null,
    target_distance_m: snapshot.targetDistanceM ?? null,
    target_steps: snapshot.targetSteps ?? null,
    was_overridden: toDbBoolean(snapshot.wasOverridden),
    status: snapshot.status,
    started_at: toEpochMs(snapshot.startedAt),
    completed_at: toEpochMs(snapshot.completedAt),
    ...baseMutableRow(snapshot),
  };
}

export function fromSessionExerciseSnapshotRow(row: SessionExerciseSnapshotRow): SessionExerciseSnapshot {
  const snapshot: SessionExerciseSnapshot = {
    id: row.id,
    workoutSessionInstanceId: row.workout_session_instance_id,
    routineExerciseTemplateId: row.routine_exercise_template_id ?? undefined,
    exerciseDefinitionId: row.exercise_definition_id,
    exerciseNameSnapshot: row.exercise_name_snapshot,
    phase: row.phase as SessionExerciseSnapshot["phase"],
    orderIndex: row.order_index,
    targetType: row.target_type as SessionExerciseSnapshot["targetType"],
    targetLoadKg: row.target_load_kg ?? undefined,
    targetReps: row.target_reps ?? undefined,
    targetSets: row.target_sets ?? undefined,
    targetDurationSec: row.target_duration_sec ?? undefined,
    targetDistanceM: row.target_distance_m ?? undefined,
    targetSteps: row.target_steps ?? undefined,
    wasOverridden: fromDbBoolean(row.was_overridden),
    status: row.status as SessionExerciseSnapshot["status"],
    startedAt: fromEpochMs(row.started_at),
    completedAt: fromEpochMs(row.completed_at),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, snapshot);
  return snapshot;
}

export function toExerciseSetLogRow(log: ExerciseSetLog, userId: string): ExerciseSetLogRow {
  return {
    id: log.id,
    user_id: userId,
    session_exercise_snapshot_id: log.sessionExerciseSnapshotId,
    set_number: log.setNumber,
    actual_load_kg: log.actualLoadKg ?? null,
    actual_reps: log.actualReps ?? null,
    actual_duration_sec: log.actualDurationSec ?? null,
    actual_distance_m: log.actualDistanceM ?? null,
    actual_steps: log.actualSteps ?? null,
    completed: toDbBoolean(log.completed),
    failed_reason: log.failedReason ?? null,
    metadata_json: log.metadata ? toDbJson(log.metadata) : null,
    started_at: toEpochMs(log.startedAt),
    completed_at: toEpochMs(log.completedAt),
    ...baseMutableRow(log),
  };
}

export function fromExerciseSetLogRow(row: ExerciseSetLogRow): ExerciseSetLog {
  const log: ExerciseSetLog = {
    id: row.id,
    sessionExerciseSnapshotId: row.session_exercise_snapshot_id,
    setNumber: row.set_number,
    actualLoadKg: row.actual_load_kg ?? undefined,
    actualReps: row.actual_reps ?? undefined,
    actualDurationSec: row.actual_duration_sec ?? undefined,
    actualDistanceM: row.actual_distance_m ?? undefined,
    actualSteps: row.actual_steps ?? undefined,
    completed: fromDbBoolean(row.completed),
    failedReason: row.failed_reason ?? undefined,
    metadata: fromDbJson<Record<string, unknown>>(row.metadata_json),
    startedAt: fromEpochMs(row.started_at),
    completedAt: fromEpochMs(row.completed_at),
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, log);
  return log;
}

export function toExerciseProgressStateRow(state: ExerciseProgressState): ExerciseProgressStateRow {
  return {
    id: state.id,
    user_id: state.userId,
    exercise_definition_id: state.exerciseDefinitionId,
    current_load_kg: state.currentTargetLoadKg ?? null,
    current_reps: state.currentTargetReps ?? null,
    current_duration_sec: state.currentTargetDurationSec ?? null,
    current_distance_m: state.currentTargetDistanceM ?? null,
    current_steps: state.currentTargetSteps ?? null,
    current_target_load_kg: state.currentTargetLoadKg ?? null,
    current_target_reps: state.currentTargetReps ?? null,
    current_target_sets: state.currentTargetSets ?? null,
    current_target_duration_sec: state.currentTargetDurationSec ?? null,
    current_target_distance_m: state.currentTargetDistanceM ?? null,
    current_target_steps: state.currentTargetSteps ?? null,
    success_count_since_progression: state.successCountSinceProgression,
    last_session_result: state.lastSessionResult ?? null,
    last_progressed_at: toEpochMs(state.lastProgressedAt),
    manual_override: toDbBoolean(state.manualOverride),
    last_session_at: toEpochMs(state.lastSessionAt),
    last_progression_outcome: state.lastProgressionOutcome ?? null,
    ...baseMutableRow(state),
  };
}

export function fromExerciseProgressStateRow(row: ExerciseProgressStateRow): ExerciseProgressState {
  const state: ExerciseProgressState = {
    id: row.id,
    userId: row.user_id,
    exerciseDefinitionId: row.exercise_definition_id,
    currentTargetLoadKg: row.current_target_load_kg ?? row.current_load_kg ?? undefined,
    currentTargetReps: row.current_target_reps ?? row.current_reps ?? undefined,
    currentTargetSets: row.current_target_sets ?? undefined,
    currentTargetDurationSec: row.current_target_duration_sec ?? row.current_duration_sec ?? undefined,
    currentTargetDistanceM: row.current_target_distance_m ?? row.current_distance_m ?? undefined,
    currentTargetSteps: row.current_target_steps ?? row.current_steps ?? undefined,
    successCountSinceProgression: row.success_count_since_progression,
    lastSessionResult: (row.last_session_result as ExerciseProgressState["lastSessionResult"]) ?? undefined,
    lastProgressedAt: fromEpochMs(row.last_progressed_at),
    manualOverride: fromDbBoolean(row.manual_override),
    lastSessionAt: fromEpochMs(row.last_session_at),
    lastProgressionOutcome: (row.last_progression_outcome as ExerciseProgressState["lastProgressionOutcome"]) ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
  mapRowMetadata(row, state);
  return state;
}
