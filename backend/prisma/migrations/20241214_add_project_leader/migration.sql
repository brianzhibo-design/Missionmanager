-- 添加项目负责人字段
ALTER TABLE "projects" ADD COLUMN "leader_id" TEXT;

-- 添加外键约束
ALTER TABLE "projects" ADD CONSTRAINT "projects_leader_id_fkey" 
FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 创建索引
CREATE INDEX "projects_leader_id_idx" ON "projects"("leader_id");

