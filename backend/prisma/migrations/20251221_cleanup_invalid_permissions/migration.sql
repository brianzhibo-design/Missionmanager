-- 清理无效的权限值
-- 移除 TEAM_KUDOS 和 FUN_EVENTS 等后端不支持的权限

-- 从 permissions 数组中移除无效值
UPDATE "workspace_users" 
SET permissions = array_remove(array_remove(permissions, 'TEAM_KUDOS'), 'FUN_EVENTS')
WHERE permissions @> ARRAY['TEAM_KUDOS'] OR permissions @> ARRAY['FUN_EVENTS'];









