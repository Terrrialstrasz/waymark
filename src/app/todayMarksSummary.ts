type MarkLike = {
  status: string;
};

export function isSettledTodayMarkStatus(status: string) {
  return status === "done" || status === "resolved";
}

export function countCompletedTodayMarks<T extends MarkLike>(marks: T[]) {
  return marks.filter((mark) => isSettledTodayMarkStatus(mark.status)).length;
}
