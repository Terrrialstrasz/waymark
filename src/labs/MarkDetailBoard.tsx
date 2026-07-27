import { ReactNode } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useCopy } from "../i18n/useCopy";
import { MarkDetailItem, replaceTemplateValue } from "../components/mark-detail/model";
import { MarkDetailTemplate } from "../components/mark-detail/MarkDetailTemplate";
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

export function MarkDetailBoard({ locale }: Props) {
  const copy = useCopy(locale);
  const dateLabel = locale === "vi" ? "Thu nam, ngay 1 thang 5" : "Thursday, May 1";
  const career = createMarkFixture(locale, copy, dateLabel, getPathFixture(locale, "career"));
  const health = createMarkFixture(locale, copy, dateLabel, getPathFixture(locale, "health"));
  const family = createMarkFixture(locale, copy, dateLabel, getPathFixture(locale, "family"));
  const culture = createMarkFixture(locale, copy, dateLabel, getPathFixture(locale, "culture"));
  const baseExpedition = career.expeditions?.[0];

  const states: Array<{ id: string; title: string; mark: MarkDetailItem }> = [
    {
      id: "collage",
      title: "Completed planned mark with collage",
      mark: career,
    },
    {
      id: "image",
      title: "Completed planned mark with image",
      mark: {
        ...health,
        mediaItems: undefined,
        media: {
          assetId: "hero.path.healthBody",
          alt: locale === "vi" ? "Anh hero suc khoe" : "Health path hero image",
        },
      },
    },
    {
      id: "no-image",
      title: "Completed planned mark without image",
      mark: {
        ...family,
        mediaItems: undefined,
        media: undefined,
      },
    },
    {
      id: "quick",
      title: "Quick mark",
      mark: {
        ...culture,
        sourceType: "quickMark",
      },
    },
    {
      id: "no-note",
      title: "Mark without note",
      mark: {
        ...career,
        note: undefined,
      },
    },
    {
      id: "no-proof",
      title: "Mark without proof detail",
      mark: {
        ...health,
        proofDetail: undefined,
      },
    },
    {
      id: "no-expeditions",
      title: "Mark with no expeditions",
      mark: {
        ...family,
        expeditions: [],
      },
    },
    {
      id: "long-title",
      title: "Long title",
      mark: {
        ...career,
        title:
          locale === "vi"
            ? "Da hoan thanh mot khoi lam viec sau du dai de giu mach chinh cua cong viec ma khong troi sang nhung viec gay nhieu khong can thiet"
            : "Completed a long deep-work block that held the core thread together without drifting into peripheral noise",
      },
    },
    {
      id: "long-expedition",
      title: "Long expedition title",
      mark: {
        ...health,
        expeditions: baseExpedition
          ? [
              {
                ...baseExpedition,
                title:
                  locale === "vi"
                    ? "Dot day trong tam cho du an loi voi mot tieu de du dai de kiem tra truncation cua row lien ket"
                    : "Core project push expedition with an intentionally long title to verify compact row truncation",
              },
            ]
          : [],
      },
    },
    {
      id: "disabled-expedition",
      title: "Disabled or gated expedition link",
      mark: {
        ...culture,
        expeditions: baseExpedition
          ? [
              {
                ...baseExpedition,
                gate: "disabled_dev",
                onPress: undefined,
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
          subtitle={locale === "vi" ? "Xem trang thai component detail stack." : "Preview the detail stack state."}
          title={state.title}
        >
          <PreviewFrame activeTintColor={state.mark.path.skin.color} locale={locale}>
            <MarkDetailTemplate
              locale={locale}
              mark={state.mark}
              onAddPhoto={(mark) => Alert.alert(locale === "vi" ? "Thêm ảnh" : "Add photo", mark.title)}
              onBack={() => Alert.alert(locale === "vi" ? "Quay lai" : "Back", state.mark.title)}
              onOpenExpedition={(expedition) =>
                Alert.alert(locale === "vi" ? "Chi tiet hanh trinh" : "Expedition detail", expedition.title)
              }
              onMarkAsMemory={(mark) =>
                Alert.alert(locale === "vi" ? "Đánh dấu thành ký ức" : "Mark as memories", mark.title)
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

function createMarkFixture(
  locale: Locale,
  copy: ReturnType<typeof useCopy>,
  dateLabel: string,
  pathFixture: PathFixture
): MarkDetailItem {
  const pathSkin = getPathSkin(pathFixture.pathId, pathFixture.pathName);

  return {
    id: `mark-detail-preview-${pathFixture.pathId}`,
    title: locale === "vi" ? "Da hoan thanh mot khoi lam viec tap trung" : "Focused work block completed",
    note: locale === "vi" ? "Giu phan loi that don gian." : "Kept the core simple.",
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
        ? "Khoi nay nho thoi, nhung no bao ve duoc phan viec quan trong. Toi o lai voi nhiem vu loi thay vi troi vao tieng on."
        : "This block was small, but it protected the important work. I stayed with the core task instead of drifting into noise.",
    mediaItems: pathFixture.mediaItems,
    metadata: [
      {
        id: "captured",
        iconSemanticName: "nav.journal",
        label: copy.markDetail.metadata.capturedInJournal,
      },
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
      {
        id: "proof",
        iconSemanticName: "entity.mark",
        label: copy.markDetail.metadata.completedAsProof,
      },
    ],
    expeditions: [
      {
        id: `expedition-${pathFixture.pathId}`,
        title: pathFixture.expeditionTitle,
        milestoneLabel: locale === "vi" ? "Milestone: Cot moc hien tai" : "Milestone: Current marker",
        description:
          locale === "vi"
            ? "Dau moc nay thuoc ve mot mach thuc thi dai hon."
            : "This mark belongs to a longer execution thread.",
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
