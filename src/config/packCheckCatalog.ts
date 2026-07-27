import type { PathId } from "../types/ui";

type SeedPathId = "career" | "snag" | "family" | "health" | "style" | "golf" | "character";

type PackCheckSurfacePolicy =
  | "today_when_due"
  | "prepare_tomorrow"
  | "embedded_in_mark"
  | "all_pack_checks_only"
  | "manual_only"
  | "hidden_until_linked";

type PackCheckCatalogItem = {
  sourceSeedId: string;
  label: string;
  isRequired: boolean;
  orderIndex: number;
};

type PackCheckCatalogRule = {
  sourceSeedId: string;
  markTemplateSeedId: string;
  availableOffsetMin?: number;
  dueOffsetMin?: number;
};

export type PackCheckCatalogTone = "morning" | "office" | "gym" | "evening";

export type PackCheckCatalogEntry = {
  sourceSeedId: string;
  title: string;
  description?: string;
  pathSeedId: SeedPathId;
  uiPathId: PathId;
  tone: PackCheckCatalogTone;
  surfacePolicy: PackCheckSurfacePolicy;
  iconFileName: string;
  items: PackCheckCatalogItem[];
  markRules?: PackCheckCatalogRule[];
};

export const PACK_CHECK_ICON_SOURCE_DIR =
  "ai-resources/Waymark Icon skins/12_Pack Check icon";

export const PACK_CHECK_CATALOG: readonly PackCheckCatalogEntry[] = [
  {
    sourceSeedId: "family.before-leaving-home-check",
    title: "Before Leaving Home Check",
    description: "Pack Check: Before Leaving Home Check.",
    pathSeedId: "career",
    uiPathId: "career",
    tone: "office",
    surfacePolicy: "today_when_due",
    iconFileName: "before-leaving-home-check.svg",
    items: [
      { sourceSeedId: "phone", label: "Điện thoại", isRequired: true, orderIndex: 0 },
      { sourceSeedId: "wallet", label: "Ví", isRequired: true, orderIndex: 1 },
      { sourceSeedId: "keys", label: "Chìa khóa", isRequired: true, orderIndex: 2 },
      { sourceSeedId: "work_badge", label: "Thẻ cơ quan", isRequired: true, orderIndex: 3 },
      { sourceSeedId: "vehicle_key", label: "Chìa khóa xe", isRequired: true, orderIndex: 4 },
      { sourceSeedId: "helmet", label: "Mũ bảo hiểm", isRequired: true, orderIndex: 5 },
      { sourceSeedId: "raincoat", label: "Áo mưa", isRequired: true, orderIndex: 6 },
      { sourceSeedId: "laptop", label: "Laptop", isRequired: true, orderIndex: 7 },
    ],
  },
  {
    sourceSeedId: "style.daily-grooming-presence-check",
    title: "Daily Grooming Presence Check",
    description: "Pack Check: Daily Grooming Presence Check.",
    pathSeedId: "style",
    uiPathId: "culture",
    tone: "morning",
    surfacePolicy: "today_when_due",
    iconFileName: "daily-grooming-presence-check.svg",
    items: [
      { sourceSeedId: "face_clean", label: "Face clean", isRequired: true, orderIndex: 0 },
      { sourceSeedId: "hair_controlled", label: "Hair controlled", isRequired: true, orderIndex: 1 },
      { sourceSeedId: "breath_acceptable", label: "Breath acceptable", isRequired: true, orderIndex: 2 },
      {
        sourceSeedId: "body_and_clothes_smell_acceptable",
        label: "Body and clothes smell acceptable",
        isRequired: true,
        orderIndex: 3,
      },
      { sourceSeedId: "shirt_neat", label: "Shirt neat", isRequired: true, orderIndex: 4 },
      { sourceSeedId: "nails_acceptable", label: "Nails acceptable", isRequired: true, orderIndex: 5 },
      { sourceSeedId: "shoes_presentable", label: "Shoes presentable", isRequired: true, orderIndex: 6 },
    ],
  },
  {
    sourceSeedId: "health.workout-readiness-check",
    title: "Workout Readiness Check",
    description: "Pack Check: Workout Readiness Check.",
    pathSeedId: "health",
    uiPathId: "health",
    tone: "gym",
    surfacePolicy: "prepare_tomorrow",
    iconFileName: "workout-readiness-check.svg",
    items: [
      { sourceSeedId: "gym_shoes_and_socks", label: "Giày và tất tập gym", isRequired: true, orderIndex: 0 },
      { sourceSeedId: "gloves_if_needed", label: "Găng tay nếu cần", isRequired: true, orderIndex: 1 },
      { sourceSeedId: "gym_card", label: "Thẻ gym", isRequired: true, orderIndex: 2 },
      { sourceSeedId: "phone", label: "Điện thoại", isRequired: true, orderIndex: 3 },
      { sourceSeedId: "headphones", label: "Tai nghe", isRequired: true, orderIndex: 4 },
    ],
    markRules: [
      { sourceSeedId: "day_a1_rule", markTemplateSeedId: "health_day_a_strength", availableOffsetMin: 525, dueOffsetMin: 525 },
      { sourceSeedId: "day_b1_rule", markTemplateSeedId: "health_day_b_strength", availableOffsetMin: 525, dueOffsetMin: 525 },
      { sourceSeedId: "day_a2_rule", markTemplateSeedId: "health_day_a2_strength", availableOffsetMin: 525, dueOffsetMin: 525 },
      { sourceSeedId: "day_b2_rule", markTemplateSeedId: "health_day_b_2_strength", availableOffsetMin: 525, dueOffsetMin: 525 },
    ],
  },
  {
    sourceSeedId: "health.walk-readiness-check",
    title: "Walk Readiness Check",
    description: "Pack Check: Walk Readiness Check.",
    pathSeedId: "health",
    uiPathId: "health",
    tone: "morning",
    surfacePolicy: "prepare_tomorrow",
    iconFileName: "walk-readiness-check.svg",
    items: [
      { sourceSeedId: "walking_shoes_and_socks", label: "Giày và tất đi bộ", isRequired: true, orderIndex: 0 },
      { sourceSeedId: "phone", label: "Điện thoại", isRequired: true, orderIndex: 1 },
      { sourceSeedId: "headphones", label: "Tai nghe", isRequired: true, orderIndex: 2 },
    ],
    markRules: [
      { sourceSeedId: "walk_1_rule", markTemplateSeedId: "health_walk_day_1", availableOffsetMin: 525, dueOffsetMin: 525 },
      { sourceSeedId: "walk_2_rule", markTemplateSeedId: "health_walk_day_2", availableOffsetMin: 525, dueOffsetMin: 525 },
      { sourceSeedId: "walk_3_rule", markTemplateSeedId: "health_walk_day_3", availableOffsetMin: 525, dueOffsetMin: 525 },
    ],
  },
  {
    sourceSeedId: "family.home-shutdown-check",
    title: "Home Shutdown Check",
    description: "Pack Check: Home Shutdown Check.",
    pathSeedId: "family",
    uiPathId: "family",
    tone: "evening",
    surfacePolicy: "today_when_due",
    iconFileName: "home-shutdown-check.svg",
    items: [
      { sourceSeedId: "lock_main_door", label: "Khóa cửa chính", isRequired: true, orderIndex: 0 },
      { sourceSeedId: "close_windows", label: "Đóng cửa sổ", isRequired: true, orderIndex: 1 },
      { sourceSeedId: "check_kitchen_and_gas", label: "Kiểm tra bếp và gas", isRequired: true, orderIndex: 2 },
      { sourceSeedId: "turn_off_lights", label: "Tắt đèn nơi cần thiết", isRequired: true, orderIndex: 3 },
      { sourceSeedId: "turn_off_ac_and_fans", label: "Tắt điều hòa và quạt", isRequired: true, orderIndex: 4 },
      { sourceSeedId: "unplug_chargers", label: "Rút sạc nếu cần", isRequired: true, orderIndex: 5 },
      {
        sourceSeedId: "prepare_tomorrow_clothes",
        label: "Chuẩn bị đồ ngày mai: áo, quần, đồ lót, thắt lưng, tất",
        isRequired: true,
        orderIndex: 6,
      },
    ],
  },
  {
    sourceSeedId: "golf.golf-outing-readiness-check",
    title: "Golf Outing Readiness Check",
    description: "Pack Check: Golf Outing Readiness Check.",
    pathSeedId: "golf",
    uiPathId: "golf",
    tone: "morning",
    surfacePolicy: "today_when_due",
    iconFileName: "golf-outing-readiness-check.svg",
    items: [
      { sourceSeedId: "golf_shoes", label: "Giày golf", isRequired: true, orderIndex: 0 },
      {
        sourceSeedId: "golf_bag",
        label: "Túi gậy gồm gậy, bóng, găng tay và tee",
        isRequired: true,
        orderIndex: 1,
      },
      { sourceSeedId: "towel", label: "Khăn", isRequired: true, orderIndex: 2 },
      { sourceSeedId: "water", label: "Nước", isRequired: true, orderIndex: 3 },
      { sourceSeedId: "food", label: "Đồ ăn", isRequired: true, orderIndex: 4 },
      { sourceSeedId: "hat", label: "Mũ", isRequired: true, orderIndex: 5 },
      { sourceSeedId: "sunscreen", label: "Kem chống nắng", isRequired: true, orderIndex: 6 },
      {
        sourceSeedId: "booking_confirmed",
        label: "Đã xác nhận đặt chỗ và địa điểm",
        isRequired: true,
        orderIndex: 7,
      },
      { sourceSeedId: "wallet_cash_card", label: "Ví có tiền mặt và thẻ", isRequired: true, orderIndex: 8 },
    ],
  },
  {
    sourceSeedId: "family.weekend-around-hanoi-readiness-check",
    title: "Weekend Hanoi Check",
    description: "Pack Check: Weekend Hanoi Check.",
    pathSeedId: "family",
    uiPathId: "family",
    tone: "office",
    surfacePolicy: "today_when_due",
    iconFileName: "weekend-around-hanoi-readiness-check.svg",
    items: [
      { sourceSeedId: "destination_confirmed", label: "Đã xác nhận điểm đến", isRequired: true, orderIndex: 0 },
      { sourceSeedId: "route_checked", label: "Đã kiểm tra đường đi", isRequired: true, orderIndex: 1 },
      { sourceSeedId: "wallet", label: "Ví", isRequired: true, orderIndex: 2 },
      { sourceSeedId: "phone_charged", label: "Điện thoại đã sạc", isRequired: true, orderIndex: 3 },
      { sourceSeedId: "child_essentials", label: "Đồ cần thiết cho con", isRequired: true, orderIndex: 4 },
      { sourceSeedId: "water", label: "Nước", isRequired: true, orderIndex: 5 },
      { sourceSeedId: "snacks", label: "Đồ ăn nhẹ", isRequired: true, orderIndex: 6 },
      { sourceSeedId: "weather_checked", label: "Đã kiểm tra thời tiết", isRequired: true, orderIndex: 7 },
      { sourceSeedId: "indoor_backup", label: "Phương án trong nhà dự phòng", isRequired: true, orderIndex: 8 },
    ],
  },
  {
    sourceSeedId: "family.travel-tour-readiness-check",
    title: "Travel Tour Readiness Check",
    description: "Pack Check: Travel Tour Readiness Check.",
    pathSeedId: "family",
    uiPathId: "family",
    tone: "office",
    surfacePolicy: "today_when_due",
    iconFileName: "travel-tour-readiness-check.svg",
    items: [
      {
        sourceSeedId: "documents_cash_cards",
        label: "Giấy tờ tùy thân, hộ chiếu nếu cần, tiền mặt và thẻ",
        isRequired: true,
        orderIndex: 0,
      },
      { sourceSeedId: "tickets", label: "Vé", isRequired: true, orderIndex: 1 },
      { sourceSeedId: "hotel_booking", label: "Đặt phòng", isRequired: true, orderIndex: 2 },
      { sourceSeedId: "phone", label: "Điện thoại", isRequired: true, orderIndex: 3 },
      { sourceSeedId: "charger", label: "Sạc", isRequired: true, orderIndex: 4 },
      { sourceSeedId: "power_bank", label: "Pin dự phòng", isRequired: true, orderIndex: 5 },
      {
        sourceSeedId: "clothes_prepared",
        label: "Quần áo đã chuẩn bị: 3 bộ mỗi ngày",
        isRequired: true,
        orderIndex: 6,
      },
      { sourceSeedId: "toiletries", label: "Đồ vệ sinh cá nhân", isRequired: true, orderIndex: 7 },
      { sourceSeedId: "medicine", label: "Thuốc", isRequired: true, orderIndex: 8 },
      { sourceSeedId: "first_aid", label: "Đồ sơ cứu cơ bản", isRequired: true, orderIndex: 9 },
      { sourceSeedId: "child_essentials", label: "Đồ cần thiết cho con", isRequired: true, orderIndex: 10 },
      { sourceSeedId: "family_essentials", label: "Đồ cần thiết cho gia đình", isRequired: true, orderIndex: 11 },
      { sourceSeedId: "home_turned_off", label: "Đã tắt nhà", isRequired: true, orderIndex: 12 },
    ],
  },
  {
    sourceSeedId: "character.pilgrimage-readiness-check",
    title: "Pilgrimage Readiness Check",
    description: "Pack Check: Pilgrimage Readiness Check.",
    pathSeedId: "character",
    uiPathId: "character",
    tone: "evening",
    surfacePolicy: "today_when_due",
    iconFileName: "pilgrimage-readiness-check.svg",
    items: [
      { sourceSeedId: "modest_clothing", label: "Trang phục lịch sự", isRequired: true, orderIndex: 0 },
      { sourceSeedId: "offerings", label: "Lễ vật", isRequired: true, orderIndex: 1 },
      { sourceSeedId: "incense_candles_lighter", label: "Hương, nến và bật lửa", isRequired: true, orderIndex: 2 },
      { sourceSeedId: "flowers", label: "Hoa", isRequired: true, orderIndex: 3 },
      { sourceSeedId: "small_cash", label: "Tiền lẻ", isRequired: true, orderIndex: 4 },
      { sourceSeedId: "water", label: "Nước", isRequired: true, orderIndex: 5 },
      { sourceSeedId: "comfortable_shoes", label: "Giày thoải mái", isRequired: true, orderIndex: 6 },
      { sourceSeedId: "hat", label: "Mũ", isRequired: true, orderIndex: 7 },
      { sourceSeedId: "rain_cover", label: "Đồ che mưa", isRequired: true, orderIndex: 8 },
    ],
  },
] as const;

export type PackCheckSourceSeedId = (typeof PACK_CHECK_CATALOG)[number]["sourceSeedId"];

export function getPackCheckCatalogEntryBySourceSeedId(sourceSeedId?: string | null) {
  if (!sourceSeedId) {
    return null;
  }
  return PACK_CHECK_CATALOG.find((entry) => entry.sourceSeedId === sourceSeedId) ?? null;
}

export function getPackCheckCatalogEntryByTitle(title?: string | null) {
  if (!title) {
    return null;
  }
  return PACK_CHECK_CATALOG.find((entry) => entry.title === title) ?? null;
}
