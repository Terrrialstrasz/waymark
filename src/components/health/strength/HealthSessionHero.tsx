import { StyleSheet, View } from "react-native";
import { JournalCard } from "../../primitives/JournalCard";
import { WMText } from "../../primitives/Text";
import { foundationColors, spacing } from "../../../theme/tokens";
import { Locale } from "../../../types/ui";
import { SessionPhase } from "./types";
import { formatTemplate, getHealthStrengthCopy } from "./utils";
import { getPathHeroImage } from "../../../tokens/pathHeroImages";
import { WaymarkImage } from "../../primitives/WaymarkImage";

type Props = {
  locale: Locale;
  phase: SessionPhase;
  dayLabel: string;
};

export function HealthSessionHero({ locale, phase, dayLabel }: Props) {
  const copy = getHealthStrengthCopy(locale);
  const content = getHeroContent(copy, phase, dayLabel);
  const isCompact = phase !== "complete";
  const strengthHero = getPathHeroImage("health");
  const useStrongCompleteHero = phase === "complete";

  if (isCompact) {
    return (
      <JournalCard contentStyle={styles.compactContent} preserveSurfaceColorOnPress variant="nested">
        <WMText numberOfLines={1} style={styles.compactDayLabel} variant="meta">
          {formatTemplate(copy.hero.dayLabel, { dayLabel })}
        </WMText>
        <View style={styles.compactRow}>
          <WMText numberOfLines={1} style={styles.compactTitle} variant="bodyStrong">
            {content.title}
          </WMText>
          <WMText numberOfLines={1} style={styles.compactStatus} variant="meta">
            {content.status}
          </WMText>
        </View>
      </JournalCard>
    );
  }

  return (
    <JournalCard
      backgroundLayer={
        strengthHero?.assetId ? (
          <View style={styles.heroBackground}>
            <WaymarkImage
              alt={content.title}
              assetId={strengthHero.assetId}
              decorative
              imageStyle={[styles.heroBackgroundImage, useStrongCompleteHero ? styles.heroBackgroundImageStrong : null]}
              objectFit="cover"
              style={styles.heroBackgroundImageFrame}
              usage="hero"
            />
            <View style={[styles.heroBackgroundScrim, useStrongCompleteHero ? styles.heroBackgroundScrimStrong : null]} />
          </View>
        ) : null
      }
      contentStyle={styles.content}
      preserveSurfaceColorOnPress
      variant="hero"
    >
      <View style={styles.copy}>
        <WMText style={styles.dayLabel} variant="label">
          {formatTemplate(copy.hero.dayLabel, { dayLabel })}
        </WMText>
        <WMText style={styles.title} variant="pageTitle">
          {content.title}
        </WMText>
        <WMText style={styles.body} variant="bodySm">
          {content.body}
        </WMText>
      </View>
    </JournalCard>
  );
}

function getHeroContent(copy: ReturnType<typeof getHealthStrengthCopy>, phase: SessionPhase, dayLabel: string) {
  if (phase === "rest") {
    return {
      icon: "restTimer" as const,
      title: formatTemplate(copy.hero.restTitle, { dayLabel }),
      body: copy.hero.restBody,
      status: copy.hero.restStatus,
    };
  }

  if (phase === "cooldown") {
    return {
      icon: "cooldown" as const,
      title: copy.hero.cooldownTitle,
      body: copy.hero.cooldownBody,
      status: copy.hero.cooldownStatus,
    };
  }

  if (phase === "complete") {
    return {
      icon: "cooldown" as const,
      title: copy.hero.completeTitle,
      body: copy.hero.completeBody,
      status: copy.hero.completeStatus,
    };
  }

  return {
    icon: phase === "timed" ? ("sessionTimer" as const) : ("strength" as const),
    title: formatTemplate(copy.hero.strengthTitle, { dayLabel }),
    body: copy.hero.strengthBody,
    status: copy.hero.strengthStatus,
  };
}

const styles = StyleSheet.create({
  compactContent: {
    gap: 4,
    paddingVertical: spacing.sm,
  },
  compactDayLabel: {
    color: foundationColors.gold.deep,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  compactTitle: {
    flex: 1,
    color: foundationColors.ink.primary,
  },
  compactStatus: {
    color: foundationColors.ink.secondary,
  },
  content: {
    gap: spacing.xs,
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBackgroundImageFrame: {
    width: "100%",
    height: "100%",
  },
  heroBackgroundImage: {
    opacity: 0.24,
  },
  heroBackgroundImageStrong: {
    opacity: 0.38,
  },
  heroBackgroundScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 251, 241, 0.84)",
  },
  heroBackgroundScrimStrong: {
    backgroundColor: "rgba(255, 251, 241, 0.68)",
  },
  copy: {
    gap: spacing.xs,
  },
  dayLabel: {
    color: foundationColors.gold.deep,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  body: {
    color: foundationColors.ink.secondary,
    maxWidth: "88%",
  },
});
