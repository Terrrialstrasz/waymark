import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { getWaymarkSkinAssetsByFamily, WaymarkSkinAssetFamily } from "../design/skin-assets";
import { UtilityIconButton } from "../components/domain/icons/UtilityIconButton";
import { BottomNavIcon } from "../components/domain/icons/BottomNavIcon";
import { EntityIcon } from "../components/domain/icons/EntityIcon";
import { StatusIcon } from "../components/domain/icons/StatusIcon";
import { PathMedallion } from "../components/domain/icons/PathMedallion";
import { JudgmentSeal } from "../components/domain/icons/JudgmentSeal";
import { HealthSessionIcon } from "../components/domain/icons/HealthSessionIcon";
import { BotanicalMotif } from "../components/domain/icons/BotanicalMotif";
import { IconBadge } from "../components/primitives/IconBadge";
import { BotanicalDecorationLayer } from "../components/primitives/BotanicalDecorationLayer";
import { WaymarkSkinAsset } from "../components/primitives/WaymarkSkinAsset";
import { BottomNavBar } from "../components/primitives/BottomNavBar";
import { WMCard } from "../components/primitives/WMCard";
import { WMEmptyState } from "../components/primitives/WMEmptyState";
import { PageHeader } from "../components/primitives/PageHeader";
import { WMSectionHeader } from "../components/primitives/WMSectionHeader";
import { WMText } from "../components/primitives/Text";
import { WMChip } from "../components/primitives/WMChip";
import { waymarkIconMap } from "../design/waymark-icon-map";
import {
  waymarkEntitySemanticNames,
  waymarkHealthSemanticNames,
  waymarkStatusSemanticNames,
} from "../design/semantic-icon-types";
import { foundationColors, spacing } from "../theme/tokens";
import { Locale } from "../types/ui";

type Props = {
  locale: Locale;
};

type LabArtTab =
  | "utility"
  | "navigation"
  | "entity"
  | "status"
  | "pathIdentity"
  | "judgmentSeal"
  | "healthSession"
  | "botanicalMotif";

const labTabs: Array<{ id: LabArtTab; label: string }> = [
  { id: "utility", label: "Utility" },
  { id: "navigation", label: "Navigation" },
  { id: "entity", label: "Entity" },
  { id: "status", label: "Status" },
  { id: "pathIdentity", label: "Path Identity" },
  { id: "judgmentSeal", label: "Judgment" },
  { id: "healthSession", label: "Health" },
  { id: "botanicalMotif", label: "Botanical" },
];

export function WaymarkSkinAssetBoard({ locale }: Props) {
  const [activeTab, setActiveTab] = useState<LabArtTab>("utility");
  const assets = useMemo(() => getWaymarkSkinAssetsByFamily(activeTab as WaymarkSkinAssetFamily), [activeTab]);

  return (
    <View style={styles.stack}>
      <BoardSection
        subtitle="Split component art by manifest family so each review screen mounts only one icon set at a time."
        title="Waymark Icon Skin Review"
      >
        <View style={styles.tabRow}>
          {labTabs.map((tab) => (
            <WMChip key={tab.id} label={tab.label} onPress={() => setActiveTab(tab.id)} selected={activeTab === tab.id} />
          ))}
        </View>
      </BoardSection>

      <BoardSection
        subtitle={`${assets.length} assets in ${activeTab}. Registry remains the only runtime entrypoint.`}
        title={`${formatFamilyLabel(activeTab)} Asset Grid`}
      >
        <View style={styles.grid}>
          {assets.map((asset) => (
            <View key={asset.id} style={styles.assetTile}>
              <WaymarkSkinAsset assetId={asset.id} decorative size={asset.family === "botanicalMotif" ? "lg" : "md"} />
              <WMText numberOfLines={2} style={styles.caption} variant="meta">
                {asset.name}
              </WMText>
            </View>
          ))}
        </View>
      </BoardSection>

      {activeTab === "utility" ? (
        <BoardSection title="Utility Component Art">
          <View style={styles.row}>
            <UtilityIconButton accessibilityLabel="Back" icon="back" />
            <UtilityIconButton accessibilityLabel="Close" icon="close" />
            <UtilityIconButton accessibilityLabel="Search" icon="search" />
            <UtilityIconButton accessibilityLabel="Bell" disabled icon="bell" />
          </View>
        </BoardSection>
      ) : null}

      {activeTab === "navigation" ? (
        <BoardSection title="Navigation Component Art">
          <View style={styles.row}>
            <BottomNavIcon state="default" tab="today" />
            <BottomNavIcon state="active" tab="journal" />
            <BottomNavIcon state="active" tab="capture" />
            <BottomNavIcon state="pressed" tab="paths" />
            <BottomNavIcon state="muted" tab="me" />
          </View>
          <BottomNavBar activeTab="capture" locale={locale} />
        </BoardSection>
      ) : null}

      {activeTab === "entity" ? (
        <BoardSection title="Entity Component Art">
          <View style={styles.rowWrap}>
            {waymarkEntitySemanticNames.map((entity) => (
              <View key={entity} style={styles.centered}>
                <EntityIcon entity={entity} />
                <WMText variant="meta">{entity}</WMText>
              </View>
            ))}
          </View>
          <View style={styles.rowWrap}>
            <IconBadge semanticName="entity.mark" shape="circle" size="sm" />
            <IconBadge semanticName="entity.memory" shape="rounded" size="md" state="selected" tone="warm" />
            <IconBadge semanticName="entity.backlog" shape="softSquare" size="lg" tone="default" />
          </View>
        </BoardSection>
      ) : null}

      {activeTab === "status" ? (
        <BoardSection title="Status Component Art">
          <View style={styles.rowWrap}>
            {waymarkStatusSemanticNames
              .filter((status): status is "planned" | "done" | "active" | "weak" | "missed" | "protected" | "upcoming" | "inProgress" =>
                ["planned", "done", "active", "weak", "missed", "protected", "upcoming", "inProgress"].includes(status)
              )
              .map((status) => (
              <View key={status} style={styles.centered}>
                <StatusIcon status={status} />
                <WMText variant="meta">{status}</WMText>
              </View>
            ))}
          </View>
          <View style={styles.rowWrap}>
            <IconBadge semanticName="status.done" shape="softSquare" size="lg" state="completed" tone="green" />
            <IconBadge semanticName="status.missed" shape="seal" size="xl" state="warning" tone="warning" />
          </View>
        </BoardSection>
      ) : null}

      {activeTab === "pathIdentity" ? (
        <BoardSection title="Path Identity Component Art">
          <View style={styles.rowWrap}>
            {Object.keys(waymarkIconMap.pathIdentity).map((domain) => (
              <View key={domain} style={styles.centered}>
                <PathMedallion domain={domain as keyof typeof waymarkIconMap.pathIdentity} />
                <WMText variant="meta">{domain}</WMText>
              </View>
            ))}
          </View>
        </BoardSection>
      ) : null}

      {activeTab === "judgmentSeal" ? (
        <BoardSection title="Judgment Component Art">
          <View style={styles.rowWrap}>
            {Object.keys(waymarkIconMap.judgment).map((seal) => (
              <View key={seal} style={styles.centered}>
                <JudgmentSeal seal={seal as keyof typeof waymarkIconMap.judgment} />
                <WMText variant="meta">{seal}</WMText>
              </View>
            ))}
          </View>
        </BoardSection>
      ) : null}

      {activeTab === "healthSession" ? (
        <BoardSection title="Health Session Component Art">
          <View style={styles.rowWrap}>
            {waymarkHealthSemanticNames
              .filter((session): session is "strength" | "walk" | "stretch" | "sessionTimer" | "setDone" | "restTimer" | "cooldown" =>
                ["strength", "walk", "stretch", "sessionTimer", "setDone", "restTimer", "cooldown"].includes(session)
              )
              .map((session) => (
              <View key={session} style={styles.centered}>
                <HealthSessionIcon session={session} />
                <WMText variant="meta">{session}</WMText>
              </View>
            ))}
          </View>
        </BoardSection>
      ) : null}

      {activeTab === "botanicalMotif" ? (
        <>
          <BoardSection title="BotanicalMotifAssetGrid">
            <View style={styles.grid}>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.headerLeafMark" size="lg" />
                <WMText style={styles.caption} variant="meta">headerLeafMark</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.pressedLeaf" size="lg" />
                <WMText style={styles.caption} variant="meta">pressedLeaf</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.sprig" size="lg" />
                <WMText style={styles.caption} variant="meta">sprig</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.sectionSprig" size="lg" />
                <WMText style={styles.caption} variant="meta">sectionSprig</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.cornerBranch" size="lg" />
                <WMText style={styles.caption} variant="meta">cornerBranch</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.wreathLeft" size="lg" />
                <WMText style={styles.caption} variant="meta">wreathLeft</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.wreathRight" size="lg" />
                <WMText style={styles.caption} variant="meta">wreathRight</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.wreathSeal" size="lg" />
                <WMText style={styles.caption} variant="meta">wreathSeal</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.leafVein" size="lg" />
                <WMText style={styles.caption} variant="meta">leafVein</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.seedDot" size="md" />
                <WMText style={styles.caption} variant="meta">seedDot</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.trailCurve" size="lg" />
                <WMText style={styles.caption} variant="meta">trailCurve</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.branchTick" size="lg" />
                <WMText style={styles.caption} variant="meta">branchTick</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.stampRing" size="lg" />
                <WMText style={styles.caption} variant="meta">stampRing</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.ribbonBookmark" size="lg" />
                <WMText style={styles.caption} variant="meta">ribbonBookmark</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.photoOverlay" size="lg" />
                <WMText style={styles.caption} variant="meta">photoOverlay</WMText>
              </View>
              <View style={styles.assetTile}>
                <BotanicalMotif motif="botanical.headerSystemSprig" size="lg" />
                <WMText style={styles.caption} variant="meta">headerSystemSprig</WMText>
              </View>
            </View>
          </BoardSection>

          <BoardSection title="BotanicalOpacityBoard">
            <View style={styles.rowWrap}>
              {(["ghost", "whisper", "subtle", "soft", "visible"] as const).map((opacity) => (
                <View key={opacity} style={styles.centered}>
                  <View style={styles.opacityStage}>
                    <BotanicalDecorationLayer motifs={["botanical.pressedLeaf"]} preset="journalCard">
                      <BotanicalMotif motif="botanical.pressedLeaf" opacity={opacity} size="lg" />
                    </BotanicalDecorationLayer>
                  </View>
                  <WMText variant="meta">{opacity}</WMText>
                </View>
              ))}
            </View>
          </BoardSection>

          <BoardSection title="BotanicalPlacementBoard">
            <View style={styles.placementGrid}>
              <View style={styles.placementTile}>
                <PageHeader eyebrow="Waymark" subtitle="Top right page-header motif" title="Header motif" />
              </View>
              <View style={styles.placementTile}>
                <WMCard decorationPreset="journalCard">
                  <WMText variant="cardTitle">Card corner motif</WMText>
                  <WMText variant="bodySm">Pressed leaf / corner branch stays inside clipped card.</WMText>
                </WMCard>
              </View>
              <View style={styles.placementTile}>
                <WMSectionHeader title="Section end motif" />
              </View>
              <View style={styles.mediaTile}>
                <BotanicalDecorationLayer preset="mediaHero">
                  <View style={styles.mediaHeroMock}>
                    <WMText style={styles.mediaLabel} variant="bodyStrong">Media corner overlay</WMText>
                  </View>
                </BotanicalDecorationLayer>
              </View>
              <View style={styles.placementTile}>
                <BotanicalDecorationLayer preset="resultSeal">
                  <View style={styles.resultSealStage}>
                    <WMText variant="cardTitle">Seal around</WMText>
                  </View>
                </BotanicalDecorationLayer>
              </View>
            </View>
          </BoardSection>

          <BoardSection title="BotanicalDensityBoard">
            <View style={styles.rowWrap}>
              <DensityExample density="none" label="none" />
              <DensityExample density="trace" label="trace" />
              <DensityExample density="low" label="low" />
              <DensityExample density="medium" label="medium" />
              <DensityExample density="seal" label="seal" />
            </View>
          </BoardSection>

          <BoardSection title="PageHeaderDecorationBoard">
            <PageHeader eyebrow="Waymark" subtitle="Header motifs should stay quiet and out of the title's way." title="Field Journal Header" />
          </BoardSection>

          <BoardSection title="JournalCardDecorationBoard">
            <View style={styles.rowWrap}>
              <WMCard decorationPreset="journalCard">
                <WMText variant="cardTitle">Pressed leaf</WMText>
                <WMText variant="bodySm">Low density, clipped, decorative only.</WMText>
              </WMCard>
              <WMCard decorationPreset="journalCard" tint="muted">
                <WMText variant="cardTitle">Ribbon / corner</WMText>
                <WMText variant="bodySm">Quiet journal texture, not scrapbook stickers.</WMText>
              </WMCard>
            </View>
          </BoardSection>

          <BoardSection title="MediaHeroDecorationBoard">
            <BotanicalDecorationLayer preset="mediaHero">
              <View style={styles.mediaHeroMock}>
                <WMText style={styles.mediaLabel} variant="cardTitle">Photo hero overlay</WMText>
              </View>
            </BotanicalDecorationLayer>
          </BoardSection>

          <BoardSection title="ResultSealDecorationBoard">
            <BotanicalDecorationLayer preset="resultSeal">
              <View style={styles.resultSealBoard}>
                <WMText variant="screenTitle">Marked</WMText>
                <WMText variant="bodySm">Wreath / stamp composition stays reflective, not gamified.</WMText>
              </View>
            </BotanicalDecorationLayer>
          </BoardSection>

          <BoardSection title="AntiPatternBoard">
            <View style={styles.rowWrap}>
              <View style={styles.antiPatternTile}>
                <BotanicalMotif motif="botanical.pressedLeaf" opacity="hero" size="hero" />
                <WMText variant="meta">Too opaque / too large</WMText>
              </View>
              <View style={styles.antiPatternTile}>
                <BotanicalDecorationLayer motifs={["botanical.sprig", "botanical.seedDot"]} preset="emptyState">
                  <View style={styles.antiPatternTextBlock}>
                    <WMText variant="bodyStrong">Text obstruction</WMText>
                    <WMText variant="bodySm">Do not let motifs compete with reading zones.</WMText>
                  </View>
                </BotanicalDecorationLayer>
              </View>
            </View>
            <WMText style={styles.decorativeNote} variant="meta">
              Anti-patterns are for review only: no interactive motifs, no wallpaper density, no text obstruction.
            </WMText>
          </BoardSection>

          <BoardSection title="EmptyState / Shell Examples">
            <WMEmptyState
              body="Decoration can be more visible in empty states, but still has to feel calm and private."
              title="No entries yet"
            />
          </BoardSection>
        </>
      ) : null}
    </View>
  );
}

function formatFamilyLabel(family: LabArtTab) {
  return labTabs.find((tab) => tab.id === family)?.label ?? family;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  assetTile: {
    width: 92,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  caption: {
    textAlign: "center",
    color: foundationColors.ink.secondary,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  centered: {
    alignItems: "center",
    gap: spacing.xs,
  },
  motifExample: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
  },
  placementGrid: {
    gap: spacing.md,
  },
  placementTile: {
    gap: spacing.sm,
  },
  opacityStage: {
    width: 120,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: foundationColors.bg.paper,
    borderRadius: 16,
    overflow: "hidden",
  },
  mediaTile: {
    overflow: "hidden",
    borderRadius: 18,
  },
  mediaHeroMock: {
    minHeight: 180,
    borderRadius: 18,
    backgroundColor: "#D7E0D0",
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  mediaLabel: {
    color: foundationColors.ink.primary,
  },
  resultSealStage: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  resultSealBoard: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  antiPatternTile: {
    width: 220,
    minHeight: 140,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: 18,
    overflow: "hidden",
    padding: spacing.md,
  },
  antiPatternTextBlock: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  decorativeNote: {
    color: foundationColors.ink.secondary,
  },
});

function DensityExample({ density, label }: { density: "none" | "trace" | "low" | "medium" | "seal"; label: string }) {
  return (
    <View style={styles.centered}>
      <BotanicalDecorationLayer density={density} preset={density === "seal" ? "resultSeal" : "emptyState"}>
        <View style={{ width: 120, height: 88, borderRadius: 16, backgroundColor: foundationColors.bg.paper }} />
      </BotanicalDecorationLayer>
      <WMText variant="meta">{label}</WMText>
    </View>
  );
}
