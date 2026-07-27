import type { CloseTrailDisciplineCluster } from "./__fixtures__/closeTrail.fixtures";
import type { Locale } from "../../types/ui";

export function resolveSelectedDisciplines(
  cluster: CloseTrailDisciplineCluster,
  selectedKeys: string[],
  locale: Locale,
) {
  return cluster.items
    .filter((item) => selectedKeys.includes(item.key))
    .map((item) => ({
      key: item.key,
      label: item.label[locale],
      pathId: item.pathId,
      expeditionId: item.expeditionId,
      milestoneId: item.milestoneId,
    }));
}
