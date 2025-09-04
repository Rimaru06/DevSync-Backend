import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createError } from "../middleware/errorHandler.js";

// Refresh access token
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies?.jwt;

  if (!refreshToken) {
    throw createError.unauthorized("Refresh token required");
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_JWT_SECRET!
    ) as any;

    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.ACCESS_JWT_SECRET!,
      { expiresIn: "10m" }
    );

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    throw createError.unauthorized("Invalid refresh token");
  }
};

// Logout user
export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

// Verify token
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.json({
    success: true,
    message: "Token is valid",
    user: req.user,
  });
};

// Get current user info
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.json({
    success: true,
    data: req.user,
  });
};
