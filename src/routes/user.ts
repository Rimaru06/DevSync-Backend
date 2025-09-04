import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  searchUsers,
  getUserRooms,
  deleteUserAccount,
} from "../controller/user.js";

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// User profile routes
router.get("/profile", asyncHandler(getUserProfile));
router.patch("/profile", asyncHandler(updateUserProfile));

// Password management
router.post("/change-password", asyncHandler(changeUserPassword));

// User search and rooms
router.get("/search", asyncHandler(searchUsers));
router.get("/rooms", asyncHandler(getUserRooms));

// Account management
router.delete("/account", asyncHandler(deleteUserAccount));

export default router;
