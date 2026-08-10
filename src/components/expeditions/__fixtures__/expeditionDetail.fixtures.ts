import { getPathHeroImage } from "../../../tokens/pathHeroImages";
import { ExpeditionDetailItem, ExpeditionMilestoneItem, ExpeditionPlannedMarkItem } from "../types";

const snagHero = getPathHeroImage("snag")?.assetId;
const careerHero = getPathHeroImage("career")?.assetId;

export const expeditionFixtureBase: ExpeditionDetailItem = {
  id: "website-go-live",
  title: "Website Go-Live",
  subtitle: "SNAG Golf Vietnam",
  status: "active",
  startDate: "2026-05-12",
  endDate: "2026-06-30",
  daysLeftLabel: "6 weeks left",
  summaryTitle: "Expedition Summary",
  summaryText: "Bring the official site live with strong foundation content, clean structure, and launch readiness.",
  completedMarks: 7,
  totalMarks: 18,
  completedMilestones: 2,
  totalMilestones: 5,
  percentComplete: 40,
  pathId: "snag",
  pathName: "SNAG Golf Vietnam",
  pathColor: "#2D8B57",
  pathAccent: "#2D8B57",
  heroImage: snagHero,
  whyItMatters: "This expedition strengthens SNAG Golf Vietnam’s official presence and creates the foundation for long-term growth.",
};

export const plannedMarkFixtures: Record<string, ExpeditionPlannedMarkItem> = {
  planned: {
    id: "finish-static-export-hardening",
    title: "Finish static export hardening",
    subtitle: "Lock the export rules before the launch package is prepared.",
    status: "planned",
    pathId: "snag",
    pathName: "SNAG",
    timingLabel: "This week",
    icon: "entity.mark",
    heroImage: snagHero,
  },
  upcoming: {
    id: "test-public-html-upload",
    title: "Test public_html upload",
    subtitle: "Run a clean upload rehearsal for the launch package.",
    status: "planned",
    pathId: "snag",
    pathName: "SNAG",
    timingLabel: "Tomorrow",
    icon: "entity.mark",
    heroImage: snagHero,
  },
  done: {
    id: "review-static-build-errors",
    title: "Review static build errors",
    subtitle: "Confirm the final build warnings are resolved cleanly.",
    status: "completed",
    pathId: "snag",
    pathName: "SNAG",
    timingLabel: "Today",
    icon: "status.done",
    heroImage: snagHero,
  },
  longTitle: {
    id: "long-title",
    title: "Finish static export hardening before the launch package is handed over to hosting operations",
    subtitle: "Confirm the release rule set and keep the final launch handoff stable.",
    status: "planned",
    pathId: "career",
    pathName: "Career",
    timingLabel: "This week",
    icon: "entity.mark",
    heroImage: careerHero,
  },
  noHero: {
    id: "no-hero",
    title: "Confirm image system",
    subtitle: "Check that the shared image pipeline respects the optimized variants.",
    status: "planned",
    pathId: "snag",
    pathName: "SNAG",
    timingLabel: "Today",
    icon: "entity.mark",
  },
};

export const milestoneFixtures: ExpeditionMilestoneItem[] = [
  {
    id: "core-content-live",
    number: 1,
    title: "Core content live",
    startDate: "2026-05-12",
    endDate: "2026-05-20",
    status: "done",
    completedMarks: 4,
    totalMarks: 4,
    plannedMarks: [],
  },
  {
    id: "static-export-ready",
    number: 2,
    title: "Static export ready",
    startDate: "2026-05-21",
    endDate: "2026-06-05",
    status: "inProgress",
    completedMarks: 2,
    totalMarks: 5,
    plannedMarks: [
      plannedMarkFixtures.planned,
      plannedMarkFixtures.noHero,
      plannedMarkFixtures.upcoming,
      plannedMarkFixtures.done,
    ],
    isExpanded: true,
  },
  {
    id: "google-indexing-setup",
    number: 3,
    title: "Google indexing setup",
    startDate: "2026-06-06",
    endDate: "2026-06-18",
    status: "upcoming",
    completedMarks: 0,
    totalMarks: 4,
    plannedMarks: [],
  },
  {
    id: "launch-review",
    number: 4,
    title: "Launch review",
    startDate: "2026-06-19",
    endDate: "2026-06-30",
    status: "upcoming",
    completedMarks: 0,
    totalMarks: 5,
    plannedMarks: [],
  },
];

export const noMilestoneMarkFixture = {
  id: "no-milestone-marks",
  title: "No milestone",
  completedMarks: 0,
  totalMarks: 2,
  plannedMarks: [
    {
      ...plannedMarkFixtures.planned,
      id: "expedition-level-scope-note",
      title: "Write expedition scope note",
      timingLabel: "This week",
    },
    {
      ...plannedMarkFixtures.upcoming,
      id: "expedition-level-launch-risk",
      title: "Review launch risk list",
      timingLabel: "Tomorrow",
    },
  ],
};

export const expeditionDetailScreenFixtures = {
  active: {
    expedition: { ...expeditionFixtureBase, totalMarks: expeditionFixtureBase.totalMarks + noMilestoneMarkFixture.totalMarks },
    milestones: milestoneFixtures,
    unassignedMarks: noMilestoneMarkFixture,
  },
  completed: {
    expedition: {
      ...expeditionFixtureBase,
      status: "done" as const,
      daysLeftLabel: undefined,
      completedMarks: 18,
      completedMilestones: 5,
      percentComplete: 100,
    },
    milestones: milestoneFixtures.map((milestone) => ({
      ...milestone,
      status: "done" as const,
      completedMarks: milestone.totalMarks,
      plannedMarks: milestone.plannedMarks.map((mark) => ({
        ...mark,
        status: "completed" as const,
      })),
      isExpanded: false,
    })),
    unassignedMarks: null,
  },
  upcoming: {
    expedition: {
      ...expeditionFixtureBase,
      status: "upcoming" as const,
      completedMarks: 0,
      completedMilestones: 0,
      percentComplete: 0,
      daysLeftLabel: "Starts soon",
    },
    milestones: milestoneFixtures.map((milestone) => ({
      ...milestone,
      status: "upcoming" as const,
      completedMarks: 0,
      plannedMarks: milestone.plannedMarks.map((mark) => ({
        ...mark,
        status: "planned" as const,
      })),
      isExpanded: false,
    })),
    unassignedMarks: null,
  },
};
