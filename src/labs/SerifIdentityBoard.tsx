import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { spacing } from "../theme/tokens";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";

export function SerifIdentityBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="SerifIdentityBoard"
        subtitle="Serif should hold identity at the screen, page, and card-title levels without becoming literary UI."
      >
        <WMText variant="displayHero">Kết quả hôm nay được bảo vệ</WMText>
        <WMText variant="screenTitle">Close the Day</WMText>
        <WMText variant="pageTitle">Gia đình & Nhà cửa</WMText>
      </BoardSection>

      <WMCard>
        <WMText variant="cardTitle">A small honest mark still counts</WMText>
        <WMText variant="bodySm">
          Card titles should feel like private journal entries, not Jira tickets or dashboard panels.
        </WMText>
      </WMCard>
    </View>
  );
}
