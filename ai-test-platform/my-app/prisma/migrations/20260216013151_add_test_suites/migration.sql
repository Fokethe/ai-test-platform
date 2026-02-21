-- CreateTable
CREATE TABLE "test_suites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "project_id" TEXT NOT NULL,
    CONSTRAINT "test_suites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_suite_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "test_suite_id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "test_suite_cases_test_suite_id_fkey" FOREIGN KEY ("test_suite_id") REFERENCES "test_suites" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "test_suite_cases_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suite_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "browser" TEXT NOT NULL DEFAULT 'chromium',
    "headless" BOOLEAN NOT NULL DEFAULT true,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "passed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "test_suite_id" TEXT NOT NULL,
    CONSTRAINT "suite_executions_test_suite_id_fkey" FOREIGN KEY ("test_suite_id") REFERENCES "test_suites" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "test_suite_cases_test_suite_id_test_case_id_key" ON "test_suite_cases"("test_suite_id", "test_case_id");
