import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { foundationColors, semanticBorder, semanticElevation, semanticRadius, semanticSpacing, semanticTokens, spacing } from "../../theme/tokens";
import { BottomTabId, FeatureState, Locale, PathId } from "../../types/ui";
import { useCopy } from "../../i18n/useCopy";
import { isFeatureInteractive } from "../../utils/featureGate";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { CaptureLeafButton } from "./CaptureLeafButton";
import { CaptureChooserSheet } from "./CaptureChooserSheet";
import { WMText } from "./Text";
import { BottomNavIcon } from "../domain/icons/BottomNavIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CaptureMediaAttachment } from "../../types/capture";
import { MediaAssetKind } from "../../domain/waymark";

type Props = {
  activeTab: BottomTabId;
  locale: Locale;
  captureGate?: FeatureState;
  activeTintColor?: string;
  onTabPress?: (tab: Exclude<BottomTabId, "capture">) => void;
  onCaptureDestinationPress?: (
    destination: "mark" | "memory" | "backlog",
    noteTitle: string,
    noteDetail: string,
    pathId: PathId,
    mediaAttachments: CaptureMediaAttachment[],
  ) => void;
};

export function BottomNavBar({
  activeTab,
  locale,
  captureGate = "enabled",
  activeTintColor,
  onTabPress,
  onCaptureDestinationPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const [captureChooserOpen, setCaptureChooserOpen] = useState(false);
  const [mediaAttachments, setMediaAttachments] = useState<CaptureMediaAttachment[]>([]);
  const c = useCopy(locale);
  const captureDisabled = !isFeatureInteractive(captureGate);
  const tabs: { id: Exclude<BottomTabId, "capture">; label: string }[] = [
    { id: "today", label: c.bottomNav.today },
    { id: "journal", label: c.bottomNav.journal },
    { id: "paths", label: c.bottomNav.paths },
    { id: "me", label: c.bottomNav.me },
  ];
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);
  const handleAddMediaPress = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      mediaTypes: ["images", "videos"],
      orderedSelection: true,
      quality: 1,
      selectionLimit: 20,
    });

    if (result.canceled) {
      return;
    }

    if (result.assets.length > 20) {
      return;
    }

    setMediaAttachments(
      result.assets
        .filter((asset): asset is typeof asset & { uri: string } => Boolean(asset?.uri))
        .map((asset) => ({
          durationMs: typeof asset.duration === "number" ? asset.duration : null,
          fileName: asset.fileName ?? null,
          fileSize: typeof asset.fileSize === "number" ? asset.fileSize : null,
          height: typeof asset.height === "number" ? asset.height : null,
          kind: asset.mimeType?.startsWith("video/") || asset.type === "video" ? MediaAssetKind.Video : MediaAssetKind.Image,
          libraryAssetId: asset.assetId ?? null,
          mimeType: asset.mimeType ?? null,
          originalPickerUri: asset.uri,
          thumbnailUri: null,
          uri: asset.uri,
          width: typeof asset.width === "number" ? asset.width : null,
        })),
    );
  };

  return (
    <>
      <View style={styles.wrapper}>
      <View style={[styles.shell, { paddingBottom: spacing.sm + insets.bottom }]}>
        <View style={styles.captureLayer} pointerEvents="box-none">
          <CaptureLeafButton
            accessibilityHint={captureDisabled ? c.captureLeafButton.disabled : c.captureLeafButton.hint}
            accessibilityLabel={c.captureLeafButton.label}
            accessibilityLabelOpen={c.captureLeafButton.labelOpen}
            active={captureChooserOpen}
            disabled={captureDisabled}
            haloSize={68}
            iconSize={52}
            onPress={() => {
              if (!captureDisabled) {
                setCaptureChooserOpen(true);
              }
            }}
            visualSize={64}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.tabCluster}>
            {leftTabs.map((tab) => (
              <Pressable key={tab.id} onPress={() => onTabPress?.(tab.id)} style={styles.navItem}>
                <BottomNavIcon state={tab.id === activeTab ? "active" : "default"} tab={tab.id} />
                <WMText
                  numberOfLines={1}
                  style={[styles.navLabel, tab.id === activeTab ? [styles.navLabelActive, activeTintColor ? { color: activeTintColor } : null] : null]}
                  variant="nav"
                >
                  {tab.label}
                </WMText>
              </Pressable>
            ))}
          </View>

          <View style={styles.captureGap} />

          <View style={styles.tabCluster}>
            {rightTabs.map((tab) => (
              <Pressable key={tab.id} onPress={() => onTabPress?.(tab.id)} style={styles.navItem}>
              <BottomNavIcon state={tab.id === activeTab ? "active" : "default"} tab={tab.id} />
              <WMText
                numberOfLines={1}
                style={[styles.navLabel, tab.id === activeTab ? [styles.navLabelActive, activeTintColor ? { color: activeTintColor } : null] : null]}
                variant="nav"
              >
                {tab.label}
              </WMText>
            </Pressable>
            ))}
          </View>
        </View>
      </View>
      </View>
      <CaptureChooserSheet
        mediaAttachments={mediaAttachments}
        onAddMediaPress={handleAddMediaPress}
        onDestinationPress={(destination, noteTitle, noteDetail, pathId, nextMediaAttachments) => {
          onCaptureDestinationPress?.(destination, noteTitle, noteDetail, pathId, nextMediaAttachments);
          setMediaAttachments([]);
        }}
        locale={locale}
        onClose={() => {
          setCaptureChooserOpen(false);
          setMediaAttachments([]);
        }}
        title={c.bottomNav.capture}
        visible={captureChooserOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  shell: {
    position: "relative",
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.nav.default),
    borderTopLeftRadius: semanticRadius.nav,
    borderTopRightRadius: semanticRadius.nav,
    paddingHorizontal: semanticSpacing.nav.paddingX,
    paddingTop: spacing.sm,
    minHeight: 74,
    boxShadow: semanticElevation.nav,
  },
  captureLayer: {
    position: "absolute",
    top: -16,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  tabCluster: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    minWidth: 0,
    minHeight: 56,
  },
  captureGap: {
    width: semanticTokens.size.captureLeaf.tapTarget,
    minWidth: semanticTokens.size.captureLeaf.tapTarget,
  },
  navLabel: {
    color: foundationColors.ink.tertiary,
    textAlign: "center",
    width: "100%",
    flexShrink: 1,
  },
  navLabelActive: {
    color: foundationColors.green.base,
  },
});
