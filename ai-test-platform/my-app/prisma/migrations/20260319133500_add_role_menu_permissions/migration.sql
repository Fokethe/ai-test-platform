-- CreateTable
CREATE TABLE "role_menu_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "menu_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "role_menu_permissions_role_menu_key_key" ON "role_menu_permissions"("role", "menu_key");

-- CreateIndex
CREATE INDEX "role_menu_permissions_menu_key_idx" ON "role_menu_permissions"("menu_key");
