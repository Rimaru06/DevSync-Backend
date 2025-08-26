import { PrismaClient } from "../src/generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Updated seed file for use AFTER migration
  // This version uses the new OAuth fields: provider, googleId, githubId

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Email user
  const user1 = await prisma.user.create({
    data: {
      username: "alice",
      email: "alice@example.com",
      password: hashedPassword,
      provider: "EMAIL",
      avatar: "https://i.pravatar.cc/150?img=1",
    },
  });

  // Google OAuth user
  const user2 = await prisma.user.create({
    data: {
      username: "bob_google",
      email: "bob@gmail.com",
      provider: "GOOGLE",
      googleId: "google_123456789",
      avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c",
    },
  });

  // GitHub OAuth user
  const user3 = await prisma.user.create({
    data: {
      username: "charlie_github",
      email: "charlie@github.com",
      provider: "GITHUB",
      githubId: "github_987654321",
      avatar: "https://avatars.githubusercontent.com/u/12345?v=4",
    },
  });

  // Another email user
  const user4 = await prisma.user.create({
    data: {
      username: "diana",
      email: "diana@example.com",
      password: hashedPassword,
      provider: "EMAIL",
      avatar: "https://i.pravatar.cc/150?img=4",
    },
  });

  // Create test rooms
  const room1 = await prisma.room.create({
    data: {
      name: "JavaScript Project",
      description: "Learning JavaScript together",
      ownerId: user1.id,
      isPrivate: false,
    },
  });

  const room2 = await prisma.room.create({
    data: {
      name: "React Collaboration",
      description: "Building a React app with the team",
      ownerId: user2.id,
      isPrivate: true,
    },
  });

  // Add members to rooms
  await prisma.roomMember.create({
    data: {
      userId: user1.id,
      roomId: room1.id,
      role: "OWNER",
    },
  });

  await prisma.roomMember.create({
    data: {
      userId: user2.id,
      roomId: room1.id,
      role: "MEMBER",
    },
  });

  await prisma.roomMember.create({
    data: {
      userId: user3.id,
      roomId: room1.id,
      role: "MEMBER",
    },
  });

  await prisma.roomMember.create({
    data: {
      userId: user2.id,
      roomId: room2.id,
      role: "OWNER",
    },
  });

  await prisma.roomMember.create({
    data: {
      userId: user4.id,
      roomId: room2.id,
      role: "ADMIN",
    },
  });

  // Create sample code files
  await prisma.codeFile.create({
    data: {
      name: "index.js",
      language: "javascript",
      content: 'console.log("Hello World!");',
      roomId: room1.id,
    },
  });

  await prisma.codeFile.create({
    data: {
      name: "App.jsx",
      language: "javascript",
      content:
        'import React from "react";\n\nfunction App() {\n  return <h1>Hello React!</h1>;\n}\n\nexport default App;',
      roomId: room2.id,
    },
  });

  // Create sample chat messages
  await prisma.chatMessage.create({
    data: {
      content: "Welcome to the JavaScript project!",
      type: "TEXT",
      roomId: room1.id,
      userId: user1.id,
    },
  });

  await prisma.chatMessage.create({
    data: {
      content: "Great to be here! Looking forward to collaborating.",
      type: "TEXT",
      roomId: room1.id,
      userId: user2.id,
    },
  });

  await prisma.chatMessage.create({
    data: {
      content: "This React project looks interesting!",
      type: "TEXT",
      roomId: room2.id,
      userId: user4.id,
    },
  });

  console.log("✅ Database seeded successfully with OAuth support!");
  console.log("\n📊 Created data:");
  console.log("👥 Users:");
  console.log("   - Alice (EMAIL): alice@example.com [with password]");
  console.log("   - Bob (GOOGLE): bob@gmail.com [OAuth - no password]");
  console.log(
    "   - Charlie (GITHUB): charlie@github.com [OAuth - no password]"
  );
  console.log("   - Diana (EMAIL): diana@example.com [with password]");
  console.log("🏠 Rooms: 2 rooms with members");
  console.log("📁 Files: 2 code files (index.js, App.jsx)");
  console.log("💬 Messages: 3 chat messages");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
