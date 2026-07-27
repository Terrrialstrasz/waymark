import { BacklogDetailTemplate } from "./BacklogDetailTemplate";
import type { ComponentProps } from "react";

export type BacklogDetailProps = ComponentProps<typeof BacklogDetailTemplate>;

export function BacklogDetail(props: BacklogDetailProps) {
  return <BacklogDetailTemplate {...props} />;
}
