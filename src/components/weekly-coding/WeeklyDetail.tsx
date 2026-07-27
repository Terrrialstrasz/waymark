import { WeeklyDetailTemplate } from "./WeeklyDetailTemplate";
import type { ComponentProps } from "react";

export type WeeklyDetailProps = ComponentProps<typeof WeeklyDetailTemplate>;

export function WeeklyDetail(props: WeeklyDetailProps) {
  return <WeeklyDetailTemplate {...props} />;
}
