import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Request, Response } from "express";
import cookieParser from 'cookie-parser'
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

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



app.use(notFoundHandler);
app.use(errorHandler); 

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Access at: http://localhost:${PORT}`);
});
