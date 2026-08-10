import type { MarkInstance, WaymarkRepositories } from "../../domain/waymark";
import { MarkInstanceOrigin, MarkInstanceStatus } from "../../domain/waymark/enums";

const MAX_LINEAGE_DEPTH = 32;

export const EFFECTIVE_DAILY_MARK_STATUSES = new Set<MarkInstanceStatus>([
  MarkInstanceStatus.Planned,
  MarkInstanceStatus.Ready,
  MarkInstanceStatus.Blocked,
  MarkInstanceStatus.Active,
  MarkInstanceStatus.Completed,
  MarkInstanceStatus.PartiallyCompleted,
  MarkInstanceStatus.Expired,
]);

export class DailyPlanIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailyPlanIntegrityError";
  }
}

export type PlannedMarkLineage = {
  root: MarkInstance;
  leaf: MarkInstance;
  chain: MarkInstance[];
};

function nextId(mark: MarkInstance): string | undefined {
  if (mark.status === MarkInstanceStatus.Substituted) {
    return mark.substitutedByMarkId;
  }
  if (mark.status === MarkInstanceStatus.Rescheduled) {
    return mark.rescheduledToMarkId;
  }
  return undefined;
}

export async function resolvePlannedMarkLineage(
  repos: WaymarkRepositories,
  rootMarkId: string,
): Promise<PlannedMarkLineage> {
  const root = await repos.marks.getMarkInstanceById(rootMarkId);
  if (!root) {
    throw new DailyPlanIntegrityError(`Daily plan root ${rootMarkId} does not exist.`);
  }

  const visited = new Set<string>();
  const chain: MarkInstance[] = [];
  let current = root;
  while (true) {
    if (visited.has(current.id)) {
      throw new DailyPlanIntegrityError(`Cycle detected in planned Mark lineage at ${current.id}.`);
    }
    if (chain.length >= MAX_LINEAGE_DEPTH) {
      throw new DailyPlanIntegrityError(`Planned Mark lineage ${rootMarkId} exceeds ${MAX_LINEAGE_DEPTH} nodes.`);
    }
    visited.add(current.id);
    chain.push(current);

    if (current.status !== MarkInstanceStatus.Substituted && current.status !== MarkInstanceStatus.Rescheduled) {
      return { root, leaf: current, chain };
    }
    const linkedId = nextId(current);
    if (!linkedId) {
      throw new DailyPlanIntegrityError(`Resolved Mark ${current.id} is missing its forward link.`);
    }
    const linked = await repos.marks.getMarkInstanceById(linkedId);
    if (!linked) {
      throw new DailyPlanIntegrityError(`Resolved Mark ${current.id} links to missing Mark ${linkedId}.`);
    }
    current = linked;
  }
}

export async function tracePlannedMarkRoot(
  repos: WaymarkRepositories,
  leaf: MarkInstance,
): Promise<PlannedMarkLineage> {
  const reverseChain: MarkInstance[] = [leaf];
  const visited = new Set<string>([leaf.id]);
  let current = leaf;
  while (true) {
    if (reverseChain.length >= MAX_LINEAGE_DEPTH) {
      throw new DailyPlanIntegrityError(`Planned Mark ancestry ${leaf.id} exceeds ${MAX_LINEAGE_DEPTH} nodes.`);
    }
    const predecessors = await repos.marks.listPredecessorMarkInstances(current.id);
    if (predecessors.length > 1) {
      throw new DailyPlanIntegrityError(`Mark ${current.id} has multiple lineage predecessors.`);
    }
    const predecessor = predecessors[0];
    if (!predecessor) {
      const chain = [...reverseChain].reverse();
      return { root: current, leaf, chain };
    }
    if (visited.has(predecessor.id)) {
      throw new DailyPlanIntegrityError(`Cycle detected in planned Mark ancestry at ${predecessor.id}.`);
    }
    visited.add(predecessor.id);
    reverseChain.push(predecessor);
    current = predecessor;
  }
}

async function hasActiveWeeklyLineage(repos: WaymarkRepositories, lineage: PlannedMarkLineage) {
  if (lineage.root.origin !== MarkInstanceOrigin.WeeklyPlanned) {
    return false;
  }
  for (const mark of lineage.chain) {
    if (await repos.weekPlans.findActiveItemByCreatedMarkInstanceId(mark.id)) {
      return true;
    }
  }
  return false;
}

export async function collectCandidateRootMarkIds(
  repos: WaymarkRepositories,
  userId: string,
  localDate: string,
): Promise<string[]> {
  const marks = await repos.marks.listMarkInstancesByDate(userId, localDate);
  const roots = new Set<string>();
  for (const mark of marks) {
    if (!EFFECTIVE_DAILY_MARK_STATUSES.has(mark.status)) {
      continue;
    }
    const lineage = await tracePlannedMarkRoot(repos, mark);
    if (await hasActiveWeeklyLineage(repos, lineage)) {
      roots.add(lineage.root.id);
    }
  }
  return [...roots].sort();
}
