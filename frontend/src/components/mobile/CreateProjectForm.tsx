/**
 * 移动端创建项目表单
 */
import { useState } from 'react';
import { Folder, Loader2 } from '../Icons';
import { projectService } from '../../services/project';
import { usePermissions } from '../../hooks/usePermissions';

interface CreateProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateProjectForm({ onSuccess, onCancel }: CreateProjectFormProps) {
  const { currentWorkspace } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('请输入项目名称');
      return;
    }
    
    if (!currentWorkspace?.id) {
      setError('请先选择工作区');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await projectService.createProject(
        currentWorkspace.id,
        name.trim(),
        description.trim() || undefined
      );

      // 通知成功
      onSuccess?.();
    } catch (err) {
      console.error('Failed to create project:', err);
      setError('创建项目失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mm-create-form">
      {/* 项目名称 */}
      <div className="mm-form-group">
        <div className="mm-form-input-wrapper">
          <Folder size={18} className="mm-form-input-icon" />
          <input
            type="text"
            className="mm-form-input"
            placeholder="项目名称（必填）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* 项目描述 */}
      <div className="mm-form-group">
        <label className="mm-form-label">描述（可选）</label>
        <textarea
          className="mm-form-textarea"
          placeholder="添加项目描述..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mm-form-error">
          {error}
        </div>
      )}

      {/* 按钮 */}
      <div className="mm-form-actions">
        <button
          type="button"
          className="mm-btn mm-btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </button>
        <button
          type="submit"
          className="mm-btn mm-btn-primary"
          disabled={loading || !name.trim()}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="spin" />
              <span>创建中...</span>
            </>
          ) : (
            '创建项目'
          )}
        </button>
      </div>
    </form>
  );
}

