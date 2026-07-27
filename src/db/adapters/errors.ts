export class RepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export function getErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const causeMessage =
    "cause" in error && error.cause instanceof Error && error.cause.message && error.cause.message !== error.message
      ? error.cause.message
      : null;

  return causeMessage ?? error.message ?? null;
}

export class NotFoundRepositoryError extends RepositoryError {
  constructor(message: string, public readonly tableName?: string, public readonly entityId?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class ConstraintViolationRepositoryError extends RepositoryError {}
export class RepositoryValidationError extends RepositoryError {}
export class TransactionRepositoryError extends RepositoryError {}
export class UnsupportedPolymorphicReferenceRepositoryError extends RepositoryError {}
export class MapperRepositoryError extends RepositoryError {}
export class NotImplementedRepositoryError extends RepositoryError {}
