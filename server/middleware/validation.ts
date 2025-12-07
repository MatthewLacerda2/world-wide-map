import { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";

/**
 * Validation middleware factory
 * Creates a middleware that validates request body against a Zod schema
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}
