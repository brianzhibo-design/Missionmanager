-- CreateTable: 咖啡抽奖记录
-- 用于存储每日咖啡抽奖的获奖者信息

CREATE TABLE IF NOT EXISTS "coffee_lotteries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspace_id" TEXT NOT NULL,
    "winner_id" TEXT NOT NULL,

    CONSTRAINT "coffee_lotteries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: 每个工作区每天只能有一条抽奖记录
CREATE UNIQUE INDEX IF NOT EXISTS "coffee_lotteries_workspace_id_date_key" ON "coffee_lotteries"("workspace_id", "date");

-- AddForeignKey: 关联工作区
ALTER TABLE "coffee_lotteries" ADD CONSTRAINT "coffee_lotteries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: 关联获奖用户
ALTER TABLE "coffee_lotteries" ADD CONSTRAINT "coffee_lotteries_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;









