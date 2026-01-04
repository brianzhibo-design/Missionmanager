import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CloudUpload, Globe, Briefcase, Users } from './Icons';
import './CreateWorkspaceModal.css';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; teamSize?: string; primaryUse?: string }) => Promise<void>;
}

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [teamSize, setTeamSize] = useState('1-10');
  const [primaryUse, setPrimaryUse] = useState('work');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 渐变色列表
  const gradients = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #10b981, #14b8a6)',
    'linear-gradient(135deg, #f43f5e, #f97316)',
  ];

  // 根据名字选择颜色
  const getGradient = () => {
    if (!name) return gradients[0];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入工作区名称');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      await onSubmit({
        name: name.trim(),
        description: `团队规模: ${teamSize}, 用途: ${primaryUse === 'work' ? '工作项目' : '教育'}`,
        teamSize,
        primaryUse,
      });
      // 成功后重置表单并关闭
      setName('');
      setTeamSize('1-10');
      setPrimaryUse('work');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setTeamSize('1-10');
      setPrimaryUse('work');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="cwm-overlay">
      {/* 背景模糊 */}
      <div className="cwm-backdrop" onClick={handleClose} />
      
      {/* 模态框主体 */}
      <div className="cwm-modal">
        
        {/* 头部装饰背景 */}
        <div className="cwm-header" style={{ background: getGradient() }}>
          <button onClick={handleClose} className="cwm-close-btn" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        {/* 核心内容区 */}
        <div className="cwm-content">
           
          {/* Logo 预览 */}
          <div className="cwm-logo-wrapper">
            <div className="cwm-logo" style={{ background: getGradient() }}>
              <span className="cwm-logo-letter">{name ? name[0].toUpperCase() : 'W'}</span>
              
              {/* 悬浮遮罩 */}
              <div className="cwm-logo-overlay">
                <CloudUpload size={24} />
                <span>上传</span>
              </div>
            </div>
          </div>

          <div className="cwm-form">
            {/* 标题区 */}
            <div className="cwm-title-section">
              <h2 className="cwm-title">创建新工作区</h2>
              <p className="cwm-subtitle">与您的团队在专属空间中协作</p>
            </div>

            {error && (
              <div className="cwm-error">{error}</div>
            )}

            <div className="cwm-fields">
              {/* 工作区名称输入 */}
              <div className="cwm-field">
                <label className="cwm-label">工作区名称</label>
                <div className="cwm-input-wrapper">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如: 产品设计团队" 
                    className="cwm-input"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>
                {/* URL 预览 */}
                <div className={`cwm-url-preview ${name ? 'visible' : ''}`}>
                  <Globe size={12} />
                  <span className="cwm-url-base">app.taskflow.com/</span>
                  <span className="cwm-url-slug">{name ? name.toLowerCase().replace(/\s+/g, '-') : '...'}</span>
                </div>
              </div>

              {/* 团队规模 */}
              <div className="cwm-field">
                <label className="cwm-label">团队规模</label>
                <div className="cwm-size-options">
                  {['1-10', '11-50', '50+'].map((size) => (
                    <label key={size} className="cwm-size-option">
                      <input 
                        type="radio" 
                        name="size" 
                        value={size}
                        checked={teamSize === size}
                        onChange={(e) => setTeamSize(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <div className="cwm-size-label">{size}</div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 用途选择 */}
              <div className="cwm-field">
                <label className="cwm-label">主要用途</label>
                <div className="cwm-use-options">
                  {/* 工作项目 */}
                  <label className={`cwm-use-option ${primaryUse === 'work' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="use" 
                      value="work"
                      checked={primaryUse === 'work'}
                      onChange={(e) => setPrimaryUse(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="cwm-use-icon work">
                      <Briefcase size={20} />
                    </div>
                    <div className="cwm-use-info">
                      <div className="cwm-use-title">工作项目</div>
                      <div className="cwm-use-desc">管理任务、冲刺和路线图</div>
                    </div>
                    <div className="cwm-use-radio" />
                  </label>
                  
                  {/* 教育 */}
                  <label className={`cwm-use-option ${primaryUse === 'education' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="use" 
                      value="education"
                      checked={primaryUse === 'education'}
                      onChange={(e) => setPrimaryUse(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="cwm-use-icon education">
                      <Users size={20} />
                    </div>
                    <div className="cwm-use-info">
                      <div className="cwm-use-title">教育</div>
                      <div className="cwm-use-desc">适用于学生、教师和课堂</div>
                    </div>
                    <div className="cwm-use-radio" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="cwm-actions">
            <button 
              onClick={handleClose} 
              className="cwm-btn-cancel"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button 
              onClick={handleSubmit}
              className="cwm-btn-submit"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? '创建中...' : '创建工作区'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateWorkspaceModal;









