-- CreateTable
CREATE TABLE "rag_index_builds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "project_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "strategy_json" TEXT NOT NULL,
    "quality_score" REAL,
    "unit_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rag_index_builds_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rag_index_units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "build_id" TEXT NOT NULL,
    "unit_key" TEXT NOT NULL,
    "unit_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "start_offset" INTEGER,
    "end_offset" INTEGER,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rag_index_units_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "rag_index_builds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rag_index_builds_source_type_source_id_version_key" ON "rag_index_builds"("source_type", "source_id", "version");

-- CreateIndex
CREATE INDEX "rag_index_builds_source_type_source_id_is_active_idx" ON "rag_index_builds"("source_type", "source_id", "is_active");

-- CreateIndex
CREATE INDEX "rag_index_builds_project_id_created_at_idx" ON "rag_index_builds"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rag_index_units_unit_key_key" ON "rag_index_units"("unit_key");

-- CreateIndex
CREATE INDEX "rag_index_units_build_id_unit_index_idx" ON "rag_index_units"("build_id", "unit_index");
