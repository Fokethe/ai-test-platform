/*
  Warnings:

  - You are about to drop the column `tags` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `vector_id` on the `knowledge_entries` table. All the data in the column will be lost.
  - Made the column `requirement_id` on table `tests` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DOC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "content" TEXT,
    "selector" TEXT,
    "url" TEXT,
    "project_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_assets" ("content", "created_at", "created_by", "description", "id", "project_id", "selector", "status", "title", "type", "updated_at", "url") SELECT "content", "created_at", "created_by", "description", "id", "project_id", "selector", "status", "title", "type", "updated_at", "url" FROM "assets";
DROP TABLE "assets";
ALTER TABLE "new_assets" RENAME TO "assets";
CREATE INDEX "assets_status_idx" ON "assets"("status");
CREATE INDEX "assets_title_idx" ON "assets"("title");
CREATE INDEX "assets_created_by_idx" ON "assets"("created_by");
CREATE TABLE "new_knowledge_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "chunk_index" INTEGER,
    "total_chunks" INTEGER,
    "department_id" TEXT,
    "project_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "author_id" TEXT NOT NULL,
    CONSTRAINT "knowledge_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_knowledge_entries" ("author_id", "category", "chunk_index", "content", "created_at", "department_id", "id", "project_id", "tags", "title", "total_chunks", "updated_at") SELECT "author_id", "category", "chunk_index", "content", "created_at", "department_id", "id", "project_id", "tags", "title", "total_chunks", "updated_at" FROM "knowledge_entries";
DROP TABLE "knowledge_entries";
ALTER TABLE "new_knowledge_entries" RENAME TO "knowledge_entries";
CREATE INDEX "knowledge_entries_category_idx" ON "knowledge_entries"("category");
CREATE INDEX "knowledge_entries_author_id_idx" ON "knowledge_entries"("author_id");
CREATE INDEX "knowledge_entries_department_id_idx" ON "knowledge_entries"("department_id");
CREATE INDEX "knowledge_entries_project_id_idx" ON "knowledge_entries"("project_id");
CREATE TABLE "new_tests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CASE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "content" TEXT,
    "parent_id" TEXT,
    "project_id" TEXT NOT NULL,
    "tags" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "ai_prompt" TEXT,
    "ai_model" TEXT,
    "requirement_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tests_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tests_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tests" ("ai_model", "ai_prompt", "assigned_to", "content", "created_at", "created_by", "description", "id", "name", "parent_id", "priority", "project_id", "requirement_id", "source", "status", "tags", "type", "updated_at") SELECT "ai_model", "ai_prompt", "assigned_to", "content", "created_at", "created_by", "description", "id", "name", "parent_id", "priority", "project_id", "requirement_id", "source", "status", "tags", "type", "updated_at" FROM "tests";
DROP TABLE "tests";
ALTER TABLE "new_tests" RENAME TO "tests";
CREATE INDEX "tests_project_id_type_idx" ON "tests"("project_id", "type");
CREATE INDEX "tests_parent_id_idx" ON "tests"("parent_id");
CREATE INDEX "tests_requirement_id_idx" ON "tests"("requirement_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
