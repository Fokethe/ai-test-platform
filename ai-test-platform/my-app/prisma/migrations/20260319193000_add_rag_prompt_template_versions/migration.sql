-- CreateTable
CREATE TABLE "rag_prompt_template_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "scenario" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rag_prompt_template_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rag_prompt_template_versions_project_id_scenario_version_key" ON "rag_prompt_template_versions"("project_id", "scenario", "version");

-- CreateIndex
CREATE INDEX "rag_prompt_template_versions_project_id_scenario_is_active_idx" ON "rag_prompt_template_versions"("project_id", "scenario", "is_active");
