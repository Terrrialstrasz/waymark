export type SyncOutboxIdentityInput = {
  vaultId: string;
  sourceApplicationId?: string | null;
  deviceId: string;
  entityType: string;
  entityId: string;
  localRevision: number;
};

export function buildCurrentSyncOutboxIdempotencyKey(input: SyncOutboxIdentityInput): string {
  return [
    input.vaultId,
    input.sourceApplicationId ?? "legacy",
    input.deviceId,
    input.entityType,
    input.entityId,
    String(input.localRevision),
  ].join(":");
}

export function buildSyncOutboxLocalId(idempotencyKey: string): string {
  const readable = idempotencyKey.replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 120);
  return `outbox_${readable}_${hashStableSeed(idempotencyKey)}`;
}

function hashStableSeed(seed: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
