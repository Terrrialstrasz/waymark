CREATE TABLE IF NOT EXISTS planning_sync_state (
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_planning_change_sequence INTEGER NOT NULL DEFAULT 0,
  last_pull_started_at INTEGER,
  last_pull_completed_at INTEGER,
  last_pull_status TEXT NOT NULL DEFAULT 'idle' CHECK (last_pull_status IN ('idle', 'pulling', 'success', 'error')),
  last_error TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (vault_id, device_id),
  FOREIGN KEY(vault_id) REFERENCES vaults(id),
  FOREIGN KEY(device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS planning_entity_state (
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('week_plan', 'week_plan_item', 'signal', 'path', 'expedition', 'milestone')),
  entity_id TEXT NOT NULL,
  entity_revision INTEGER NOT NULL,
  last_change_sequence INTEGER NOT NULL,
  last_pulled_at INTEGER NOT NULL,
  PRIMARY KEY (vault_id, entity_type, entity_id),
  FOREIGN KEY(vault_id) REFERENCES vaults(id)
);

CREATE TABLE IF NOT EXISTS planning_side_effect_retries (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('week_plan', 'week_plan_item', 'signal', 'path', 'expedition', 'milestone')),
  entity_id TEXT NOT NULL,
  side_effect_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(vault_id) REFERENCES vaults(id)
);

CREATE INDEX IF NOT EXISTS idx_planning_side_effect_retries_pending
  ON planning_side_effect_retries(vault_id, status, created_at);
