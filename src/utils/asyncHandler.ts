import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * asyncHandler — wraps async Express route handlers.
 * Any thrown error or rejected promise is forwarded to next(err),
 * which hits the centralised errorHandler middleware.
 *
 * Before:  try { ... } catch (err) { next(err); }  in every controller
 * After:   asyncHandler(async (req, res) => { ... })  — clean, DRY
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
