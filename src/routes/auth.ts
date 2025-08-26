import { Router } from "express";
import { EmailLogin } from "../controller/login.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router : Router = Router();

router.post("/login", asyncHandler(EmailLogin));

export default router;
