import { z } from "zod";

// Room related schemas
export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Room name is required")
    .max(50, "Room name too long"),
  description: z.string().max(200, "Description too long").optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z
    .number()
    .min(2, "Minimum 2 members")
    .max(50, "Maximum 50 members")
    .default(10),
});

export const updateRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Room name is required")
    .max(50, "Room name too long")
    .optional(),
  description: z.string().max(200, "Description too long").optional(),
  isPrivate: z.boolean().optional(),
  maxMembers: z
    .number()
    .min(2, "Minimum 2 members")
    .max(50, "Maximum 50 members")
    .optional(),
});

export const joinRoomSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
});

// Type exports
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
