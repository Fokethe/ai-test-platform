-- CreateTable
CREATE TABLE "user_ai_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "api_key_encrypted" TEXT,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 2000,
    "top_p" REAL NOT NULL DEFAULT 1.0,
    "frequency_penalty" REAL NOT NULL DEFAULT 0.0,
    "presence_penalty" REAL NOT NULL DEFAULT 0.0,
    "enable_ai" BOOLEAN NOT NULL DEFAULT true,
    "auto_generate" BOOLEAN NOT NULL DEFAULT false,
    "smart_analysis" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_ai_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_ai_settings_user_id_key" ON "user_ai_settings"("user_id");
