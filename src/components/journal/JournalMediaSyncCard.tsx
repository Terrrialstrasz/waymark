import { StyleSheet, View } from "react-native";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import type { Locale } from "../../types/ui";
import { WMButton } from "../primitives/WMButton";
import { WMText } from "../primitives/Text";

type Props = {
  locale: Locale;
  connected: boolean;
  disabled?: boolean;
  authenticating?: boolean;
  uploading?: boolean;
  message?: string | null;
  onConnect?: () => void;
  onUpload?: () => void;
};

export function JournalMediaSyncCard({
  locale,
  connected,
  disabled = false,
  authenticating = false,
  uploading = false,
  message,
  onConnect,
  onUpload,
}: Props) {
  const copy = getCopy(locale);
  return (
    <View style={styles.card}>
      <View style={styles.copyStack}>
        <WMText style={styles.title} variant="sectionTitle">
          {copy.title}
        </WMText>
        <WMText style={styles.message} variant="meta">
          {message ?? (connected ? copy.connected : copy.disconnected)}
        </WMText>
      </View>
      {connected ? (
        <WMButton
          disabled={disabled || authenticating}
          label={copy.upload}
          loading={uploading}
          onPress={onUpload}
          variant="secondary"
        />
      ) : (
        <WMButton
          disabled={disabled || uploading}
          label={copy.connect}
          loading={authenticating}
          onPress={onConnect}
          variant="secondary"
        />
      )}
    </View>
  );
}

function getCopy(locale: Locale) {
  return {
    title: locale === "vi" ? "Google Drive · Media backup" : "Google Drive · Media backup",
    connected: locale === "vi" ? "Drive đã sẵn sàng sao lưu media." : "Drive is ready to back up media.",
    disconnected: locale === "vi" ? "Kết nối Drive để sao lưu ảnh và video." : "Connect Drive to back up photos and videos.",
    connect: locale === "vi" ? "Kết nối" : "Connect",
    upload: locale === "vi" ? "Upload media" : "Upload media",
  };
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  copyStack: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  message: {
    color: foundationColors.ink.secondary,
  },
});
