import { StyleSheet, View } from "react-native";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { getCopy } from "../../i18n/copy";
import { foundationColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { JournalImageSource, MediaCollage } from "./MediaCollage";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getChipToneStyle } from "./journalPlaceholders";

type Props = {
  locale?: Locale;
  title: string;
  meta?: string;
  image?: JournalImageSource;
  readonly?: boolean;
  loading?: boolean;
  onPress?: () => void;
};

export function MemoryLookBackCard({
  locale = "en",
  title,
  meta,
  image,
  readonly = false,
  loading = false,
  onPress,
}: Props) {
  const c = getCopy(locale);
  const actionable = Boolean(onPress) && !readonly && !loading;

  return (
    <JournalCard actionable={actionable} onPress={actionable ? onPress : undefined} style={styles.card} variant="standard">
      <MediaCollage
        images={[image ?? {}]}
        loading={loading}
        locale={locale}
        placeholderSeed={title}
        readonly
        titleForAccessibility={title}
        variant="single"
      />
      <WMText numberOfLines={2} style={styles.title} variant="sectionTitle">
        {title}
      </WMText>
      {meta ? (
        <WMText numberOfLines={1} style={styles.meta} variant="meta">
          {meta}
        </WMText>
      ) : null}
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 192,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  meta: {
    color: foundationColors.ink.secondary,
  },
});
