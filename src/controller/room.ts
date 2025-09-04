import type { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import { AppError } from "../middleware/errorHandler.js";
import { createRoomSchema, updateRoomSchema } from "../schemas/room.js";

const prisma = new PrismaClient();

// Create a new room
export const createRoom = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  // Validate request body
  const validatedData = createRoomSchema.parse(req.body);

  // Create room
  const room = await prisma.room.create({
    data: {
      name: validatedData.name,
      description: validatedData.description || "",
      isPrivate: validatedData.isPrivate || false,
      maxMembers: validatedData.maxMembers || 10,
      ownerId: userId,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  // Add owner as member with OWNER role - using correct role
  await prisma.roomMember.create({
    data: {
      userId,
      roomId: room.id,
      role: "ADMIN", // Using ADMIN as owner role from schema
    },
  });

  res.status(201).json({
    success: true,
    message: "Room created successfully",
    data: room,
  });
};

// Get room details
export const getRoomDetails = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.userId;

  if (!userId || !roomId) {
    throw new AppError("User not authenticated or invalid room ID", 401);
  }

  // Check if user is member of the room
  const membership = await prisma.roomMember.findFirst({
    where: {
      roomId: roomId,
      userId: userId,
    },
  });

  if (!membership) {
    throw new AppError("Access denied. You are not a member of this room", 403);
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isOnline: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      codeFiles: {
        select: {
          id: true,
          name: true,
          language: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          members: true,
          codeFiles: true,
          chatMessages: true,
        },
      },
    },
  });

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  res.json({
    success: true,
    data: {
      ...room,
      userRole: membership.role,
    },
  });
};

// Update room details (owner only)
export const updateRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.userId;

  if (!userId || !roomId) {
    throw new AppError("User not authenticated or invalid room ID", 401);
  }

  // Check if user is the owner
  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      ownerId: userId,
    },
  });

  if (!room) {
    throw new AppError(
      "Room not found or you don't have permission to update it",
      404
    );
  }

  const validatedData = updateRoomSchema.parse(req.body);

  // Filter out undefined values for Prisma
  const updateData: any = {};
  if (validatedData.name !== undefined) {
    updateData.name = validatedData.name;
  }
  if (validatedData.description !== undefined) {
    updateData.description = validatedData.description;
  }
  if (validatedData.isPrivate !== undefined) {
    updateData.isPrivate = validatedData.isPrivate;
  }
  if (validatedData.maxMembers !== undefined) {
    updateData.maxMembers = validatedData.maxMembers;
  }

  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: updateData,
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  res.json({
    success: true,
    message: "Room updated successfully",
    data: updatedRoom,
  });
};

// Delete room (owner only)
export const deleteRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.userId;

  if (!userId || !roomId) {
    throw new AppError("User not authenticated or invalid room ID", 401);
  }

  // Check if user is the owner
  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      ownerId: userId,
    },
  });

  if (!room) {
    throw new AppError(
      "Room not found or you don't have permission to delete it",
      404
    );
  }

  // Delete room (cascade will handle related records)
  await prisma.room.delete({
    where: { id: roomId },
  });

  res.json({
    success: true,
    message: "Room deleted successfully",
  });
};

// Join room by invite code
export const joinRoom = async (req: Request, res: Response) => {
  const { inviteCode } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  if (!inviteCode) {
    throw new AppError("Invite code is required", 400);
  }

  // Find room by invite code
  const room = await prisma.room.findFirst({
    where: { inviteCode },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });

  if (!room) {
    throw new AppError("Invalid invite code", 404);
  }

  // Check if room is full
  if (room._count.members >= room.maxMembers) {
    throw new AppError("Room is full", 400);
  }

  // Check if user is already a member
  const existingMembership = await prisma.roomMember.findFirst({
    where: {
      roomId: room.id,
      userId: userId,
    },
  });

  if (existingMembership) {
    throw new AppError("You are already a member of this room", 400);
  }

  // Add user as member
  await prisma.roomMember.create({
    data: {
      userId: userId,
      roomId: room.id,
      role: "MEMBER",
    },
  });

  res.json({
    success: true,
    message: "Successfully joined the room",
    data: { roomId: room.id, roomName: room.name },
  });
};

// Leave room (members only, owner cannot leave)
export const leaveRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.userId;

  if (!userId || !roomId) {
    throw new AppError("User not authenticated or invalid room ID", 401);
  }

  // Check if user is a member
  const membership = await prisma.roomMember.findFirst({
    where: {
      roomId: roomId,
      userId: userId,
    },
  });

  if (!membership) {
    throw new AppError("You are not a member of this room", 404);
  }

  if (membership.role === "ADMIN") {
    throw new AppError(
      "Room owner cannot leave. Transfer ownership or delete the room instead",
      400
    );
  }

  // Remove membership
  await prisma.roomMember.delete({
    where: { id: membership.id },
  });

  res.json({
    success: true,
    message: "Left the room successfully",
  });
};

// Kick member (owner only)
export const kickMember = async (req: Request, res: Response) => {
  const { roomId, memberId } = req.params;
  const userId = req.user?.userId;

  if (!userId || !roomId || !memberId) {
    throw new AppError("User not authenticated or invalid parameters", 401);
  }

  // Check if requester has permission (only room owner)
  const requesterMembership = await prisma.roomMember.findFirst({
    where: {
      roomId: roomId,
      userId: userId,
    },
  });

  if (!requesterMembership || requesterMembership.role !== "ADMIN") {
    throw new AppError("You don't have permission to kick members", 403);
  }

  // Find the member to kick
  const targetMembership = await prisma.roomMember.findFirst({
    where: {
      roomId: roomId,
      userId: memberId,
    },
  });

  if (!targetMembership) {
    throw new AppError("Member not found in this room", 404);
  }

  // Cannot kick the owner
  if (targetMembership.role === "ADMIN") {
    throw new AppError("Cannot kick the room owner", 400);
  }

  // Remove the member
  await prisma.roomMember.delete({
    where: { id: targetMembership.id },
  });

  res.json({
    success: true,
    message: "Member kicked successfully",
  });
};

// Update member role (owner only)
export const updateMemberRole = async (req: Request, res: Response) => {
  const { roomId, memberId } = req.params;
  const { role } = req.body;
  const userId = req.user?.userId;

  if (!userId || !roomId || !memberId) {
    throw new AppError("User not authenticated or invalid parameters", 401);
  }

  if (!["MEMBER", "VIEWER"].includes(role)) {
    throw new AppError("Invalid role. Must be MEMBER or VIEWER", 400);
  }

  // Check if requester is the owner
  const requesterMembership = await prisma.roomMember.findFirst({
    where: {
      roomId: roomId,
      userId: userId,
      role: "ADMIN",
    },
  });

  if (!requesterMembership) {
    throw new AppError("Only room owner can update member roles", 403);
  }

  // Find the member to update
  const targetMembership = await prisma.roomMember.findFirst({
    where: {
      roomId: roomId,
      userId: memberId,
    },
  });

  if (!targetMembership) {
    throw new AppError("Member not found in this room", 404);
  }

  if (targetMembership.role === "ADMIN") {
    throw new AppError("Cannot change owner role", 400);
  }

  // Update role
  await prisma.roomMember.update({
    where: { id: targetMembership.id },
    data: { role: role as any },
  });

  res.json({
    success: true,
    message: "Member role updated successfully",
  });
};

// Get room members
export const getRoomMembers = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.userId;

  if (!userId || !roomId) {
    throw new AppError("User not authenticated or invalid room ID", 401);
  }

  // Check if user is a member
  const membership = await prisma.roomMember.findFirst({
    where: {
      roomId: roomId,
      userId: userId,
    },
  });

  if (!membership) {
    throw new AppError("Access denied. You are not a member of this room", 403);
  }

  const members = await prisma.roomMember.findMany({
    where: { roomId: roomId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
          isOnline: true,
          lastSeen: true,
        },
      },
    },
    orderBy: [
      { role: "asc" }, // ADMIN first, then MEMBER, then VIEWER
      { joinedAt: "asc" },
    ],
  });

  res.json({
    success: true,
    data: members.map((member) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt,
      user: member.user,
    })),
  });
};
