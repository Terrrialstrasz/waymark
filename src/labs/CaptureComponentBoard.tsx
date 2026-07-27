import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { CaptureAttachmentButton } from "../components/primitives/CaptureAttachmentButton";
import { CaptureChooserSheet } from "../components/primitives/CaptureChooserSheet";
import { CaptureDestinationButton } from "../components/primitives/CaptureDestinationButton";
import { CaptureLeafButton } from "../components/primitives/CaptureLeafButton";
import { CaptureNoteInput } from "../components/primitives/CaptureNoteInput";
import { WMButton } from "../components/primitives/WMButton";
import { Locale } from "../types/ui";
import { spacing } from "../theme/tokens";

type Props = {
  locale: Locale;
};

export function CaptureComponentBoard({ locale }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState(locale === "vi" ? "Má»™t dáº¥u váº¿t nhá», ngáº¯n, tháº­t." : "A small trace, short and honest.");

  return (
    <View style={styles.stack}>
      <BoardSection
        title="Capture Family"
        subtitle="Capture stays private, light, and limited to Mark, Memory, and Backlog. Camera is only an optional attachment."
      >
        <View style={styles.rowWrap}>
          <CaptureLeafButton
            accessibilityLabel={locale === "vi" ? "Má»Ÿ ghi nhanh" : "Open capture"}
            accessibilityLabelOpen={locale === "vi" ? "Ghi nhanh Ä‘ang má»Ÿ" : "Capture chooser open"}
            active={sheetOpen}
            onPress={() => setSheetOpen(true)}
          />
          <WMButton
            label={locale === "vi" ? "Má»Ÿ sheet Capture" : "Open Capture sheet"}
            onPress={() => setSheetOpen(true)}
            variant="primary"
          />
        </View>
      </BoardSection>

      <BoardSection title="CaptureNoteInput">
        <CaptureNoteInput
          accessibilityLabel={locale === "vi" ? "Ghi chÃº capture" : "Capture note"}
          onChangeText={setNote}
          placeholder={locale === "vi" ? "Ghi nhanh má»™t dÃ²ng..." : "Type a quick note..."}
          value={note}
        />
      </BoardSection>

      <BoardSection title="CaptureAttachmentButton">
        <View style={styles.rowWrap}>
          <CaptureAttachmentButton
            accessibilityLabel={locale === "vi" ? "ThÃªm áº£nh" : "Add photo"}
            label={locale === "vi" ? "ThÃªm áº£nh" : "Add photo"}
            onPress={() => undefined}
          />
          <CaptureAttachmentButton
            accessibilityLabel={locale === "vi" ? "ThÃªm áº£nh bá»‹ khÃ³a" : "Add photo disabled"}
            disabled
            label={locale === "vi" ? "ThÃªm áº£nh" : "Add photo"}
          />
        </View>
      </BoardSection>

      <BoardSection title="CaptureDestinationButton">
        <View style={styles.destinations}>
          <CaptureDestinationButton
            accessibilityLabel="Create Mark"
            iconSemanticName="entity.mark"
            label="Mark"
            onPress={() => undefined}
          />
          <CaptureDestinationButton
            accessibilityLabel="Create Memory"
            iconSemanticName="entity.memory"
            label="Memory"
            onPress={() => undefined}
          />
          <CaptureDestinationButton
            accessibilityLabel="Create Backlog"
            iconSemanticName="entity.backlog"
            label="Backlog"
            onPress={() => undefined}
          />
        </View>
      </BoardSection>

      <CaptureChooserSheet
        locale={locale}
        onAddPhotoPress={() => undefined}
        onClose={() => setSheetOpen(false)}
        onDestinationPress={() => setSheetOpen(false)}
        title={locale === "vi" ? "Ghi nhanh" : "Capture"}
        visible={sheetOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
  },
  destinations: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
