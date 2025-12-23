-- 规范化角色名称
-- workspace_users 表中的角色统一为: director, leader, member, guest

-- 更新 workspace_users 表中的角色
UPDATE "workspace_users" SET role = 'director' WHERE role = 'admin';
UPDATE "workspace_users" SET role = 'leader' WHERE role = 'manager';
UPDATE "workspace_users" SET role = 'guest' WHERE role = 'observer';




