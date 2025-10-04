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
  try {
    const { PrismaClient } = await import("../generated/prisma/index.js");
    const prisma = new PrismaClient();
    
    if (!req.user?.userId) {
      throw createError.unauthorized("User ID not found in token");
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        provider: true,
      },
    });

    if (!user) {
      throw createError.notFound("User not found");
    }

    res.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    next(error);
  }
};
