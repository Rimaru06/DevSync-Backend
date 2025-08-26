import { Router } from "express";
import { EmailLogin, EmailRegister } from "../controller/login.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { GoogleCallback, GoogleGenerateUrl } from "../controller/oauthLogin.js";
import { GitHubCallback, GitHubGenerateUrl } from "../controller/authgithub.js";

const router : Router = Router();

router.post("/login", asyncHandler(EmailLogin));
router.post("/register", asyncHandler(EmailRegister))
router.get("/google", asyncHandler(GoogleGenerateUrl))
router.get("/google/callback",asyncHandler(GoogleCallback));
router.get("/github", asyncHandler(GitHubGenerateUrl))
router.get("/github/callback",asyncHandler(GitHubCallback))

export default router;
