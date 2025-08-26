import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/index.js";
import { createError } from "../middleware/errorHandler.js";
import { emailLoginSchema, registerSchema } from "../schemas/auth.js";

const prisma = new PrismaClient();

export const EmailRegister = async (
  req : Request,
  res: Response,
  next : NextFunction
) => {
  const {username, email , password} = registerSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where : {email}
  })

  if (user) {
    throw createError.unauthorized("User already resgistered Please Login");
  }

  const hashedPassword = await bcrypt.hash(password,10);

  await prisma.user.create({
    data : {
      username,
      email,
      password : hashedPassword
    }
  })

  res.json({
    success : true,
    message : "Resgistration successful"
  })


}

export const EmailLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = emailLoginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
      avatar: true,
    },
  });

  if (!user) {
    throw createError.unauthorized("Invalid credentials");
  }

  if (!user.password) {
    throw createError.badRequest("This account uses OAuth authentication");
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createError.unauthorized("Invalid credentials");
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

  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeen: new Date() },
  });

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
      accessToken
    },
  });
};

