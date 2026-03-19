-- CreateTable
CREATE TABLE "rag_strategy_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "multi_query" BOOLEAN NOT NULL DEFAULT false,
    "hyde" BOOLEAN NOT NULL DEFAULT true,
    "decomposition" BOOLEAN NOT NULL DEFAULT false,
    "fusion" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rag_strategy_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rag_strategy_configs_project_id_version_key" ON "rag_strategy_configs"("project_id", "version");

-- CreateIndex
CREATE INDEX "rag_strategy_configs_project_id_is_active_idx" ON "rag_strategy_configs"("project_id", "is_active");
