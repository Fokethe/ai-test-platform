-- CreateTable
CREATE TABLE "ai_requirements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "features" TEXT NOT NULL,
    "business_rules" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "test_points" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "related_feature" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requirement_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "test_points_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "ai_requirements" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ai_requirements_project_id_created_at_idx" ON "ai_requirements"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "test_points_requirement_id_priority_idx" ON "test_points"("requirement_id", "priority");
