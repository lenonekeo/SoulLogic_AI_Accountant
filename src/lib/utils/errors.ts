// Custom error classes

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} '${id}' not found` : `${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class PostingError extends AppError {
  constructor(message: string, public details?: string[]) {
    super(message, 422, "POSTING_ERROR");
    this.name = "PostingError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "AuthError";
  }
}
