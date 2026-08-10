import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Image, ImageBackground, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { getWaymarkDatabaseAsync, verifyWaymarkSchemaAsync } from "../db";
import { createSQLiteRepositoryProvider } from "../db/adapters/SQLiteRepositories";
import type { UserProfile, WaymarkRepositories } from "../domain/waymark";
import type {
  CloseTrailEngine,
  DependencyEngine,
  MarkEngine,
  PackCheckEngine,
  SignalEngine,
  StrengthProgressionService,
  StrengthSessionEngine,
} from "../domain/waymark/services";
import {
  bootstrapWaymarkMap,
  createCloseTrailEngine,
  createDefaultDependencyEngine,
  createMarkEngine,
  createPackCheckEngine,
  createSignalEngine,
  createStrengthProgressionService,
  createStrengthSessionEngine,
  createDailyPlanEngine,
  reconcileLocalWeeklyPlanningMaterialization,
  type DailyPlanEngine,
  isPulledHierarchyRequiredError,
} from "../lib/waymark";
import { recordWaymarkSeedCompletedAsync, runWaymarkVaultBootGateAsync } from "./waymarkVaultBootGate";
import {
  CompositeSignalAlarmAdapter,
  WaymarkAlarmPermissionBlockedError,
  initializeWaymarkNotificationsAsync,
  requestWaymarkSignalNotificationPermissionAsync,
} from "./waymarkNotifications";
import {
  openWaymarkAlarmNotificationSettings,
  openWaymarkExactAlarmSettings,
  openWaymarkFullScreenIntentSettings,
} from "./waymarkSignalAlarm";
import { WAYMARK_MAP_CONFIG } from "../waymark-map";
import { FieldJournalScreenShell } from "../components/primitives/FieldJournalScreenShell";
import { WMEmptyState } from "../components/primitives/WMEmptyState";
import { WMButton } from "../components/primitives/WMButton";
import { WMText } from "../components/primitives/Text";
import { spacing } from "../theme/tokens";

const loadingBackgroundSource = require("../../assets/skins/generated/loading/waymark-loading-background.png");
const loadingLogoSource = require("../../assets/skins/generated/loading/waymark-botanical-stone-emblem.webp");

export const WAYMARK_LOCAL_USER_ID = "waymark-local-user";

export type WaymarkAppServices = {
  repositories: WaymarkRepositories;
  user: UserProfile;
  markEngine: MarkEngine;
  packCheckEngine: PackCheckEngine;
  dependencyEngine: DependencyEngine;
  signalEngine: SignalEngine;
  closeTrailEngine: CloseTrailEngine;
  dailyPlanEngine?: DailyPlanEngine;
  strengthProgressionService: StrengthProgressionService;
  strengthSessionEngine: StrengthSessionEngine;
};

type BootstrapState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "alarmSetup"; services: WaymarkAppServices; error: WaymarkAlarmPermissionBlockedError }
  | { status: "ready"; services: WaymarkAppServices };

const WaymarkAppContext = createContext<WaymarkAppServices | null>(null);

async function timeWaymarkBootstrapStep<T>(label: string, run: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  console.info(`[WaymarkTiming] bootstrap:${label}:start`);
  try {
    const result = await run();
    console.info(`[WaymarkTiming] bootstrap:${label}:end ${Date.now() - startedAt}ms`);
    return result;
  } catch (error) {
    console.info(`[WaymarkTiming] bootstrap:${label}:error ${Date.now() - startedAt}ms`);
    throw error;
  }
}

export function WaymarkAppProvider({ children }: PropsWithChildren) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    setState({ status: "loading" });

    void (async () => {
      let preparedServices: WaymarkAppServices | null = null;
      const bootstrapStartedAt = Date.now();
      console.info(`[WaymarkTiming] bootstrap:total:start attempt=${attempt}`);

      try {
        const db = await timeWaymarkBootstrapStep("database", () => getWaymarkDatabaseAsync());
        const report = await timeWaymarkBootstrapStep("schemaVerification", () => verifyWaymarkSchemaAsync(db));

        if (!report.ok) {
          throw new Error("Waymark schema verification failed.");
        }

        await timeWaymarkBootstrapStep("vaultBootGate", () =>
          runWaymarkVaultBootGateAsync(db, {
            mapVersion: WAYMARK_MAP_CONFIG.version,
            seedVersion: WAYMARK_MAP_CONFIG.version,
          }),
        );

        const repositories = createSQLiteRepositoryProvider();
        const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const localUserDefaults = {
          userId: WAYMARK_LOCAL_USER_ID,
          locale: "en",
          timezone: currentTimezone,
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        } as const;
        const user = await timeWaymarkBootstrapStep("userProfile", async () => {
          const initialUser = await repositories.userProfiles.getOrCreateLocalUserProfile(localUserDefaults);
          return initialUser.locale !== localUserDefaults.locale ||
            initialUser.timezone !== localUserDefaults.timezone ||
            initialUser.weekStartsOn !== localUserDefaults.weekStartsOn ||
            initialUser.closeTrailPromptTime !== localUserDefaults.closeTrailPromptTime
              ? repositories.userProfiles.updateUserProfile(initialUser.id, {
                  locale: localUserDefaults.locale,
                  timezone: localUserDefaults.timezone,
                  weekStartsOn: localUserDefaults.weekStartsOn,
                  closeTrailPromptTime: localUserDefaults.closeTrailPromptTime,
                })
              : initialUser;
        });

        await timeWaymarkBootstrapStep("notifications", () => initializeWaymarkNotificationsAsync());
        const signalEngine = createSignalEngine(repositories, new CompositeSignalAlarmAdapter(repositories));
        const strengthProgressionService = createStrengthProgressionService(repositories);

        const dailyPlanEngine = createDailyPlanEngine(repositories);
        const services: WaymarkAppServices = {
          repositories,
          user,
          markEngine: createMarkEngine(repositories, signalEngine),
          packCheckEngine: createPackCheckEngine(repositories),
          dependencyEngine: createDefaultDependencyEngine(repositories),
          signalEngine,
          closeTrailEngine: createCloseTrailEngine(repositories, signalEngine),
          dailyPlanEngine,
          strengthProgressionService,
          strengthSessionEngine: createStrengthSessionEngine(repositories, strengthProgressionService),
        };
        preparedServices = services;

        const fullDbState = await db.getFirstAsync<{ full_db_schema_version: number; last_cloud_revision: number }>(
          `SELECT full_db_schema_version, last_cloud_revision
           FROM sync_state
           WHERE full_db_schema_version = 1 AND last_cloud_revision > 0
           ORDER BY last_successful_sync_at DESC
           LIMIT 1;`,
        );
        let hierarchyWarning: Error | null = null;
        try {
          await timeWaymarkBootstrapStep("seedMap", () =>
            bootstrapWaymarkMap(
              {
                repositories,
                userId: user.id,
              },
              WAYMARK_MAP_CONFIG,
              { trustExistingPulledHierarchy: Boolean(fullDbState) },
            ),
          );
          await timeWaymarkBootstrapStep("recordSeedCompleted", () =>
            recordWaymarkSeedCompletedAsync(db, {
              mapVersion: WAYMARK_MAP_CONFIG.version,
              seedVersion: WAYMARK_MAP_CONFIG.version,
            }),
          );
          if (fullDbState) {
            const repair = await timeWaymarkBootstrapStep("fullDbPlanningRepair", () =>
              reconcileLocalWeeklyPlanningMaterialization({ executor: db as any }),
            );
            if (repair.weekPlanIds.length > 0) {
              console.info("[WaymarkBootstrap] Reconciled Full-DB planning cache", repair);
            }
          }
        } catch (error) {
          if (!isPulledHierarchyRequiredError(error)) {
            throw error;
          }
          hierarchyWarning = error;
          console.warn("[WaymarkBootstrap] Pulled hierarchy is required before seed bootstrap", error.message);
        }

        if (!cancelled) {
          setState({ status: "ready", services });
          if (hierarchyWarning) {
            Alert.alert(
              user.locale === "vi" ? "Can pull du lieu Waymark" : "Waymark data pull required",
              user.locale === "vi"
                ? `Hierarchy chua reconcile duoc voi Turso. Vao Me > Turso Sync va chay Pull Full DB.\n\n${hierarchyWarning.message}`
                : `Hierarchy could not be reconciled with Turso. Go to Me > Turso Sync and run Pull Full DB.\n\n${hierarchyWarning.message}`,
            );
          }
          console.info(`[WaymarkTiming] bootstrap:total:end ${Date.now() - bootstrapStartedAt}ms`);
        }
      } catch (error) {
        console.info(`[WaymarkTiming] bootstrap:total:error ${Date.now() - bootstrapStartedAt}ms`);
        if (error instanceof WaymarkAlarmPermissionBlockedError && preparedServices) {
          console.warn("[WaymarkBootstrap] Signal alarm setup is required", error.message);
          if (!cancelled) {
            setState({
              status: "alarmSetup",
              services: preparedServices,
              error,
            });
          }
          return;
        }

        console.error("[WaymarkBootstrap] Failed to open local journal", error);
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Waymark bootstrap failed."),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const content = useMemo(() => {
    if (state.status === "loading") {
      return (
        <ImageBackground
          imageStyle={styles.splashBackgroundImage}
          resizeMode="cover"
          source={loadingBackgroundSource}
          style={styles.splashRoot}
        >
          <StatusBar hidden />
          <View style={styles.splashLockup}>
            <Image
              accessibilityIgnoresInvertColors
              accessible={false}
              resizeMode="contain"
              source={loadingLogoSource}
              style={styles.splashLogo}
            />
            <WMText allowFontScaling={false} style={styles.splashWordmark} variant="display">
              Waymark
            </WMText>
          </View>
        </ImageBackground>
      );
    }

    if (state.status === "error") {
      return (
        <FieldJournalScreenShell variant="navAware">
          <View style={styles.centered}>
            <WMEmptyState
              body="The local journal could not open yet. You can try the bootstrap again."
              title="Waymark could not open"
            />
            <WMButton
              label="Retry"
              onPress={() => setAttempt((current) => current + 1)}
              variant="primary"
            />
          </View>
        </FieldJournalScreenShell>
      );
    }

    if (state.status === "alarmSetup") {
      const blockers = state.error.blockers;
      const hasNotificationBlocker = blockers.includes("notification");
      const hasExactAlarmBlocker = blockers.includes("exactAlarm");
      const hasFullScreenBlocker = blockers.includes("fullScreenIntent");

      return (
        <FieldJournalScreenShell variant="navAware">
          <View style={styles.centered}>
            <WMEmptyState
              body="Waymark can open, but strict signal alarms need Android permission setup before this test can continue."
              title="Signal alarm setup required"
            />
            <View style={styles.permissionList}>
              <PermissionRow
                blocked={hasNotificationBlocker}
                label="Notification permission"
              />
              <PermissionRow
                blocked={hasExactAlarmBlocker}
                label="Exact alarm permission"
              />
              <PermissionRow
                blocked={hasFullScreenBlocker}
                label="Full-screen intent permission"
              />
            </View>
            <View style={styles.setupActions}>
              {hasNotificationBlocker ? (
                <WMButton
                  fullWidth
                  label="Grant notification permission"
                  onPress={() => {
                    void requestWaymarkSignalNotificationPermissionAsync().finally(() => {
                      setAttempt((current) => current + 1);
                    });
                  }}
                  variant="primary"
                />
              ) : null}
              {hasExactAlarmBlocker ? (
                <WMButton
                  fullWidth
                  label="Open exact alarm settings"
                  onPress={() => {
                    void openWaymarkExactAlarmSettings();
                  }}
                  variant="secondary"
                />
              ) : null}
              {hasFullScreenBlocker ? (
                <WMButton
                  fullWidth
                  label="Open full-screen alarm settings"
                  onPress={() => {
                    void openWaymarkFullScreenIntentSettings();
                  }}
                  variant="secondary"
                />
              ) : null}
              <WMButton
                fullWidth
                label="Open app notification settings"
                onPress={() => {
                  void openWaymarkAlarmNotificationSettings();
                }}
                variant="ghost"
              />
              <WMButton
                fullWidth
                label="Recheck alarm setup"
                onPress={() => setAttempt((current) => current + 1)}
                variant="primary"
              />
            </View>
          </View>
        </FieldJournalScreenShell>
      );
    }

    return (
      <WaymarkAppContext.Provider value={state.services}>
        {children}
      </WaymarkAppContext.Provider>
    );
  }, [state]);

  return content;
}

export function useWaymarkApp(): WaymarkAppServices {
  const value = useContext(WaymarkAppContext);
  if (!value) {
    throw new Error("useWaymarkApp must be used inside WaymarkAppProvider.");
  }
  return value;
}

function PermissionRow({ blocked, label }: { blocked: boolean; label: string }) {
  return (
    <View style={styles.permissionRow}>
      <WMText variant="body">{blocked ? "Blocked" : "Ready"}</WMText>
      <WMText style={styles.permissionLabel} variant="body">
        {label}
      </WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
  },
  splashRoot: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F6EEDC",
    justifyContent: "center",
    overflow: "hidden",
  },
  splashBackgroundImage: {
    transform: [{ translateY: -91 }, { scale: 1.12 }],
  },
  splashLockup: {
    alignItems: "center",
    alignSelf: "stretch",
    flex: 1,
    gap: 46,
    justifyContent: "center",
    transform: [{ translateY: -42 }],
  },
  splashLogo: {
    height: 92,
    width: 92,
  },
  splashWordmark: {
    color: "#3C3932",
    fontSize: 40,
    letterSpacing: 0,
    lineHeight: 48,
  },
  permissionList: {
    gap: spacing.xs,
  },
  permissionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  permissionLabel: {
    flex: 1,
  },
  setupActions: {
    gap: spacing.sm,
  },
});
