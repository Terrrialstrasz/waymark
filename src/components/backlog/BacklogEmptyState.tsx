import { StyleSheet, View } from "react-native";
import { Locale } from "../../types/ui";
import { foundationColors, spacing } from "../../theme/tokens";
import { getCopy } from "../../i18n/copy";
import { BotanicalDecorationLayer } from "../primitives/BotanicalDecorationLayer";
import { IconBadge } from "../primitives/IconBadge";
import { WMButton } from "../primitives/WMButton";
import { WMText } from "../primitives/Text";
import { BacklogEmptyStateMode, BacklogFilterValue, getBacklogEmptyBody } from "./types";

type Props = {
  locale: Locale;
  mode: BacklogEmptyStateMode;
  selectedFilter?: BacklogFilterValue;
  canReset?: boolean;
  onResetView?: () => void;
};

export function BacklogEmptyState({
  locale,
  mode,
  selectedFilter = "all",
  canReset = false,
  onResetView,
}: Props) {
  const backlog = getCopy(locale).backlog;

  return (
    <BotanicalDecorationLayer preset="emptyState">
      <View style={styles.wrap}>
        <IconBadge semanticName="entity.backlog" shape="seal" size="lg" tone="warm" />
        <View style={styles.copy}>
          <WMText style={styles.title} variant="sectionTitle">
            {backlog.empty.title}
          </WMText>
          <WMText style={styles.body} variant="body">
            {getBacklogEmptyBody(locale, mode, selectedFilter)}
          </WMText>
        </View>

        {canReset && onResetView ? (
          <WMButton
            accessibilityLabel={backlog.empty.resetView}
            label={backlog.empty.resetView}
            onPress={onResetView}
            variant="secondary"
          />
        ) : null}
      </View>
    </BotanicalDecorationLayer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  copy: {
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: 360,
  },
  title: {
    textAlign: "center",
  },
  body: {
    color: foundationColors.ink.secondary,
    textAlign: "center",
  },
});
