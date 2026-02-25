-- CreateTable
CREATE TABLE "tests" (
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
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tests_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "passed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "schedule_id" TEXT,
    "cron" TEXT,
    "next_run_at" DATETIME,
    "project_id" TEXT,
    "created_by" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "run_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "duration" INTEGER,
    "error_message" TEXT,
    "error_stack" TEXT,
    "screenshot" TEXT,
    "video" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    CONSTRAINT "executions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "executions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'BUG',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "project_id" TEXT NOT NULL,
    "test_id" TEXT,
    "run_id" TEXT,
    "reporter_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "resolution" TEXT,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "issues_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "issues_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issues_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DOC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "content" TEXT,
    "selector" TEXT,
    "url" TEXT,
    "tags" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "token" TEXT,
    "events" TEXT NOT NULL,
    "config" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "integrations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integration_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "response_status" INTEGER,
    "response_body" TEXT,
    "error" TEXT,
    "delivered_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deliveries_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link_url" TEXT,
    "link_text" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inbox_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_id" TEXT,
    "actor_type" TEXT NOT NULL DEFAULT 'USER',
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "metadata" TEXT,
    "project_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "tests_project_id_type_idx" ON "tests"("project_id", "type");

-- CreateIndex
CREATE INDEX "tests_parent_id_idx" ON "tests"("parent_id");

-- CreateIndex
CREATE INDEX "tests_tags_idx" ON "tests"("tags");

-- CreateIndex
CREATE INDEX "runs_project_id_status_idx" ON "runs"("project_id", "status");

-- CreateIndex
CREATE INDEX "runs_status_created_at_idx" ON "runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "runs_schedule_id_idx" ON "runs"("schedule_id");

-- CreateIndex
CREATE INDEX "executions_run_id_status_idx" ON "executions"("run_id", "status");

-- CreateIndex
CREATE INDEX "executions_test_id_idx" ON "executions"("test_id");

-- CreateIndex
CREATE INDEX "issues_project_id_status_idx" ON "issues"("project_id", "status");

-- CreateIndex
CREATE INDEX "issues_status_severity_idx" ON "issues"("status", "severity");

-- CreateIndex
CREATE INDEX "issues_assignee_id_status_idx" ON "issues"("assignee_id", "status");

-- CreateIndex
CREATE INDEX "assets_project_id_type_idx" ON "assets"("project_id", "type");

-- CreateIndex
CREATE INDEX "assets_tags_idx" ON "assets"("tags");

-- CreateIndex
CREATE INDEX "integrations_project_id_type_idx" ON "integrations"("project_id", "type");

-- CreateIndex
CREATE INDEX "integrations_is_active_idx" ON "integrations"("is_active");

-- CreateIndex
CREATE INDEX "deliveries_integration_id_status_idx" ON "deliveries"("integration_id", "status");

-- CreateIndex
CREATE INDEX "deliveries_status_created_at_idx" ON "deliveries"("status", "created_at");

-- CreateIndex
CREATE INDEX "inbox_user_id_is_read_idx" ON "inbox"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "inbox_created_at_idx" ON "inbox"("created_at");

-- CreateIndex
CREATE INDEX "activities_project_id_created_at_idx" ON "activities"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_target_id_created_at_idx" ON "activities"("target_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_actor_id_created_at_idx" ON "activities"("actor_id", "created_at");
