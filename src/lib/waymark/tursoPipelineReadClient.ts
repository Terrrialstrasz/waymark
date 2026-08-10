import type { Client, InArgs, InStatement, InValue, ResultSet, Row } from "@tursodatabase/serverless/compat";

export type WaymarkTursoPipelineReadConfig = {
  url: string;
  authToken: string;
};

type PipelineValue =
  | { type: "null" }
  | { type: "integer"; value: string }
  | { type: "float"; value: number }
  | { type: "text"; value: string }
  | { type: "blob"; base64: string };

type PipelineExecuteResult = {
  cols?: Array<{ name?: string; decltype?: string | null }>;
  rows?: PipelineValue[][];
  affected_row_count?: number;
  last_insert_rowid?: string | number | null;
};

type PipelineResponse = {
  results?: Array<{
    type: "ok" | "error";
    response?: { type?: string; result?: PipelineExecuteResult };
    error?: { message?: string; code?: string };
  }>;
};

/**
 * Read-only Turso client for React Native. It uses the JSON pipeline endpoint
 * because Android's fetch stream can finish before the serverless cursor
 * driver receives the first NDJSON cursor record.
 */
export function createWaymarkTursoPipelineReadClient(config: WaymarkTursoPipelineReadConfig): Client {
  if (!config.url || !config.authToken) throw new Error("Turso config requires url and authToken.");
  let closed = false;

  const execute = async (statement: string | InStatement, args?: InArgs): Promise<ResultSet> => {
    if (closed) throw new Error("Turso pipeline read client is closed.");
    const normalized = normalizeStatement(statement, args);
    const encoded = encodeArgs(normalized.args);
    const response = await fetch(`${normalizeTursoHttpUrl(config.url)}/v3/pipeline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.authToken}`,
      },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql: normalized.sql,
              args: encoded.positional,
              named_args: encoded.named,
              want_rows: true,
            },
          },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await readHttpError(response);
      throw new Error(`Turso pipeline HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
    }
    const payload = (await response.json()) as PipelineResponse;
    const first = payload.results?.[0];
    if (!first) throw new Error("Turso pipeline returned no execute result.");
    if (first.type === "error") throw createPipelineError(first.error);
    const result = first.response?.result;
    if (first.response?.type !== "execute" || !result) throw new Error("Turso pipeline returned an invalid execute result.");
    return toResultSet(result);
  };

  return {
    execute,
    batch: async () => unsupportedReadOperation("batch"),
    migrate: async () => unsupportedReadOperation("migrate"),
    transaction: async () => unsupportedReadOperation("transaction"),
    executeMultiple: async () => unsupportedReadOperation("executeMultiple"),
    sync: async () => unsupportedReadOperation("sync"),
    close: () => {
      closed = true;
    },
    get closed() {
      return closed;
    },
    protocol: "http",
  } as Client;
}

function normalizeStatement(statement: string | InStatement, args?: InArgs): { sql: string; args: InArgs } {
  if (typeof statement === "string") return { sql: statement, args: args ?? [] };
  return { sql: statement.sql, args: statement.args ?? [] };
}

function encodeArgs(args: InArgs) {
  if (Array.isArray(args)) {
    return { positional: args.map(encodeValue), named: [] as Array<{ name: string; value: PipelineValue }> };
  }
  return {
    positional: [] as PipelineValue[],
    named: Object.entries(args).map(([name, value]) => ({ name, value: encodeValue(value) })),
  };
}

function encodeValue(value: InValue): PipelineValue {
  if (value == null) return { type: "null" };
  if (typeof value === "boolean") return { type: "integer", value: value ? "1" : "0" };
  if (typeof value === "bigint") return { type: "integer", value: value.toString() };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Only finite Turso numeric arguments are supported.");
    return Number.isSafeInteger(value) ? { type: "integer", value: String(value) } : { type: "float", value };
  }
  if (typeof value === "string") return { type: "text", value };
  if (value instanceof Date) return { type: "text", value: value.toISOString() };
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return { type: "blob", base64: bytesToBase64(bytes) };
}

function toResultSet(result: PipelineExecuteResult): ResultSet {
  const columns = (result.cols ?? []).map((column) => column.name ?? "");
  const columnTypes = (result.cols ?? []).map((column) => column.decltype ?? "");
  const rows = (result.rows ?? []).map((values) => {
    const row = values.map(decodeValue) as unknown as Row;
    columns.forEach((columnName, index) => {
      if (columnName) row[columnName] = row[index];
    });
    return row;
  });
  const lastInsertRowid = result.last_insert_rowid == null ? undefined : BigInt(result.last_insert_rowid);
  return {
    columns,
    columnTypes,
    rows,
    rowsAffected: Number(result.affected_row_count ?? 0),
    lastInsertRowid,
    toJSON() {
      return {
        columns: this.columns,
        columnTypes: this.columnTypes,
        rows: this.rows,
        rowsAffected: this.rowsAffected,
        lastInsertRowid: this.lastInsertRowid?.toString(),
      };
    },
  };
}

function decodeValue(value: PipelineValue): InValue {
  switch (value.type) {
    case "null":
      return null;
    case "integer":
      return Number(value.value);
    case "float":
      return value.value;
    case "text":
      return value.value;
    case "blob":
      return base64ToBytes(value.base64);
  }
}

function normalizeTursoHttpUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (/^libsql:\/\//i.test(trimmed)) return trimmed.replace(/^libsql:\/\//i, "https://");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function readHttpError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: unknown };
    return typeof payload.message === "string" ? payload.message : "";
  } catch {
    return "";
  }
}

function createPipelineError(error: { message?: string; code?: string } | undefined) {
  const result = new Error(error?.message || "Turso pipeline execute failed.") as Error & { code?: string };
  result.code = error?.code;
  return result;
}

function unsupportedReadOperation(operation: string): never {
  throw new Error(`Turso pipeline read client does not support ${operation}.`);
}
