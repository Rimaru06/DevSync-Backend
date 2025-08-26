import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Simple error class
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Simple error handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Something went wrong";

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof z.ZodError) {
    statusCode = 400;
    message = "Invalid input data";
  } else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Log error
  console.error(`Error: ${error.message}`);

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
};

// Async wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Simple error creators
export const createError = {
  badRequest: (message: string) => new AppError(message, 400),
  unauthorized: (message: string) => new AppError(message, 401),
  forbidden: (message: string) => new AppError(message, 403),
  notFound: (message: string) => new AppError(message, 404),
  conflict: (message: string) => new AppError(message, 409),
  internal: (message: string) => new AppError(message, 500),
};
