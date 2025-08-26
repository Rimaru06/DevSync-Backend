/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[githubId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'GITHUB');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "githubId" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "provider" "public"."AuthProvider" DEFAULT 'EMAIL',
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "public"."users"("githubId");
