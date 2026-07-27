import { StyleSheet, View } from "react-native";
import { foundationColors } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";
import { JudgmentSeal } from "./icons/JudgmentSeal";

type Props = {
  locale: Locale;
  title?: string;
  body?: string;
  meta?: string;
};

export function CloseTrailSummaryCard({ locale, title, body, meta }: Props) {
  return (
    <WMCard decorationPreset="resultSeal" tint="gold">
      <View style={styles.row}>
        <View style={styles.sealWrap}>
          <JudgmentSeal seal="dayClosed" />
        </View>
        <View style={styles.copyWrap}>
          <WMText variant="cardTitle">{title ?? (locale === "en" ? "Today is marked. Rest." : "Hom nay da co dau. Nghi thoi.")}</WMText>
          <WMText style={styles.copy} variant="body">
            {body ??
              (locale === "en"
                ? "Three planned marks completed. One mark was postponed without shame."
                : "Ba dau moc theo ke hoach da hoan tat. Mot viec duoc doi lai ma khong can xau ho hay ep thanh that bai.")}
          </WMText>
          <WMText variant="meta">{meta ?? (locale === "en" ? "Planned 4 · Completed 3" : "Da len 4 · Hoan tat 3")}</WMText>
        </View>
      </View>
    </WMCard>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  sealWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 84,
  },
  copyWrap: {
    flex: 1,
    gap: 6,
  },
  copy: {
    color: foundationColors.ink.secondary,
  },
});
