import { Alert, StyleSheet, View } from "react-native";
import { BackupStatusRow } from "../components/me/BackupStatusRow";
import { MeHubCard } from "../components/me/MeHubCard";
import { PrivacyStatusBadge } from "../components/me/PrivacyStatusBadge";
import { PrivateDocumentsCard } from "../components/me/PrivateDocumentsCard";
import { SettingsGroupCard } from "../components/me/SettingsGroupCard";
import { SettingsRow } from "../components/me/SettingsRow";
import { WaymarkPrincipleCard } from "../components/me/WaymarkPrincipleCard";
import { MeOverviewTemplate } from "../screens/me/MeOverviewTemplate";
import { getCopy } from "../i18n/copy";
import { spacing } from "../theme/tokens";
import { Locale } from "../types/ui";
import { BoardSection } from "./BoardPrimitives";

type Props = {
  locale: Locale;
};

export function MeComponentsBoard({ locale }: Props) {
  const c = getCopy(locale).me;
  const backlogCountLabel = formatCountLabel(12, locale);
  const longVietnamesePrinciple =
    "Codex viết nên Tấm Bản Đồ để giữ phương hướng thật rõ, còn tôi để lại Dấu Mốc bằng những việc đã thực sự được sống qua.";

  return (
    <View style={styles.stack}>
      <BoardSection title="MeOverviewTemplate" subtitle="All features enabled.">
        <View style={styles.templateViewport}>
          <MeOverviewTemplate
            actions={{
              more: { onPress: () => Alert.alert("More") },
              notifications: { onPress: () => Alert.alert("Notifications") },
            }}
            hubItems={[
              {
                id: "weekly-coding",
                title: c.weeklyCodingHub.title,
                subtitle: c.weeklyCodingHub.subtitle,
                icon: "entity.weeklyCodingReport",
                tone: "blue",
                helperText: c.weeklyCodingHub.helperText,
                onPress: () => Alert.alert("Weekly Coding"),
              },
              {
                id: "backlog",
                title: c.backlogHub.title,
                subtitle: c.backlogHub.subtitle,
                icon: "entity.backlog",
                tone: "green",
                badgeLabel: backlogCountLabel,
                onPress: () => Alert.alert("Backlog"),
              },
            ]}
            locale={locale}
            principle={{}}
            privateDocumentsCard={{ onPress: () => Alert.alert("Private Documents") }}
            settings={{
              backup: { onPress: () => Alert.alert("Backup"), status: { kind: "lastBackupSuccess", lastBackupAt: new Date() } },
              privacy: {
                title: locale === "vi" ? "Quyền riêng tư" : "Privacy",
                subtitle: locale === "vi" ? "Trạng thái bảo vệ hiện tại của bạn." : "Your current protection state.",
                status: "protected",
                label: locale === "vi" ? "Đã xác minh" : "Verified",
                onPress: () => Alert.alert("Privacy"),
              },
              rows: [
                {
                  id: "notifications",
                  title: locale === "vi" ? "Thông báo" : "Notifications",
                  subtitle: locale === "vi" ? "Chọn những lời nhắc bạn muốn giữ lại." : "Choose which quiet reminders you keep.",
                  icon: "utility.bell",
                  onPress: () => Alert.alert("Notifications"),
                },
              ],
            }}
          />
        </View>
      </BoardSection>

      <BoardSection title="MeOverviewTemplate" subtitle="Private Documents disabled.">
        <View style={styles.templateViewport}>
          <MeOverviewTemplate
            hubItems={[
              {
                id: "weekly-coding",
                title: c.weeklyCodingHub.title,
                subtitle: c.weeklyCodingHub.subtitle,
                icon: "entity.weeklyCodingReport",
                tone: "blue",
                onPress: () => Alert.alert("Weekly Coding"),
              },
              {
                id: "backlog",
                title: c.backlogHub.title,
                subtitle: c.backlogHub.subtitle,
                icon: "entity.backlog",
                tone: "green",
                badgeLabel: backlogCountLabel,
                onPress: () => Alert.alert("Backlog"),
              },
            ]}
            locale={locale}
            principle={{}}
            settings={{
              backup: { status: { kind: "lastBackupSuccess", lastBackupAt: new Date("2026-05-14T08:10:00") } },
              rows: [
                {
                  id: "preferences",
                  title: locale === "vi" ? "Tùy chọn" : "Preferences",
                  subtitle: locale === "vi" ? "Nhịp hiển thị và sự yên tĩnh của ứng dụng." : "Display rhythm and app quietness.",
                  icon: "nav.me",
                  onPress: () => Alert.alert("Preferences"),
                },
              ],
            }}
          />
        </View>
      </BoardSection>

      <BoardSection title="MeOverviewTemplate" subtitle="Local Backup disabled.">
        <View style={styles.templateViewport}>
          <MeOverviewTemplate
            hubItems={[
              {
                id: "weekly-coding",
                title: c.weeklyCodingHub.title,
                subtitle: c.weeklyCodingHub.subtitle,
                icon: "entity.weeklyCodingReport",
                tone: "blue",
                onPress: () => Alert.alert("Weekly Coding"),
              },
              {
                id: "backlog",
                title: c.backlogHub.title,
                subtitle: c.backlogHub.subtitle,
                icon: "entity.backlog",
                tone: "green",
                badgeLabel: backlogCountLabel,
                onPress: () => Alert.alert("Backlog"),
              },
            ]}
            locale={locale}
            principle={{}}
            privateDocumentsCard={{ onPress: () => Alert.alert("Private Documents") }}
            settings={{
              privacy: {
                title: locale === "vi" ? "Quyền riêng tư" : "Privacy",
                subtitle: locale === "vi" ? "Trạng thái bảo vệ hiện tại của bạn." : "Your current protection state.",
                status: "neutral",
                label: locale === "vi" ? "Khả dụng" : "Available",
              },
              rows: [
                {
                  id: "notifications",
                  title: locale === "vi" ? "Thông báo" : "Notifications",
                  subtitle: locale === "vi" ? "Chọn những lời nhắc bạn muốn giữ lại." : "Choose which quiet reminders you keep.",
                  icon: "utility.bell",
                  onPress: () => Alert.alert("Notifications"),
                },
              ],
            }}
          />
        </View>
      </BoardSection>

      <BoardSection title="MeOverviewTemplate" subtitle="No backlog count available.">
        <View style={styles.templateViewport}>
          <MeOverviewTemplate
            hubItems={[
              {
                id: "weekly-coding",
                title: c.weeklyCodingHub.title,
                subtitle: c.weeklyCodingHub.subtitle,
                icon: "entity.weeklyCodingReport",
                tone: "blue",
                onPress: () => Alert.alert("Weekly Coding"),
              },
              {
                id: "backlog",
                title: c.backlogHub.title,
                subtitle: c.backlogHub.subtitle,
                icon: "entity.backlog",
                tone: "green",
                onPress: () => Alert.alert("Backlog"),
              },
            ]}
            locale={locale}
            principle={{}}
            privateDocumentsCard={{ onPress: () => Alert.alert("Private Documents") }}
            settings={{
              backup: { status: { kind: "neverBackedUp" } },
            }}
          />
        </View>
      </BoardSection>

      <BoardSection title="MeHubCard" subtitle="Default, with badge, disabled.">
        <View style={styles.stackSm}>
          <MeHubCard
            icon="entity.weeklyCodingReport"
            onPress={() => Alert.alert("Weekly Coding")}
            subtitle={c.weeklyCodingHub.subtitle}
            title={c.weeklyCodingHub.title}
            tone="blue"
          />
          <MeHubCard
            badgeLabel={backlogCountLabel}
            icon="entity.backlog"
            onPress={() => Alert.alert("Backlog")}
            subtitle={c.backlogHub.subtitle}
            title={c.backlogHub.title}
            tone="green"
          />
          <MeHubCard
            disabled
            icon="entity.backlog"
            subtitle={c.backlogHub.subtitle}
            title={c.backlogHub.title}
            tone="ivory"
          />
        </View>
      </BoardSection>

      <BoardSection title="PrivateDocumentsCard" subtitle="Enabled hero card.">
        <PrivateDocumentsCard
          badgeLabel={c.privateDocuments.badge}
          onPress={() => Alert.alert("Private Documents")}
          subtitle={c.privateDocuments.subtitle}
          title={c.privateDocuments.title}
        />
      </BoardSection>

      <BoardSection title="SettingsGroupCard" subtitle="One row, three rows, and long localized labels.">
        <View style={styles.stackSm}>
          <SettingsGroupCard subtitle={c.settings.subtitle} title={c.settings.title}>
            <SettingsRow
              icon="utility.bell"
              onPress={() => Alert.alert("Notifications")}
              subtitle={locale === "vi" ? "Chọn những lời nhắc bạn muốn giữ lại." : "Choose which quiet reminders you keep."}
              title={locale === "vi" ? "Thông báo" : "Notifications"}
            />
          </SettingsGroupCard>

          <SettingsGroupCard subtitle={c.settings.subtitle} title={c.settings.title}>
            <SettingsRow
              icon="status.protected"
              onPress={() => Alert.alert("Privacy")}
              statusBadge={<PrivacyStatusBadge label={locale === "vi" ? "Đã xác minh" : "Verified"} state="protected" />}
              subtitle={locale === "vi" ? "Trạng thái bảo vệ hiện tại của bạn." : "Your current protection state."}
              title={locale === "vi" ? "Quyền riêng tư" : "Privacy"}
            />
            <BackupStatusRow copy={c.backup} locale={locale} status={{ kind: "lastBackupSuccess", lastBackupAt: new Date("2026-05-14T08:10:00") }} title={c.settings.backupTitle} />
            <SettingsRow
              icon="utility.bell"
              onPress={() => Alert.alert("Notifications")}
              subtitle={
                locale === "vi"
                  ? "Chọn những lời nhắc bạn muốn giữ lại khi các tiêu đề và mô tả dài hơn bình thường."
                  : "Choose which quiet reminders you keep when labels stretch a little longer than usual."
              }
              title={
                locale === "vi"
                  ? "Thông báo dịu và nhắc nhở nền rất dài để thử xuống dòng"
                  : "Quiet notifications and longer ambient reminder labels"
              }
            />
          </SettingsGroupCard>
        </View>
      </BoardSection>

      <BoardSection title="SettingsRow" subtitle="Default, with badge, disabled.">
        <View style={styles.stackSm}>
          <SettingsRow
            icon="utility.bell"
            onPress={() => Alert.alert("Notifications")}
            subtitle={locale === "vi" ? "Chọn những lời nhắc bạn muốn giữ lại." : "Choose which quiet reminders you keep."}
            title={locale === "vi" ? "Thông báo" : "Notifications"}
          />
          <SettingsRow
            icon="status.protected"
            onPress={() => Alert.alert("Privacy")}
            statusBadge={<PrivacyStatusBadge label={locale === "vi" ? "Đã xác minh" : "Verified"} state="protected" />}
            subtitle={locale === "vi" ? "Trạng thái bảo vệ hiện tại của bạn." : "Your current protection state."}
            title={locale === "vi" ? "Quyền riêng tư" : "Privacy"}
          />
          <SettingsRow
            disabled
            icon="utility.calendar"
            subtitle={locale === "vi" ? "Sao lưu chưa khả dụng trên thiết bị này." : "Backup is not available on this device."}
            title={c.settings.backupTitle}
          />
        </View>
      </BoardSection>

      <BoardSection title="PrivacyStatusBadge" subtitle="Protected, neutral, unavailable, warning.">
        <View style={styles.badgeRow}>
          <PrivacyStatusBadge label={locale === "vi" ? "Đã xác minh" : "Verified"} state="protected" />
          <PrivacyStatusBadge label={locale === "vi" ? "Khả dụng" : "Available"} state="neutral" />
          <PrivacyStatusBadge label={locale === "vi" ? "Chưa cấu hình" : "Not configured"} state="unavailable" />
          <PrivacyStatusBadge label={locale === "vi" ? "Cần chú ý" : "Needs attention"} state="warning" />
        </View>
      </BoardSection>

      <BoardSection title="BackupStatusRow" subtitle="Never backed up, success today, success older date, in progress, failed, unavailable.">
        <View style={styles.stackSm}>
          <BackupStatusRow copy={c.backup} locale={locale} status={{ kind: "neverBackedUp" }} title={c.settings.backupTitle} />
          <BackupStatusRow copy={c.backup} locale={locale} status={{ kind: "lastBackupSuccess", lastBackupAt: new Date() }} title={c.settings.backupTitle} />
          <BackupStatusRow copy={c.backup} locale={locale} status={{ kind: "lastBackupSuccess", lastBackupAt: new Date("2026-05-11T09:45:00") }} title={c.settings.backupTitle} />
          <BackupStatusRow copy={c.backup} locale={locale} status={{ kind: "backupInProgress" }} title={c.settings.backupTitle} />
          <BackupStatusRow copy={c.backup} locale={locale} status={{ kind: "backupFailed", failedAt: new Date("2026-05-10T18:20:00") }} title={c.settings.backupTitle} />
          <BackupStatusRow copy={c.backup} locale={locale} status={{ kind: "unavailable" }} title={c.settings.backupTitle} />
        </View>
      </BoardSection>

      <BoardSection title="WaymarkPrincipleCard" subtitle="Standard English and Vietnamese long-text test.">
        <View style={styles.stackSm}>
          <WaymarkPrincipleCard body="Codex writes the Map. I leave the Mark." title="Waymark Principle" />
          <WaymarkPrincipleCard body={longVietnamesePrinciple} title={locale === "vi" ? "Nguyên lý Waymark" : "Waymark Principle"} />
        </View>
      </BoardSection>
    </View>
  );
}

function formatCountLabel(count: number, locale: Locale) {
  const c = getCopy(locale).me;
  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US");
  const template = count === 1 ? c.count.backlogOne : c.count.backlogOther;

  return template.replace("{count}", formatter.format(count));
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  stackSm: {
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  templateViewport: {
    minHeight: 840,
    overflow: "hidden",
    borderRadius: 28,
  },
});
