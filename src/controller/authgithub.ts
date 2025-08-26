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
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    return next(createError.forbidden("Invalid or missing code parameter"));
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
      user = await prisma.user.create({
        data: {
          username: userRes.data.login,
          email: primaryEmail,
          provider: "GITHUB",
          githubId: String(userRes.data.id),
          avatar: userRes.data.avatar_url,
        },
      });
    }
    const acessToken = jwt.sign(
      { email: primaryEmail },
      process.env.ACCESS_JWT_SECRET as string,
      { expiresIn: "10m" }
    );

    const refreshToken = jwt.sign(
      { email: primaryEmail },
      process.env.REFRESH_JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "GitHub login successful",
      data: { acessToken },
    });
 
};
