/*
  Warnings:

  - Added the required column `updated_at` to the `executions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_executions" (
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "executions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "executions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_executions" ("completed_at", "duration", "error_message", "error_stack", "id", "run_id", "screenshot", "started_at", "status", "stderr", "stdout", "test_id", "video") SELECT "completed_at", "duration", "error_message", "error_stack", "id", "run_id", "screenshot", "started_at", "status", "stderr", "stdout", "test_id", "video" FROM "executions";
DROP TABLE "executions";
ALTER TABLE "new_executions" RENAME TO "executions";
CREATE INDEX "executions_run_id_status_idx" ON "executions"("run_id", "status");
CREATE INDEX "executions_test_id_idx" ON "executions"("test_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
