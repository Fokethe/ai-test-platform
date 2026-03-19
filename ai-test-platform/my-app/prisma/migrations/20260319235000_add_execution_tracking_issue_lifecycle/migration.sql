-- RedefineTable
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_issues" (
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
    "execution_id" TEXT,
    "reporter_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "resolution" TEXT,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "issues_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "issues_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "issues_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issues_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_issues" ("assignee_id", "created_at", "description", "id", "priority", "project_id", "reporter_id", "resolution", "resolved_at", "run_id", "severity", "status", "test_id", "title", "type", "updated_at")
SELECT "assignee_id", "created_at", "description", "id", "priority", "project_id", "reporter_id", "resolution", "resolved_at", "run_id", "severity", "status", "test_id", "title", "type", "updated_at" FROM "issues";
DROP TABLE "issues";
ALTER TABLE "new_issues" RENAME TO "issues";
CREATE INDEX "issues_project_id_status_idx" ON "issues"("project_id", "status");
CREATE INDEX "issues_status_severity_idx" ON "issues"("status", "severity");
CREATE INDEX "issues_assignee_id_status_idx" ON "issues"("assignee_id", "status");
CREATE INDEX "issues_execution_id_idx" ON "issues"("execution_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "execution_status_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "execution_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "note" TEXT,
    "actor_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "execution_status_events_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issue_lifecycle_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issue_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_id" TEXT,
    "note" TEXT,
    "regression_run_id" TEXT,
    "regression_execution_id" TEXT,
    "regression_result" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "issue_lifecycle_events_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "issue_lifecycle_events_regression_run_id_fkey" FOREIGN KEY ("regression_run_id") REFERENCES "runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "issue_lifecycle_events_regression_execution_id_fkey" FOREIGN KEY ("regression_execution_id") REFERENCES "executions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "execution_status_events_execution_id_idempotency_key_key" ON "execution_status_events"("execution_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "execution_status_events_execution_id_created_at_idx" ON "execution_status_events"("execution_id", "created_at");

-- CreateIndex
CREATE INDEX "issue_lifecycle_events_issue_id_created_at_idx" ON "issue_lifecycle_events"("issue_id", "created_at");

-- CreateIndex
CREATE INDEX "issue_lifecycle_events_regression_run_id_idx" ON "issue_lifecycle_events"("regression_run_id");

-- CreateIndex
CREATE INDEX "issue_lifecycle_events_regression_execution_id_idx" ON "issue_lifecycle_events"("regression_execution_id");
