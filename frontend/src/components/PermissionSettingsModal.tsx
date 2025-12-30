/**
 * 权限设置弹窗
 * 仅工作区创始人可见，用于配置成员的自定义权限
 * 
 * 设计逻辑：
 * - 默认权限：显示为"已启用"且不可关闭（锁定状态）
 * - 额外权限：显示为普通开关，允许手动赋予
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Loader2, Crown, Info, Lock, CheckCircle2 } from './Icons';
import { permissionService, AVAILABLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PERMISSION_GROUPS, UserPermissionData, WorkspacePermission } from '../services/permission';
import { ROLE_LABELS } from '../config/permissions';
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

  // 获取角色默认权限
  const roleDefaultPerms = useMemo(() => {
    return userInfo?.role ? (DEFAULT_ROLE_PERMISSIONS[userInfo.role] || []) : [];
  }, [userInfo?.role]);

  // 默认权限数量
  const defaultPermCount = roleDefaultPerms.length;

  const loadPermissions = useCallback(async () => {
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
  }, [workspaceId, userId]);

  useEffect(() => {
    if (isOpen && userId && workspaceId) {
      loadPermissions();
    }
  }, [isOpen, userId, workspaceId, loadPermissions]);

  const togglePermission = (permissionId: WorkspacePermission, isDefault: boolean) => {
    // 默认权限不可关闭
    if (isDefault) return;
    
    setPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
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
      <div className="perm-modal" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="perm-header">
          <div className="perm-header-left">
            <h3 className="perm-title">权限设置</h3>
            <p className="perm-subtitle">管理该成员在工作区中的访问级别</p>
          </div>
          <button className="perm-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 用户信息卡片 */}
        <div className="perm-user-card">
          <div className="perm-user-avatar">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="perm-user-info">
            <div className="perm-user-name-row">
              <span className="perm-user-name">{userName}</span>
              {userInfo?.role && (
                <span className="perm-role-dot">
                  <span className={`role-dot role-dot-${userInfo.role}`} />
                  {ROLE_LABELS[userInfo.role] || userInfo.role}
                </span>
              )}
            </div>
            <div className="perm-user-hint">
              <Info size={12} />
              <span>该角色默认包含 <strong>{defaultPermCount} 项</strong> 基础权限</span>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="perm-content">
          {loading ? (
            <div className="perm-loading">
              <Loader2 size={28} className="spin" />
              <p>加载中...</p>
            </div>
          ) : error && !userInfo ? (
            <div className="perm-error">
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={loadPermissions}>重试</button>
            </div>
          ) : userInfo?.isOwner ? (
            <div className="perm-owner-notice">
              <Crown size={24} />
              <p>创始人拥有所有权限，无法修改</p>
            </div>
          ) : (
            <>
              {error && <div className="perm-error-msg">{error}</div>}
              
              <div className="perm-list">
                {Object.entries(PERMISSION_GROUPS).map(([groupKey, groupInfo]) => {
                  const groupPerms = AVAILABLE_PERMISSIONS.filter(p => p.group === groupKey);
                  if (groupPerms.length === 0) return null;
                  
                  return (
                    <div key={groupKey} className="perm-group">
                      <div className="perm-group-header">
                        <span className="perm-group-icon">{groupInfo.icon}</span>
                        <span className="perm-group-label">{groupInfo.label}</span>
                      </div>
                      <div className="perm-group-items">
                        {groupPerms.map((perm) => {
                          const isDefault = roleDefaultPerms.includes(perm.id);
                          const isEnabled = isDefault || permissions.includes(perm.id);
                          
                          return (
                            <div 
                              key={perm.id} 
                              className={`perm-item ${isDefault ? 'is-default' : ''} ${isEnabled ? 'is-enabled' : ''}`}
                              onClick={() => togglePermission(perm.id, isDefault)}
                            >
                              <div className="perm-item-left">
                                {/* 图标区域 */}
                                <div className={`perm-check-icon ${isEnabled ? 'checked' : ''} ${isDefault ? 'locked' : ''}`}>
                                  {isDefault ? (
                                    <CheckCircle2 size={18} />
                                  ) : isEnabled ? (
                                    <CheckCircle2 size={18} />
                                  ) : (
                                    <div className="perm-check-empty" />
                                  )}
                                </div>
                                
                                <div className="perm-item-text">
                                  <div className="perm-item-label">
                                    {perm.label}
                                    {isDefault && (
                                      <span className="perm-default-badge">
                                        <Lock size={10} />
                                        默认
                                      </span>
                                    )}
                                  </div>
                                  <div className="perm-item-desc">{perm.description}</div>
                                </div>
                              </div>

                              {/* Toggle 开关 */}
                              <div 
                                className={`perm-toggle ${isEnabled ? 'on' : 'off'} ${isDefault ? 'locked' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePermission(perm.id, isDefault);
                                }}
                              >
                                <div className="perm-toggle-thumb" />
                              </div>
                            </div>
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
        <div className="perm-footer">
          <button className="perm-btn perm-btn-cancel" onClick={onClose}>
            取消
          </button>
          {!userInfo?.isOwner && (
            <button
              className="perm-btn perm-btn-save"
              onClick={handleSave}
              disabled={saving || loading || !hasChanges()}
            >
              {saving ? (
                <><Loader2 size={14} className="spin" /> 保存中...</>
              ) : (
                '保存修改'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}








