-- CreateTable
CREATE TABLE "user_model_api_key_bindings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_model_api_key_bindings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_model_api_key_bindings_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_model_call_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "api_key_id" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT,
    "call_path" TEXT NOT NULL,
    "request_tokens" INTEGER NOT NULL DEFAULT 0,
    "response_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" REAL NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "web_enabled" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "fallback_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_model_call_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_model_call_stats_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_model_call_stats_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_model_api_key_bindings_user_id_model_key" ON "user_model_api_key_bindings"("user_id", "model");

-- CreateIndex
CREATE INDEX "user_model_api_key_bindings_api_key_id_idx" ON "user_model_api_key_bindings"("api_key_id");

-- CreateIndex
CREATE INDEX "ai_model_call_stats_user_id_created_at_idx" ON "ai_model_call_stats"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_model_call_stats_model_created_at_idx" ON "ai_model_call_stats"("model", "created_at");

-- CreateIndex
CREATE INDEX "ai_model_call_stats_api_key_id_created_at_idx" ON "ai_model_call_stats"("api_key_id", "created_at");

-- CreateIndex
CREATE INDEX "api_keys_user_id_is_active_created_at_idx" ON "api_keys"("user_id", "is_active", "created_at");
