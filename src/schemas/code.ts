import { z } from "zod";

// Code file schemas
export const createCodeFileSchema = z.object({
  name: z
    .string()
    .min(1, "File name is required")
    .max(100, "File name too long"),
  language: z.string().min(1, "Language is required").default("javascript"),
  content: z.string().default(""),
});

export const updateCodeFileSchema = z.object({
  name: z
    .string()
    .min(1, "File name is required")
    .max(100, "File name too long")
    .optional(),
  language: z.string().min(1, "Language is required").optional(),
  content: z.string().optional(),
});

// Code edit schemas
export const codeEditSchema = z.object({
  operation: z.enum(["insert", "delete", "replace"]),
  position: z.number().min(0, "Position must be non-negative"),
  content: z.string().optional(),
  length: z.number().min(0, "Length must be non-negative").optional(),
});

// Chat message schemas
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content is required")
    .max(1000, "Message too long"),
  type: z.enum(["TEXT", "CODE_SNIPPET", "FILE_SHARE"]).default("TEXT"),
  replyToId: z.string().optional(),
});

// Type exports
export type CreateCodeFileInput = z.infer<typeof createCodeFileSchema>;
export type UpdateCodeFileInput = z.infer<typeof updateCodeFileSchema>;
export type CodeEditInput = z.infer<typeof codeEditSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
