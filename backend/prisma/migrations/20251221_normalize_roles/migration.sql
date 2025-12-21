-- 规范化工作区角色
-- 将旧角色代码统一为新角色代码：
--   admin -> director (大管家)
--   manager -> leader (带头大哥)
--   observer -> guest (吃瓜群侠)

-- 更新 workspace_users 表中的角色
UPDATE "workspace_users" SET role = 'director' WHERE role = 'admin';
UPDATE "workspace_users" SET role = 'leader' WHERE role = 'manager';
UPDATE "workspace_users" SET role = 'guest' WHERE role = 'observer';

-- 更新 project_members 表中的角色（如果有的话）
UPDATE "project_members" SET role = 'director' WHERE role = 'admin';
UPDATE "project_members" SET role = 'leader' WHERE role = 'manager';
UPDATE "project_members" SET role = 'guest' WHERE role = 'observer';
