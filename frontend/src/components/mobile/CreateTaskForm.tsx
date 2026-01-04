import { useState, useEffect } from 'react';
import { Calendar, Flag, User, Folder, AlignLeft, Loader2 } from '../Icons';
import { taskService } from '../../services/task';
import { projectService, Project } from '../../services/project';
import { workspaceService, WorkspaceMember } from '../../services/workspace';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/mobile-minimal.css';

interface CreateTaskFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultProjectId?: string;
}

const PRIORITY_OPTIONS = [
  { value: 'critical', label: '紧急', className: 'critical' },
  { value: 'high', label: '高', className: 'high' },
  { value: 'medium', label: '中', className: 'medium' },
  { value: 'low', label: '低', className: 'low' },
];

export default function CreateTaskForm({
  onSuccess,
  onCancel,
  defaultProjectId,
}: CreateTaskFormProps) {
  const { currentWorkspace } = usePermissions();

  // 表单状态
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [description, setDescription] = useState('');

  // 数据状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载项目和成员数据
  useEffect(() => {
    const loadData = async () => {
      if (!currentWorkspace?.id) return;

      try {
        setLoadingData(true);
        const [projectsData, membersData] = await Promise.all([
          projectService.getProjects(currentWorkspace.id),
          workspaceService.getMembers(currentWorkspace.id),
        ]);
        setProjects(projectsData);
        setMembers(membersData);

        // 如果有默认项目或只有一个项目，自动选择
        if (defaultProjectId) {
          setProjectId(defaultProjectId);
        } else if (projectsData.length === 1) {
          setProjectId(projectsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('加载数据失败');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [currentWorkspace?.id, defaultProjectId]);

  // 表单验证
  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('请输入任务标题');
      return false;
    }
    if (title.trim().length < 2) {
      setError('标题至少需要2个字符');
      return false;
    }
    if (!projectId) {
      setError('请选择项目');
      return false;
    }
    return true;
  };

  // 提交表单
  const handleSubmit = async () => {
    setError(null);

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await taskService.createTask({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      });

      // 清空表单
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssigneeId('');
      setPriority('medium');

      onSuccess?.();
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('创建任务失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="mm-form-loading">
        <Loader2 size={24} className="mm-spinner-icon" />
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="mm-create-form mm-form">
      {/* 错误提示 */}
      {error && (
        <div className="mm-form-error">
          {error}
        </div>
      )}

      {/* 任务标题 */}
      <div className="mm-form-group">
        <input
          type="text"
          className="mm-form-input"
          placeholder="任务标题（必填）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      {/* 项目选择 */}
      <div className="mm-form-group">
        <label className="mm-form-label">
          <Folder size={16} />
          <span>项目</span>
        </label>
        <select
          className="mm-form-select"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">选择项目</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* 优先级选择 */}
      <div className="mm-form-group">
        <label className="mm-form-label">
          <Flag size={16} />
          <span>优先级</span>
        </label>
        <div className="mm-priority-group">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`mm-priority-btn ${option.className} ${priority === option.value ? 'active' : ''}`}
              onClick={() => setPriority(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 截止日期 */}
      <div className="mm-form-group">
        <label className="mm-form-label">
          <Calendar size={16} />
          <span>截止日期</span>
        </label>
        <input
          type="date"
          className="mm-date-input"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* 负责人选择 */}
      <div className="mm-form-group">
        <label className="mm-form-label">
          <User size={16} />
          <span>负责人</span>
        </label>
        <select
          className="mm-form-select"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          <option value="">不指定</option>
          {members.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.name}
            </option>
          ))}
        </select>
      </div>

      {/* 描述 */}
      <div className="mm-form-group">
        <label className="mm-form-label">
          <AlignLeft size={16} />
          <span>描述（可选）</span>
        </label>
        <textarea
          className="mm-form-input mm-form-textarea"
          placeholder="添加任务描述..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* 操作按钮 */}
      <div className="mm-form-actions">
        {onCancel && (
          <button
            type="button"
            className="mm-btn mm-btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            取消
          </button>
        )}
        <button
          type="button"
          className="mm-btn mm-btn-primary"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !projectId}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="mm-spinner-icon" />
              创建中...
            </>
          ) : (
            '创建任务'
          )}
        </button>
      </div>
    </div>
  );
}











