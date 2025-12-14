import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { taskService, Task, TaskEvent } from '../services/task';
import { aiService, AiAnalysisResult, SingleTaskOptimization } from '../services/ai';
import { memberService, Member } from '../services/member';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import { TaskBreakdownModal, RiskPredictionPanel } from '../components/ai';
import { GitBranch, Shield, Sparkles, Edit, RefreshCw, Trash2, User, Wand2 } from 'lucide-react';
import './TaskDetail.css';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: '待办', color: 'var(--text-secondary)', bg: 'var(--bg-surface-secondary)' },
  in_progress: { label: '进行中', color: 'var(--color-info)', bg: 'var(--color-info-alpha-10)' },
  review: { label: '审核中', color: 'var(--color-warning)', bg: 'var(--color-warning-alpha-10)' },
  done: { label: '已完成', color: 'var(--color-success)', bg: 'var(--color-success-alpha-10)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  urgent: { label: '紧急', icon: '🔴', color: 'var(--color-danger)' },
  high: { label: '高', icon: '🟠', color: 'var(--color-warning)' },
  medium: { label: '中', icon: '🔵', color: 'var(--color-info)' },
  low: { label: '低', icon: '⚪', color: 'var(--text-tertiary)' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress'],
  in_progress: ['review', 'done'],
  review: ['in_progress', 'done'],
  done: ['todo'],
};

const EVENT_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  created: { label: '创建任务', icon: '🆕', color: 'var(--color-brand)' },
  status_changed: { label: '状态变更', icon: '🔄', color: 'var(--color-info)' },
  priority_changed: { label: '优先级变更', icon: '📊', color: 'var(--color-warning)' },
  assigned: { label: '分配任务', icon: '👤', color: 'var(--color-success)' },
  ai_analyzed: { label: 'AI 分析', icon: '🤖', color: 'var(--color-brand)' },
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWorkspace } = usePermissions();

  // 权限检查
  const canEditTask = canWorkspace('editTask');

  const [task, setTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // AI 功能状态
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisDirection, setAnalysisDirection] = useState('');
  
  // 删除任务状态
  const [deleting, setDeleting] = useState(false);
  
  // 成员列表（用于任务分配）
  const [members, setMembers] = useState<Member[]>([]);
  
  // 任务优化状态
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<SingleTaskOptimization | null>(null);
  const [applyingOptimization, setApplyingOptimization] = useState(false);

  const loadTask = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getTask(id!);
      setTask(data);
      // 加载工作区成员列表
      if (data.project?.workspaceId) {
        const memberList = await memberService.getMembers(data.project.workspaceId);
        setMembers(memberList);
      }
    } catch {
      setError('加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadEvents = useCallback(async () => {
    try {
      const data = await taskService.getTaskEvents(id!);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [id]);

  const loadAnalysis = useCallback(async () => {
    try {
      const analyses = await aiService.getAnalysisHistory(id!);
      if (analyses && analyses.length > 0) {
        setAnalysis(analyses[0].result);
      }
    } catch (err) {
      console.error('Failed to load analysis:', err);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadTask();
      loadEvents();
      loadAnalysis();
    }
  }, [id, loadTask, loadEvents, loadAnalysis]);

  const handleAnalyze = async (direction?: string) => {
    try {
      setAnalyzing(true);
      setShowAnalysisModal(false);
      const data = await aiService.analyzeTask(id!, direction);
      setAnalysis(data.analysis.result);
      loadEvents();
      setAnalysisDirection(''); // 重置输入
    } catch (err) {
      console.error('Failed to analyze:', err);
      alert('AI 分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  // 删除任务
  const handleDeleteTask = async () => {
    if (!window.confirm('确定要删除此任务吗？此操作不可恢复。')) {
      return;
    }
    
    try {
      setDeleting(true);
      await taskService.deleteTask(id!);
      alert('任务已删除');
      navigate(`/projects/${task?.projectId}`);
    } catch (err) {
      console.error('删除任务失败:', err);
      alert('删除任务失败');
    } finally {
      setDeleting(false);
    }
  };

  // 任务优化
  const handleOptimizeTask = async () => {
    setShowOptimizeModal(true);
    setOptimizing(true);
    setOptimizationResult(null);
    
    try {
      const result = await aiService.optimizeSingleTask(id!);
      setOptimizationResult(result);
    } catch (err) {
      console.error('任务优化失败:', err);
      setOptimizationResult({
        optimizedTitle: task?.title || '',
        optimizedDescription: task?.description || '',
        suggestions: ['AI 分析暂时不可用'],
        reason: '请稍后再试',
      });
    } finally {
      setOptimizing(false);
    }
  };

  // 应用优化结果
  const handleApplyOptimization = async () => {
    if (!optimizationResult || !task) return;
    
    setApplyingOptimization(true);
    try {
      await taskService.updateTask(id!, {
        title: optimizationResult.optimizedTitle,
        description: optimizationResult.optimizedDescription,
      });
      
      // 刷新任务数据
      await loadTask();
      setShowOptimizeModal(false);
      setOptimizationResult(null);
    } catch (err) {
      console.error('应用优化失败:', err);
      alert('应用优化失败，请重试');
    } finally {
      setApplyingOptimization(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assigneeId = formData.get('assigneeId') as string;
    
    try {
      setUpdating(true);
      await taskService.updateTask(id!, {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        priority: formData.get('priority') as string,
        dueDate: formData.get('dueDate') as string || undefined,
        assigneeId: assigneeId || null,
      });
      setShowEditModal(false);
      loadTask();
      loadEvents();
    } catch (err) {
      alert('更新任务失败');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newStatus = formData.get('status') as string;
    const blockedReason = formData.get('blockedReason') as string;

    try {
      setUpdating(true);
      await taskService.updateTaskStatus(id!, newStatus, blockedReason || undefined);
      setShowStatusModal(false);
      loadTask();
      loadEvents();
    } catch (err) {
      alert('更新状态失败');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="task-detail-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="task-detail-page">
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error || '任务不存在'}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            返回
          </button>
        </div>
      </div>
    );
  }

  const availableStatuses = STATUS_TRANSITIONS[task.status] || [];

  return (
    <div className="task-detail-page">
      {/* Back Link */}
      <Link to={`/projects/${task.projectId}`} className="back-link">
        ← 返回 {task.project?.name || '项目'}
      </Link>

      {/* Two Column Layout */}
      <div className="task-detail-layout">
        {/* Main Content */}
        <div className="task-main">
          {/* Task Header */}
          <div className="task-header card">
            <div className="task-title-row">
              <div 
                className="task-priority-dot"
                style={{ backgroundColor: PRIORITY_CONFIG[task.priority]?.color }}
              />
              <h1 className="task-title">{task.title}</h1>
            </div>
            {canEditTask && (
              <div className="task-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit size={14} /> 编辑
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowStatusModal(true)}
                >
                  <RefreshCw size={14} /> 更改状态
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={handleDeleteTask}
                  disabled={deleting}
                >
                  <Trash2 size={14} /> {deleting ? '删除中...' : '删除'}
                </button>
              </div>
            )}
          </div>

          {/* AI 操作栏 */}
          <div className="task-ai-actions">
            <button 
              className={`ai-action-btn ${optimizing ? 'loading' : ''}`}
              onClick={handleOptimizeTask}
              disabled={optimizing}
            >
              <Wand2 size={14} />
              {optimizing ? '优化中...' : '任务优化'}
            </button>
            <button 
              className="ai-action-btn"
              onClick={() => setShowBreakdown(true)}
            >
              <GitBranch size={14} />
              AI 分解
            </button>
            <button 
              className="ai-action-btn"
              onClick={() => setShowRisk(!showRisk)}
            >
              <Shield size={14} />
              风险分析
            </button>
            <button 
              className={`ai-action-btn ${analyzing ? 'loading' : ''}`}
              onClick={() => setShowAnalysisModal(true)}
              disabled={analyzing}
            >
              <Sparkles size={14} />
              {analyzing ? 'AI 分析中...' : 'AI 分析'}
            </button>
          </div>

          {/* 风险面板 */}
          {showRisk && (
            <RiskPredictionPanel taskId={id!} />
          )}

          {/* Task Attributes */}
          <div className="task-attributes card">
            <div className="attribute">
              <span className="attribute-label">状态</span>
              <span 
                className="attribute-value status-badge"
                style={{
                  color: STATUS_CONFIG[task.status]?.color,
                  backgroundColor: STATUS_CONFIG[task.status]?.bg,
                }}
              >
                {STATUS_CONFIG[task.status]?.label || task.status}
              </span>
            </div>
            <div className="attribute">
              <span className="attribute-label">负责人</span>
              <span className="attribute-value assignee-value">
                {task.assignee ? (
                  <>
                    <User size={14} />
                    {task.assignee.name}
                  </>
                ) : (
                  <span className="not-assigned">未分配</span>
                )}
              </span>
            </div>
            <div className="attribute">
              <span className="attribute-label">优先级</span>
              <span className="attribute-value">
                {PRIORITY_CONFIG[task.priority]?.icon} {PRIORITY_CONFIG[task.priority]?.label}
              </span>
            </div>
            <div className="attribute">
              <span className="attribute-label">截止日期</span>
              <span className="attribute-value">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '未设置'}
              </span>
            </div>
            <div className="attribute">
              <span className="attribute-label">创建时间</span>
              <span className="attribute-value">{formatDate(task.createdAt)}</span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="task-section card">
              <h3 className="section-title">📝 描述</h3>
              <p className="task-description">{task.description}</p>
            </div>
          )}

          {/* Blocked Reason */}
          {task.status === 'blocked' && task.blockedReason && (
            <div className="task-section card card-status card-danger">
              <h3 className="section-title">⚠️ 阻塞原因</h3>
              <p className="blocked-reason">{task.blockedReason}</p>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="task-section card">
            <h3 className="section-title">📜 活动记录</h3>
            {events.length === 0 ? (
              <p className="no-events">暂无活动记录</p>
            ) : (
              <div className="events-timeline">
                {events.map((event) => {
                  const eventType = EVENT_TYPES[event.type] || { label: event.type, icon: '📌', color: 'var(--text-tertiary)' };
                  return (
                    <div key={event.id} className="event-item">
                      <div 
                        className="event-dot" 
                        style={{ backgroundColor: eventType.color }}
                      />
                      <div className="event-content">
                        <span className="event-type">
                          {eventType.icon} {eventType.label}
                        </span>
                        {event.data?.description && (
                          <span className="event-description">{event.data.description}</span>
                        )}
                        <span className="event-time">{formatDate(event.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI Sidebar */}
        <div className="task-sidebar">
          <div className="ai-panel card">
            <div className="ai-panel-header">
              <h3 className="ai-panel-title">🤖 AI 分析</h3>
              <button 
                className={`btn btn-sm ${analysis ? 'btn-secondary' : 'btn-primary'} ${analyzing ? 'btn-loading' : ''}`}
                onClick={() => setShowAnalysisModal(true)}
                disabled={analyzing}
              >
                {analysis ? '重新分析' : '开始分析'}
              </button>
            </div>

            {!analysis ? (
              <div className="ai-empty">
                <span className="ai-empty-icon">🔮</span>
                <p className="ai-empty-text">尚未进行 AI 分析</p>
                <p className="ai-empty-hint">点击"开始分析"获取智能建议</p>
              </div>
            ) : (
              <div className="ai-content">
                {/* Progress Circle */}
                {analysis.progress_assessment && (
                  <div className="progress-section">
                    <div className="progress-circle-wrapper">
                      <svg className="progress-circle" viewBox="0 0 100 100">
                        <circle className="progress-bg" cx="50" cy="50" r="42" />
                        <circle 
                          className="progress-fill" 
                          cx="50" cy="50" r="42"
                          style={{
                            strokeDasharray: `${analysis.progress_assessment.completion_percentage * 2.64} 264`
                          }}
                        />
                      </svg>
                      <span className="progress-value">{analysis.progress_assessment.completion_percentage}%</span>
                    </div>
                    <p className="progress-summary">{analysis.progress_assessment.overall_status}</p>
                  </div>
                )}

                {/* Next Actions */}
                {analysis.next_actions && analysis.next_actions.length > 0 && (
                  <div className="ai-section">
                    <h4 className="ai-section-title">📋 建议操作</h4>
                    <div className="actions-list">
                      {analysis.next_actions.map((action: { action: string; priority: string; reason: string }, index: number) => (
                        <div 
                          key={index} 
                          className={`action-item priority-${action.priority}`}
                        >
                          <span className="action-text">{action.action}</span>
                          <span className="action-reason">{action.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {analysis.risks && analysis.risks.length > 0 && (
                  <div className="ai-section">
                    <h4 className="ai-section-title">⚠️ 风险提醒</h4>
                    <div className="risks-list">
                      {analysis.risks.map((risk: { risk: string; severity: string; mitigation: string }, index: number) => (
                        <div 
                          key={index} 
                          className={`risk-item severity-${risk.severity}`}
                        >
                          <span className="risk-description">{risk.risk}</span>
                          <span className="risk-mitigation">💡 {risk.mitigation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑任务"
      >
        <form onSubmit={handleUpdateTask}>
          <div className="form-group">
            <label className="form-label">任务标题 *</label>
            <input
              name="title"
              type="text"
              className="form-input"
              defaultValue={task.title}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea
              name="description"
              className="form-textarea"
              defaultValue={task.description || ''}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label className="form-label">负责人</label>
            <select name="assigneeId" className="form-select" defaultValue={task.assigneeId || ''}>
              <option value="">未分配</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user.name} ({member.user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">优先级</label>
              <select name="priority" className="form-select" defaultValue={task.priority}>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">截止日期</label>
              <input
                name="dueDate"
                type="date"
                className="form-input"
                defaultValue={task.dueDate?.split('T')[0] || ''}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
              取消
            </button>
            <button type="submit" className={`btn btn-primary ${updating ? 'btn-loading' : ''}`} disabled={updating}>
              保存更改
            </button>
          </div>
        </form>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="更改任务状态"
      >
        <form onSubmit={handleStatusChange}>
          <div className="current-status-info">
            <span className="label">当前状态：</span>
            <span 
              className="status-badge"
              style={{
                color: STATUS_CONFIG[task.status]?.color,
                backgroundColor: STATUS_CONFIG[task.status]?.bg,
              }}
            >
              {STATUS_CONFIG[task.status]?.label}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">选择新状态</label>
            <div className="status-options">
              {availableStatuses.map(status => (
                <label key={status} className="status-option">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    required
                  />
                  <span 
                    className="status-option-badge"
                    style={{
                      color: STATUS_CONFIG[status]?.color,
                      backgroundColor: STATUS_CONFIG[status]?.bg,
                    }}
                  >
                    {STATUS_CONFIG[status]?.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">阻塞原因（仅阻塞状态需要）</label>
            <textarea
              name="blockedReason"
              className="form-textarea"
              placeholder="请说明阻塞原因..."
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>
              取消
            </button>
            <button type="submit" className={`btn btn-primary ${updating ? 'btn-loading' : ''}`} disabled={updating}>
              确认更改
            </button>
          </div>
        </form>
      </Modal>

      {/* AI 任务分解弹窗 */}
      <TaskBreakdownModal
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        taskId={id!}
        taskTitle={task.title}
        onCreateSubtasks={async (subtasks) => {
          try {
            // 为每个子任务创建新任务
            const priorityMap: Record<string, string> = {
              'URGENT': 'urgent',
              'HIGH': 'high',
              'MEDIUM': 'medium',
              'LOW': 'low',
            };
            
            for (const subtask of subtasks) {
              await taskService.createTask({
                projectId: task.projectId,
                title: `[子任务] ${subtask.title}`,
                description: `${subtask.description}\n\n---\n由 AI 从任务「${task.title}」分解而来`,
                priority: priorityMap[subtask.priority] || 'medium',
                dueDate: task.dueDate || undefined,
                parentId: task.id, // 关联到父任务
              });
            }
            
            alert(`成功创建 ${subtasks.length} 个子任务！`);
            setShowBreakdown(false);
          } catch (err) {
            console.error('创建子任务失败:', err);
            alert('创建子任务失败，请重试');
          }
        }}
      />

      {/* AI 分析对话框 */}
      {/* 任务优化弹窗 */}
      <Modal
        isOpen={showOptimizeModal}
        onClose={() => {
          setShowOptimizeModal(false);
          setOptimizationResult(null);
        }}
        title="✨ AI 任务优化"
      >
        <div className="optimize-modal">
          {optimizing ? (
            <div className="optimize-loading">
              <div className="loading-spinner" />
              <p>AI 正在分析并优化任务...</p>
            </div>
          ) : optimizationResult ? (
            <div className="optimize-result">
              {/* 优化后的标题 */}
              <div className="optimize-section">
                <h4>📝 优化后的标题</h4>
                <div className="optimize-comparison">
                  <div className="original">
                    <span className="label">原标题：</span>
                    <span className="value">{task?.title}</span>
                  </div>
                  <div className="optimized">
                    <span className="label">优化后：</span>
                    <span className="value highlight">{optimizationResult.optimizedTitle}</span>
                  </div>
                </div>
              </div>

              {/* 优化后的描述 */}
              <div className="optimize-section">
                <h4>📋 优化后的描述</h4>
                <div className="optimize-description">
                  <div className="original-desc">
                    <span className="label">原描述：</span>
                    <pre className="desc-content">{task?.description || '（无描述）'}</pre>
                  </div>
                  <div className="optimized-desc">
                    <span className="label">优化后：</span>
                    <pre className="desc-content highlight">{optimizationResult.optimizedDescription}</pre>
                  </div>
                </div>
              </div>

              {/* 优化建议 */}
              {optimizationResult.suggestions.length > 0 && (
                <div className="optimize-section">
                  <h4>💡 其他建议</h4>
                  <ul className="suggestions-list">
                    {optimizationResult.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 优化理由 */}
              <div className="optimize-reason">
                <span className="reason-icon">💬</span>
                <span className="reason-text">{optimizationResult.reason}</span>
              </div>

              {/* 操作按钮 */}
              <div className="optimize-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowOptimizeModal(false);
                    setOptimizationResult(null);
                  }}
                >
                  取消
                </button>
                <button 
                  className={`btn btn-primary ${applyingOptimization ? 'btn-loading' : ''}`}
                  onClick={handleApplyOptimization}
                  disabled={applyingOptimization}
                >
                  {applyingOptimization ? '应用中...' : '✓ 应用优化'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        title="AI 智能分析"
      >
        <div className="ai-analysis-modal">
          <p className="modal-description">
            AI 将分析此任务的各个方面，您可以指定特定的分析方向：
          </p>
          <div className="form-group">
            <label className="form-label">分析方向（可选）</label>
            <textarea
              className="form-textarea"
              value={analysisDirection}
              onChange={(e) => setAnalysisDirection(e.target.value)}
              placeholder="例如：&#10;• 技术实现难点&#10;• 时间估算和风险&#10;• 依赖关系分析&#10;• 需要的技能和资源&#10;• 如何拆分子任务"
              rows={4}
            />
            <p className="help-text">
              留空则进行全面分析，填写则聚焦于指定方向
            </p>
          </div>
          <div className="analysis-presets">
            <span className="presets-label">快速选择：</span>
            <div className="preset-tags">
              <button 
                type="button" 
                className="preset-tag"
                onClick={() => setAnalysisDirection('技术实现难点和解决方案')}
              >
                技术难点
              </button>
              <button 
                type="button" 
                className="preset-tag"
                onClick={() => setAnalysisDirection('时间估算、风险评估和建议')}
              >
                风险评估
              </button>
              <button 
                type="button" 
                className="preset-tag"
                onClick={() => setAnalysisDirection('任务优先级和依赖关系')}
              >
                依赖分析
              </button>
              <button 
                type="button" 
                className="preset-tag"
                onClick={() => setAnalysisDirection('所需技能、资源和团队配置')}
              >
                资源需求
              </button>
            </div>
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setShowAnalysisModal(false)}
            >
              取消
            </button>
            <button 
              type="button" 
              className={`btn btn-primary ${analyzing ? 'btn-loading' : ''}`}
              onClick={() => handleAnalyze(analysisDirection || undefined)}
              disabled={analyzing}
            >
              <Sparkles size={14} />
              {analyzing ? '分析中...' : '开始分析'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
