-- CreateTable
CREATE TABLE "rag_routing_rule_sets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rules_json" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rag_routing_rule_sets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rag_routing_rule_sets_project_id_version_key" ON "rag_routing_rule_sets"("project_id", "version");

-- CreateIndex
CREATE INDEX "rag_routing_rule_sets_project_id_is_active_idx" ON "rag_routing_rule_sets"("project_id", "is_active");
