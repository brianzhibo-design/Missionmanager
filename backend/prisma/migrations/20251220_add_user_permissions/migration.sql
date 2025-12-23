-- AlterTable: 添加用户自定义权限字段
-- 这个字段允许工作区创始人为每个成员设置自定义权限

ALTER TABLE "workspace_users" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 创建索引以加速权限查询
CREATE INDEX IF NOT EXISTS "workspace_users_permissions_idx" ON "workspace_users" USING GIN ("permissions");


