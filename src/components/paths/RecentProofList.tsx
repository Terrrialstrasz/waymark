import { StyleSheet, View } from "react-native";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { Locale, PathId } from "../../types/ui";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { spacing } from "../../theme/tokens";
import { RecentProofRow } from "./RecentProofRow";
import { PathProofItem } from "./types";

type Props = {
  items: PathProofItem[];
  locale: Locale;
  pathId: PathId;
  pathLabel: string;
  onPressItem?: (item: PathProofItem) => void;
};

export function RecentProofList({ items, locale, pathId, pathLabel, onPressItem }: Props) {
  const c = getPathsCopy(locale);

  if (!items.length) {
    return <WMEmptyState body={c.detail.recentProofEmptyBody} title={c.detail.recentProofEmptyTitle} />;
  }

  return (
    <View style={styles.stack}>
      {items.map((item) => (
        <RecentProofRow key={item.id} item={item} locale={locale} onPress={onPressItem} pathId={pathId} pathLabel={pathLabel} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
});
