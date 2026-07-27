import { ReactNode } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useCopy } from "../i18n/useCopy";
import { MarkDetailItem, replaceTemplateValue } from "../components/mark-detail/model";
import { MemoryDetailTemplate } from "../components/memory-detail/MemoryDetailTemplate";
import { BottomNavBar } from "../components/primitives/BottomNavBar";
import { BoardSection } from "./BoardPrimitives";
import { getPathSkin } from "../tokens/pathVisualTokens";
import { spacing } from "../theme/tokens";
import { Locale, PathId } from "../types/ui";

type Props = {
  locale: Locale;
};

type PathFixture = {
  pathId: PathId;
  pathName: string;
  mediaItems: NonNullable<MarkDetailItem["mediaItems"]>;
  expeditionTitle: string;
};

export function MemoryDetailHarness({ locale }: Props) {
  const copy = useCopy(locale);
  const dateLabel = locale === "vi" ? "Thu nam, ngay 1 thang 5" : "Thursday, May 1";
  const career = createMemoryFixture(locale, copy, dateLabel, getPathFixture(locale, "career"));
  const health = createMemoryFixture(locale, copy, dateLabel, getPathFixture(locale, "health"));
  const family = createMemoryFixture(locale, copy, dateLabel, getPathFixture(locale, "family"));
  const culture = createMemoryFixture(locale, copy, dateLabel, getPathFixture(locale, "culture"));
  const baseExpedition = career.expeditions?.[0];

  const states: Array<{ id: string; title: string; memory: MarkDetailItem }> = [
    { id: "collage", title: "Memory with collage", memory: career },
    {
      id: "image",
      title: "Memory with image",
      memory: {
        ...health,
        mediaItems: undefined,
        media: {
          assetId: "hero.path.healthBody",
          alt: locale === "vi" ? "Anh memory suc khoe" : "Memory hero image",
        },
      },
    },
    { id: "no-image", title: "Memory without image", memory: { ...family, mediaItems: undefined, media: undefined } },
    { id: "no-expeditions", title: "Memory with no expeditions", memory: { ...culture, expeditions: [] } },
    {
      id: "long-title",
      title: "Long memory title",
      memory: {
        ...career,
        title:
          locale === "vi"
            ? "Mot ky uc dai duoc giu lai tu buoi chieu khi mach cong viec tro nen nhe hon va ro rang hon"
            : "A long memory title held from the afternoon when the work thread started to feel lighter and clearer",
      },
    },
    {
      id: "long-expedition",
      title: "Long expedition title",
      memory: {
        ...health,
        expeditions: baseExpedition
          ? [
              {
                ...baseExpedition,
                title:
                  locale === "vi"
                    ? "Mach hanh trinh rat dai de kiem tra truncation cua row compact trong memory detail"
                    : "A deliberately long expedition title to verify compact row truncation in memory detail",
              },
            ]
          : [],
      },
    },
  ];

  return (
    <View style={styles.stack}>
      {states.map((state) => (
        <BoardSection
          key={state.id}
          subtitle={locale === "vi" ? "Xem trang thai memory detail." : "Preview the memory detail state."}
          title={state.title}
        >
          <PreviewFrame activeTintColor={state.memory.path.skin.color} locale={locale}>
            <MemoryDetailTemplate
              locale={locale}
              mark={state.memory}
              onAddPhoto={(memory) => Alert.alert(locale === "vi" ? "Thêm ảnh" : "Add photo", memory.title)}
              onBack={() => Alert.alert(locale === "vi" ? "Quay lai" : "Back", state.memory.title)}
              onOpenExpedition={(expedition) =>
                Alert.alert(locale === "vi" ? "Chi tiet hanh trinh" : "Expedition detail", expedition.title)
              }
            />
          </PreviewFrame>
        </BoardSection>
      ))}
    </View>
  );
}

function PreviewFrame({
  children,
  locale,
  activeTintColor,
}: {
  children: ReactNode;
  locale: Locale;
  activeTintColor?: string;
}) {
  return (
    <View style={styles.previewFrame}>
      <View style={styles.previewBody}>{children}</View>
      <BottomNavBar activeTab="journal" activeTintColor={activeTintColor} locale={locale} />
    </View>
  );
}

function createMemoryFixture(
  locale: Locale,
  copy: ReturnType<typeof useCopy>,
  dateLabel: string,
  pathFixture: PathFixture
): MarkDetailItem {
  const pathSkin = getPathSkin(pathFixture.pathId, pathFixture.pathName);

  return {
    id: `memory-detail-preview-${pathFixture.pathId}`,
    title: locale === "vi" ? "Buoi chieu con duong nhe hon" : "An afternoon the trail felt lighter",
    note: locale === "vi" ? "Giữ lại cảm giác rõ ràng đó." : "Held onto that clearer feeling.",
    date: new Date("2026-05-01T08:00:00.000Z"),
    status: "done",
    sourceType: "plannedMark",
    path: {
      id: pathFixture.pathId,
      name: pathFixture.pathName,
      skin: {
        color: pathSkin.color,
        deepColor: pathSkin.deepColor,
        softColor: pathSkin.softColor,
      },
    },
    proofDetail:
      locale === "vi"
        ? "Khoanh khac nay nho, nhung no danh dau luc mach ben trong tro nen nhe hon. Toi nho lai su ro rang do va muon giu no lai."
        : "This was a small moment, but it marked the point when the inner thread felt lighter. I wanted to keep that clarity close.",
    mediaItems: pathFixture.mediaItems,
    metadata: [
      { id: "captured", iconSemanticName: "nav.journal", label: copy.markDetail.metadata.capturedInJournal },
      {
        id: "day",
        iconSemanticName: "utility.calendar",
        label: replaceTemplateValue(copy.markDetail.metadata.partOfDay, { date: dateLabel }),
      },
      {
        id: "path",
        iconSemanticName: "entity.path",
        label: replaceTemplateValue(copy.markDetail.metadata.attachedToPath, { path: pathFixture.pathName }),
      },
      { id: "proof", iconSemanticName: "entity.mark", label: copy.markDetail.metadata.completedAsProof },
    ],
    expeditions: [
      {
        id: `expedition-${pathFixture.pathId}`,
        title: pathFixture.expeditionTitle,
        milestoneLabel: locale === "vi" ? "Milestone: Cot moc hien tai" : "Milestone: Current marker",
        description:
          locale === "vi" ? "Ky uc nay nam trong mot mach dai hon." : "This memory belongs to a longer living thread.",
        href: `/expeditions/${pathFixture.pathId}`,
      },
    ],
  };
}

function getPathFixture(locale: Locale, pathId: PathId): PathFixture {
  switch (pathId) {
    case "health":
      return {
        pathId,
        pathName: locale === "vi" ? "Suc khoe va co the" : "Health & Body",
        expeditionTitle: locale === "vi" ? "Nhip tap luyen on dinh" : "Steady Training Thread",
        mediaItems: [
          { assetId: "hero.path.healthBody", alt: locale === "vi" ? "Anh suc khoe mot" : "Health image one" },
          { assetId: "hero.path.golfCraft", alt: locale === "vi" ? "Anh suc khoe hai" : "Health image two" },
          { assetId: "hero.path.familyHome", alt: locale === "vi" ? "Anh suc khoe ba" : "Health image three" },
        ],
      };
    case "family":
      return {
        pathId,
        pathName: locale === "vi" ? "Gia dinh va to am" : "Family & Home",
        expeditionTitle: locale === "vi" ? "Nhip toi cho gia dinh" : "Family Evening Thread",
        mediaItems: [
          { assetId: "hero.path.familyHome", alt: locale === "vi" ? "Anh gia dinh mot" : "Family image one" },
          { assetId: "hero.path.cultureRomance", alt: locale === "vi" ? "Anh gia dinh hai" : "Family image two" },
          { assetId: "hero.path.careerCraft", alt: locale === "vi" ? "Anh gia dinh ba" : "Family image three" },
        ],
      };
    case "culture":
      return {
        pathId,
        pathName: locale === "vi" ? "Van hoa va lang man" : "Culture, Class & Romance",
        expeditionTitle: locale === "vi" ? "Mach song dep va co gu" : "Refined Living Thread",
        mediaItems: [
          { assetId: "hero.path.cultureRomance", alt: locale === "vi" ? "Anh van hoa mot" : "Culture image one" },
          { assetId: "hero.path.familyHome", alt: locale === "vi" ? "Anh van hoa hai" : "Culture image two" },
          { assetId: "hero.path.golfCraft", alt: locale === "vi" ? "Anh van hoa ba" : "Culture image three" },
        ],
      };
    case "career":
    default:
      return {
        pathId: "career",
        pathName: locale === "vi" ? "Su nghiep va tay nghe" : "Career Craft",
        expeditionTitle: locale === "vi" ? "Dot day cho du an loi" : "Core Project Push",
        mediaItems: [
          { assetId: "hero.path.careerCraft", alt: locale === "vi" ? "Anh career mot" : "Career image one" },
          { assetId: "hero.path.familyHome", alt: locale === "vi" ? "Anh career hai" : "Career image two" },
          { assetId: "hero.path.healthBody", alt: locale === "vi" ? "Anh career ba" : "Career image three" },
        ],
      };
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  previewFrame: {
    height: 920,
    overflow: "hidden",
    borderRadius: 28,
  },
  previewBody: {
    flex: 1,
  },
});
