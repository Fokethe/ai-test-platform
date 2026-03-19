-- CreateTable
CREATE TABLE "rag_vector_index_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "build_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_unit_key" TEXT NOT NULL,
    "representation_type" TEXT NOT NULL,
    "vector_key" TEXT NOT NULL,
    "embedding_dim" INTEGER NOT NULL,
    "strategy_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT,
    CONSTRAINT "rag_vector_index_entries_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "rag_index_builds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rag_vector_index_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rag_graph_index_nodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "build_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_unit_key" TEXT NOT NULL,
    "representation_type" TEXT NOT NULL,
    "node_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "links_json" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT,
    CONSTRAINT "rag_graph_index_nodes_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "rag_index_builds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rag_graph_index_nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rag_vector_index_entries_vector_key_key" ON "rag_vector_index_entries"("vector_key");

-- CreateIndex
CREATE INDEX "rag_vector_index_entries_build_id_representation_type_idx" ON "rag_vector_index_entries"("build_id", "representation_type");

-- CreateIndex
CREATE INDEX "rag_vector_index_entries_source_type_source_id_representation_type_idx" ON "rag_vector_index_entries"("source_type", "source_id", "representation_type");

-- CreateIndex
CREATE INDEX "rag_vector_index_entries_project_id_created_at_idx" ON "rag_vector_index_entries"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rag_graph_index_nodes_node_key_key" ON "rag_graph_index_nodes"("node_key");

-- CreateIndex
CREATE INDEX "rag_graph_index_nodes_build_id_representation_type_idx" ON "rag_graph_index_nodes"("build_id", "representation_type");

-- CreateIndex
CREATE INDEX "rag_graph_index_nodes_source_type_source_id_representation_type_idx" ON "rag_graph_index_nodes"("source_type", "source_id", "representation_type");

-- CreateIndex
CREATE INDEX "rag_graph_index_nodes_project_id_created_at_idx" ON "rag_graph_index_nodes"("project_id", "created_at");
