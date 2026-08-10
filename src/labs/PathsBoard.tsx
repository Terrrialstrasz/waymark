import { Alert, StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { Locale } from "../types/ui";
import { spacing } from "../theme/tokens";
import { PathsOverviewTemplate } from "../components/paths/PathsOverviewTemplate";
import { PathDetailTemplate } from "../components/paths/PathDetailTemplate";
import { PathOverviewStatStrip } from "../components/paths/PathOverviewStatStrip";
import { PathRow } from "../components/paths/PathRow";
import { PathPulseCard } from "../components/paths/PathPulseCard";
import { WhyThisPathCard } from "../components/paths/WhyThisPathCard";
import { ExpeditionsTemplate } from "../components/expeditions/ExpeditionsTemplate";
import { ExpeditionFilterPanel } from "../components/expeditions/ExpeditionFilterPanel";
import { PathExpeditionCard } from "../components/expeditions/PathExpeditionCard";
import { getPathsCopy } from "../i18n/pathsCopy";
import { NextMarksList } from "../components/paths/NextMarksList";
import { RecentProofList } from "../components/paths/RecentProofList";
import { NextMarkItem, PathDetailExpeditionItem, PathDetailItem, PathProofItem, PathRowItem, PathStatCardItem } from "../components/paths/types";
import { ExpeditionFilterPathOption, PathExpeditionItem } from "../components/expeditions/types";

type Props = {
  locale: Locale;
};

const statItems: PathStatCardItem[] = [
  {
    id: "alive",
    label: { en: "Paths Alive", vi: "Path còn sống" },
    value: { en: "6 / 7", vi: "6 / 7" },
    supportingText: { en: "Quiet signs of life this week.", vi: "Dấu hiệu sống yên trong tuần này." },
  },
  {
    id: "balance",
    label: { en: "Weekly Balance", vi: "Độ cân của tuần" },
    value: { en: "Good spread", vi: "Khá đều" },
    supportingText: { en: "Career and family carried the week.", vi: "Career và gia đình đang giữ nhịp tuần." },
  },
  {
    id: "attention",
    label: { en: "Needs Attention", vi: "Cần để ý" },
    value: { en: "Culture", vi: "Văn hóa" },
    supportingText: { en: "A gentle nudge, not an alarm.", vi: "Một lời nhắc nhẹ, không phải báo động." },
    state: "warning",
  },
  {
    id: "loading",
    label: { en: "Strongest Path", vi: "Path rõ nhất" },
    state: "loading",
  },
];

const pathRows: PathRowItem[] = [
  {
    id: "career-alive",
    pathId: "career",
    title: { en: "1. Career Craft", vi: "1. Sự nghiệp và tay nghề" },
    question: { en: "What honest proof is keeping this craft alive?", vi: "Bằng chứng thật nào đang giữ cho tay nghề này còn sống?" },
    status: "alive",
    markCount: 3,
    active: true,
  },
  {
    id: "family-protected",
    pathId: "family",
    title: { en: "2. Family & Home", vi: "2. Gia đình và tổ ấm" },
    question: { en: "How did home feel chosen this week?", vi: "Tuần này tổ ấm đã được chọn chủ động như thế nào?" },
    status: "protected",
    markCount: 1,
  },
  {
    id: "culture-weak",
    pathId: "culture",
    title: { en: "3. Culture, Class & Romance", vi: "3. Văn hóa, khí chất và sự lãng mạn dài hơn bình thường để thử xuống dòng" },
    question: { en: "What beauty was actually lived, not merely admired from afar?", vi: "Vẻ đẹp nào đã thực sự được sống qua, chứ không chỉ đứng nhìn từ xa?" },
    status: "weak",
    markCount: 0,
  },
  {
    id: "loading",
    pathId: "health",
    title: { en: "4. Health & Body", vi: "4. Sức khỏe và cơ thể" },
    question: { en: "Loading", vi: "Đang tải" },
    status: "growing",
    markCount: 0,
    loading: true,
  },
];

const proofs: PathProofItem[] = [
  {
    id: "proof-mark",
    kind: "mark",
    title: { en: "Left a visible follow-up note for the client", vi: "Đã để lại một ghi chú follow-up rõ ràng cho khách hàng" },
    metadata: { en: "May 17 · Career Craft", vi: "17 tháng 5 · Sự nghiệp và tay nghề" },
  },
  {
    id: "proof-memory",
    kind: "memory",
    title: { en: "Kept the garden dinner memory after the rain", vi: "Giữ lại ký ức bữa tối ngoài vườn sau cơn mưa" },
    metadata: { en: "May 15 · Family & Home", vi: "15 tháng 5 · Gia đình và tổ ấm" },
  },
];

const nextMarks: NextMarkItem[] = [
  {
    id: "today",
    title: { en: "Write one calm weekly client follow-up", vi: "Viết một bản follow-up tuần thật bình tĩnh cho khách hàng" },
    timingState: "today",
  },
  {
    id: "week",
    title: { en: "Read one poem aloud before dinner", vi: "Đọc một bài thơ thành tiếng trước bữa tối" },
    timingState: "this_week",
  },
  {
    id: "planned",
    title: { en: "Plan the parent clinic field note", vi: "Lên kế hoạch cho ghi chú hiện trường buổi clinic phụ huynh" },
    timingState: "planned",
  },
  {
    id: "upcoming",
    title: { en: "Book the Ninh Binh stay shortlist", vi: "Chốt danh sách chỗ ở Ninh Bình" },
    timingState: "upcoming",
  },
  {
    id: "missed",
    title: { en: "Body reset walk after lunch", vi: "Đi bộ reset cơ thể sau bữa trưa" },
    timingState: "missed",
    disabled: true,
  },
];

const expeditions: PathExpeditionItem[] = [
  {
    id: "exp-active",
    pathId: "career",
    pathName: { en: "Career Craft", vi: "Sự nghiệp và tay nghề" },
    title: { en: "Quiet client care refresh", vi: "Làm mới lại nhịp chăm sóc khách hàng một cách yên tĩnh" },
    description: { en: "A finite season to restore tone, cadence, and useful follow-up proof.", vi: "Một mùa hữu hạn để dựng lại giọng điệu, nhịp độ và bằng chứng follow-up hữu ích." },
    status: "active",
  },
  {
    id: "exp-planning",
    pathId: "snag",
    pathName: { en: "SNAG Golf Vietnam", vi: "SNAG Golf Việt Nam" },
    title: { en: "Family intro clinic", vi: "Buổi trải nghiệm gia đình SNAG" },
    description: { en: "Preparing a field-ready intro season without turning it into a board.", vi: "Chuẩn bị một mùa giới thiệu sẵn sàng ra hiện trường mà không biến nó thành project board." },
    status: "planned",
  },
  {
    id: "exp-upcoming",
    pathId: "culture",
    pathName: { en: "Culture, Class & Romance", vi: "Văn hóa, khí chất và sự lãng mạn" },
    title: { en: "September Ninh Binh notes", vi: "Ghi chú Ninh Bình tháng 9" },
    description: { en: "A finite trip season held as a field note card.", vi: "Một mùa du lịch hữu hạn được giữ bằng giọng điệu của thẻ ghi chú hiện trường." },
    status: "upcoming",
  },
  {
    id: "exp-done",
    pathId: "family",
    pathName: { en: "Family & Home", vi: "Gia đình và tổ ấm" },
    title: { en: "Family welcome loop", vi: "Khép lại vòng chào đón gia đình" },
    description: { en: "The season closed with enough proof already gathered.", vi: "Mùa này đã khép lại với lượng bằng chứng vừa đủ được gom lại." },
    status: "done",
  },
  {
    id: "exp-long-vi",
    pathId: "culture",
    pathName: { en: "Culture, Class & Romance", vi: "Văn hóa, khí chất và sự lãng mạn" },
    title: { en: "Carry the September trail notes without turning the path into a dashboard", vi: "Mang theo ghi chú cho chuyến đi tháng chín mà không biến cả path này thành một bảng điều khiển quản lý" },
    description: { en: "Long title stress test.", vi: "Kiểm tra tiêu đề tiếng Việt dài." },
    status: "active",
  },
  {
    id: "exp-loading",
    pathId: "health",
    pathName: { en: "Health & Body", vi: "Sức khỏe và cơ thể" },
    title: { en: "Loading", vi: "Đang tải" },
    description: { en: "Loading", vi: "Đang tải" },
    status: "active",
    loading: true,
  },
];

const currentPathExpeditions: PathDetailExpeditionItem[] = [
  {
    id: "exp-active",
    pathId: "career",
    title: "Quiet client care refresh",
    description: "Restore tone, cadence, and useful follow-up proof.",
    status: "active",
    targetDate: "2026-08-09",
    sortOrder: 1,
    unassignedMarks: [
      {
        id: "mark-expedition-level-scope-note",
        title: "Write expedition scope note",
        status: "planned",
        scheduledStartAt: "2026-08-08T09:00:00.000",
        dueAt: "2026-08-08T10:00:00.000",
        createdAt: "2026-08-03T08:00:00.000",
        sortTime: "2026-08-08T09:00:00.000",
        isDone: false,
        isFinal: false,
      },
    ],
    milestones: [
      {
        id: "ms-follow-up",
        title: "Restore useful follow-up cadence",
        status: "active",
        startDate: "2026-08-03",
        targetDate: "2026-08-09",
        sortOrder: 1,
        marks: [],
      },
      {
        id: "ms-client-note",
        title: "Send one calm client note",
        status: "planned",
        targetDate: "2026-08-12",
        sortOrder: 2,
        marks: [],
      },
    ],
  },
  {
    id: "exp-planning",
    pathId: "snag",
    title: "Family intro clinic",
    description: "Prepare a field-ready intro season.",
    status: "planned",
    sortOrder: 2,
    unassignedMarks: [],
    milestones: [
      {
        id: "ms-intro-shape",
        title: "Lock field-ready intro shape",
        status: "planned",
        targetDate: "2026-08-16",
        sortOrder: 1,
        marks: [],
      },
    ],
  },
];

const detailPath: PathDetailItem = {
  id: "career",
  pathId: "career",
  title: { en: "Career Craft", vi: "Sự nghiệp và tay nghề" },
  statement: {
    en: "Build work that is useful, honest, and kept warm by visible proof.",
    vi: "Xây công việc hữu ích, chân thật, và được giữ ấm bằng những bằng chứng có thể nhìn thấy.",
  },
  status: "alive",
  sinceLabel: { en: "2019", vi: "2019" },
  pulseSummary: { en: "Alive this week", vi: "Đang sống trong tuần này" },
  pulseBody: {
    en: "You left enough visible proof for this path to feel lived, not merely intended.",
    vi: "Bạn đã để lại đủ bằng chứng nhìn thấy được để path này có cảm giác đang được sống qua, chứ không chỉ được định ý.",
  },
  whyThisPathBody: {
    en: "This path matters because it shapes how your effort enters the world and whether your craft remains faithful to the life you are trying to build.",
    vi: "Path này quan trọng vì nó định hình cách nỗ lực của bạn đi vào thế giới và liệu tay nghề đó có còn trung thành với đời sống bạn đang cố xây dựng hay không.",
  },
  pulseMetrics: [
    { id: "marks", label: { en: "marks this week", vi: "dấu mốc tuần này" }, value: { en: "3", vi: "3" } },
    { id: "expedition", label: { en: "active expedition", vi: "expedition hiện tại" }, value: { en: "1", vi: "1" } },
    { id: "next", label: { en: "next mark today", vi: "dấu mốc hôm nay" }, value: { en: "Yes", vi: "Có" } },
  ],
};

const filterPathOptions: ExpeditionFilterPathOption[] = [
  { id: "career", pathId: "career", label: { en: "Career Craft", vi: "Sự nghiệp và tay nghề" } },
  { id: "snag", pathId: "snag", label: { en: "SNAG Golf Vietnam", vi: "SNAG Golf Việt Nam" } },
  { id: "family", pathId: "family", label: { en: "Family & Home", vi: "Gia đình và tổ ấm" } },
];

export function PathsBoard({ locale }: Props) {
  const c = getPathsCopy(locale);

  return (
    <View style={styles.stack}>
      <BoardSection title="PathRow" subtitle="Alive with 3 marks, protected with 1, weak with 0, long Vietnamese, long question, loading.">
        {pathRows.map((item) => (
          <PathRow key={item.id} item={item} locale={locale} onPress={(row) => Alert.alert("Path", row.title[locale])} />
        ))}
      </BoardSection>

      <BoardSection title="PathPulseCard" subtitle="Alive, protected, weak, growing, empty, loading.">
        <PathPulseCard
          body={detailPath.pulseBody?.[locale] ?? ""}
          locale={locale}
          metrics={detailPath.pulseMetrics}
          pathId="career"
          status="alive"
          summary={detailPath.pulseSummary?.[locale] ?? ""}
        />
        <PathPulseCard
          body={locale === "vi" ? "Nhịp này đang được giữ nhờ những hành động đều và kín đáo." : "This direction is being protected by quiet, repeated care."}
          locale={locale}
          pathId="family"
          status="protected"
          summary={locale === "vi" ? "Được giữ trong tuần này" : "Protected this week"}
        />
        <PathPulseCard
          body={locale === "vi" ? "Path này cần một bằng chứng thật để không trôi thành ý niệm." : "This path needs one honest proof so it does not drift into theory."}
          locale={locale}
          pathId="culture"
          status="weak"
          summary={locale === "vi" ? "Đang yếu trong tuần này" : "Weak this week"}
        />
        <PathPulseCard
          body={locale === "vi" ? "Có chuyển động mới, nhỏ nhưng đáng tin." : "There is new movement here, still small but trustworthy."}
          locale={locale}
          pathId="health"
          status="growing"
          summary={locale === "vi" ? "Đang lớn lên" : "Growing again"}
        />
        <PathPulseCard empty locale={locale} pathId="golf" summary={c.common.empty} />
        <PathPulseCard loading locale={locale} pathId="snag" />
      </BoardSection>

      <BoardSection title="StatCard + PathOverviewStatStrip" subtitle="Numeric value, icon value, needs attention, loading.">
        <PathOverviewStatStrip items={statItems} locale={locale} />
      </BoardSection>

      <BoardSection title="RecentProofList + NextMarksList" subtitle="Read-only proof list and quiet next actions.">
        <RecentProofList items={proofs} locale={locale} onPressItem={(item) => Alert.alert(item.kind, item.title[locale])} pathId="career" pathLabel={detailPath.title[locale]} />
        <NextMarksList items={nextMarks} locale={locale} onPressItem={(item) => Alert.alert("Mark", item.title[locale])} pathId="career" pathLabel={detailPath.title[locale]} />
      </BoardSection>

      <BoardSection title="PathExpeditionCard" subtitle="Active, planning, upcoming, done, long title, long Vietnamese, loading fallback.">
        {expeditions.map((item) => (
          <PathExpeditionCard key={item.id} item={item} locale={locale} onPress={(expedition) => Alert.alert("Expedition", expedition.title[locale])} />
        ))}
      </BoardSection>

      <BoardSection title="ExpeditionFilterPanel" subtitle="Default all filters, path selected, time selected, status selected, multiple filters.">
        <ExpeditionFilterPanel
          locale={locale}
          onClear={() => Alert.alert("Filters", "clear")}
          onSelectPath={(value) => Alert.alert("Path filter", value)}
          onSelectStatus={(value) => Alert.alert("Status filter", value)}
          onSelectTime={(value) => Alert.alert("Time filter", value)}
          pathOptions={filterPathOptions}
          selectedPathId="all_paths"
          selectedStatus="all_status"
          selectedTime="all_time"
        />
        <ExpeditionFilterPanel
          locale={locale}
          onClear={() => Alert.alert("Filters", "clear")}
          onSelectPath={(value) => Alert.alert("Path filter", value)}
          onSelectStatus={(value) => Alert.alert("Status filter", value)}
          onSelectTime={(value) => Alert.alert("Time filter", value)}
          pathOptions={filterPathOptions}
          selectedPathId="career"
          selectedStatus="active"
          selectedTime="current"
        />
      </BoardSection>

      <BoardSection title="PathsOverviewTemplate" subtitle="Paths overview as a calm life-direction index.">
        <View style={styles.templateViewport}>
          <PathsOverviewTemplate locale={locale} onOpenPath={(item) => Alert.alert("Path detail", item.title[locale])} paths={pathRows.slice(0, 3)} stats={statItems} />
        </View>
      </BoardSection>

      <BoardSection title="PathDetailTemplate" subtitle="Path header, pulse, recent proof, next marks, current expeditions, why this path matters.">
        <View style={styles.templateViewport}>
          <PathDetailTemplate
            expeditions={currentPathExpeditions}
            locale={locale}
            nextMarks={nextMarks.slice(0, 4)}
            onBack={() => Alert.alert("Back", detailPath.title[locale])}
            onOpenExpedition={(item) => Alert.alert("Expedition", item.title)}
            onOpenNextMark={(item) => Alert.alert("Mark", item.title[locale])}
            onOpenProof={(item) => Alert.alert(item.kind, item.title[locale])}
            onViewAllExpeditions={() => Alert.alert("Expeditions", "view all")}
            path={detailPath}
            proofs={proofs}
          />
        </View>
      </BoardSection>

      <BoardSection title="ExpeditionsTemplate" subtitle="No filters, filters open, filters active and panel closed, no results, many expeditions.">
        <View style={styles.templateViewport}>
          <ExpeditionsTemplate
            filterPanelOpen={false}
            isSearchFunctional={false}
            items={expeditions.slice(0, 4)}
            locale={locale}
            onClearFilters={() => Alert.alert("Filters", "clear")}
            onOpenExpedition={(item) => Alert.alert("Expedition", item.title[locale])}
            onSearchChange={() => undefined}
            onSelectPath={() => undefined}
            onSelectStatus={() => undefined}
            onSelectTime={() => undefined}
            onToggleFilterPanel={() => Alert.alert("Filters", "toggle")}
            pathOptions={filterPathOptions}
            searchValue=""
            selectedPathId="all_paths"
            selectedStatus="all_status"
            selectedTime="all_time"
          />
        </View>
        <View style={styles.templateViewport}>
          <ExpeditionsTemplate
            filterPanelOpen
            items={expeditions.slice(0, 3)}
            locale={locale}
            onClearFilters={() => Alert.alert("Filters", "clear")}
            onOpenExpedition={(item) => Alert.alert("Expedition", item.title[locale])}
            onSearchChange={() => undefined}
            onSelectPath={() => undefined}
            onSelectStatus={() => undefined}
            onSelectTime={() => undefined}
            onToggleFilterPanel={() => Alert.alert("Filters", "toggle")}
            pathOptions={filterPathOptions}
            searchValue=""
            selectedPathId="career"
            selectedStatus="active"
            selectedTime="current"
          />
        </View>
        <View style={styles.templateViewport}>
          <ExpeditionsTemplate
            filterPanelOpen={false}
            items={[]}
            locale={locale}
            onClearFilters={() => Alert.alert("Filters", "clear")}
            onOpenExpedition={(item) => Alert.alert("Expedition", item.title[locale])}
            onSearchChange={() => undefined}
            onSelectPath={() => undefined}
            onSelectStatus={() => undefined}
            onSelectTime={() => undefined}
            onToggleFilterPanel={() => Alert.alert("Filters", "toggle")}
            pathOptions={filterPathOptions}
            searchValue="ninh"
            selectedPathId="culture"
            selectedStatus="active"
            selectedTime="current"
          />
        </View>
      </BoardSection>

      <BoardSection title="WhyThisPathCard" subtitle="Reflective note card.">
        <WhyThisPathCard body={detailPath.whyThisPathBody?.[locale] ?? ""} locale={locale} pathId={detailPath.pathId} />
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  templateViewport: {
    minHeight: 820,
    overflow: "hidden",
    borderRadius: 28,
  },
});
