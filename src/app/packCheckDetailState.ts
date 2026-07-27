import type { PackCheckDetailReadModel } from "../lib/waymark/shellAppAdapters";
import { PackCheckInstanceStatus } from "../domain/waymark";

type PackCheckItemLike = {
  checked: boolean;
  required?: boolean;
};

export function derivePackCheckActionState(
  items: PackCheckItemLike[],
  isDisabled: boolean,
  status?: PackCheckInstanceStatus,
) {
  const anyChecked = items.some((item) => item.checked);
  const requiredItems = items.filter((item) => item.required !== false);
  const allRequiredChecked =
    requiredItems.length === 0 ? true : requiredItems.every((item) => item.checked);
  const alreadyCompleted = status === PackCheckInstanceStatus.Completed;

  return {
    anyChecked,
    allRequiredChecked,
    canClear: !isDisabled && anyChecked,
    canComplete: !isDisabled && allRequiredChecked && !alreadyCompleted,
  };
}

export function derivePackCheckHeroState(items: PackCheckItemLike[], status?: PackCheckInstanceStatus) {
  const totalCount = items.length;
  const isEmpty = totalCount === 0;
  const allChecked = totalCount > 0 && items.every((item) => item.checked);

  return {
    isEmpty,
    allChecked,
    isCompleted: status === PackCheckInstanceStatus.Completed,
  };
}

export function optimisticallyTogglePackCheckItem(
  data: PackCheckDetailReadModel,
  itemId: string,
  checked: boolean,
): PackCheckDetailReadModel {
  return {
    ...data,
    items: data.items.map((item) => (item.id === itemId ? { ...item, checked } : item)),
  };
}

export function optimisticallyClearPackCheckItems(
  data: PackCheckDetailReadModel,
): PackCheckDetailReadModel {
  return {
    ...data,
    items: data.items.map((item) => (item.checked ? { ...item, checked: false } : item)),
  };
}
