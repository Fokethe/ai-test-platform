/*
  Warnings:

  - Added the required column `project_id` to the `bugs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reporter_id` to the `bugs` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bugs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "steps" TEXT,
    "screenshots" TEXT,
    "external_id" TEXT,
    "test_case_id" TEXT,
    "reporter_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "execution_id" TEXT,
    "project_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bugs_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bugs_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bugs_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bugs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bugs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "test_executions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_bugs" ("created_at", "description", "external_id", "id", "screenshots", "severity", "status", "steps", "title", "updated_at") SELECT "created_at", "description", "external_id", "id", "screenshots", "severity", "status", "steps", "title", "updated_at" FROM "bugs";
DROP TABLE "bugs";
ALTER TABLE "new_bugs" RENAME TO "bugs";
CREATE INDEX "bugs_status_created_at_idx" ON "bugs"("status", "created_at");
CREATE INDEX "bugs_severity_created_at_idx" ON "bugs"("severity", "created_at");
CREATE INDEX "bugs_reporter_id_idx" ON "bugs"("reporter_id");
CREATE INDEX "bugs_assignee_id_idx" ON "bugs"("assignee_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
