import { useState } from "react";
import { Locale } from "../types/ui";
import { WMChip } from "../components/primitives/WMChip";
import { spacing } from "../theme/tokens";
import { StyleSheet, View } from "react-native";

type Props = {
  locale: Locale;
};

export function ComponentLab({ locale }: Props) {
  const [activeBoard, setActiveBoard] = useState<
    | "skins"
    | "brand"
    | "todayHero"
    | "todayCarousels"
    | "todayExpedition"
    | "todayCockpit"
    | "motion"
    | "stateColor"
    | "shell"
    | "journalCard"
    | "journalComponents"
    | "journalBatchC"
    | "pageHeader"
    | "batched"
    | "capture"
    | "packCheck"
    | "healthStrength"
    | "signalMode"
    | "plannedMarkSheet"
    | "expeditionDetail"
    | "backlog"
    | "weeklyCoding"
    | "me"
    | "markDetail"
    | "memoryDetail"
    | "paths"
    | "closeTrail"
  >("skins");

  return (
    <View style={styles.stack}>
      <View style={styles.tabRow}>
        <WMChip label="Skins" onPress={() => setActiveBoard("skins")} selected={activeBoard === "skins"} />
        <WMChip label="Brand" onPress={() => setActiveBoard("brand")} selected={activeBoard === "brand"} />
        <WMChip label="Today Hero" onPress={() => setActiveBoard("todayHero")} selected={activeBoard === "todayHero"} />
        <WMChip label="Today Carousels" onPress={() => setActiveBoard("todayCarousels")} selected={activeBoard === "todayCarousels"} />
        <WMChip label="Expedition" onPress={() => setActiveBoard("todayExpedition")} selected={activeBoard === "todayExpedition"} />
        <WMChip label="Today Cockpit" onPress={() => setActiveBoard("todayCockpit")} selected={activeBoard === "todayCockpit"} />
        <WMChip label="Motion" onPress={() => setActiveBoard("motion")} selected={activeBoard === "motion"} />
        <WMChip label="State Color" onPress={() => setActiveBoard("stateColor")} selected={activeBoard === "stateColor"} />
        <WMChip label="Shell" onPress={() => setActiveBoard("shell")} selected={activeBoard === "shell"} />
        <WMChip label="Journal Card" onPress={() => setActiveBoard("journalCard")} selected={activeBoard === "journalCard"} />
        <WMChip label="Journal" onPress={() => setActiveBoard("journalComponents")} selected={activeBoard === "journalComponents"} />
        <WMChip label="Journal Batch C" onPress={() => setActiveBoard("journalBatchC")} selected={activeBoard === "journalBatchC"} />
        <WMChip label="Page Header" onPress={() => setActiveBoard("pageHeader")} selected={activeBoard === "pageHeader"} />
        <WMChip label="Capture" onPress={() => setActiveBoard("capture")} selected={activeBoard === "capture"} />
        <WMChip label="Pack Check" onPress={() => setActiveBoard("packCheck")} selected={activeBoard === "packCheck"} />
        <WMChip label="Health Strength" onPress={() => setActiveBoard("healthStrength")} selected={activeBoard === "healthStrength"} />
        <WMChip label="Signal Mode" onPress={() => setActiveBoard("signalMode")} selected={activeBoard === "signalMode"} />
        <WMChip label="Planned Mark Sheet" onPress={() => setActiveBoard("plannedMarkSheet")} selected={activeBoard === "plannedMarkSheet"} />
        <WMChip label="Expedition Detail" onPress={() => setActiveBoard("expeditionDetail")} selected={activeBoard === "expeditionDetail"} />
        <WMChip label="Backlog" onPress={() => setActiveBoard("backlog")} selected={activeBoard === "backlog"} />
        <WMChip label="Weekly Coding" onPress={() => setActiveBoard("weeklyCoding")} selected={activeBoard === "weeklyCoding"} />
        <WMChip label="Me" onPress={() => setActiveBoard("me")} selected={activeBoard === "me"} />
        <WMChip label="Paths" onPress={() => setActiveBoard("paths")} selected={activeBoard === "paths"} />
        <WMChip label="Close the Day" onPress={() => setActiveBoard("closeTrail")} selected={activeBoard === "closeTrail"} />
        <WMChip label="Mark Detail" onPress={() => setActiveBoard("markDetail")} selected={activeBoard === "markDetail"} />
        <WMChip label="Memory Detail" onPress={() => setActiveBoard("memoryDetail")} selected={activeBoard === "memoryDetail"} />
        <WMChip label="Batch Components" onPress={() => setActiveBoard("batched")} selected={activeBoard === "batched"} />
      </View>
      {renderActiveBoard(activeBoard, locale)}
    </View>
  );
}

function renderActiveBoard(
  activeBoard:
    | "skins"
    | "brand"
    | "todayHero"
    | "todayCarousels"
    | "todayExpedition"
    | "todayCockpit"
    | "motion"
    | "stateColor"
    | "shell"
    | "journalCard"
    | "journalComponents"
    | "journalBatchC"
    | "pageHeader"
    | "batched"
    | "capture"
    | "packCheck"
    | "healthStrength"
    | "signalMode"
    | "plannedMarkSheet"
    | "expeditionDetail"
    | "backlog"
    | "weeklyCoding"
    | "me"
    | "markDetail"
    | "memoryDetail"
    | "paths"
    | "closeTrail",
  locale: Locale
) {
  switch (activeBoard) {
    case "skins": {
      const { WaymarkSkinAssetBoard } = require("./WaymarkSkinAssetBoard") as typeof import("./WaymarkSkinAssetBoard");
      return <WaymarkSkinAssetBoard locale={locale} />;
    }
    case "brand": {
      const { WaymarkLogoBoard } = require("./WaymarkLogoBoard") as typeof import("./WaymarkLogoBoard");
      return <WaymarkLogoBoard locale={locale} />;
    }
    case "todayHero": {
      const { TodayPathHeroBoard } = require("./TodayPathHeroBoard") as typeof import("./TodayPathHeroBoard");
      return <TodayPathHeroBoard locale={locale} />;
    }
    case "todayCarousels": {
      const { TodayCarouselsBoard } = require("./TodayCarouselsBoard") as typeof import("./TodayCarouselsBoard");
      return <TodayCarouselsBoard locale={locale} />;
    }
    case "todayExpedition": {
      const { TodayExpeditionBoard } = require("./TodayExpeditionBoard") as typeof import("./TodayExpeditionBoard");
      return <TodayExpeditionBoard locale={locale} />;
    }
    case "todayCockpit": {
      const { TodayCockpitBoard } = require("./TodayCockpitBoard") as typeof import("./TodayCockpitBoard");
      return <TodayCockpitBoard locale={locale} />;
    }
    case "motion": {
      const { WaymarkMotionBoard } = require("./WaymarkMotionBoard") as typeof import("./WaymarkMotionBoard");
      return <WaymarkMotionBoard />;
    }
    case "stateColor": {
      const { SemanticStateColorBoard } = require("./SemanticStateColorBoard") as typeof import("./SemanticStateColorBoard");
      return <SemanticStateColorBoard />;
    }
    case "shell": {
      const { FieldJournalScreenShellBoard } = require("./FieldJournalScreenShellBoard") as typeof import("./FieldJournalScreenShellBoard");
      return <FieldJournalScreenShellBoard />;
    }
    case "journalCard": {
      const { JournalCardBoard } = require("./JournalCardBoard") as typeof import("./JournalCardBoard");
      return <JournalCardBoard />;
    }
    case "journalComponents": {
      const { JournalComponentsBoard } = require("./JournalComponentsBoard") as typeof import("./JournalComponentsBoard");
      return <JournalComponentsBoard locale={locale} />;
    }
    case "journalBatchC": {
      const { JournalBatchCBoard } = require("./JournalBatchCBoard") as typeof import("./JournalBatchCBoard");
      return <JournalBatchCBoard locale={locale} />;
    }
    case "pageHeader": {
      const { PageHeaderBoard } = require("./PageHeaderBoard") as typeof import("./PageHeaderBoard");
      return <PageHeaderBoard />;
    }
    case "capture": {
      const { CaptureComponentBoard } = require("./CaptureComponentBoard") as typeof import("./CaptureComponentBoard");
      return <CaptureComponentBoard locale={locale} />;
    }
    case "packCheck": {
      const { PackCheckBoard } = require("./PackCheckBoard") as typeof import("./PackCheckBoard");
      return <PackCheckBoard locale={locale} />;
    }
    case "healthStrength": {
      const { HealthStrengthBoard } = require("./HealthStrengthBoard") as typeof import("./HealthStrengthBoard");
      return <HealthStrengthBoard locale={locale} />;
    }
    case "signalMode": {
      const { SignalModeBoard } = require("./SignalModeBoard") as typeof import("./SignalModeBoard");
      return <SignalModeBoard locale={locale} />;
    }
    case "plannedMarkSheet": {
      const { PlannedMarkActionSheetBoard } = require("./PlannedMarkActionSheetBoard") as typeof import("./PlannedMarkActionSheetBoard");
      return <PlannedMarkActionSheetBoard locale={locale} />;
    }
    case "expeditionDetail": {
      const { ExpeditionDetailBoard } = require("./ExpeditionDetailBoard") as typeof import("./ExpeditionDetailBoard");
      return <ExpeditionDetailBoard locale={locale} />;
    }
    case "backlog": {
      const { BacklogBoard } = require("./BacklogBoard") as typeof import("./BacklogBoard");
      return <BacklogBoard locale={locale} />;
    }
    case "weeklyCoding": {
      const { WeeklyCodingBoard } = require("./WeeklyCodingBoard") as typeof import("./WeeklyCodingBoard");
      return <WeeklyCodingBoard locale={locale} />;
    }
    case "me": {
      const { MeComponentsBoard } = require("./MeComponentsBoard") as typeof import("./MeComponentsBoard");
      return <MeComponentsBoard locale={locale} />;
    }
    case "paths": {
      const { PathsBoard } = require("./PathsBoard") as typeof import("./PathsBoard");
      return <PathsBoard locale={locale} />;
    }
    case "closeTrail": {
      const { CloseTrailBoard } = require("./CloseTrailBoard") as typeof import("./CloseTrailBoard");
      return <CloseTrailBoard locale={locale} />;
    }
    case "markDetail": {
      const { MarkDetailBoard } = require("./MarkDetailBoard") as typeof import("./MarkDetailBoard");
      return <MarkDetailBoard locale={locale} />;
    }
    case "memoryDetail": {
      const { MemoryDetailBoard } = require("./MemoryDetailBoard") as typeof import("./MemoryDetailBoard");
      return <MemoryDetailBoard locale={locale} />;
    }
    case "batched": {
      const { BatchedComponentsBoard } = require("./BatchedComponentsBoard") as typeof import("./BatchedComponentsBoard");
      return <BatchedComponentsBoard locale={locale} />;
    }
  }
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
});
