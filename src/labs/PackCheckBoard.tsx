import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { PackCheckInstanceStatus } from "../domain/waymark";
import { BottomNavBar } from "../components/primitives/BottomNavBar";
import { PackCheckHero, PackCheckItem, PackCheckItemRow, PackCheckResetAction, PackCheckTemplate } from "../components/pack-check";
import { WMCard } from "../components/primitives/WMCard";
import { WMChip } from "../components/primitives/WMChip";
import { WMText } from "../components/primitives/Text";
import { getPathVisualTokens } from "../tokens/pathVisualTokens";
import { spacing } from "../theme/tokens";
import { Locale, PathId } from "../types/ui";
import { BoardSection } from "./BoardPrimitives";

type Props = {
  locale: Locale;
};

type FixtureId = "character" | "class" | "family" | "empty" | "loading" | "vietnameseLong";

type PackCheckFixture = {
  id: FixtureId;
  label: string;
  packCheck: {
    id?: string;
    name: string;
    path: PathId;
  };
  items: PackCheckItem[];
  loading?: boolean;
};

const fixtureRegistry: Record<FixtureId, Record<Locale, PackCheckFixture>> = {
  character: {
    en: {
      id: "character",
      label: "Character",
      packCheck: { id: "fixture_character_en", name: "Before Leaving Home Check", path: "character" },
      items: [
        { id: "wallet", label: "Wallet", checked: true },
        { id: "keys", label: "House keys", checked: true },
        { id: "badge", label: "Access badge", checked: false },
        { id: "charger", label: "Laptop charger", checked: false },
      ],
    },
    vi: {
      id: "character",
      label: "Character",
      packCheck: { name: "Kiểm tra đồ đi làm", path: "character" },
      items: [
        { id: "wallet", label: "Ví tiền", checked: true },
        { id: "keys", label: "Chùm chìa khóa", checked: true },
        { id: "badge", label: "Thẻ ra vào", checked: false },
        { id: "charger", label: "Sạc laptop", checked: false },
      ],
    },
  },
  class: {
    en: {
      id: "class",
      label: "Class / Culture",
      packCheck: { id: "fixture_class_en", name: "Daily Grooming Presence Check", path: "culture" },
      items: [
        { id: "watch", label: "Watch", checked: true },
        { id: "linen", label: "Pressed shirt", checked: false },
        { id: "fragrance", label: "Pocket fragrance", checked: false },
        { id: "card", label: "Calling card holder", checked: true },
      ],
    },
    vi: {
      id: "class",
      label: "Class / Culture",
      packCheck: { name: "Chuẩn bị diện mạo sáng", path: "culture" },
      items: [
        { id: "watch", label: "Đồng hồ", checked: true },
        { id: "linen", label: "Áo sơ mi đã là phẳng", checked: false },
        { id: "fragrance", label: "Nước hoa mang theo", checked: false },
        { id: "card", label: "Ví đựng danh thiếp", checked: true },
      ],
    },
  },
  family: {
    en: {
      id: "family",
      label: "Another path",
      packCheck: { id: "fixture_family_en", name: "Travel Tour Readiness Check", path: "family" },
      items: [
        { id: "tickets", label: "Train tickets", checked: true },
        { id: "snacks", label: "Snacks for the kids", checked: true },
        { id: "charger", label: "Power bank and cable", checked: false },
        { id: "blanket", label: "Light blanket", checked: false },
      ],
    },
    vi: {
      id: "family",
      label: "Another path",
      packCheck: { name: "Chuẩn bị chuyến đi", path: "family" },
      items: [
        { id: "tickets", label: "Vé tàu", checked: true },
        { id: "snacks", label: "Đồ ăn nhẹ cho trẻ", checked: true },
        { id: "charger", label: "Pin dự phòng và dây sạc", checked: false },
        { id: "blanket", label: "Chăn mỏng", checked: false },
      ],
    },
  },
  empty: {
    en: {
      id: "empty",
      label: "Empty",
      packCheck: { id: "fixture_empty_en", name: "Golf Outing Readiness Check", path: "golf" },
      items: [],
    },
    vi: {
      id: "empty",
      label: "Empty",
      packCheck: { name: "Túi tập", path: "golf" },
      items: [],
    },
  },
  loading: {
    en: {
      id: "loading",
      label: "Loading",
      packCheck: { id: "fixture_loading_en", name: "Before Leaving Home Check", path: "career" },
      items: [
        { id: "wallet", label: "Wallet", checked: true, disabled: true },
        { id: "keys", label: "House keys", checked: false, disabled: true },
        { id: "badge", label: "Access badge", checked: false, disabled: true },
      ],
      loading: true,
    },
    vi: {
      id: "loading",
      label: "Loading",
      packCheck: { name: "Kiểm tra đồ đi làm", path: "career" },
      items: [
        { id: "wallet", label: "Ví tiền", checked: true, disabled: true },
        { id: "keys", label: "Chùm chìa khóa", checked: false, disabled: true },
        { id: "badge", label: "Thẻ ra vào", checked: false, disabled: true },
      ],
      loading: true,
    },
  },
  vietnameseLong: {
    en: {
      id: "vietnameseLong",
      label: "Vietnamese Long",
      packCheck: { id: "fixture_long_en", name: "Weekend Hanoi Check", path: "culture" },
      items: [],
    },
    vi: {
      id: "vietnameseLong",
      label: "Vietnamese Long",
      packCheck: { name: "Chuẩn bị ra ngoài cùng gia đình buổi sáng", path: "culture" },
      items: [
        { id: "bag", label: "Túi vải gấp gọn để mang thêm đồ nhẹ nhưng vẫn giữ lối xếp gọn ở hàng checklist", checked: false },
        { id: "papers", label: "Bọc giấy tờ cần mang theo để không phải lục tìm khi đang vội", checked: true },
        { id: "charger", label: "Bộ sạc điện thoại để sẵn trong ngăn nhỏ của túi", checked: false },
        { id: "water", label: "Bình nước cá nhân đã rửa và châm đầy", checked: true },
      ],
    },
  },
};

export function PackCheckBoard({ locale }: Props) {
  const [fixtureId, setFixtureId] = useState<FixtureId>("character");
  const [items, setItems] = useState(fixtureRegistry.character[locale].items);
  const fixtureLocale = fixtureId === "vietnameseLong" ? "vi" : locale;
  const fixture = useMemo(() => fixtureRegistry[fixtureId][fixtureLocale], [fixtureId, fixtureLocale]);
  const fixturePackCheck = useMemo(
    () => ({
      id: fixture.packCheck.id ?? `fixture_${fixture.id}_${fixtureLocale}`,
      ...fixture.packCheck,
    }),
    [fixture, fixtureLocale],
  );

  function applyFixture(nextFixtureId: FixtureId) {
    const nextLocale = nextFixtureId === "vietnameseLong" ? "vi" : locale;
    setFixtureId(nextFixtureId);
    setItems(fixtureRegistry[nextFixtureId][nextLocale].items);
  }

  function toggleItem(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  }

  function clearChecks() {
    setItems((current) => current.map((item) => ({ ...item, checked: false })));
  }

  function completePackCheck() {
    Alert.alert(fixtureLocale === "vi" ? "Pack Check" : "Pack Check", fixtureLocale === "vi" ? "Ghi nhận Pack Check hiện tại." : "Record the current pack check.");
  }

  const checkedCount = items.filter((item) => item.checked).length;
  const tintedPath = getPathVisualTokens(fixture.packCheck.path);

  return (
    <View style={styles.stack}>
      <View style={styles.heading}>
        <WMText variant="cardTitle">Pack Check</WMText>
        <WMText variant="bodySm">
          {locale === "vi"
            ? "Header luôn ổn định là Pack Check; identity, hero image và checklist tint đi theo path source-of-truth."
            : "Header stays fixed as Pack Check while identity, hero image, and checklist tint come from the path source-of-truth."}
        </WMText>
      </View>

      <View style={styles.tabRow}>
        {(["character", "class", "family", "empty", "loading", "vietnameseLong"] as FixtureId[]).map((id) => (
          <WMChip key={id} label={fixtureRegistry[id][id === "vietnameseLong" ? "vi" : locale].label} onPress={() => applyFixture(id)} selected={fixtureId === id} />
        ))}
      </View>

      <BoardSection
        subtitle={fixtureLocale === "vi" ? "Màn hình compact hơn, hero dùng path image, action bar sticky đứng trên bottom nav." : "Compact screen, path hero image, and sticky action bar above the bottom nav."}
        title="PackCheckTemplate"
      >
        <View style={styles.screenFrame}>
          <PackCheckTemplate
            gate="enabled"
            isLoading={fixture.loading}
            items={items}
            locale={fixtureLocale}
            onClearChecks={clearChecks}
            onComplete={completePackCheck}
            onToggleItem={toggleItem}
            packCheck={fixturePackCheck}
            showBack
            withShell={false}
          />
          <BottomNavBar activeTab="today" locale={fixtureLocale} />
        </View>
      </BoardSection>

      <BoardSection title="Pack Check / Path Variants">
        <View style={styles.stackSm}>
          <PackCheckHero locale={locale} packCheckName="Before Leaving Home Check" path="character" items={fixtureRegistry.character[locale].items} />
          <PackCheckHero locale={locale} packCheckName="Daily Grooming Presence Check" path="culture" items={fixtureRegistry.class[locale].items} />
          <PackCheckHero locale={locale} packCheckName="Travel Tour Readiness Check" path="family" items={fixtureRegistry.family[locale].items} />
        </View>
      </BoardSection>

      <BoardSection title="Hero States">
        <View style={styles.stackSm}>
          <PackCheckHero locale={fixtureLocale} packCheckName={fixturePackCheck.name} path={fixturePackCheck.path} items={[]} />
          <PackCheckHero locale={fixtureLocale} packCheckName={fixturePackCheck.name} path={fixturePackCheck.path} items={fixture.items} />
          <PackCheckHero
            locale={fixtureLocale}
            packCheckName={fixturePackCheck.name}
            packCheckStatus={PackCheckInstanceStatus.Completed}
            path={fixturePackCheck.path}
            items={fixture.items.map((item) => ({ ...item, checked: true }))}
          />
        </View>
      </BoardSection>

      <BoardSection title="PackCheckItemRow">
        <View style={styles.stackSm}>
          <PackCheckItemRow checked id="checked" index={0} label={fixtureLocale === "vi" ? "Hộp đựng bút" : "Pen case"} locale={fixtureLocale} onToggle={() => undefined} path={fixture.packCheck.path} />
          <PackCheckItemRow checked={false} id="unchecked" index={1} label={fixtureLocale === "vi" ? "Sổ tay" : "Notebook"} locale={fixtureLocale} onToggle={() => undefined} path={fixture.packCheck.path} />
          <PackCheckItemRow
            checked={false}
            id="long"
            index={2}
            label={
              fixtureLocale === "vi"
                ? "Túi vải gấp gọn để mang thêm đồ nhẹ nhưng vẫn giữ nhịp đọc sạch, không chèn vào vùng check control"
                : "Foldable tote bag for the afternoon stop so the long label still wraps cleanly in two lines"
            }
            locale={fixtureLocale}
            onToggle={() => undefined}
            path={fixture.packCheck.path}
          />
          <View style={styles.numberedListPreview}>
            {[0, 1, 2, 3].map((index) => (
              <PackCheckItemRow
                key={index}
                checked={index === 0 || index === 3}
                id={`numbered-${index}`}
                index={index}
                label={fixtureLocale === "vi" ? `Mục kiểm tra số ${index + 1}` : `Checklist item ${index + 1}`}
                locale={fixtureLocale}
                onToggle={() => undefined}
                path={fixture.packCheck.path}
              />
            ))}
          </View>
        </View>
      </BoardSection>

      <BoardSection title="Checklist Section / Path Tint">
        <WMCard contentStyle={styles.tintCardContent} style={{ ...styles.tintCard, backgroundColor: tintedPath.accentSoft, borderColor: tintedPath.accentMuted }}>
          <WMText style={{ color: tintedPath.accentDeep }} variant="bodyStrong">
            {fixtureLocale === "vi" ? "Checklist section / path tinted background" : "Checklist section / path tinted background"}
          </WMText>
          <PackCheckItemRow checked id="tint-1" index={0} label={fixtureLocale === "vi" ? "Ví tiền" : "Wallet"} locale={fixtureLocale} onToggle={() => undefined} path={fixture.packCheck.path} />
          <PackCheckItemRow checked={false} id="tint-2" index={1} label={fixtureLocale === "vi" ? "Chìa khóa" : "Keys"} locale={fixtureLocale} onToggle={() => undefined} path={fixture.packCheck.path} />
        </WMCard>
      </BoardSection>

      <BoardSection title="PackCheckResetAction">
        <View style={styles.stackSm}>
          <PackCheckResetAction locale={fixtureLocale} onClearChecks={() => undefined} />
          <PackCheckResetAction disabled locale={fixtureLocale} onClearChecks={() => undefined} />
          <PackCheckResetAction loading locale={fixtureLocale} onClearChecks={() => undefined} />
        </View>
      </BoardSection>

      <BoardSection title="Sticky Action Bar Above Bottom Nav">
        <View style={styles.screenFrame}>
          <PackCheckTemplate
            items={fixtureRegistry.family[locale].items}
            locale={locale}
            onClearChecks={() => undefined}
            onComplete={() => undefined}
            onToggleItem={() => undefined}
            packCheck={{
              id: fixtureRegistry.family[locale].packCheck.id ?? `fixture_family_${locale}`,
              ...fixtureRegistry.family[locale].packCheck,
            }}
            showBack
            withShell={false}
          />
          <BottomNavBar activeTab="today" locale={locale} />
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  heading: {
    gap: spacing.xs,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stackSm: {
    gap: spacing.sm,
  },
  screenFrame: {
    height: 740,
    overflow: "hidden",
    borderRadius: 28,
  },
  numberedListPreview: {
    borderRadius: 24,
    overflow: "hidden",
  },
  tintCard: {
    borderWidth: 1,
  },
  tintCardContent: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
