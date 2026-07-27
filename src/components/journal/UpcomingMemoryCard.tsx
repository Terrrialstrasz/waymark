import { StyleSheet, View } from "react-native";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { getCopy } from "../../i18n/copy";
import { foundationColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { DateSeal } from "./DateSeal";

type Props = {
  locale?: Locale;
  title: string;
  subtitle?: string;
  day?: string;
  month?: string;
  tone?: "green" | "gold";
  readonly?: boolean;
  loading?: boolean;
  onPress?: () => void;
};

export function UpcomingMemoryCard({
  locale = "en",
  title,
  subtitle,
  day = "21",
  month = "MAY",
  tone = "green",
  readonly = false,
  loading = false,
  onPress,
}: Props) {
  const actionable = Boolean(onPress) && !readonly && !loading;

  return (
    <JournalCard actionable={actionable} onPress={actionable ? onPress : undefined} style={styles.card} variant="standard">
      <View style={styles.row}>
        <DateSeal day={day} month={month} tone={tone} />
        <View style={styles.copy}>
          <WMText numberOfLines={2} variant="sectionTitle">
            {title}
          </WMText>
          {subtitle ? (
            <WMText numberOfLines={1} style={styles.subtitle} variant="bodySm">
              {subtitle}
            </WMText>
          ) : null}
        </View>
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 248,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
});
