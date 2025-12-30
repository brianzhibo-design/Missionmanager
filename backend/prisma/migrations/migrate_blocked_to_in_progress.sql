-- 迁移脚本：将 blocked 状态的任务改为 in_progress
-- 执行时间：2025-12-20

-- 1. 检查有多少 blocked 状态的任务
SELECT COUNT(*) as blocked_count 
FROM tasks 
WHERE status = 'blocked';

-- 2. 将所有 blocked 状态的任务改为 in_progress
UPDATE tasks 
SET status = 'in_progress', 
    updated_at = NOW()
WHERE status = 'blocked';

-- 3. 验证迁移结果
SELECT COUNT(*) as remaining_blocked 
FROM tasks 
WHERE status = 'blocked';
-- 应该返回 0










