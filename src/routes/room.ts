import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  createRoom,
  getRoomDetails,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  kickMember,
  updateMemberRole,
  getRoomMembers,
} from "../controller/room.js";

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Room management
router.post("/create", asyncHandler(createRoom));
router.get("/:roomId", asyncHandler(getRoomDetails));
router.patch("/:roomId", asyncHandler(updateRoom));
router.delete("/:roomId", asyncHandler(deleteRoom));

// Room membership
router.post("/join", asyncHandler(joinRoom));
router.delete("/:roomId/leave", asyncHandler(leaveRoom));

// Member management
router.get("/:roomId/members", asyncHandler(getRoomMembers));
router.delete("/:roomId/members/:memberId", asyncHandler(kickMember));
router.patch("/:roomId/members/:memberId", asyncHandler(updateMemberRole));

export default router;
