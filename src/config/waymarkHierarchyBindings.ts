export type WaymarkHierarchyBindingType = "path" | "expedition" | "milestone";

export type WaymarkHierarchyBinding = {
  entityType: WaymarkHierarchyBindingType;
  sourceSeedId: string;
  id: string;
  parentId?: string;
  label: string;
};

const PATH_BINDINGS = [
  ["career", "path_mq3pmhk6_6q3e2fvj", "Career"],
  ["snag", "path_mq3pmhkc_xuxoi0wq", "SNAG Golf Vietnam"],
  ["family", "path_mq3pmhki_gb7awock", "Family & Home"],
  ["health", "path_mq3pmhkp_ud2cjflc", "Health & Body"],
  ["style", "path_mq3pmhkv_2vgkobjs", "Style & Class"],
  ["golf", "path_mq3pmhl1_wpvj7spt", "Golf Craft"],
  ["character", "path_mq3pmhl8_sc9skeva", "Stoicism & Character"],
] as const;

const EXPEDITION_BINDINGS = [
  ["career.sch.expedition.smart-counter-hub-project", "expedition_mq3pmhlf_aig2n4pg", "path_mq3pmhk6_6q3e2fvj", "SCH Smart Counter Hub Project"],
  ["snag.growth.expedition", "expedition_mq3pmhlm_eaxvjz0x", "path_mq3pmhkc_xuxoi0wq", "Xay dung & maintain website SNAG Golf"],
  ["family.english.expedition", "expedition_mq3pmhlt_67fc440m", "path_mq3pmhki_gb7awock", "Day con Tieng Anh"],
  ["family.waymark.expedition", "expedition_mq3pmhm0_5moqubq6", "path_mq3pmhl8_sc9skeva", "Building Waymark"],
  ["family.weekend.expedition", "expedition_mqpvkguy_b2o1flj2", "path_mq3pmhki_gb7awock", "Family Weekend"],
  ["family.rhythm.expedition", "expedition_mqpvkgw9_leizpz82", "path_mq3pmhki_gb7awock", "Family rhythm"],
  ["family.vietnam-trip.expedition", "expedition_mq3pmhm8_2kevyhwg", "path_mq3pmhki_gb7awock", "Ke hoach Du lich Viet Nam"],
  ["family.tony-golf.expedition", "expedition_mr616w17_7vs3kjc5", "path_mq3pmhki_gb7awock", "Tony Golf"],
  ["career.ba-core.expedition", "expedition_mqyfz6ui_2tgw2wtp", "path_mq3pmhk6_6q3e2fvj", "Transfer kien thuc BA len Core"],
  ["health.cut70.expedition", "expedition_mq3pmhmf_lyzded04", "path_mq3pmhkp_ud2cjflc", "Cut to 70"],
  ["golf.beginning.expedition", "expedition_mq3pmhmn_vq52p8ej", "path_mq3pmhl1_wpvj7spt", "Beginning: From SNAG to 3D Line"],
] as const;

const MILESTONE_BINDINGS = [
  ["career.sch.milestone.2026-06.smb-card-service-confirmation", "milestone_mq3pmhnw_dpyd6k12", "expedition_mq3pmhlf_aig2n4pg", "SMB card service confirmation"],
  ["career.sch.milestone.2026-06.card-onboarding-release", "milestone_mq3pmhmv_v9eg17xn", "expedition_mq3pmhlf_aig2n4pg", "Card onboarding release"],
  ["career.sch.milestone.2026-09.domestic-debit-cortex", "milestone_mq3pmhpb_ft6dlfzo", "expedition_mq3pmhlf_aig2n4pg", "Domestic debit Cortex"],
  ["health.cut70.milestone.76kg", "milestone_mq3pmht8_lyjbmwfu", "expedition_mq3pmhmf_lyzded04", "Reach 76kg"],
  ["golf.beginning.milestone.home-snag-phase", "milestone_mq3pmhvt_8rwziol8", "expedition_mq3pmhmn_vq52p8ej", "Home and SNAG practice phase"],
  ["golf.beginning.weekly.snag-chipping", "milestone_msfk32bs_83z2n0l3", "expedition_mq3pmhmn_vq52p8ej", "SNAG Chipping"],
  ["golf.beginning.weekly.snag-pitching", "milestone_msfk32d5_4muc0w6b", "expedition_mq3pmhmn_vq52p8ej", "SNAG Pitching"],
  ["golf.beginning.weekly.snag-full-swing-iron", "milestone_msfk32ei_ex86xcoc", "expedition_mq3pmhmn_vq52p8ej", "SNAG Full Swing Iron"],
  ["golf.beginning.weekly.snag-full-swing-driver", "milestone_msfk32fl_4rbzx9cp", "expedition_mq3pmhmn_vq52p8ej", "SNAG Full Swing Driver"],
  ["golf.beginning.weekly.chipping-sw-pw", "milestone_msfk32h6_8xg8qwoo", "expedition_mq3pmhmn_vq52p8ej", "Chipping SW + PW"],
  ["golf.beginning.weekly.chipping-8i", "milestone_msfk32if_x1ondibj", "expedition_mq3pmhmn_vq52p8ej", "Chipping 8i"],
  ["golf.beginning.weekly.stock-pitch-sw-pw", "milestone_msfk32jr_hz94m64s", "expedition_mq3pmhmn_vq52p8ej", "Stock Pitch SW + PW"],
  ["golf.beginning.weekly.short-pitch-sw-pw", "milestone_msfk32l1_omjq4cwf", "expedition_mq3pmhmn_vq52p8ej", "Short Pitch SW + PW"],
  ["golf.beginning.weekly.long-pitch-sw-pw", "milestone_msfk32mb_mwv4ych1", "expedition_mq3pmhmn_vq52p8ej", "Long Pitch SW + PW"],
  ["golf.beginning.weekly.full-swing-sw-pw", "milestone_msfk32nx_r9ob2q6j", "expedition_mq3pmhmn_vq52p8ej", "Full Swing SW + PW"],
  ["golf.beginning.weekly.full-swing-8i-6i", "milestone_msfk32p6_ggbf4cl2", "expedition_mq3pmhmn_vq52p8ej", "Full Swing 8i + 6i"],
  ["golf.beginning.weekly.full-swing-hybrid", "milestone_msfk32qk_6ibuksas", "expedition_mq3pmhmn_vq52p8ej", "Full Swing Hybrid"],
  ["golf.beginning.weekly.driver", "milestone_msfk32ru_9l075nuv", "expedition_mq3pmhmn_vq52p8ej", "Driver"],
] as const;

export const WAYMARK_HIERARCHY_BINDINGS: readonly WaymarkHierarchyBinding[] = [
  ...PATH_BINDINGS.map(([sourceSeedId, id, label]) => ({ entityType: "path" as const, sourceSeedId, id, label })),
  ...EXPEDITION_BINDINGS.map(([sourceSeedId, id, parentId, label]) => ({
    entityType: "expedition" as const,
    sourceSeedId,
    id,
    parentId,
    label,
  })),
  ...MILESTONE_BINDINGS.map(([sourceSeedId, id, parentId, label]) => ({
    entityType: "milestone" as const,
    sourceSeedId,
    id,
    parentId,
    label,
  })),
];

const BINDING_BY_SOURCE = new Map(
  WAYMARK_HIERARCHY_BINDINGS.map((binding) => [`${binding.entityType}:${binding.sourceSeedId}`, binding] as const),
);

export function getWaymarkHierarchyBinding(
  entityType: WaymarkHierarchyBindingType,
  sourceSeedId: string,
): WaymarkHierarchyBinding | undefined {
  return BINDING_BY_SOURCE.get(`${entityType}:${sourceSeedId}`);
}
