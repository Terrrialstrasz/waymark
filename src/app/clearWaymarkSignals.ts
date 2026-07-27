import { runExclusiveSqliteWrite } from "../db/adapters/SQLiteRepositoryBase";
import { getWaymarkDatabaseAsync } from "../db/sqlite";

export type ClearWaymarkSignalsResult = {
  deletedSignals: number;
  deletedSignalRuntimeSettings: number;
  deletedSignalConfigs: number;
};

type CountRow = {
  count: number;
};

export async function clearWaymarkSignalsAsync(userId: string): Promise<ClearWaymarkSignalsResult> {
  const db = await getWaymarkDatabaseAsync();
  let result: ClearWaymarkSignalsResult = {
    deletedSignals: 0,
    deletedSignalRuntimeSettings: 0,
    deletedSignalConfigs: 0,
  };

  await runExclusiveSqliteWrite(() =>
    db.withExclusiveTransactionAsync(async (txn) => {
      const signalCount = await txn.getFirstAsync<CountRow>(
        "SELECT COUNT(*) AS count FROM signals WHERE user_id = ?;",
        userId,
      );
      const runtimeSettingsCount = await txn.getFirstAsync<CountRow>(
        "SELECT COUNT(*) AS count FROM app_settings WHERE user_id = ? AND (key LIKE 'signal_behavior:%' OR key LIKE 'signal_delivery:%');",
        userId,
      );
      const configSettingsCount = await txn.getFirstAsync<CountRow>(
        "SELECT COUNT(*) AS count FROM app_settings WHERE user_id = ? AND (key LIKE 'signal_config:%' OR key LIKE 'seed_registry:signal_config:%');",
        userId,
      );

      await txn.runAsync("DELETE FROM signals WHERE user_id = ?;", userId);
      await txn.runAsync(
        "DELETE FROM app_settings WHERE user_id = ? AND (key LIKE 'signal_behavior:%' OR key LIKE 'signal_delivery:%');",
        userId,
      );
      await txn.runAsync(
        "DELETE FROM app_settings WHERE user_id = ? AND (key LIKE 'signal_config:%' OR key LIKE 'seed_registry:signal_config:%');",
        userId,
      );

      result = {
        deletedSignals: signalCount?.count ?? 0,
        deletedSignalRuntimeSettings: runtimeSettingsCount?.count ?? 0,
        deletedSignalConfigs: configSettingsCount?.count ?? 0,
      };
    }),
  );

  return result;
}
