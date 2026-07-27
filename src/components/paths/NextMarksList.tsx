import { StyleSheet, View } from "react-native";
import { Locale, PathId } from "../../types/ui";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { spacing } from "../../theme/tokens";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { NextMarkRow } from "./NextMarkRow";
import { NextMarkItem } from "./types";

type Props = {
  items: NextMarkItem[];
  locale: Locale;
  pathId: PathId;
  pathLabel: string;
  onPressItem?: (item: NextMarkItem) => void;
};

export function NextMarksList({ items, locale, pathId, pathLabel, onPressItem }: Props) {
  const c = getPathsCopy(locale);

  if (!items.length) {
    return <WMEmptyState body={c.detail.nextMarksEmptyBody} title={c.detail.nextMarksEmptyTitle} />;
  }

  return (
    <View style={styles.stack}>
      {items.map((item) => (
        <NextMarkRow key={item.id} item={item} locale={locale} onPress={onPressItem} pathId={pathId} pathLabel={pathLabel} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
});
