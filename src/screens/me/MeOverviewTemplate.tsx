import { StyleSheet, View } from "react-native";
import { getCopy } from "../../i18n/copy";
import { BottomTabId, Locale } from "../../types/ui";
import { UtilityIconButton } from "../../components/domain/icons/UtilityIconButton";
import { BottomNavBar } from "../../components/primitives/BottomNavBar";
import { FieldJournalScreenShell } from "../../components/primitives/FieldJournalScreenShell";
import { WMAccordion } from "../../components/primitives/WMAccordion";
import { JournalCard } from "../../components/primitives/JournalCard";
import { PageHeader } from "../../components/primitives/PageHeader";
import { BackupStatusRow } from "../../components/me/BackupStatusRow";
import { MeHubCard } from "../../components/me/MeHubCard";
import { PrivacyStatusBadge } from "../../components/me/PrivacyStatusBadge";
import { PrivateDocumentsCard } from "../../components/me/PrivateDocumentsCard";
import { SettingsGroupCard } from "../../components/me/SettingsGroupCard";
import { SettingsRow } from "../../components/me/SettingsRow";
import { WaymarkPrincipleCard } from "../../components/me/WaymarkPrincipleCard";
import { MeOverviewTemplateData } from "../../components/me/types";

export type MeOverviewTemplateProps = MeOverviewTemplateData;

type Props = MeOverviewTemplateProps & {
  showBottomNav?: boolean;
  onTabPress?: (tab: Exclude<BottomTabId, "capture">) => void;
};

export function MeOverviewTemplate({
  locale,
  reducedMotion,
  actions,
  privateDocumentsCard,
  hubItems = [],
  settings,
  principle,
  showBottomNav = true,
  onTabPress,
}: Props) {
  const c = getCopy(locale).me;
  const showSettingsCard = Boolean(settings?.privacy || settings?.backup || settings?.rows?.length);
  const settingGroups =
    settings?.groups?.filter((group) => group.rows.length > 0 || Boolean(group.privateDocumentsCard) || Boolean(group.hubItems?.length)) ?? [];
  const hasStructuredGroups = settingGroups.length > 0;
  const planningHubIds = new Set(["weekly-signal", "backlog"]);
  const planningHubItems = hubItems.filter((item) => planningHubIds.has(item.id));
  const standaloneHubItems = hubItems.filter((item) => !planningHubIds.has(item.id));
  const settingGroupById = new Map(settingGroups.map((group) => [group.id, group] as const));
  const devModeRows = settingGroupById.get("dev-mode")?.rows ?? [];
  const renderedGroups = hasStructuredGroups
    ? [
        privateDocumentsCard
          ? {
              id: "private-documents",
              title: c.privateDocuments.title,
              subtitle: locale === "vi" ? "Tai lieu rieng tu" : "Private vault",
              privateDocumentsCard,
              rows: [],
            }
          : null,
        {
          id: "planning",
          title: locale === "vi" ? "Planning" : "Planning",
          subtitle: locale === "vi" ? "Lich tuan va backlog" : "Weekly plans and backlog",
          hubItems: planningHubItems,
          rows: [],
        },
        {
          id: "basecamp",
          title: locale === "vi" ? "Basecamp Settings" : "Basecamp Settings",
          subtitle: locale === "vi" ? "Drive, sync va signal" : "Drive, sync, and signals",
          childGroups: [
            settingGroupById.get("prod-google-drive"),
            settingGroupById.get("prod-turso-sync"),
            settingGroupById.get("prod-phone-signal-settings"),
          ].filter(Boolean),
          rows: settings?.rows ?? [],
        },
        {
          id: "dev-mode",
          title: locale === "vi" ? "Dev Mode" : "Dev Mode",
          subtitle: locale === "vi" ? "Debug va test tools" : "Debug and test tools",
          hubItems: standaloneHubItems,
          rows: devModeRows,
        },
      ].filter((group): group is NonNullable<typeof group> => Boolean(group))
    : settingGroups;

  return (
    <FieldJournalScreenShell botanicalAmbient reducedMotion={reducedMotion} variant="navAware">
      <PageHeader
        actions={
          actions?.notifications || actions?.more ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {actions.notifications ? (
                <UtilityIconButton
                  accessibilityLabel={actions.notifications.accessibilityLabel ?? c.header.notifications}
                  icon="bell"
                  onPress={actions.notifications.onPress}
                  size="md"
                />
              ) : null}
              {actions.more ? (
                <UtilityIconButton
                  accessibilityLabel={actions.more.accessibilityLabel ?? c.header.more}
                  icon="more"
                  onPress={actions.more.onPress}
                  size="md"
                />
              ) : null}
            </View>
          ) : undefined
        }
        decorativeAccent
        logoSize="lg"
        logoVariant="primary"
        subtitle={c.header.subtitle}
        title={c.header.title}
        variant="standard"
      />

      {!hasStructuredGroups && privateDocumentsCard ? (
        <PrivateDocumentsCard
          accessibilityLabel={privateDocumentsCard.accessibilityLabel ?? c.privateDocuments.accessibilityLabel}
          badgeLabel={c.privateDocuments.badge}
          disabled={privateDocumentsCard.disabled}
          loading={privateDocumentsCard.loading}
          onPress={privateDocumentsCard.onPress}
          reducedMotion={reducedMotion}
          subtitle={c.privateDocuments.subtitle}
          title={c.privateDocuments.title}
        />
      ) : null}

      {!hasStructuredGroups && planningHubItems.length > 0 ? (
        <WMAccordion
          defaultExpanded={false}
          reducedMotion={reducedMotion}
          subtitle={
            locale === "vi"
              ? "Weekly Signal va Backlog trong mot cum."
              : "Weekly Signal and Backlog in one place."
          }
          title={locale === "vi" ? "Planning" : "Planning"}
        >
          {planningHubItems.map((item) => (
            <MeHubCard
              accessibilityHint={item.accessibilityHint}
              accessibilityLabel={item.accessibilityLabel}
              badgeLabel={item.badgeLabel}
              disabled={item.disabled}
              helperText={item.helperText}
              icon={item.icon}
              key={item.id}
              loading={item.loading}
              onPress={item.onPress}
              reducedMotion={reducedMotion}
              subtitle={item.subtitle}
              title={item.title}
              tone={item.tone}
            />
          ))}
        </WMAccordion>
      ) : null}

      {!hasStructuredGroups ? standaloneHubItems.map((item) => (
        <MeHubCard
          accessibilityHint={item.accessibilityHint}
          accessibilityLabel={item.accessibilityLabel}
          badgeLabel={item.badgeLabel}
          disabled={item.disabled}
          helperText={item.helperText}
          icon={item.icon}
          key={item.id}
          loading={item.loading}
          onPress={item.onPress}
          reducedMotion={reducedMotion}
          subtitle={item.subtitle}
          title={item.title}
          tone={item.tone}
        />
      )) : null}

      {!hasStructuredGroups && showSettingsCard ? (
        <SettingsGroupCard subtitle={c.settings.subtitle} title={c.settings.title}>
          {settings?.privacy ? (
            <SettingsRow
              accessibilityHint={settings.privacy.accessibilityHint}
              accessibilityLabel={settings.privacy.accessibilityLabel}
              disabled={settings.privacy.disabled}
              icon="status.protected"
              loading={settings.privacy.loading}
              onPress={settings.privacy.onPress}
              statusBadge={<PrivacyStatusBadge label={settings.privacy.label} state={settings.privacy.status} />}
              subtitle={settings.privacy.subtitle}
              title={settings.privacy.title}
            />
          ) : null}

          {settings?.backup ? (
            <BackupStatusRow
              accessibilityHint={settings.backup.accessibilityHint}
              accessibilityLabel={settings.backup.accessibilityLabel ?? c.settings.backupAccessibilityLabel}
              copy={c.backup}
              disabled={settings.backup.disabled}
              loading={settings.backup.loading}
              locale={locale}
              onPress={settings.backup.onPress}
              status={settings.backup.status}
              title={c.settings.backupTitle}
            />
          ) : null}

          {settings?.rows?.map((row) => (
            <SettingsRow
              accessibilityHint={row.accessibilityHint}
              accessibilityLabel={row.accessibilityLabel}
              disabled={row.disabled}
              icon={row.icon}
              key={row.id}
              loading={row.loading}
              onPress={row.onPress}
              statusBadge={row.statusBadge}
              subtitle={row.subtitle}
              title={row.title}
            />
          ))}
        </SettingsGroupCard>
      ) : null}

      {renderedGroups.map((group) => (
        <WMAccordion
          defaultExpanded={false}
          key={group.id}
          reducedMotion={reducedMotion}
          size="major"
          subtitle={group.subtitle}
          title={group.title}
        >
          {group.privateDocumentsCard ? (
            <PrivateDocumentsCard
              accessibilityLabel={group.privateDocumentsCard.accessibilityLabel ?? c.privateDocuments.accessibilityLabel}
              badgeLabel={c.privateDocuments.badge}
              disabled={group.privateDocumentsCard.disabled}
              loading={group.privateDocumentsCard.loading}
              onPress={group.privateDocumentsCard.onPress}
              reducedMotion={reducedMotion}
              subtitle={c.privateDocuments.subtitle}
              title={c.privateDocuments.title}
            />
          ) : null}

          {group.hubItems?.map((item) => (
            <MeHubCard
              accessibilityHint={item.accessibilityHint}
              accessibilityLabel={item.accessibilityLabel}
              badgeLabel={item.badgeLabel}
              disabled={item.disabled}
              helperText={item.helperText}
              icon={item.icon}
              key={item.id}
              loading={item.loading}
              onPress={item.onPress}
              reducedMotion={reducedMotion}
              subtitle={item.subtitle}
              title={item.title}
              tone={item.tone}
            />
          ))}

          {(group.childGroups ?? []).filter((childGroup): childGroup is NonNullable<typeof childGroup> => Boolean(childGroup)).map((childGroup) => (
            <WMAccordion
              defaultExpanded={false}
              key={childGroup.id}
              reducedMotion={reducedMotion}
              size="level2"
              subtitle={childGroup.subtitle}
              title={childGroup.title}
            >
              {childGroup.rows.map((row) => (
                <SettingsRow
                  accessibilityHint={row.accessibilityHint}
                  accessibilityLabel={row.accessibilityLabel}
                  disabled={row.disabled}
                  icon={row.icon}
                  key={row.id}
                  loading={row.loading}
                  onPress={row.onPress}
                  statusBadge={row.statusBadge}
                  subtitle={row.subtitle}
                  title={row.title}
                  titleVariant="bodyStrong"
                />
              ))}
            </WMAccordion>
          ))}

          {group.rows.map((row) => (
            <JournalCard contentStyle={styles.level2RowCardContent} key={row.id} preserveSurfaceColorOnPress variant="standard">
              <SettingsRow
                accessibilityHint={row.accessibilityHint}
                accessibilityLabel={row.accessibilityLabel}
                disabled={row.disabled}
                icon={row.icon}
                loading={row.loading}
                onPress={row.onPress}
                statusBadge={row.statusBadge}
                subtitle={row.subtitle}
                title={row.title}
                titleVariant="cardTitle"
              />
            </JournalCard>
          ))}
        </WMAccordion>
      ))}

      {principle === null ? null : (
        <WaymarkPrincipleCard
          accessibilityLabel={principle?.accessibilityLabel}
          body={principle?.body ?? c.principle.body}
          onPress={principle?.onPress}
          reducedMotion={reducedMotion}
          title={principle?.title ?? c.principle.title}
        />
      )}

      {showBottomNav ? <BottomNavBar activeTab="me" locale={locale} onTabPress={onTabPress} /> : null}
    </FieldJournalScreenShell>
  );
}

const styles = StyleSheet.create({
  level2RowCardContent: {
    padding: 20,
  },
});
