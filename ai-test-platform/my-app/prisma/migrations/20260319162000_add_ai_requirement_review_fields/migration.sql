-- AlterTable
ALTER TABLE "ai_requirements" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ai_requirements" ADD COLUMN "confirmed_at" DATETIME;
ALTER TABLE "ai_requirements" ADD COLUMN "confirmed_by" TEXT;
