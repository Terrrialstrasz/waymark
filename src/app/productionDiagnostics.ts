import * as FileSystem from "expo-file-system/legacy";

export type ProductionDiagnosticSeverity = "info" | "warning" | "error";

export type ProductionDiagnosticEvent = {
  category: "routine_binding" | "workout_session" | "golf_practice" | "turso_sync" | "planning_materialization" | "ui_action";
  name: string;
  severity?: ProductionDiagnosticSeverity;
  correlationId?: string;
  context?: Record<string, unknown>;
  error?: unknown;
};

const MAX_LOG_BYTES = 512 * 1024;
const MAX_LOG_LINES = 1500;
let pendingWrite: Promise<void> = Promise.resolve();

function diagnosticsDirectoryUri(fileSystem: typeof FileSystem) {
  return fileSystem.documentDirectory ? `${fileSystem.documentDirectory}waymark/diagnostics` : null;
}

function getProductionDiagnosticLogUri(fileSystem: typeof FileSystem): string | null {
  const directory = diagnosticsDirectoryUri(fileSystem);
  return directory ? `${directory}/events.jsonl` : null;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error == null ? undefined : { message: String(error) };
}

async function appendEvent(event: ProductionDiagnosticEvent) {
  if (typeof process !== "undefined" && process.release?.name === "node") return;
  const directory = diagnosticsDirectoryUri(FileSystem);
  const uri = getProductionDiagnosticLogUri(FileSystem);
  if (!directory || !uri) return;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const info = await FileSystem.getInfoAsync(uri);
  const previous = info.exists ? await FileSystem.readAsStringAsync(uri) : "";
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: event.severity ?? "info",
    category: event.category,
    name: event.name,
    correlationId: event.correlationId,
    context: event.context,
    error: serializeError(event.error),
  });
  const lines = `${previous}${previous ? "\n" : ""}${line}`.split("\n");
  let retained = lines.slice(-MAX_LOG_LINES);
  while (retained.length > 1 && retained.join("\n").length > MAX_LOG_BYTES) retained = retained.slice(1);
  await FileSystem.writeAsStringAsync(uri, retained.join("\n"));
}

export function recordProductionDiagnostic(event: ProductionDiagnosticEvent): Promise<void> {
  pendingWrite = pendingWrite
    .then(() => appendEvent(event))
    .catch((error) => console.warn("[WaymarkDiagnostics] Unable to persist diagnostic event.", error));
  return pendingWrite;
}

export async function flushProductionDiagnostics(): Promise<string | null> {
  await pendingWrite;
  const uri = getProductionDiagnosticLogUri(FileSystem);
  if (!uri) return null;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? uri : null;
}
