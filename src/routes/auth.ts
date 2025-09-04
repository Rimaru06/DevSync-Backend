import { Router } from "express";
import { EmailLogin, EmailRegister } from "../controller/login.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { GoogleCallback, GoogleGenerateUrl } from "../controller/oauthLogin.js";
import { GitHubCallback, GitHubGenerateUrl } from "../controller/authgithub.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  refreshToken,
  logoutUser,
  verifyToken,
  getCurrentUser,
} from "../controller/authExtra.js";

const router: Router = Router();

// Public routes
router.post("/login", asyncHandler(EmailLogin));
router.post("/register", asyncHandler(EmailRegister));
router.get("/google", asyncHandler(GoogleGenerateUrl));
router.get("/google/callback", asyncHandler(GoogleCallback));
router.get("/github", asyncHandler(GitHubGenerateUrl));
router.get("/github/callback", asyncHandler(GitHubCallback));

// Protected routes
router.post("/refresh", asyncHandler(refreshToken));
router.post("/logout", authenticateToken, asyncHandler(logoutUser));
router.get("/verify", authenticateToken, asyncHandler(verifyToken));
router.get("/me", authenticateToken, asyncHandler(getCurrentUser));

export default router;
