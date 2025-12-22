import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  User,
  Folder,
  Flag,
  MessageSquare,
  CheckSquare,
  Check,
  Send,
  Edit,
  Trash2,
  Share2,
  Plus,
  Loader2,
  Sparkles,
} from '../../components/Icons';
import { taskService, Task } from '../../services/task';
import { commentService, Comment } from '../../services/comment';
import MobileLayout from '../../components/mobile/MobileLayout';
import SheetModal from '../../components/mobile/SheetModal';
import '../../styles/mobile-minimal.css';

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  todo: { label: '待办', className: 'todo' },
  in_progress: { label: '进行中', className: 'in-progress' },
  review: { label: '审核中', className: 'in-progress' },
  done: { label: '已完成', className: 'done' },
};

// 优先级配置
const PRIORITY_CONFIG: Record<string, { label: string }> = {
  critical: { label: '紧急' },
  high: { label: '高' },
  medium: { label: '中' },
  low: { label: '低' },
};

// 状态选项
const STATUS_OPTIONS = [
  { value: 'todo', label: '待办', className: 'todo' },
  { value: 'in_progress', label: '进行中', className: 'in-progress' },
  { value: 'done', label: '已完成', className: 'done' },
];

export default function MobileTaskDetail() {
  const { id: taskId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTaskDetail();
    }
  }, [taskId]);

  const loadTaskDetail = async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      const [taskData, commentsData] = await Promise.all([
        taskService.getTask(taskId),
        commentService.getByTaskId(taskId),
      ]);
      setTask(taskData);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!taskId || !task) return;

    try {
      setUpdatingStatus(true);
      await taskService.updateTask(taskId, { status: newStatus });
      setTask({ ...task, status: newStatus });
      setShowStatusSheet(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSubtaskToggle = async (subtaskId: string, currentStatus: string) => {
    if (!task) return;

    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    
    try {
      await taskService.updateTask(subtaskId, { status: newStatus });
      // 更新本地状态
      setTask({
        ...task,
        subTasks: task.subTasks?.map(st => 
          st.id === subtaskId ? { ...st, status: newStatus } : st
        ),
      });
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (!taskId || !task || !newSubtaskTitle.trim()) return;

    try {
      setAddingSubtask(true);
      const newSubtask = await taskService.createTask({
        projectId: task.projectId,
        title: newSubtaskTitle.trim(),
        parentId: taskId,
      });
      
      // 更新本地状态
      setTask({
        ...task,
        subTasks: [...(task.subTasks || []), newSubtask],
      });
      setNewSubtaskTitle('');
      setShowAddSubtask(false);
    } catch (error) {
      console.error('Failed to add subtask:', error);
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!taskId || !commentText.trim()) return;

    try {
      setSubmittingComment(true);
      const newComment = await commentService.create(taskId, {
        content: commentText.trim(),
      });
      setComments([...comments, newComment]);
      setCommentText('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskId || !window.confirm('确定要删除这个任务吗？此操作不可恢复。')) return;

    try {
      await taskService.deleteTask(taskId);
      navigate(-1);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date < today) return '已逾期';
    if (date.getTime() === today.getTime()) return '今天';
    if (date.getTime() === tomorrow.getTime()) return '明天';
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const formatCommentTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase();
  };

  // Loading 状态
  if (loading) {
    return (
      <MobileLayout
        headerType="detail"
        headerTitle="任务详情"
        showBottomNav={false}
        headerProps={{ onBack: handleBack }}
      >
        <div className="mm-loading" style={{ marginTop: 100 }}>
          <div className="mm-spinner" />
        </div>
      </MobileLayout>
    );
  }

  // 任务不存在
  if (!task) {
    return (
      <MobileLayout
        headerType="detail"
        headerTitle="任务详情"
        showBottomNav={false}
        headerProps={{ onBack: handleBack }}
      >
        <div className="mm-empty-state">
          <div className="mm-empty-title">任务不存在</div>
          <div className="mm-empty-desc">该任务可能已被删除</div>
        </div>
      </MobileLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const completedSubtasks = task.subTasks?.filter(t => t.status === 'done').length || 0;
  const totalSubtasks = task.subTasks?.length || 0;

  return (
    <MobileLayout
      headerType="detail"
      headerTitle="任务详情"
      showBottomNav={false}
      headerProps={{
        onBack: handleBack,
        onMoreClick: () => setShowMenu(true),
      }}
    >
      {/* 任务标题区 */}
      <header className="mm-detail-header">
        <h1 className="mm-detail-title">{task.title}</h1>
        <button 
          className={`mm-detail-status ${statusConfig.className}`}
          onClick={() => setShowStatusSheet(true)}
        >
          {statusConfig.label}
        </button>
      </header>

      {/* 属性 4 宫格 */}
      <div className="mm-detail-attrs">
        <div className="mm-attr-item">
          <span className="mm-attr-label">
            <Flag size={14} /> 优先级
          </span>
          <span className="mm-attr-value">
            {priorityConfig.label}
          </span>
        </div>
        <div className="mm-attr-item">
          <span className="mm-attr-label">
            <Calendar size={14} /> 截止时间
          </span>
          <span className={`mm-attr-value ${isOverdue ? 'danger' : ''}`}>
            {formatDate(task.dueDate)}
          </span>
        </div>
        <div className="mm-attr-item">
          <span className="mm-attr-label">
            <User size={14} /> 负责人
          </span>
          <span className="mm-attr-value">
            {task.assignee?.name || '未分配'}
          </span>
        </div>
        <div className="mm-attr-item">
          <span className="mm-attr-label">
            <Folder size={14} /> 所属项目
          </span>
          <span className="mm-attr-value">
            {task.project?.name || '无'}
          </span>
        </div>
      </div>

      {/* 描述区 */}
      <div className="mm-detail-section">
        <div className="mm-section-title">描述</div>
        <div className="mm-section-content">
          {task.description || '暂无描述'}
        </div>
      </div>

      {/* 子任务列表 */}
      <div className="mm-detail-section">
        <div className="mm-section-title">
          <CheckSquare size={16} />
          子任务 ({completedSubtasks}/{totalSubtasks})
        </div>
        
        {task.subTasks && task.subTasks.length > 0 ? (
          task.subTasks.map((subtask) => (
            <div
              key={subtask.id}
              className={`mm-subtask-item ${subtask.status === 'done' ? 'done' : ''}`}
              onClick={() => handleSubtaskToggle(subtask.id, subtask.status)}
            >
              <div className="mm-subtask-check">
                {subtask.status === 'done' && <Check size={12} />}
              </div>
              <span className="mm-subtask-title">{subtask.title}</span>
            </div>
          ))
        ) : (
          <div className="mm-section-content" style={{ color: 'var(--min-text-muted)' }}>
            暂无子任务
          </div>
        )}
        
        {/* 添加子任务 */}
        {showAddSubtask ? (
          <div className="mm-add-subtask-form">
            <input
              type="text"
              className="mm-form-input"
              placeholder="输入子任务标题..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddSubtask();
                } else if (e.key === 'Escape') {
                  setShowAddSubtask(false);
                  setNewSubtaskTitle('');
                }
              }}
            />
            <div className="mm-add-subtask-actions">
              <button 
                className="mm-btn mm-btn-secondary"
                onClick={() => {
                  setShowAddSubtask(false);
                  setNewSubtaskTitle('');
                }}
              >
                取消
              </button>
              <button 
                className="mm-btn mm-btn-primary"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim() || addingSubtask}
              >
                {addingSubtask ? <Loader2 size={16} className="mm-spinner-icon" /> : '添加'}
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="mm-add-subtask-btn"
            onClick={() => setShowAddSubtask(true)}
          >
            <Plus size={16} />
            添加子任务
          </button>
        )}
      </div>

      {/* 评论区 */}
      <div className="mm-detail-section">
        <div className="mm-section-title">
          <MessageSquare size={16} />
          评论 ({comments.length})
        </div>

        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="mm-comment-item">
              <div className="mm-comment-header">
                <div className="mm-comment-avatar">
                  {getInitials(comment.user.name)}
                </div>
                <span className="mm-comment-author">{comment.user.name}</span>
                <span className="mm-comment-time">
                  {formatCommentTime(comment.createdAt)}
                </span>
              </div>
              <p className="mm-comment-text">{comment.content}</p>
            </div>
          ))
        ) : (
          <div className="mm-section-content" style={{ color: 'var(--min-text-muted)' }}>
            暂无评论
          </div>
        )}

        {/* 评论输入框 */}
        <div className="mm-comment-input-wrapper">
          <input
            type="text"
            className="mm-comment-input"
            placeholder="写评论..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
          <button
            className="mm-comment-send"
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || submittingComment}
          >
            {submittingComment ? (
              <Loader2 size={18} className="mm-spinner-icon" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="mm-detail-actions">
        <button
          className="mm-btn mm-btn-secondary"
          onClick={() => setShowStatusSheet(true)}
        >
          更新状态
        </button>
        <button
          className="mm-btn mm-btn-primary"
          onClick={() => navigate(`/tasks/${taskId}/edit`)}
        >
          <Edit size={16} />
          编辑
        </button>
      </div>

      {/* 更多菜单 */}
      <SheetModal
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        title="操作"
      >
        <div className="mm-action-menu">
          <button
            className="mm-action-menu-item"
            onClick={() => {
              setShowMenu(false);
              navigate(`/ai/tasks/${taskId}/analysis?type=task`);
            }}
          >
            <Sparkles size={20} />
            AI 分析
          </button>
          <button
            className="mm-action-menu-item"
            onClick={() => {
              setShowMenu(false);
              navigate(`/tasks/${taskId}/edit`);
            }}
          >
            <Edit size={20} />
            编辑任务
          </button>
          <button
            className="mm-action-menu-item"
            onClick={() => {
              setShowMenu(false);
              // TODO: 实现分享功能
            }}
          >
            <Share2 size={20} />
            分享任务
          </button>
          <button
            className="mm-action-menu-item danger"
            onClick={() => {
              setShowMenu(false);
              handleDeleteTask();
            }}
          >
            <Trash2 size={20} />
            删除任务
          </button>
        </div>
      </SheetModal>

      {/* 状态选择弹窗 */}
      <SheetModal
        isOpen={showStatusSheet}
        onClose={() => setShowStatusSheet(false)}
        title="更新状态"
      >
        <div className="mm-status-options">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`mm-status-option ${option.className} ${task.status === option.value ? 'active' : ''}`}
              onClick={() => handleStatusChange(option.value)}
              disabled={updatingStatus}
            >
              {task.status === option.value && <Check size={18} />}
              {option.label}
              {updatingStatus && task.status !== option.value && option.value === task.status && (
                <Loader2 size={16} className="mm-spinner-icon" />
              )}
            </button>
          ))}
        </div>
      </SheetModal>
    </MobileLayout>
  );
}


