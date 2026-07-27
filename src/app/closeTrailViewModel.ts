import type {
  CloseTrailJudgment,
  CloseTrailReview,
} from "../domain/waymark/services";
import type {
  CloseTrailFirstStep,
  CloseTrailFixture,
  CloseTrailReviewFixture,
  TrailClosedChipViewModel,
  TrailClosedResultViewModel,
} from "../components/close-trail/__fixtures__/closeTrail.fixtures";
import type { TodayMarkItem } from "../components/today/__fixtures__/todayCarousel.fixtures";

function text(value: string) {
  return { en: value, vi: value };
}

function chip(id: string, label: string, stateTone?: TrailClosedChipViewModel["stateTone"]): TrailClosedChipViewModel {
  return {
    id,
    label: text(label),
    stateTone,
  };
}

function buildFirstStep(
  preview: CloseTrailReview["suggestedTomorrowFirstStep"] | CloseTrailJudgment["tomorrowFirstStep"],
): CloseTrailFirstStep {
  const emptyText = text("No planned mark is set for tomorrow.");
  if (!preview) {
    return {
      title: text("Tomorrow's first step"),
      value: emptyText,
      chips: [],
      emptyText,
    };
  }

  return {
    title: text("Tomorrow's first step"),
    plannedMarkId: preview.plannedMarkId,
    value: text(preview.title),
    chips: [
      preview.scheduledTime
        ? {
            id: "time",
            label: text(preview.scheduledTime),
          }
        : null,
      preview.pathLabel
        ? {
            id: "path",
            label: text(preview.pathLabel),
          }
        : null,
      preview.blockLabel
        ? {
            id: "block",
            label: text(preview.blockLabel),
          }
        : null,
      {
        id: "status",
        label: text(preview.statusLabel ?? "Planned"),
      },
    ].filter(Boolean) as CloseTrailFirstStep["chips"],
    emptyText,
  };
}

export function buildCloseTrailReviewFixture(review: CloseTrailReview, marks: TodayMarkItem[]): CloseTrailReviewFixture {
  return {
    phase: "review",
    marks,
    memories: review.memories.map((memory) => ({
      id: memory.id,
      title: { en: memory.title, vi: memory.title },
      metadata: {
        en: memory.note ?? memory.capturedAt,
        vi: memory.note ?? memory.capturedAt,
      },
    })),
    disciplineCluster: {
      title: {
        en: "Discipline Proof",
        vi: "Discipline Proof",
      },
      subtitle: {
        en: "Select only what you can honestly keep as proof.",
        vi: "Chi chon dieu ban co the thanh that giu lai nhu bang chung.",
      },
      question: {
        en: "What discipline did I keep today?",
        vi: "Hom nay toi giu duoc ky luat nao?",
      },
      items: review.disciplineOptions.map((option) => ({
        key: option.key,
        label: { en: option.label, vi: option.label },
        pathId: option.pathId,
        expeditionId: option.expeditionId,
        milestoneId: option.milestoneId,
      })),
    },
    firstStep: buildFirstStep(review.suggestedTomorrowFirstStep),
  };
}

export function buildEmptyCloseTrailReviewFixture(marks: TodayMarkItem[]): CloseTrailReviewFixture {
  return {
    phase: "review",
    marks,
    memories: [],
    disciplineCluster: {
      title: {
        en: "Discipline Proof",
        vi: "Discipline Proof",
      },
      subtitle: {
        en: "No discipline options are available yet.",
        vi: "Chua co lua chon ky luat nao.",
      },
      question: {
        en: "What discipline did I keep today?",
        vi: "Hom nay toi giu duoc ky luat nao?",
      },
      items: [],
    },
    firstStep: {
      title: {
        en: "Tomorrow's first step",
        vi: "Buoc dau tien cua ngay mai",
      },
      value: {
        en: "No planned mark is set for tomorrow.",
        vi: "Chua co planned mark nao cho ngay mai.",
      },
      chips: [],
      emptyText: {
        en: "No planned mark is set for tomorrow.",
        vi: "Chua co planned mark nao cho ngay mai.",
      },
    },
  };
}

function buildSummarySentence(counts: CloseTrailJudgment["plannedMarkOutcomes"]["counts"]) {
  if (counts.completed === 0 && counts.moved === 0 && counts.skipped === 0 && counts.substituted === 0) {
    return counts.unresolved === 1 ? "No marks were completed. 1 needs repair." : `No marks were completed. ${counts.unresolved} need repair.`;
  }

  return [
    `${counts.completed} completed.`,
    `${counts.moved} moved.`,
    `${counts.skipped} skipped.`,
    `${counts.substituted} substituted.`,
    `${counts.unresolved} need repair.`,
  ].join(" ");
}

export function buildCloseTrailJudgmentFixture(judgment: CloseTrailJudgment): TrailClosedResultViewModel {
  const counts = judgment.plannedMarkOutcomes.counts;
  const disciplineProofCount = judgment.disciplineProofs.filter((item) => item.completed).length;
  const plannedDoneCount = judgment.character.completedPlannedMarks;
  const plannedTotalCount = judgment.character.totalPlannedMarks;
  const disciplineDoneCount = judgment.character.completedDisciplineStandards;
  const disciplineTotalCount = judgment.character.totalDisciplineStandards;
  const unresolvedPreview = judgment.plannedMarkOutcomes.unresolved.slice(0, 3);
  const unresolvedMoreCount = Math.max(0, judgment.plannedMarkOutcomes.unresolved.length - unresolvedPreview.length);

  return {
    phase: "judgment",
    title: text("Trail Closed"),
    subtitle: text("Judgment after the trail is closed."),
    dayJudgmentHero: {
      judgment: judgment.day.passed ? "marked" : "needs_repair",
      label: text(judgment.day.label),
      supportText: text(
        judgment.day.passed ? "Proof was left where it mattered." : "Some marks still need honest resolution.",
      ),
      artworkSemanticName: judgment.day.icon,
      evidenceChips: [
        judgment.day.memoryCount > 0
          ? chip(
              "memories",
              judgment.day.memoryCount === 1 ? "1 memory" : `${judgment.day.memoryCount} memories`,
              "quieted",
            )
          : null,
        disciplineProofCount > 0
          ? chip(
              "discipline-proof-count",
              disciplineProofCount === 1 ? "1 discipline proof" : `${disciplineProofCount} discipline proofs`,
              "protected",
            )
          : null,
      ].filter(Boolean) as TrailClosedChipViewModel[],
    },
    plannedMarkOutcomeSummary: {
      title: text("Summary"),
      sentence: text(buildSummarySentence(counts)),
      chips: [
        chip("completed", `${counts.completed} completed`, "done"),
        chip("moved", `${counts.moved} moved`, "rescheduled"),
        chip("skipped", `${counts.skipped} skipped`, "skipped"),
        chip("substituted", `${counts.substituted} substituted`, "substituted"),
        chip("unresolved", `${counts.unresolved} need repair`, "weak"),
      ],
      counts,
      substituted: judgment.plannedMarkOutcomes.substituted.map((item) => ({
        originalMarkId: item.originalMarkId,
        originalTitle: text(item.originalTitle),
        substituteMarkId: item.substituteMarkId,
        substituteTitle: text(item.substituteTitle),
        resultLabel: item.resultLabel ? text(item.resultLabel) : undefined,
      })),
      skipped: judgment.plannedMarkOutcomes.skipped.map((item) => ({
        markId: item.markId,
        title: text(item.title),
        reason: item.reason ? text(item.reason) : undefined,
      })),
      moved: judgment.plannedMarkOutcomes.moved.map((item) => ({
        markId: item.markId,
        title: text(item.title),
        destinationLabel: text(item.destinationLabel),
        destinationDate: item.destinationDate ? text(item.destinationDate) : undefined,
        destinationTime: item.destinationTime ? text(item.destinationTime) : undefined,
        destinationBlock: item.destinationBlock ? text(item.destinationBlock) : undefined,
        destinationPath: item.destinationPath ? text(item.destinationPath) : undefined,
        reason: item.reason ? text(item.reason) : undefined,
      })),
      unresolvedPreview: unresolvedPreview.map((item) => ({
        markId: item.markId,
        title: text(item.title),
        statusLabel: text(item.statusLabel),
      })),
      unresolvedMoreCount,
    },
    characterJudgment: {
      judgment: judgment.character.passed ? "protected" : "needs_repair",
      label: text(judgment.character.label),
      supportText: text(
        plannedTotalCount + disciplineTotalCount === 0
          ? "No planned marks or discipline proofs were recorded today."
          : `${plannedDoneCount} of ${plannedTotalCount} planned marks and ${disciplineDoneCount} of ${disciplineTotalCount} discipline proofs were kept.`,
      ),
      artworkSemanticName: judgment.character.icon,
      chips: [
        chip(
          "character-planned",
          `${plannedDoneCount}/${plannedTotalCount} planned`,
          judgment.character.passed ? "protected" : "weak",
        ),
        chip(
          "character-discipline",
          `${disciplineDoneCount}/${disciplineTotalCount} discipline`,
          judgment.character.passed ? "protected" : "quieted",
        ),
      ],
    },
    disciplineProofSummary: {
      title: text("Discipline Proof"),
      rows: judgment.disciplineProofs.map((item) => ({
        key: item.key,
        label: text(item.completed ? "Kept" : "Not kept"),
        text: text(item.label),
        tone: item.completed ? "positive" : "repair",
      })),
      emptyText: text("No discipline proof was saved today."),
    },
    tomorrowFirstStep: buildFirstStep(judgment.tomorrowFirstStep),
  };
}

export function buildCloseTrailFixture(review: CloseTrailReview, marks: TodayMarkItem[]): CloseTrailFixture {
  return buildCloseTrailReviewFixture(review, marks);
}
