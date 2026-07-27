import { ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { MediaAssetKind } from "../../domain/waymark";
import { useCopy } from "../../i18n/useCopy";
import { spacing } from "../../theme/tokens";
import { ContainerLinkList } from "../detail/ContainerLinkList";
import { DetailSummaryCard } from "../detail/DetailSummaryCard";
import { JournalCard } from "../primitives/JournalCard";
import { CaptureAttachmentButton } from "../primitives/CaptureAttachmentButton";
import { EntityChip } from "../primitives/EntityChip";
import { MediaHero, MediaHeroOverlayChips } from "../primitives/MediaHero";
import { MediaCollagePreview } from "../media/MediaCollagePreview";
import { MediaViewerModal } from "../media/MediaViewerModal";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMButton } from "../primitives/WMButton";
import { WMText } from "../primitives/Text";
import { MarkProofBlock } from "./MarkProofBlock";
import { MarkMetadataCard } from "./MarkMetadataCard";
import {
  formatMarkDetailOverlayDate,
  isPlannedMarkSource,
  MarkDetailExpeditionItem,
  MarkDetailTemplateProps,
  resolveMarkHeroAssetId,
  resolveMarkMediaItems,
  resolveMarkPathShortLabel,
  resolveMarkPathSkin,
} from "./model";

export function MarkDetailTemplate({
  mark,
  locale = "en",
  onBack,
  onOpenExpedition,
  headerTitle,
  entityKind = "mark",
  onMarkAsMemory,
  onAddPhoto,
  signalContent,
  actionButtons = [],
}: MarkDetailTemplateProps) {
  const c = useCopy(locale);
  const { pathId, skin } = resolveMarkPathSkin(mark);
  const mediaItems = resolveMarkMediaItems(mark);
  const mediaAssetId = mediaItems.length === 0 ? resolveMarkHeroAssetId(pathId) : undefined;
  const statusChipNodes: ReactNode[] = [];
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const showStatusChips = entityKind === "mark";

  if (showStatusChips && mark.status === "done") {
    statusChipNodes.push(<EntityChip key="done" label={c.markDetail.status.done} stateTone="done" variant="status" />);
  }

  if (showStatusChips && isPlannedMarkSource(mark.sourceType)) {
    statusChipNodes.push(<EntityChip key="planned" label={c.markDetail.status.plannedMark} stateTone="planned" variant="status" />);
  }

  const overlayMeta = {
    dateLabel: formatMarkDetailOverlayDate(mark.date, locale),
    pathLabel: resolveMarkPathShortLabel(pathId, mark.path.name),
    pathTintColor: skin.color,
    pathTintTextColor: skin.deepColor,
    proofPhotoCountLabel: getMediaCountLabel(mediaItems),
    statusChipNodes,
  };

  const expeditionItems = (mark.expeditions ?? []).flatMap((item) => {
    const resolved = resolveExpeditionItem(item, onOpenExpedition);
    return resolved ? [resolved] : [];
  });
  const showMarkAsMemoryAction = entityKind === "mark" && Boolean(onMarkAsMemory);
  const showAddPhotoAction = Boolean(onAddPhoto);
  const summaryChips = showStatusChips
    ? ([
        mark.status === "done" ? { id: "done", label: c.markDetail.status.done, stateTone: "done" as const } : null,
        isPlannedMarkSource(mark.sourceType) ? { id: "planned", label: c.markDetail.status.plannedMark, stateTone: "planned" as const } : null,
      ].filter(Boolean) as Array<{ id: string; label: string; stateTone?: "done" | "planned" }>)
    : [];
  const handleMarkAsMemory = showMarkAsMemoryAction && onMarkAsMemory ? () => onMarkAsMemory(mark) : undefined;
  const handleAddPhoto = showAddPhotoAction && onAddPhoto ? () => onAddPhoto(mark) : undefined;

  return (
    <FieldJournalScreenShell contentContainerStyle={styles.content} variant="navAware">
      <View style={styles.headerBlock}>
        <PageHeader
          backLabel={c.markDetail.actions.back}
          onBack={onBack}
          showBack
          title={headerTitle ?? c.markDetail.title}
          variant="compact"
        />
        <View accessible={false} aria-hidden style={[styles.headerAccent, { backgroundColor: skin.color }]} />
      </View>

      {mediaItems.length > 0 ? (
        <View style={[styles.collageFrame, { borderColor: withAlpha(skin.color, 0.24), backgroundColor: skin.softColor }]}>
          <MediaCollagePreview
            items={mediaItems}
            locale={locale}
            onPressMedia={(index) => {
              setViewerIndex(index);
              setViewerOpen(true);
            }}
            titleForAccessibility={mark.title}
          />
          <MediaHeroOverlayChips overlayMeta={overlayMeta} />
        </View>
      ) : mediaAssetId ? (
        <MediaHero
          assetId={mediaAssetId}
          frameStyle={[styles.heroFrame, { borderColor: withAlpha(skin.color, 0.24), backgroundColor: skin.softColor }]}
          overlayMeta={overlayMeta}
          placeholderLabel={mark.path.name}
          variant="standard"
        />
      ) : null}

      {signalContent}

      <DetailSummaryCard chips={summaryChips} note={mark.note} title={mark.title} />

      {mark.proofDetail ? (
        <MarkProofBlock body={mark.proofDetail} iconSemanticName="entity.mark" pathSkin={skin} title={mark.title} />
      ) : null}

      {mark.checklist?.items.length ? (
        <JournalCard preserveSurfaceColorOnPress variant="readOnly">
          <View style={styles.checklistStack}>
            <WMText variant="sectionTitle">{mark.checklist.title ?? "Checklist"}</WMText>
            <View style={styles.checklistItems}>
              {mark.checklist.items.map((item) => (
                <View key={item.id} style={styles.checklistRow}>
                  <WMText style={styles.checklistIcon} variant="bodyStrong">
                    {item.checked ? "✓" : "○"}
                  </WMText>
                  <WMText style={styles.checklistLabel} variant="bodySm">
                    {item.label}
                  </WMText>
                </View>
              ))}
            </View>
          </View>
        </JournalCard>
      ) : null}

      <MarkMetadataCard items={mark.metadata} pathSkin={skin} />

      <ContainerLinkList
        accessibilityHint={c.markDetail.actions.openExpedition}
        entityLabel={c.markDetail.entityLabel.expedition}
        items={expeditionItems}
        pathSkin={skin}
        title={c.markDetail.section.expeditions}
      />

      {showMarkAsMemoryAction ? (
        <View style={styles.ctaRow}>
          <WMButton
            accessibilityLabel={c.markDetail.actions.markAsMemory}
            fullWidth
            label={c.markDetail.actions.markAsMemory}
            onPress={handleMarkAsMemory}
            variant="primary"
          />
        </View>
      ) : null}

      {actionButtons.map((action) => (
        <View key={action.id} style={styles.ctaRow}>
          <WMButton
            fullWidth
            label={action.label}
            onPress={action.onPress}
            variant={action.variant ?? "secondary"}
          />
        </View>
      ))}

      {showAddPhotoAction ? (
        <View style={styles.addPhotoRow}>
          <CaptureAttachmentButton
            accessibilityLabel={c.markDetail.actions.addPhoto}
            label={c.markDetail.actions.addPhoto}
            onPress={handleAddPhoto}
          />
        </View>
      ) : null}

      <View accessible={false} aria-hidden style={styles.bottomSafeSpacer} />
      <MediaViewerModal
        initialIndex={viewerIndex}
        items={mediaItems}
        locale={locale}
        onClose={() => setViewerOpen(false)}
        open={viewerOpen}
      />
    </FieldJournalScreenShell>
  );
}

function resolveExpeditionItem(item: MarkDetailExpeditionItem, onOpenExpedition?: (expedition: MarkDetailExpeditionItem) => void) {
  if (item.gate === "hidden") {
    return null;
  }

  const resolvedOnPress = item.onPress ?? (onOpenExpedition ? () => onOpenExpedition(item) : undefined);

  return {
    ...item,
    onPress: resolvedOnPress,
    disabled: item.disabled ?? (!resolvedOnPress && !item.href),
  };
}

function withAlpha(color: string, alpha: number) {
  const normalized = color.replace("#", "");

  if (normalized.length !== 6) {
    return color;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getMediaCountLabel(mediaItems: ReturnType<typeof resolveMarkMediaItems>) {
  const photoCount = mediaItems.filter((item) => item.kind !== MediaAssetKind.Video).length;
  const videoCount = mediaItems.filter((item) => item.kind === MediaAssetKind.Video).length;
  const segments = [
    photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : null,
    videoCount > 0 ? `${videoCount} video${videoCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  if (segments.length === 0) {
    return undefined;
  }

  return segments.join(" + ");
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  headerBlock: {
    gap: spacing.sm,
  },
  headerAccent: {
    height: 3,
    borderRadius: 999,
    opacity: 0.2,
  },
  heroFrame: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  collageFrame: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  addPhotoRow: {
    alignItems: "flex-start",
  },
  ctaRow: {
    paddingTop: spacing.xs,
  },
  checklistStack: {
    gap: spacing.sm,
  },
  checklistItems: {
    gap: spacing.xs,
  },
  checklistRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  checklistIcon: {
    width: 16,
  },
  checklistLabel: {
    flex: 1,
  },
  bottomSafeSpacer: {
    height: spacing.md,
  },
});
