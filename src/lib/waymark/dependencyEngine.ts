import {
  DependencyEngine as DependencyEngineContract,
  DependencyEvaluationResult,
  DependencyRequiredEntityType,
  DependencyStatus,
  DependencyType,
  EntityId,
  ISODateTimeString,
  MarkDependency,
  MarkInstanceStatus,
  PackCheckInstanceStatus,
  WaymarkRepositories,
} from "../../domain/waymark";

type SatisfyDependenciesByRequiredEntityInput = {
  requiredEntityType: DependencyRequiredEntityType;
  requiredEntityId: EntityId;
  satisfiedAt?: ISODateTimeString;
  dependencyTypes?: DependencyType[];
};

type FailDependenciesByRequiredEntityInput = {
  requiredEntityType: DependencyRequiredEntityType;
  requiredEntityId: EntityId;
  dependencyTypes?: DependencyType[];
};

type CancelDependenciesByRequiredEntityInput = {
  requiredEntityType: DependencyRequiredEntityType;
  requiredEntityId: EntityId;
  dependencyTypes?: DependencyType[];
};

type WaiveDependencyInput = {
  dependencyId: EntityId;
  waivedAt: ISODateTimeString;
};

function isMarkResolvedStatus(status: MarkInstanceStatus): boolean {
  switch (status) {
    case MarkInstanceStatus.Completed:
    case MarkInstanceStatus.Skipped:
    case MarkInstanceStatus.Rescheduled:
    case MarkInstanceStatus.Substituted:
    case MarkInstanceStatus.Cancelled:
      return true;
    case MarkInstanceStatus.Planned:
    case MarkInstanceStatus.Ready:
    case MarkInstanceStatus.Blocked:
    case MarkInstanceStatus.Active:
    case MarkInstanceStatus.Expired:
    default:
      return false;
  }
}

function getDefaultSatisfiedDependencyTypes(requiredEntityType: DependencyRequiredEntityType): DependencyType[] {
  if (requiredEntityType === DependencyRequiredEntityType.MarkInstance) {
    return [DependencyType.MarkCompleted, DependencyType.MarkResolved];
  }
  return [DependencyType.PackCheckCompleted];
}

function describeDependency(dependency: MarkDependency): string {
  switch (dependency.dependencyType) {
    case DependencyType.MarkCompleted:
      return `Requires Mark ${dependency.requiredEntityId} completed`;
    case DependencyType.MarkResolved:
      return `Requires Mark ${dependency.requiredEntityId} resolved`;
    case DependencyType.PackCheckCompleted:
      return `Requires Pack Check ${dependency.requiredEntityId} completed`;
    case DependencyType.ManualUnlock:
      return `Requires manual unlock`;
    case DependencyType.SessionLevelPackCheck:
      return `Requires session-level Pack Check`;
    default:
      return `Dependency ${dependency.id} is unmet`;
  }
}

class DependencyEngineImpl implements DependencyEngineContract {
  constructor(private readonly repositories: WaymarkRepositories) {}

  async evaluateMarkReadiness(markInstanceId: EntityId, _asOf?: ISODateTimeString): Promise<DependencyEvaluationResult> {
    const mark = await this.repositories.marks.getMarkInstanceById(markInstanceId);
    if (!mark) {
      throw new Error(`MarkInstance ${markInstanceId} not found.`);
    }

    const dependencies = await this.repositories.dependencies.listDependenciesForMark(markInstanceId);
    const blockingDependencies: MarkDependency[] = [];

    for (const dependency of dependencies) {
      if (!dependency.isRequired) {
        continue;
      }

      const satisfiedNow = await this.isDependencySatisfiedNow(dependency);
      if (!satisfiedNow) {
        blockingDependencies.push(dependency);
      }
    }

    return {
      mark,
      dependencies,
      blockingReasons: blockingDependencies.map(describeDependency),
      isReady: blockingDependencies.length === 0,
    };
  }

  async refreshDependenciesForMark(markInstanceId: EntityId): Promise<DependencyEvaluationResult> {
    const dependencies = await this.repositories.dependencies.listDependenciesForMark(markInstanceId);

    for (const dependency of dependencies) {
      if (dependency.status !== DependencyStatus.Pending) {
        continue;
      }

      const satisfiedNow = await this.isDependencySatisfiedNow(dependency);
      if (!satisfiedNow) {
        continue;
      }

      await this.repositories.dependencies.updateDependency(dependency.id, {
        status: DependencyStatus.Satisfied,
        satisfiedAt: new Date().toISOString(),
        waivedAt: null,
      });
    }

    return this.evaluateMarkReadiness(markInstanceId);
  }

  async satisfyDependenciesByRequiredEntity(input: SatisfyDependenciesByRequiredEntityInput): Promise<MarkDependency[]> {
    const dependencyTypes = input.dependencyTypes ?? getDefaultSatisfiedDependencyTypes(input.requiredEntityType);
    const dependencies = await this.repositories.dependencies.listDependenciesByRequiredEntity(
      input.requiredEntityType,
      input.requiredEntityId,
    );
    const updated: MarkDependency[] = [];

    for (const dependency of dependencies) {
      if (dependency.status !== DependencyStatus.Pending || !dependencyTypes.includes(dependency.dependencyType)) {
        continue;
      }

      updated.push(
        await this.repositories.dependencies.updateDependency(dependency.id, {
          status: DependencyStatus.Satisfied,
          satisfiedAt: input.satisfiedAt ?? new Date().toISOString(),
          waivedAt: null,
        }),
      );
    }

    return updated;
  }

  async failDependenciesByRequiredEntity(input: FailDependenciesByRequiredEntityInput): Promise<MarkDependency[]> {
    const dependencies = await this.repositories.dependencies.listDependenciesByRequiredEntity(
      input.requiredEntityType,
      input.requiredEntityId,
    );
    const updated: MarkDependency[] = [];

    for (const dependency of dependencies) {
      if (dependency.status !== DependencyStatus.Pending) {
        continue;
      }
      if (input.dependencyTypes && !input.dependencyTypes.includes(dependency.dependencyType)) {
        continue;
      }

      updated.push(
        await this.repositories.dependencies.updateDependency(dependency.id, {
          status: DependencyStatus.Failed,
          satisfiedAt: null,
          waivedAt: null,
        }),
      );
    }

    return updated;
  }

  async cancelDependenciesByRequiredEntity(input: CancelDependenciesByRequiredEntityInput): Promise<MarkDependency[]> {
    const dependencies = await this.repositories.dependencies.listDependenciesByRequiredEntity(
      input.requiredEntityType,
      input.requiredEntityId,
    );
    const updated: MarkDependency[] = [];

    for (const dependency of dependencies) {
      if (dependency.status !== DependencyStatus.Pending) {
        continue;
      }
      if (input.dependencyTypes && !input.dependencyTypes.includes(dependency.dependencyType)) {
        continue;
      }

      updated.push(
        await this.repositories.dependencies.updateDependency(dependency.id, {
          status: DependencyStatus.Cancelled,
          satisfiedAt: null,
          waivedAt: null,
        }),
      );
    }

    return updated;
  }

  async waiveDependency(input: WaiveDependencyInput): Promise<MarkDependency> {
    return this.repositories.dependencies.updateDependency(input.dependencyId, {
      status: DependencyStatus.Waived,
      satisfiedAt: null,
      waivedAt: input.waivedAt,
    });
  }

  private async isDependencySatisfiedNow(dependency: MarkDependency): Promise<boolean> {
    switch (dependency.status) {
      case DependencyStatus.Satisfied:
      case DependencyStatus.Waived:
        return true;
      case DependencyStatus.Failed:
      case DependencyStatus.Cancelled:
        return false;
      case DependencyStatus.Pending:
      default:
        break;
    }

    switch (dependency.dependencyType) {
      case DependencyType.PackCheckCompleted: {
        const packCheck = await this.repositories.packChecks.getInstanceById(dependency.requiredEntityId);
        return !!packCheck && packCheck.status === PackCheckInstanceStatus.Completed;
      }
      case DependencyType.MarkCompleted: {
        const mark = await this.repositories.marks.getMarkInstanceById(dependency.requiredEntityId);
        return !!mark && mark.status === MarkInstanceStatus.Completed;
      }
      case DependencyType.MarkResolved: {
        const mark = await this.repositories.marks.getMarkInstanceById(dependency.requiredEntityId);
        return !!mark && isMarkResolvedStatus(mark.status);
      }
      case DependencyType.ManualUnlock:
      case DependencyType.SessionLevelPackCheck:
      default:
        return false;
    }
  }
}

export function createDependencyEngine(repos: WaymarkRepositories): DependencyEngineContract {
  return new DependencyEngineImpl(repos);
}

export function createDefaultDependencyEngine(repos: WaymarkRepositories): DependencyEngineContract {
  return createDependencyEngine(repos);
}
