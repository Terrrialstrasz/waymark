import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { JournalCard } from "../../primitives/JournalCard";
import { IconBadge } from "../../primitives/IconBadge";
import { WMText } from "../../primitives/Text";
import { Locale } from "../../../types/ui";
import { formatTemplate, getHealthStrengthCopy } from "./utils";
import { foundationColors, spacing } from "../../../theme/tokens";

type Props = {
  locale: Locale;
  exerciseCount?: number;
  title?: string;
  body?: string;
  children?: ReactNode;
};

export function WorkoutCompletionSummary({ locale, exerciseCount = 0, title, body, children }: Props) {
  const copy = getHealthStrengthCopy(locale);
  const resolvedTitle = title ?? copy.summary.title;
  const resolvedBody = body ?? formatTemplate(copy.summary.body, { exerciseCount });

  return (
    <JournalCard contentStyle={styles.content} stateTone="done" variant="readOnly">
      <View style={styles.row}>
        <IconBadge semanticName="status.done" shape="rounded" size="lg" state="completed" tone="green" />
        <View style={styles.copy}>
          <WMText style={styles.title} variant="bodyStrong">
            {resolvedTitle}
          </WMText>
          <WMText style={styles.body} variant="bodySm">
            {resolvedBody}
          </WMText>
        </View>
      </View>
      {children ? <View style={styles.actionSlot}>{children}</View> : null}
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: foundationColors.green.deep,
  },
  body: {
    color: foundationColors.ink.secondary,
  },
  actionSlot: {
    marginTop: spacing.xs,
  },
});
