import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Locale } from "../types/ui";
import { todayCockpitFixtures } from "../components/today/__fixtures__/todayCockpit.fixtures";
import { TodayCockpitScreen } from "../components/today/TodayCockpitScreen";
import { WMChip } from "../components/primitives/WMChip";
import { WMText } from "../components/primitives/Text";
import { spacing } from "../theme/tokens";

type Props = {
  locale: Locale;
};

export function TodayCockpitBoard({ locale }: Props) {
  const [selectedFixtureId, setSelectedFixtureId] = useState(todayCockpitFixtures[0].id);
  const fixture = todayCockpitFixtures.find((item) => item.id === selectedFixtureId) ?? todayCockpitFixtures[0];
  const screenLocale = fixture.locale ?? locale;
  const [selectedPathId, setSelectedPathId] = useState(fixture.screenProps.selectedPathId);

  useEffect(() => {
    setSelectedPathId(fixture.screenProps.selectedPathId);
  }, [fixture.id, fixture.screenProps.selectedPathId]);

  const screenProps = {
    ...fixture.screenProps,
    locale: screenLocale,
    onOpenCloseTrail: () => Alert.alert(screenLocale === "vi" ? "Đóng ngày" : "Close the Day", screenLocale === "vi" ? "Mở phần phản tư" : "Open reflection"),
    onOpenExpedition: (expedition: (typeof fixture.screenProps.currentExpeditions)[number]) =>
      Alert.alert(screenLocale === "vi" ? "Expedition" : "Expedition", expedition.title[screenLocale]),
    onOpenMarkDetail: (mark: (typeof fixture.screenProps.marks)[number]) =>
      Alert.alert(screenLocale === "vi" ? "Mark Detail" : "Mark Detail", mark.title[screenLocale]),
    onOpenPackCheck: (pack: (typeof fixture.screenProps.packChecks)[number]) =>
      Alert.alert(screenLocale === "vi" ? "Pack Check" : "Pack Check", pack.title[screenLocale]),
    onOpenPathDetail: (pathId: (typeof fixture.screenProps.paths)[number]["id"]) =>
      Alert.alert(screenLocale === "vi" ? "Path detail" : "Path detail", String(pathId)),
    onPathChange: setSelectedPathId,
    selectedPathId,
    withShell: false,
  };

  return (
    <View style={styles.stack}>
      <View style={styles.heading}>
        <WMText variant="cardTitle">Today Cockpit</WMText>
        <WMText variant="bodySm">
          {locale === "vi"
            ? "Màn Today hoàn chỉnh với thứ tự section đã chốt và trạng thái feature-gated."
            : "Full Today screen composition with the approved section order and gated states."}
        </WMText>
      </View>

      <View style={styles.tabRow}>
        {todayCockpitFixtures.map((item) => (
          <WMChip
            key={item.id}
            label={item.title}
            onPress={() => setSelectedFixtureId(item.id)}
            selected={selectedFixtureId === item.id}
          />
        ))}
      </View>

      <View style={[styles.previewFrame, fixture.frameWidth ? { width: fixture.frameWidth } : null]}>
        <TodayCockpitScreen {...screenProps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  heading: {
    gap: spacing.xs,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  previewFrame: {
    alignSelf: "stretch",
    maxWidth: "100%",
  },
});
