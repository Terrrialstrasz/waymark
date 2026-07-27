export interface MigrationDefinition {
  version: number;
  name: string;
  sql: string;
}
