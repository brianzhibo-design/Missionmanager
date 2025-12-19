/**
 * 成员编辑弹窗 - 编辑成员在项目中的角色和描述
 */
import { useState, useEffect } from 'react';
import { X, Briefcase, FileText, Save } from 'lucide-react';
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
  isReviewer: boolean;  // 验收人标记
  description?: string;
}

export function MemberEditModal({ isOpen, member, onClose, onSave }: MemberEditModalProps) {
  const [isReviewer, setIsReviewer] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      // isLeader 在新设计中表示验收人
      setIsReviewer((member as any).isReviewer || member.isLeader || false);
      setDescription((member as any).description || '');
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    setError(null);

    try {
      await onSave(member.userId, { isReviewer, description });
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

          {/* 验收人标记 */}
          <div className="form-group">
            <label>
              <Briefcase size={16} />
              <span>项目验收人</span>
            </label>
            <p className="role-note">
              验收人负责审核和验收项目任务，确保任务质量符合要求。每个项目最多设置一名验收人。
            </p>
            
            <div 
              className={`leader-card ${isReviewer ? 'active' : ''}`}
              onClick={() => setIsReviewer(!isReviewer)}
            >
              <div className="leader-card-checkbox">
                {isReviewer && <span className="checkmark">✓</span>}
              </div>
              <div className="leader-card-content">
                <div className="leader-card-title">
                  <span className="leader-icon">✅</span>
                  <span>设为验收人</span>
                </div>
                <p className="leader-card-desc">负责任务的审核与验收</p>
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
