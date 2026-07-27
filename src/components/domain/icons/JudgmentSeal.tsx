import { WaymarkJudgmentSemanticName } from "../../../design/waymark-icon-map";
import { WaymarkIcon } from "../../primitives/WaymarkIcon";

type Props = {
  seal: WaymarkJudgmentSemanticName;
  decorative?: boolean;
  accessibilityLabel?: string;
};

export function JudgmentSeal({ seal, decorative = true, accessibilityLabel }: Props) {
  return (
    <WaymarkIcon
      accessibilityLabel={decorative ? undefined : accessibilityLabel ?? `judgment.${seal}`}
      customWidth={84}
      decorative={decorative}
      semanticName={`judgment.${seal}`}
      size="custom"
    />
  );
}
