export type EntityId = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type LocalDateString = string;

export interface LocalRecordMetadata {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  syncVersion?: number;
  lastSyncedAt?: ISODateTimeString;
  deletedAt?: ISODateTimeString;
}

export interface UserScopedRecord extends LocalRecordMetadata {
  id: EntityId;
  userId: EntityId;
}

export interface LocalWindow {
  scheduledStartAt?: ISODateTimeString;
  scheduledEndAt?: ISODateTimeString;
  dueAt?: ISODateTimeString;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface QueryPage {
  limit?: number;
  cursor?: string;
}

export interface QueryResult<T> {
  items: T[];
  nextCursor?: string;
}

export interface TransactionRunner<TRepositories = unknown> {
  runInTransaction<T>(work: (repositories: TRepositories) => Promise<T>): Promise<T>;
}

export interface TimeWindowRule {
  startAt?: ISODateTimeString;
  endAt?: ISODateTimeString;
  timezone?: string;
}
