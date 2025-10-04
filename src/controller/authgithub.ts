import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import { PrismaClient } from "../generated/prisma/index.js";
import { createError } from "../middleware/errorHandler.js";

const prisma = new PrismaClient();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID as string;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET as string;

export const GitHubGenerateUrl = (req: Request, res: Response) => {
  const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(redirectUrl);
};

export const GitHubCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      throw createError.forbidden("Invalid or missing code parameter");
    }
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) throw createError.unauthorized("Failed to get GitHub access token");

    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `token ${accessToken}` },
    });

    const emailRes = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `token ${accessToken}` },
    });

    const primaryEmail = emailRes.data.find((e: any) => e.primary)?.email;

    if (!primaryEmail) throw createError.unauthorized("Email not available from GitHub");

    let user = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    if (!user) {
      // Only create new user if email doesn't exist
      user = await prisma.user.create({
        data: {
          username: userRes.data.login,
          email: primaryEmail,
          provider: "GITHUB",
          githubId: String(userRes.data.id),
          avatar: userRes.data.avatar_url,
        },
      });
      console.log("Created new GitHub user:", user.id);
    } else {
      // User exists - just log them in, no updates needed
      console.log("Found existing user, logging in:", user.id);
    }
    const appAccessToken = jwt.sign(
      { userId: user.id, email: primaryEmail },
      process.env.ACCESS_JWT_SECRET as string,
      { expiresIn: "10m" }
    );

    const appRefreshToken = jwt.sign(
      { userId: user.id, email: primaryEmail },
      process.env.REFRESH_JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    res.cookie("jwt", appRefreshToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with access token
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendUrl}/auth/callback?token=${appAccessToken}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const errorMessage = error instanceof Error ? error.message : 'oauth_failed';
    res.redirect(`${frontendUrl}?error=${encodeURIComponent(errorMessage)}`);
  }
};
