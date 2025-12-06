import { NextFunction, Request, Response } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error for debugging
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
  });

  // PostgreSQL errors
  if (err.code && err.code.startsWith("2")) {
    // PostgreSQL class 2 errors (data exception, etc.)
    res.status(400).json({
      success: false,
      error: "Database error",
      message: err.message,
    });
    return;
  }

  if (err.code && err.code.startsWith("3")) {
    // PostgreSQL class 3 errors (integrity constraint violation)
    res.status(409).json({
      success: false,
      error: "Database constraint violation",
      message: err.message,
    });
    return;
  }

  // Custom application errors
  const statusCode = err.statusCode || 500;
  const message =
    err.message ||
    (statusCode === 500 ? "Internal Server Error" : "An error occurred");

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
};
