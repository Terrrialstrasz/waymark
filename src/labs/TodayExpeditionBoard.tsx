import { Alert, StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { Locale } from "../types/ui";
import { spacing } from "../theme/tokens";
import { currentExpeditionFixtures, closeTrailFixtures } from "../components/today/__fixtures__/todayExpedition.fixtures";
import { CurrentExpeditionSection } from "../components/today/CurrentExpeditionSection";
import { CloseTrailEntryCard } from "../components/today/CloseTrailEntryCard";
import { WMText } from "../components/primitives/Text";

type Props = {
  locale: Locale;
};

export function TodayExpeditionBoard({ locale }: Props) {
  return (
    <View style={styles.stack}>
      <BoardSection
        subtitle={locale === "vi" ? "Current Expedition là carousel yên tĩnh, không có progress dashboard." : "Current Expedition stays quiet and does not become a progress dashboard."}
        title="Current Expedition"
      >
        <View style={styles.stackSm}>
          {currentExpeditionFixtures
            .filter((fixture) => fixture.id !== "empty")
            .map((fixture) => (
              <View key={fixture.id} style={styles.stackSm}>
                <WMText variant="meta">{fixture.title}</WMText>
                <CurrentExpeditionSection
                  expeditions={fixture.expeditions}
                  locale={locale}
                  onOpenExpeditionDetail={(expedition) => Alert.alert("Expedition detail", expedition.title[locale])}
                />
              </View>
            ))}

          <View style={styles.stackSm}>
            <WMText variant="meta">
              {locale === "vi" ? "No expedition / hidden by parent" : "No expedition / hidden by parent"}
            </WMText>
            <WMText variant="bodySm">
              {locale === "vi"
                ? "Khi không có expedition end-to-end, section này nên bị ẩn hoàn toàn."
                : "When no expedition is end-to-end, this section should stay hidden."}
            </WMText>
          </View>
        </View>
      </BoardSection>

      <BoardSection
        subtitle={locale === "vi" ? "Close the Day là thẻ entry phẳng, không warning, không score." : "Close the Day is a calm entry card, not a warning or score surface."}
        title="Close the Day Entry"
      >
        <View style={styles.stackSm}>
          <CloseTrailEntryCard locale={locale} onPress={() => Alert.alert("Close the Day", "Open reflection")} status={closeTrailFixtures[0].status} />
          <CloseTrailEntryCard locale={locale} onPress={() => Alert.alert("Close the Day", "Today is already closed")} status={closeTrailFixtures[1].status} />
          <CloseTrailEntryCard locale={locale} status={closeTrailFixtures[2].status} />
          <CloseTrailEntryCard locale={locale} status={closeTrailFixtures[3].status} />
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
