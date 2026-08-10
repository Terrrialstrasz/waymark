CREATE TABLE IF NOT EXISTS planning_conflicts (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('path', 'expedition', 'milestone')),
  entity_id TEXT NOT NULL,
  local_revision INTEGER NOT NULL,
  remote_entity_revision INTEGER NOT NULL,
  remote_change_sequence INTEGER NOT NULL,
  reason TEXT NOT NULL,
  remote_snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(vault_id, entity_type, entity_id),
  FOREIGN KEY(vault_id) REFERENCES vaults(id)
);

CREATE INDEX IF NOT EXISTS idx_planning_conflicts_open
  ON planning_conflicts(vault_id, status, updated_at);
