import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

// Extend socket type for custom properties
declare module "socket.io" {
  interface Socket {
    userId: string;
    username: string;
  }
}

export const setupSocketIO = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          isOnline: true,
        },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      // Attach user info to socket
      socket.userId = user.id;
      socket.username = user.username;

      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  // Handle connections
  io.on("connection", (socket) => {
    console.log(`✅ User ${socket.username} (${socket.userId}) connected`);

    // Update user online status and create session
    updateUserStatus(socket.userId, true);
    createUserSession(socket.userId, socket.id);

    // Handle room creation
    socket.on("create-room", async (data) => {
      try {
        console.log(`🏠 Creating room for user ${socket.username}:`, data);

        const room = await createRoom(socket.userId, data);

        // Join the room
        socket.join(room.id);

        // Emit success response
        socket.emit("room-created", {
          success: true,
          data: room,
        });

        console.log(`✅ Room ${room.name} created by ${socket.username}`);
      } catch (error) {
        console.error("❌ Error creating room:", error);
        socket.emit("error", {
          type: "create-room-error",
          message:
            error instanceof Error ? error.message : "Failed to create room",
        });
      }
    });

    // Handle joining room
    socket.on("join-room", async (data) => {
      try {
        console.log(`🚪 User ${socket.username} joining room:`, data.roomId);

        const room = await joinRoom(socket.userId, data.roomId);

        // Join the socket room
        socket.join(data.roomId);

        // Update user session with current room
        updateUserSession(socket.id, data.roomId);

        // Notify other users in the room
        socket.to(data.roomId).emit("user-joined", {
          userId: socket.userId,
          username: socket.username,
          joinedAt: new Date(),
        });

        // Send room data and active users to the joining user
        const activeUsers = await getActiveUsersInRoom(data.roomId);
        socket.emit("room-joined", {
          success: true,
          data: room,
          activeUsers,
        });

        // Broadcast updated presence to room
        io.to(data.roomId).emit("room-presence", { activeUsers });

        console.log(`✅ User ${socket.username} joined room ${data.roomId}`);
      } catch (error) {
        console.error("❌ Error joining room:", error);
        socket.emit("error", {
          type: "join-room-error",
          message:
            error instanceof Error ? error.message : "Failed to join room",
        });
      }
    });

    // Handle leaving room
    socket.on("leave-room", async (roomId) => {
      try {
        console.log(`🚪 User ${socket.username} leaving room ${roomId}`);

        socket.leave(roomId);

        // Update user session (no longer in room)
        updateUserSession(socket.id, null);

        // Notify other users
        socket.to(roomId).emit("user-left", {
          userId: socket.userId,
          username: socket.username,
          leftAt: new Date(),
        });

        // Update room presence
        const activeUsers = await getActiveUsersInRoom(roomId);
        socket.to(roomId).emit("room-presence", { activeUsers });

        socket.emit("room-left", { success: true, roomId });

        console.log(`✅ User ${socket.username} left room ${roomId}`);
      } catch (error) {
        console.error("❌ Error leaving room:", error);
      }
    });

    // Handle code changes (real-time collaboration)
    socket.on("code-change", async (data) => {
      try {
        console.log(
          `💻 Code change from ${socket.username} in room ${data.roomId}`
        );

        // Save code edit to database
        const codeEdit = await saveCodeEdit({
          ...data,
          userId: socket.userId,
        });

        // Broadcast to all other users in the room (except sender)
        socket.to(data.roomId).emit("code-updated", {
          ...data,
          userId: socket.userId,
          username: socket.username,
          timestamp: codeEdit.timestamp,
        });

        console.log(`✅ Code change broadcasted in room ${data.roomId}`);
      } catch (error) {
        console.error("❌ Error handling code change:", error);
        socket.emit("error", {
          type: "code-change-error",
          message: "Failed to save code changes",
        });
      }
    });

    // Handle chat messages
    socket.on("send-message", async (data) => {
      try {
        console.log(
          `💬 Message from ${socket.username} in room ${data.roomId}`
        );

        const message = await saveMessage(socket.userId, data);

        // Broadcast to all users in the room (including sender)
        io.to(data.roomId).emit("new-message", message);

        console.log(`✅ Message sent in room ${data.roomId}`);
      } catch (error) {
        console.error("❌ Error sending message:", error);
        socket.emit("error", {
          type: "message-error",
          message: "Failed to send message",
        });
      }
    });

    // Handle cursor position (for real-time collaboration)
    socket.on("cursor-position", (data) => {
      socket.to(data.roomId).emit("cursor-updated", {
        userId: socket.userId,
        username: socket.username,
        position: data.position,
        selection: data.selection,
      });
    });

    // Handle file operations
    socket.on("create-file", async (data) => {
      try {
        const file = await createCodeFile(
          data.roomId,
          data.fileName,
          data.language
        );

        io.to(data.roomId).emit("file-created", {
          file,
          createdBy: {
            userId: socket.userId,
            username: socket.username,
          },
        });
      } catch (error) {
        socket.emit("error", {
          type: "file-creation-error",
          message: "Failed to create file",
        });
      }
    });

    // Handle file deletion
    socket.on("delete-file", async (data) => {
      try {
        await deleteCodeFile(data.fileId, socket.userId);

        io.to(data.roomId).emit("file-deleted", {
          fileId: data.fileId,
          deletedBy: {
            userId: socket.userId,
            username: socket.username,
          },
        });
      } catch (error) {
        socket.emit("error", {
          type: "file-deletion-error",
          message: "Failed to delete file",
        });
      }
    });

    // Handle file rename
    socket.on("rename-file", async (data) => {
      try {
        const file = await renameCodeFile(
          data.fileId,
          data.newName,
          socket.userId
        );

        io.to(data.roomId).emit("file-renamed", {
          file,
          renamedBy: {
            userId: socket.userId,
            username: socket.username,
          },
        });
      } catch (error) {
        socket.emit("error", {
          type: "file-rename-error",
          message: "Failed to rename file",
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`❌ User ${socket.username} disconnected: ${reason}`);

      // Update user offline status and cleanup session
      updateUserStatus(socket.userId, false);
      cleanupUserSession(socket.id);

      // You could also notify rooms that the user was in
      // But socket.io automatically handles leaving rooms on disconnect
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
    });
  });

  return io;
};

// Helper Functions
async function createRoom(userId: string, data: any) {
  const room = await prisma.room.create({
    data: {
      name: data.name,
      description: data.description || "",
      isPrivate: data.isPrivate || false,
      maxMembers: data.maxMembers || 10,
      ownerId: userId,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  // Add owner as member with OWNER role
  await prisma.roomMember.create({
    data: {
      userId,
      roomId: room.id,
      role: "OWNER",
    },
  });

  return room;
}

async function joinRoom(userId: string, roomId: string) {
  // Check if room exists and is active
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isOnline: true,
            },
          },
        },
      },
      codeFiles: {
        orderBy: { createdAt: "asc" },
      },
      chatMessages: {
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              username: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    throw new Error("Room not found");
  }

  if (!room.isActive) {
    throw new Error("Room is not active");
  }

  // Check if user is already a member
  const existingMember = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
    },
  });

  if (existingMember) {
    return room; // Already a member, return room data
  }

  // Check if room is full
  if (room.members.length >= room.maxMembers) {
    throw new Error("Room is full");
  }

  // Add user as member
  await prisma.roomMember.create({
    data: {
      userId,
      roomId,
      role: "MEMBER",
    },
  });

  return room;
}

async function saveCodeEdit(data: any) {
  return await prisma.codeEdit.create({
    data: {
      fileId: data.fileId,
      userId: data.userId,
      operation: data.operation,
      position: data.position,
      content: data.content,
      length: data.length || null,
    },
  });
}

async function saveMessage(userId: string, data: any) {
  return await prisma.chatMessage.create({
    data: {
      content: data.content,
      type: data.type || "TEXT",
      roomId: data.roomId,
      userId,
      replyToId: data.replyToId || null,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
  });
}

async function createCodeFile(
  roomId: string,
  fileName: string,
  language: string = "javascript"
) {
  return await prisma.codeFile.create({
    data: {
      name: fileName,
      language,
      content: "",
      roomId,
    },
  });
}

async function updateUserStatus(userId: string, isOnline: boolean) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline,
        lastSeen: new Date(),
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
  }
}

// User Session Management
async function createUserSession(userId: string, socketId: string) {
  try {
    await prisma.userSession.create({
      data: {
        userId,
        socketId,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Error creating user session:", error);
  }
}

async function updateUserSession(socketId: string, roomId: string | null) {
  try {
    await prisma.userSession.update({
      where: { socketId },
      data: {
        roomId,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error updating user session:", error);
  }
}

async function cleanupUserSession(socketId: string) {
  try {
    await prisma.userSession.delete({
      where: { socketId },
    });
  } catch (error) {
    console.error("Error cleaning up user session:", error);
  }
}

async function getActiveUsersInRoom(roomId: string) {
  try {
    const sessions = await prisma.userSession.findMany({
      where: {
        roomId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          },
        },
      },
    });

    return sessions.map((session) => session.user);
  } catch (error) {
    console.error("Error getting active users:", error);
    return [];
  }
}

// File Management Functions
async function deleteCodeFile(fileId: string, userId: string) {
  // Check if user has permission to delete file
  const file = await prisma.codeFile.findUnique({
    where: { id: fileId },
    include: {
      room: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!file) {
    throw new Error("File not found");
  }

  // Check if user is a member of the room
  if (file.room.members.length === 0) {
    throw new Error("Permission denied");
  }

  // Delete file and all associated edits
  await prisma.codeFile.delete({
    where: { id: fileId },
  });

  return true;
}

async function renameCodeFile(fileId: string, newName: string, userId: string) {
  // Check permissions
  const file = await prisma.codeFile.findUnique({
    where: { id: fileId },
    include: {
      room: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!file) {
    throw new Error("File not found");
  }

  if (file.room.members.length === 0) {
    throw new Error("Permission denied");
  }

  // Update file name
  const updatedFile = await prisma.codeFile.update({
    where: { id: fileId },
    data: { name: newName },
  });

  return updatedFile;
}
