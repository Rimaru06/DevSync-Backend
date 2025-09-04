import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/index.js";
import { createError } from "../middleware/errorHandler.js";
import { updateProfileSchema, changePasswordSchema } from "../schemas/user.js";

const prisma = new PrismaClient();

// Get current user profile
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw createError.unauthorized("User not authenticated");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      provider: true,
      isOnline: true,
      lastSeen: true,
      createdAt: true,
      _count: {
        select: {
          ownedRooms: true,
          roomMembers: true,
          chatMessages: true,
          codeEdits: true,
        },
      },
    },
  });

  if (!user) {
    throw createError.notFound("User not found");
  }

  res.json({
    success: true,
    data: user,
  });
};

// Update user profile
export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw createError.unauthorized("User not authenticated");
  }

  const validatedData = updateProfileSchema.parse(req.body);

  // Check if username is already taken (if provided)
  if (validatedData.username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: validatedData.username,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw createError.conflict("Username already taken");
    }
  }

  // Filter out undefined values for Prisma
  const updateData: any = {};
  if (validatedData.username !== undefined) {
    updateData.username = validatedData.username;
  }
  if (validatedData.avatar !== undefined) {
    updateData.avatar = validatedData.avatar;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      provider: true,
    },
  });

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
};

// Change password (for EMAIL provider users only)
export const changeUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw createError.unauthorized("User not authenticated");
  }

  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
      provider: true,
    },
  });

  if (!user) {
    throw createError.notFound("User not found");
  }

  if (user.provider !== "EMAIL") {
    throw createError.badRequest(
      "Password change not available for OAuth users"
    );
  }

  if (!user.password) {
    throw createError.badRequest("No password set for this account");
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw createError.badRequest("Current password is incorrect");
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword },
  });

  res.json({
    success: true,
    message: "Password changed successfully",
  });
};

// Search users (for inviting to rooms)
export const searchUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { q, limit = 10 } = req.query;

  if (!q || typeof q !== "string" || q.trim().length < 2) {
    throw createError.badRequest("Search query must be at least 2 characters");
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      isOnline: true,
    },
    take: Number(limit),
  });

  res.json({
    success: true,
    data: users,
  });
};

// Get user's rooms
export const getUserRooms = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw createError.unauthorized("User not authenticated");
  }

  const rooms = await prisma.roomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
              codeFiles: true,
              chatMessages: true,
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  res.json({
    success: true,
    data: rooms.map((rm) => ({
      ...rm.room,
      userRole: rm.role,
      joinedAt: rm.joinedAt,
    })),
  });
};

// Delete account (with confirmation)
export const deleteUserAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw createError.unauthorized("User not authenticated");
  }

  // Check if user owns any rooms
  const ownedRooms = await prisma.room.count({
    where: { ownerId: userId },
  });

  if (ownedRooms > 0) {
    throw createError.badRequest(
      "Cannot delete account while owning rooms. Transfer ownership or delete rooms first."
    );
  }

  // Delete user account (cascade will handle related records)
  await prisma.user.delete({
    where: { id: userId },
  });

  res.json({
    success: true,
    message: "Account deleted successfully",
  });
};
