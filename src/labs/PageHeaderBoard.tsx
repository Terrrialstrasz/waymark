import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { PageHeader } from "../components/primitives/PageHeader";
import { UtilityIconButton } from "../components/domain/icons/UtilityIconButton";
import { WMBadge } from "../components/primitives/WMBadge";
import { WMText } from "../components/primitives/Text";
import { spacing } from "../theme/tokens";

export function PageHeaderBoard() {
  return (
    <View style={styles.stack}>
      <BoardSection
        title="PageHeader"
        subtitle="Serif-led screen identity with calm back/action placement and optional contextual line."
      >
        <View style={styles.stack}>
          <PageHeader
            actions={
              <>
                <UtilityIconButton accessibilityLabel="Search" icon="search" />
                <UtilityIconButton accessibilityLabel="More" icon="more" />
              </>
            }
            eyebrow="Waymark"
            subtitle="Standard root page identity"
            title="Today"
            variant="standard"
          />

          <PageHeader
            decorativeAccent
            eyebrow="Journal"
            meta={<WMBadge state="protected" />}
            subtitle="Tuesday, May 12"
            title="A quiet day with enough proof"
            variant="hero"
          />

          <PageHeader
            backLabel="Back to Today"
            meta={<WMText variant="meta">Detail screen</WMText>}
            onBack={() => undefined}
            showBack
            subtitle="Compact detail header"
            title="Daily Grooming Presence Check"
            variant="compact"
          />

          <PageHeader
            actions={<UtilityIconButton accessibilityLabel="Edit" icon="calendar" />}
            disabledActions
            subtitle="Muted action state example"
            title="Disabled action"
            variant="withActions"
          />

          <PageHeader
            isScrolled
            sticky
            subtitle="Sticky header with subtle paper wash"
            title="Memory Detail"
            variant="sticky"
          />

          <PageHeader
            title="A long English page title that still needs to breathe without letting the right-side actions crush the reading flow"
            actions={<UtilityIconButton accessibilityLabel="More" icon="more" />}
            variant="standard"
          />

          <PageHeader
            title="Mot tua de tieng Viet dai hon de kiem tra viec xuong dong ma khong lam mat di nhip doc hay chen ep cum hanh dong o ben phai"
            subtitle="Dong phu de ngan va ro"
            variant="standard"
          />

          <PageHeader
            backLabel="Quay lai"
            onBack={() => undefined}
            showBack
            title="Quiet reflection"
            subtitle="More whitespace, less utility pressure"
            variant="quiet"
          />

          <PageHeader
            actions={<UtilityIconButton accessibilityLabel="Language" icon="language" />}
            title="Dense settings-like page"
            subtitle="Compact but still warm"
            variant="dense"
          />
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
});
