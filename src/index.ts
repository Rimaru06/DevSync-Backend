import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRouters from "./routes/auth.js";
import roomRouters from "./routes/room.js";
import userRouters from "./routes/user.js";
import { setupSocketIO } from "./services/webSocket.js";

const app = express();
const server = createServer(app);

// Setup Socket.IO
setupSocketIO(server);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173", // Vite default port
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "DevSync Server is running fine!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/auth", authRouters);
app.use("/api/v1/rooms", roomRouters);
app.use("/api/v1/users", userRouters);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Access at: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server is ready for real-time collaboration`);
});
