-- AlterTable: 将 ProjectMember.role 改为 isLeader 布尔字段

-- Step 1: 添加新的 isLeader 字段
ALTER TABLE "project_members" ADD COLUMN "is_leader" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: 迁移现有数据：将 role = 'lead' 或 'project_admin' 的项目成员设置为 isLeader = true
UPDATE "project_members" 
SET "is_leader" = true 
WHERE "role" IN ('lead', 'project_admin');

-- Step 3: 创建索引
CREATE INDEX IF NOT EXISTS "project_members_is_leader_idx" ON "project_members"("is_leader");

-- Step 4: 删除旧的 role 字段
ALTER TABLE "project_members" DROP COLUMN "role";

