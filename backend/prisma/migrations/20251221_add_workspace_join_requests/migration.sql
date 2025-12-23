-- 工作区加入申请表
CREATE TABLE IF NOT EXISTS "workspace_join_requests" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "workspace_join_requests_pkey" PRIMARY KEY ("id")
);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_join_requests_user_id_workspace_id_key" ON "workspace_join_requests"("user_id", "workspace_id");
CREATE INDEX IF NOT EXISTS "workspace_join_requests_workspace_id_status_idx" ON "workspace_join_requests"("workspace_id", "status");

-- 外键约束
ALTER TABLE "workspace_join_requests" ADD CONSTRAINT "workspace_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_join_requests" ADD CONSTRAINT "workspace_join_requests_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_join_requests" ADD CONSTRAINT "workspace_join_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;




