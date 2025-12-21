/**
 * 权限设置弹窗
 * 仅工作区创始人可见，用于配置成员的自定义权限
 */
import { useState, useEffect } from 'react';
import { X, Shield, Loader2, Check, Crown } from 'lucide-react';
import { permissionService, AVAILABLE_PERMISSIONS, PERMISSION_GROUPS, DEFAULT_ROLE_PERMISSIONS, UserPermissionData, WorkspacePermission } from '../services/permission';
import { ROLE_LABELS, ROLE_ICONS } from '../config/permissions';
import './PermissionSettingsModal.css';

interface PermissionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  onUpdate?: () => void;
}

export default function PermissionSettingsModal({
  isOpen,
  onClose,
  workspaceId,
  userId,
  userName,
  userAvatar,
  onUpdate,
}: PermissionSettingsModalProps) {
  const [permissions, setPermissions] = useState<WorkspacePermission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<WorkspacePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserPermissionData | null>(null);

  useEffect(() => {
    if (isOpen && userId && workspaceId) {
      loadPermissions();
    }
  }, [isOpen, userId, workspaceId]);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await permissionService.getUserPermissions(workspaceId, userId);
      setUserInfo(data);
      setPermissions(data.permissions || []);
      setOriginalPermissions(data.permissions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载权限失败');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: WorkspacePermission) => {
    setPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const selectAll = () => {
    setPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
  };

  const deselectAll = () => {
    setPermissions([]);
  };

  const hasChanges = () => {
    if (permissions.length !== originalPermissions.length) return true;
    return permissions.some(p => !originalPermissions.includes(p));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await permissionService.updateUserPermissions(workspaceId, userId, permissions);
      setOriginalPermissions(permissions);
      onUpdate?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="permission-settings-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* 头部 */}
        <div className="modal-header">
          <div className="header-icon">
            <Shield size={24} />
          </div>
          <div className="header-content">
            <h3>权限设置</h3>
            <div className="user-info">
              <div className="user-avatar">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="user-name">{userName}</span>
              {userInfo?.role && (
                <span className="role-badge">
                  {ROLE_ICONS[userInfo.role] || '👤'} {ROLE_LABELS[userInfo.role] || userInfo.role}
                </span>
              )}
              {userInfo?.isOwner && (
                <span className="owner-badge"><Crown size={12} /> 创始人</span>
              )}
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="modal-content">
          {loading ? (
            <div className="loading-state">
              <Loader2 size={32} className="spin" />
              <p>加载中...</p>
            </div>
          ) : error && !userInfo ? (
            <div className="error-state">
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={loadPermissions}>重试</button>
            </div>
          ) : userInfo?.isOwner ? (
            <div className="owner-notice">
              <Crown size={24} />
              <p>创始人拥有所有权限，无法修改</p>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}
              
              {/* 角色默认权限说明 */}
              {userInfo?.role && (
                <div className="role-permissions-info">
                  <div className="info-header">
                    <span className="info-icon">ℹ️</span>
                    <span className="info-title">角色默认权限</span>
                  </div>
                  <p className="info-desc">
                    {ROLE_ICONS[userInfo.role]} <strong>{ROLE_LABELS[userInfo.role]}</strong> 角色默认拥有以下权限（标记为 <span className="default-tag">默认</span>），
                    您可以额外授予或移除权限。
                  </p>
                </div>
              )}
              
              <div className="quick-actions">
                <button className="btn btn-sm btn-secondary" onClick={selectAll}>
                  全选
                </button>
                <button className="btn btn-sm btn-secondary" onClick={deselectAll}>
                  全不选
                </button>
              </div>

              <div className="permission-list">
                {Object.entries(PERMISSION_GROUPS).map(([groupId, group]) => {
                  const groupPermissions = AVAILABLE_PERMISSIONS.filter(p => p.group === groupId);
                  if (groupPermissions.length === 0) return null;
                  
                  // 获取角色默认权限
                  const roleDefaultPerms = userInfo?.role 
                    ? (DEFAULT_ROLE_PERMISSIONS[userInfo.role] || [])
                    : [];
                  
                  return (
                    <div key={groupId} className="permission-group">
                      <div className="group-header">
                        <span className="group-icon">{group.icon}</span>
                        <span className="group-label">{group.label}</span>
                        <span className="group-count">
                          {groupPermissions.filter(p => permissions.includes(p.id)).length}/{groupPermissions.length}
                        </span>
                      </div>
                      <div className="group-items">
                        {groupPermissions.map((perm) => {
                          const isRoleDefault = roleDefaultPerms.includes(perm.id);
                          const isChecked = permissions.includes(perm.id);
                          
                          return (
                            <label
                              key={perm.id}
                              className={`permission-item ${isChecked ? 'checked' : ''} ${isRoleDefault ? 'role-default' : ''}`}
                            >
                              <div className="checkbox-wrapper">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.id)}
                                />
                                <div className="checkbox-custom">
                                  {isChecked && <Check size={14} />}
                                </div>
                              </div>
                              <div className="permission-info">
                                <div className="permission-label">
                                  {perm.label}
                                  {isRoleDefault && <span className="default-badge">默认</span>}
                                </div>
                                <div className="permission-desc">{perm.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          {!userInfo?.isOwner && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || loading || !hasChanges()}
            >
              {saving ? (
                <><Loader2 size={16} className="spin" /> 保存中...</>
              ) : (
                '保存'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
