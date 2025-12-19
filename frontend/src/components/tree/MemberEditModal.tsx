/**
 * 成员编辑弹窗 - 编辑成员在项目中的角色和描述
 */
import { useState, useEffect } from 'react';
import { X, Crown, FileText, Save } from 'lucide-react';
import { MemberNode } from '../../services/tree';
import { Avatar } from '../Avatar';
import './MemberEditModal.css';

interface MemberEditModalProps {
  isOpen: boolean;
  member: MemberNode | null;
  currentLeaderId?: string;  // 当前项目负责人ID
  onClose: () => void;
  onSave: (memberId: string, data: MemberEditData) => Promise<void>;
}

export interface MemberEditData {
  isLeader?: boolean;   // 设为负责人
  description?: string;
}

export function MemberEditModal({ isOpen, member, currentLeaderId, onClose, onSave }: MemberEditModalProps) {
  const [isLeader, setIsLeader] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentLeader = member?.userId === currentLeaderId;

  useEffect(() => {
    if (member) {
      setIsLeader(member.userId === currentLeaderId);
      setDescription((member as any).description || '');
    }
  }, [member, currentLeaderId]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    setError(null);

    try {
      // 如果从负责人变为非负责人，或者从非负责人变为负责人，需要传递 isLeader
      const leaderChanged = isLeader !== isCurrentLeader;
      await onSave(member.userId, { 
        isLeader: leaderChanged ? isLeader : undefined,
        description 
      });
      onClose();
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
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

          {/* 项目负责人 */}
          <div className="form-group">
            <label>
              <Crown size={16} />
              <span>项目负责人</span>
            </label>
            <p className="role-note">
              负责人拥有项目的完整管理权限，可以编辑项目设置、分配任务等。每个项目只有一名负责人。
            </p>
            
            <div 
              className={`leader-card leader ${isLeader ? 'active' : ''}`}
              onClick={() => setIsLeader(!isLeader)}
            >
              <div className="leader-card-checkbox">
                {isLeader && <span className="checkmark">✓</span>}
              </div>
              <div className="leader-card-content">
                <div className="leader-card-title">
                  <span className="leader-icon">👑</span>
                  <span>{isCurrentLeader ? '当前是负责人' : '设为负责人'}</span>
                </div>
                <p className="leader-card-desc">
                  {isCurrentLeader 
                    ? '取消勾选可转让负责人角色' 
                    : '设置后将替换当前负责人'}
                </p>
              </div>
            </div>
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
