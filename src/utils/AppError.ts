/**
 * AppError — typed HTTP error with a status code.
 *
 * Throw this anywhere in services/controllers:
 *   throw new AppError(404, 'Submission not found');
 *
 * The centralised errorHandler auto-maps statusCode to the HTTP response.
 * No manual res.status().json() needed in controllers for known errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  /** Operational errors are expected (bad input, not found, etc.).
   *  Non-operational errors are programmer mistakes → log stack trace. */
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
