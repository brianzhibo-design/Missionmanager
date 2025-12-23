-- 日报评论表
CREATE TABLE IF NOT EXISTS "daily_report_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daily_report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "daily_report_comments_pkey" PRIMARY KEY ("id")
);

-- 日报点赞表
CREATE TABLE IF NOT EXISTS "daily_report_likes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daily_report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "daily_report_likes_pkey" PRIMARY KEY ("id")
);

-- 索引
CREATE INDEX IF NOT EXISTS "daily_report_comments_daily_report_id_created_at_idx" ON "daily_report_comments"("daily_report_id", "created_at");

-- 唯一约束：每个用户只能对同一日报点赞一次
CREATE UNIQUE INDEX IF NOT EXISTS "daily_report_likes_daily_report_id_user_id_key" ON "daily_report_likes"("daily_report_id", "user_id");

-- 外键约束
ALTER TABLE "daily_report_comments" ADD CONSTRAINT "daily_report_comments_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_report_comments" ADD CONSTRAINT "daily_report_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_report_likes" ADD CONSTRAINT "daily_report_likes_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_report_likes" ADD CONSTRAINT "daily_report_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


