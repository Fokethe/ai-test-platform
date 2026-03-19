-- CreateTable
CREATE TABLE "rag_eval_dataset_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "name" TEXT NOT NULL,
    "dataset_version" TEXT NOT NULL,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT NOT NULL,
    "sample_json" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rag_eval_dataset_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rag_eval_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "strategy_version" INTEGER NOT NULL,
    "dataset_version_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "frameworks_json" TEXT NOT NULL,
    "result_version" INTEGER NOT NULL DEFAULT 1,
    "reproducibility_key" TEXT NOT NULL,
    "metrics_json" TEXT,
    "report_json" TEXT,
    "total_cost" REAL NOT NULL DEFAULT 0,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "recovered_from_run_id" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" DATETIME,
    "last_error" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rag_eval_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rag_eval_runs_dataset_version_id_fkey" FOREIGN KEY ("dataset_version_id") REFERENCES "rag_eval_dataset_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rag_eval_refresh_guard_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "guard_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "observed_latency_ms" INTEGER NOT NULL,
    "threshold_ms" INTEGER NOT NULL,
    "detail_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rag_eval_refresh_guard_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rag_eval_dataset_versions_project_id_name_dataset_version_key" ON "rag_eval_dataset_versions"("project_id", "name", "dataset_version");

-- CreateIndex
CREATE INDEX "rag_eval_dataset_versions_project_id_name_is_active_idx" ON "rag_eval_dataset_versions"("project_id", "name", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "rag_eval_runs_project_id_strategy_version_dataset_version_id_result_version_key" ON "rag_eval_runs"("project_id", "strategy_version", "dataset_version_id", "result_version");

-- CreateIndex
CREATE INDEX "rag_eval_runs_project_id_strategy_version_dataset_version_id_status_idx" ON "rag_eval_runs"("project_id", "strategy_version", "dataset_version_id", "status");

-- CreateIndex
CREATE INDEX "rag_eval_runs_project_id_created_at_idx" ON "rag_eval_runs"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "rag_eval_refresh_guard_events_project_id_guard_type_created_at_idx" ON "rag_eval_refresh_guard_events"("project_id", "guard_type", "created_at");
