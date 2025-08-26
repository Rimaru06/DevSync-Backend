import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/index.js";
import { createError } from "../middleware/errorHandler.js";
import client from "../utils/googleAuth.js";

const prisma = new PrismaClient();

export const GoogleGenerateUrl = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorizeUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "profile", "email"],
  });

  res.redirect(authorizeUrl);
};

export const GoogleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    throw createError.forbidden("Invalid or missing code parameter");
  }
  const { tokens } = await client.getToken(code);

  client.setCredentials(tokens);

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token as string,
    audience: process.env.GOOGLE_CLIENT_ID as string,
  });

  const payload = ticket.getPayload(); 

  if (!payload) {
    throw createError.unauthorized("Invalid Google token");
  }

  if (!payload.email_verified) {
    throw createError.unauthorized("Email not verified");
  }

  if (!payload.email || !payload.name || !payload.sub) {
    throw createError.badRequest(
      "Missing required user information from Google"
    );
  }

  let user = await prisma.user.findUnique({
    where: {
      email: payload.email as string,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username: payload.name as string,
        email: payload.email as string,
        provider: "GOOGLE",
        googleId: payload.sub,
        avatar: payload.picture as string,
      },
    });
  }

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.ACCESS_JWT_SECRET as string,
    { expiresIn: "10m" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.REFRESH_JWT_SECRET as string,
    { expiresIn: "1d" }
  );

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: "Login successful",
    data: {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
      },
    },
  });
};
