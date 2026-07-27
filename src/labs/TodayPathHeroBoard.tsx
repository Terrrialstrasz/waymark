import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { TodayPathHero } from "../components/today/TodayPathHero";
import { Locale, PathId } from "../types/ui";
import { spacing } from "../theme/tokens";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import { narrowViewportFixture, todayPathHeroFixtures } from "../components/today/__fixtures__/todayPathHero.fixtures";

type Props = {
  locale: Locale;
};

export function TodayPathHeroBoard({ locale }: Props) {
  const [selectedPathId, setSelectedPathId] = useState<PathId>("family");
  const interactivePaths = useMemo(() => todayPathHeroPaths, []);

  return (
    <View style={styles.stack}>
      <BoardSection
        title="TodayPathHero / Interactive"
        subtitle="Full-image Anchor Path hero with title-integrated path reselect. No progress, milestones, or expedition framing."
      >
        <TodayPathHero
          isPathDetailEnabled
          locale={locale}
          onOpenPathDetail={(pathId) => Alert.alert("Path detail", pathId)}
          onPathChange={setSelectedPathId}
          paths={interactivePaths}
          selectedPathId={selectedPathId}
        />
      </BoardSection>

      {todayPathHeroFixtures.map((fixture) => (
        <BoardSection key={fixture.id} title={fixture.title}>
          <TodayPathHero
            isLoading={fixture.isLoading}
            isPathDetailEnabled={fixture.isPathDetailEnabled}
            locale={locale}
            onOpenPathDetail={(pathId) => Alert.alert("Path detail", pathId)}
            onPathChange={() => undefined}
            paths={fixture.paths ?? todayPathHeroPaths}
            selectedPathId={fixture.selectedPathId}
          />
        </BoardSection>
      ))}

      <BoardSection title={narrowViewportFixture.title}>
        <View style={styles.narrowViewport}>
          <TodayPathHero
            locale={locale}
            onPathChange={() => undefined}
            paths={todayPathHeroPaths}
            selectedPathId={narrowViewportFixture.selectedPathId}
          />
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  narrowViewport: {
    width: 320,
    maxWidth: "100%",
  },
});
