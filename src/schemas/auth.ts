import { z } from "zod";

// Auth related schemas
export const emailLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const googleAuthSchema = z.object({
  googleId: z.string().min(1, "Google ID is required"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(1, "Username is required"),
  avatar: z.string().url().optional(),
});

export const githubAuthSchema = z.object({
  githubId: z.string().min(1, "GitHub ID is required"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(1, "Username is required"),
  avatar: z.string().url().optional(),
});

// Type exports for TypeScript
export type EmailLoginInput = z.infer<typeof emailLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type GitHubAuthInput = z.infer<typeof githubAuthSchema>;
