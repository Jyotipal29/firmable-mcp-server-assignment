export class NotFoundError extends Error {
  readonly code = "not_found";
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  readonly code = "validation_error";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class InternalError extends Error {
  readonly code = "internal_error";
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "InternalError";
  }
}

export type DomainError = NotFoundError | ValidationError | InternalError;

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof NotFoundError || err instanceof ValidationError || err instanceof InternalError;
}
