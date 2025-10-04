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
  try {
    const authorizeUrl = client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "profile", "email"],
    });

    res.redirect(authorizeUrl);
  } catch (error) {
    console.error("Error generating Google OAuth URL:", error);
    next(error);
  }
};

export const GoogleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("Google OAuth callback initiated");
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      console.error("Invalid or missing code parameter");
      throw createError.forbidden("Invalid or missing code parameter");
    }
    
    console.log("Getting tokens from Google...");
    const { tokens } = await client.getToken(code);

    client.setCredentials(tokens);

    console.log("Verifying ID token...");
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token as string,
      audience: process.env.GOOGLE_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();
    console.log("Google payload received:", { email: payload?.email, name: payload?.name }); 

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

    console.log("Finding or creating user...");
    let user = await prisma.user.findUnique({
      where: {
        email: payload.email as string,
      },
    });

    if (!user) {
      // Only create new user if email doesn't exist
      user = await prisma.user.create({
        data: {
          username: payload.name as string,
          email: payload.email as string,
          provider: "GOOGLE",
          googleId: payload.sub,
          avatar: payload.picture as string,
        },
      });
      console.log("Created new Google user:", user.id);
    }
    
    // User exists or was just created - simply generate tokens and login
    console.log("Logging in user:", user.id);

    console.log("Generating JWT tokens...");
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

    // Redirect to frontend with access token
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}`;
    console.log("Redirecting to frontend:", redirectUrl);
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const errorMessage = error instanceof Error ? error.message : 'oauth_failed';
    res.redirect(`${frontendUrl}?error=${encodeURIComponent(errorMessage)}`);
  }
};
