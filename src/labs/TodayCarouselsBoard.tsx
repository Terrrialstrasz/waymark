import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { Locale } from "../types/ui";
import { spacing } from "../theme/tokens";
import { MarksToLeaveSection } from "../components/today/MarksToLeaveSection";
import { PackChecksSection } from "../components/today/PackChecksSection";
import { marksToLeaveFixtures, packChecksFixtures, type TodayPackCheckItem } from "../components/today/__fixtures__/todayCarousel.fixtures";
import { WMChip } from "../components/primitives/WMChip";

type Props = {
  locale: Locale;
};

export function TodayCarouselsBoard({ locale }: Props) {
  const [selectedFixture, setSelectedFixture] = useState("mixed");
  const packCheckLayoutStressPacks: TodayPackCheckItem[] = [
    {
      id: "stress-short",
      title: { en: "Walk Readiness Check", vi: "Walk Readiness Check" },
      count: 1,
      tone: "morning",
      sourceSeedId: "health.walk-readiness-check",
      section: "independent",
      detailEnabled: true,
    },
    {
      id: "stress-before-leaving",
      title: { en: "Before Leaving Home Check", vi: "Before Leaving Home Check" },
      count: 2,
      tone: "office",
      sourceSeedId: "family.before-leaving-home-check",
      section: "independent",
      supportLabel: { en: "Signal active", vi: "Signal active" },
      detailEnabled: true,
    },
    {
      id: "stress-grooming",
      title: { en: "Daily Grooming Presence Check", vi: "Daily Grooming Presence Check" },
      count: 1,
      tone: "morning",
      sourceSeedId: "style.daily-grooming-presence-check",
      section: "independent",
      detailEnabled: true,
    },
    {
      id: "stress-workout",
      title: { en: "Workout Readiness Check", vi: "Workout Readiness Check" },
      count: 0,
      tone: "gym",
      sourceSeedId: "health.workout-readiness-check",
      section: "prepare_tomorrow",
      supportLabel: { en: "For Day A Strength", vi: "For Day A Strength" },
      detailEnabled: true,
    },
    {
      id: "stress-very-long",
      title: {
        en: "Weekend Hanoi Check",
        vi: "Weekend Hanoi Check",
      },
      count: 3,
      tone: "office",
      sourceSeedId: "family.weekend-around-hanoi-readiness-check",
      section: "independent",
      detailEnabled: true,
    },
  ];

  return (
    <View style={styles.stack}>
      <BoardSection
        subtitle={locale === "vi" ? "Tach rieng rail Today de mo lab nhe hon va test dung state carousel." : "Separated Today rails to keep the lab lighter and test carousel states directly."}
        title="Today Carousels"
      >
        <View style={styles.tabRow}>
          {marksToLeaveFixtures.map((fixture) => (
            <WMChip
              key={fixture.id}
              label={fixture.title}
              onPress={() => setSelectedFixture(fixture.id)}
              selected={selectedFixture === fixture.id}
            />
          ))}
          {packChecksFixtures.map((fixture) => (
            <WMChip
              key={fixture.id}
              label={fixture.title}
              onPress={() => setSelectedFixture(`pack-${fixture.id}`)}
              selected={selectedFixture === `pack-${fixture.id}`}
            />
          ))}
        </View>
      </BoardSection>

      {marksToLeaveFixtures
        .filter((fixture) => fixture.id === selectedFixture)
        .map((fixture) => (
          <BoardSection key={fixture.id} subtitle="Marks to Leave rail" title={fixture.title}>
            <MarksToLeaveSection locale={locale} marks={fixture.marks} onOpenMarkDetail={(mark) => Alert.alert("Mark Detail", mark.title[locale])} />
          </BoardSection>
        ))}

      {packChecksFixtures
        .filter((fixture) => `pack-${fixture.id}` === selectedFixture)
        .map((fixture) => (
          <BoardSection
            key={fixture.id}
            subtitle="Pack Checks rail with short, long, square-tile, and future-linked states."
            title={fixture.title}
          >
            <PackChecksSection locale={locale} packs={fixture.packs} onOpenPackCheck={(pack) => Alert.alert("Pack Check", pack.title[locale])} />
          </BoardSection>
        ))}

      <BoardSection
        subtitle="Dedicated layout stress cases for square tiles, multi-line titles, support labels, and mixed carousel width."
        title="Pack Check Layout Stress"
      >
        <PackChecksSection locale={locale} packs={packCheckLayoutStressPacks} onOpenPackCheck={(pack) => Alert.alert("Pack Check", pack.title[locale])} />
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
