/**
 * 成员编辑弹窗 - 编辑成员在项目中的角色和描述
 */
import { useState, useEffect } from 'react';
import { X, Briefcase, FileText, Save, Plus, Tag } from 'lucide-react';
import { MemberNode } from '../../services/tree';
import { Avatar } from '../Avatar';
import './MemberEditModal.css';

interface MemberEditModalProps {
  isOpen: boolean;
  member: MemberNode | null;
  onClose: () => void;
  onSave: (memberId: string, data: MemberEditData) => Promise<void>;
}

export interface MemberEditData {
  role: string;
  customRole?: string;
  description: string;
}

// 预设角色
const PRESET_ROLES = [
  { value: 'project_admin', label: '项目管理员', description: '拥有项目的完全管理权限', color: '#8b5cf6' },
  { value: 'team_lead', label: '团队负责人', description: '负责团队的日常管理和任务分配', color: '#3b82f6' },
  { value: 'senior', label: '高级成员', description: '经验丰富的核心成员', color: '#10b981' },
  { value: 'member', label: '普通成员', description: '项目的普通参与者', color: '#6b7280' },
  { value: 'observer', label: '观察者', description: '只能查看项目内容，不能编辑', color: '#9ca3af' },
];

// 常用自定义角色建议
const CUSTOM_ROLE_SUGGESTIONS = [
  '前端开发', '后端开发', '全栈工程师', 'UI设计师', '产品经理',
  '测试工程师', '运维工程师', '架构师', '技术总监', '项目经理',
  '数据分析师', 'DevOps工程师', '安全工程师'
];

export function MemberEditModal({ isOpen, member, onClose, onSave }: MemberEditModalProps) {
  const [roleType, setRoleType] = useState<'preset' | 'custom'>('preset');
  const [presetRole, setPresetRole] = useState('member');
  const [customRole, setCustomRole] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (member) {
      const memberRole = member.role || 'member';
      // 检查是否是预设角色
      const isPreset = PRESET_ROLES.some(r => r.value === memberRole);
      if (isPreset) {
        setRoleType('preset');
        setPresetRole(memberRole);
        setCustomRole('');
      } else {
        setRoleType('custom');
        setCustomRole(memberRole);
        setPresetRole('member');
      }
      setDescription((member as any).description || '');
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (roleType === 'custom' && !customRole.trim()) {
      setError('请输入自定义角色名称');
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      const role = roleType === 'preset' ? presetRole : customRole.trim();
      await onSave(member.userId, { role, description });
      onClose();
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCustomRole(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="member-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>编辑成员信息</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 成员信息 */}
          <div className="member-info">
            <Avatar name={member.name} size="lg" />
            <div className="member-details">
              <h3>{member.name}</h3>
              <p>{member.email}</p>
            </div>
          </div>

          {error && (
            <div className="error-alert">{error}</div>
          )}

          {/* 角色类型切换 */}
          <div className="form-group">
            <label>
              <Briefcase size={16} />
              <span>项目角色</span>
            </label>
            <p className="role-note">
              项目角色仅用于标识成员在项目中的职能定位（如前端开发、产品经理等），不影响成员在工作区中的实际权限。
            </p>
            
            <div className="role-type-tabs">
              <button
                type="button"
                className={`tab ${roleType === 'preset' ? 'active' : ''}`}
                onClick={() => setRoleType('preset')}
              >
                预设角色
              </button>
              <button
                type="button"
                className={`tab ${roleType === 'custom' ? 'active' : ''}`}
                onClick={() => setRoleType('custom')}
              >
                <Plus size={14} />
                自定义角色
              </button>
            </div>

            {roleType === 'preset' ? (
              <div className="role-selector">
                {PRESET_ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`role-option ${presetRole === r.value ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="presetRole"
                      value={r.value}
                      checked={presetRole === r.value}
                      onChange={(e) => setPresetRole(e.target.value)}
                    />
                    <div 
                      className="role-color-dot" 
                      style={{ backgroundColor: r.color }}
                    />
                    <div className="role-content">
                      <span className="role-label">{r.label}</span>
                      <span className="role-desc">{r.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="custom-role-input">
                <div className="input-wrapper">
                  <Tag size={16} className="input-icon" />
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="输入自定义角色名称，如：前端开发、产品经理..."
                    maxLength={20}
                  />
                </div>
                
                {showSuggestions && (
                  <div className="role-suggestions">
                    <p className="suggestions-title">常用角色：</p>
                    <div className="suggestion-tags">
                      {CUSTOM_ROLE_SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`suggestion-tag ${customRole === s ? 'active' : ''}`}
                          onClick={() => handleSuggestionClick(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 成员描述 */}
          <div className="form-group">
            <label>
              <FileText size={16} />
              <span>成员描述</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述该成员的职责、技能特长等，便于任务分配和 AI 分析..."
              rows={4}
            />
            <p className="help-text">
              详细的描述有助于 AI 更准确地分析团队能力和推荐任务分配
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>保存中...</>
              ) : (
                <>
                  <Save size={16} />
                  <span>保存</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
