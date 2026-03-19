-- CreateTable
CREATE TABLE "rag_hierarchical_index_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "project_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stage" TEXT NOT NULL DEFAULT 'init',
    "recovered_from_job_id" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" DATETIME,
    "last_error" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rag_hierarchical_index_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rag_index_checkpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "payload_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rag_index_checkpoints_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "rag_hierarchical_index_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rag_hierarchical_index_nodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL,
    "node_key" TEXT NOT NULL,
    "cluster_key" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "unit_refs_json" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rag_hierarchical_index_nodes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "rag_hierarchical_index_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "rag_hierarchical_index_jobs_source_type_source_id_status_idx" ON "rag_hierarchical_index_jobs"("source_type", "source_id", "status");

-- CreateIndex
CREATE INDEX "rag_hierarchical_index_jobs_project_id_created_at_idx" ON "rag_hierarchical_index_jobs"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "rag_index_checkpoints_job_id_created_at_idx" ON "rag_index_checkpoints"("job_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rag_hierarchical_index_nodes_node_key_key" ON "rag_hierarchical_index_nodes"("node_key");

-- CreateIndex
CREATE INDEX "rag_hierarchical_index_nodes_job_id_level_idx" ON "rag_hierarchical_index_nodes"("job_id", "level");

-- CreateIndex
CREATE INDEX "rag_hierarchical_index_nodes_job_id_parent_id_idx" ON "rag_hierarchical_index_nodes"("job_id", "parent_id");
