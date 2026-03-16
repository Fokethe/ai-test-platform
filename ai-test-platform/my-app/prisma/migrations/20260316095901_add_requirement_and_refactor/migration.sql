-- AlterTable
ALTER TABLE "knowledge_entries" ADD COLUMN "chunk_index" INTEGER;
ALTER TABLE "knowledge_entries" ADD COLUMN "department_id" TEXT;
ALTER TABLE "knowledge_entries" ADD COLUMN "project_id" TEXT;
ALTER TABLE "knowledge_entries" ADD COLUMN "total_chunks" INTEGER;
ALTER TABLE "knowledge_entries" ADD COLUMN "vector_id" TEXT;

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "custom_fields_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "custom_field_values_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "tags" TEXT,
    "project_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_assets" ("content", "created_at", "created_by", "description", "id", "project_id", "selector", "status", "tags", "title", "type", "updated_at", "url") SELECT "content", "created_at", "created_by", "description", "id", "project_id", "selector", "status", "tags", "title", "type", "updated_at", "url" FROM "assets";
DROP TABLE "assets";
ALTER TABLE "new_assets" RENAME TO "assets";
CREATE INDEX "assets_status_idx" ON "assets"("status");
CREATE INDEX "assets_project_id_status_idx" ON "assets"("project_id", "status");
CREATE INDEX "assets_project_id_type_status_idx" ON "assets"("project_id", "type", "status");
CREATE INDEX "assets_updated_at_idx" ON "assets"("updated_at");
CREATE INDEX "assets_title_idx" ON "assets"("title");
CREATE INDEX "assets_created_by_idx" ON "assets"("created_by");
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
    "requirement_id" TEXT,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tests_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tests_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tests" ("ai_model", "ai_prompt", "assigned_to", "content", "created_at", "created_by", "description", "id", "name", "parent_id", "priority", "project_id", "source", "status", "tags", "type", "updated_at") SELECT "ai_model", "ai_prompt", "assigned_to", "content", "created_at", "created_by", "description", "id", "name", "parent_id", "priority", "project_id", "source", "status", "tags", "type", "updated_at" FROM "tests";
DROP TABLE "tests";
ALTER TABLE "new_tests" RENAME TO "tests";
CREATE INDEX "tests_project_id_type_idx" ON "tests"("project_id", "type");
CREATE INDEX "tests_parent_id_idx" ON "tests"("parent_id");
CREATE INDEX "tests_tags_idx" ON "tests"("tags");
CREATE INDEX "tests_requirement_id_idx" ON "tests"("requirement_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "custom_fields_project_id_type_idx" ON "custom_fields"("project_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "custom_fields_project_id_key_key" ON "custom_fields"("project_id", "key");

-- CreateIndex
CREATE INDEX "custom_field_values_test_id_idx" ON "custom_field_values"("test_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_field_id_test_id_key" ON "custom_field_values"("field_id", "test_id");

-- CreateIndex
CREATE INDEX "knowledge_entries_department_id_idx" ON "knowledge_entries"("department_id");

-- CreateIndex
CREATE INDEX "knowledge_entries_project_id_idx" ON "knowledge_entries"("project_id");

-- CreateIndex
CREATE INDEX "knowledge_entries_vector_id_idx" ON "knowledge_entries"("vector_id");
