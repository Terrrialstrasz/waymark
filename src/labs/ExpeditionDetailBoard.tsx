import { Alert, StyleSheet, View } from "react-native";
import { Locale } from "../types/ui";
import { BoardSection } from "./BoardPrimitives";
import { spacing } from "../theme/tokens";
import { ExpeditionDetailTemplate } from "../components/expeditions/ExpeditionDetailTemplate";
import { ExpeditionSummaryCard } from "../components/expeditions/ExpeditionSummaryCard";
import { MilestoneTimeline } from "../components/expeditions/MilestoneTimeline";
import { MilestoneRow } from "../components/expeditions/MilestoneRow";
import { ExpeditionPlannedMarkRow } from "../components/expeditions/ExpeditionPlannedMarkRow";
import {
  expeditionDetailScreenFixtures,
  expeditionFixtureBase,
  milestoneFixtures,
  plannedMarkFixtures,
} from "../components/expeditions/__fixtures__/expeditionDetail.fixtures";

type Props = {
  locale: Locale;
};

export function ExpeditionDetailBoard({ locale }: Props) {
  return (
    <View style={styles.stack}>
      <BoardSection title="ExpeditionDetailTemplate" subtitle="Active, completed, upcoming, Vietnamese, and reduced motion review surfaces.">
        <View style={styles.stack}>
          <ExpeditionDetailTemplate
            expedition={expeditionDetailScreenFixtures.active.expedition}
            locale={locale}
            milestones={expeditionDetailScreenFixtures.active.milestones}
            onBack={() => Alert.alert("Back", "Expedition detail")}
            onMore={() => Alert.alert("More", "Expedition detail")}
            onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)}
            unassignedMarks={expeditionDetailScreenFixtures.active.unassignedMarks}
          />
          <ExpeditionDetailTemplate
            expedition={expeditionDetailScreenFixtures.completed.expedition}
            locale={locale}
            milestones={expeditionDetailScreenFixtures.completed.milestones}
            onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)}
          />
          <ExpeditionDetailTemplate
            expedition={expeditionDetailScreenFixtures.upcoming.expedition}
            locale={locale}
            milestones={expeditionDetailScreenFixtures.upcoming.milestones}
            onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)}
          />
          <ExpeditionDetailTemplate
            expedition={expeditionDetailScreenFixtures.active.expedition}
            locale="vi"
            milestones={expeditionDetailScreenFixtures.active.milestones}
            onOpenMarkDetail={(markId) => Alert.alert("Chi tiết dấu mốc", markId)}
          />
          <ExpeditionDetailTemplate
            expedition={expeditionDetailScreenFixtures.active.expedition}
            locale={locale}
            milestones={expeditionDetailScreenFixtures.active.milestones}
            onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)}
          />
        </View>
      </BoardSection>

      <BoardSection title="ExpeditionSummaryCard" subtitle="0 percent, 40 percent, and 100 percent states.">
        <View style={styles.stackSm}>
          <ExpeditionSummaryCard expedition={{ ...expeditionFixtureBase, percentComplete: 0, completedMarks: 0, completedMilestones: 0 }} locale={locale} />
          <ExpeditionSummaryCard expedition={{ ...expeditionFixtureBase, percentComplete: 40 }} locale={locale} />
          <ExpeditionSummaryCard expedition={{ ...expeditionFixtureBase, percentComplete: 100, completedMarks: 18, completedMilestones: 5 }} locale={locale} />
        </View>
      </BoardSection>

      <BoardSection title="MilestoneTimeline" subtitle="One expanded milestone and all collapsed states.">
        <View style={styles.stackSm}>
          <MilestoneTimeline
            locale={locale}
            milestones={milestoneFixtures}
            onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)}
            unassignedMarks={expeditionDetailScreenFixtures.active.unassignedMarks}
          />
          <MilestoneTimeline
            locale={locale}
            milestones={milestoneFixtures.map((milestone) => ({
              ...milestone,
              isExpanded: false,
            }))}
            onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)}
          />
        </View>
      </BoardSection>

      <BoardSection title="MilestoneRow" subtitle="Done, in progress, and upcoming row states.">
        <View style={styles.stackSm}>
          <MilestoneRow expanded={false} locale={locale} milestone={milestoneFixtures[0]} onToggle={() => undefined} />
          <MilestoneRow expanded={true} locale={locale} milestone={milestoneFixtures[1]} onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)} onToggle={() => undefined} />
          <MilestoneRow expanded={false} locale={locale} milestone={milestoneFixtures[2]} onToggle={() => undefined} showConnector={false} />
        </View>
      </BoardSection>

      <BoardSection title="ExpeditionPlannedMarkRow" subtitle="Planned, done, upcoming, long title, and no hero fallback states.">
        <View style={styles.stackSm}>
          <ExpeditionPlannedMarkRow locale={locale} mark={plannedMarkFixtures.planned} onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)} />
          <ExpeditionPlannedMarkRow locale={locale} mark={plannedMarkFixtures.done} onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)} />
          <ExpeditionPlannedMarkRow locale={locale} mark={plannedMarkFixtures.upcoming} onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)} />
          <ExpeditionPlannedMarkRow locale={locale} mark={plannedMarkFixtures.longTitle} onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)} />
          <ExpeditionPlannedMarkRow locale={locale} mark={plannedMarkFixtures.noHero} onOpenMarkDetail={(markId) => Alert.alert("Mark detail", markId)} />
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  stackSm: {
    gap: spacing.sm,
  },
});
