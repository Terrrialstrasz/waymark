import { StyleSheet, View } from "react-native";
import { Locale } from "../types/ui";
import { closeTrailFixture } from "../components/close-trail/__fixtures__/closeTrail.fixtures";
import { CloseTrailScreen } from "../components/close-trail/CloseTrailScreen";
import { WMText } from "../components/primitives/Text";
import { spacing } from "../theme/tokens";

type Props = {
  locale: Locale;
};

export function CloseTrailBoard({ locale }: Props) {
  return (
    <View style={styles.stack}>
      <View style={styles.heading}>
        <WMText variant="cardTitle">{locale === "vi" ? "Close the Day" : "Close the Day"}</WMText>
        <WMText variant="bodySm">
          {locale === "vi"
            ? "Bản preview cho màn khép ngày: chỉ rà lại hôm nay, không có affordance để đi lạc sang chỗ khác."
            : "Preview for the end-of-day close screen: today-only review, no browse affordances."}
        </WMText>
      </View>

      <View style={styles.previewFrame}>
        <CloseTrailScreen fixture={closeTrailFixture} locale={locale} withShell={false} />
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
  previewFrame: {
    maxWidth: "100%",
  },
});
