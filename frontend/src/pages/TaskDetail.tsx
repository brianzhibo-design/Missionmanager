import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { taskService, Task, TaskEvent } from '../services/task';
import { aiService, AiAnalysisResult, SingleTaskOptimization, ChatMessage } from '../services/ai';
import { memberService, Member } from '../services/member';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { TaskBreakdownModal, RiskPredictionPanel } from '../components/ai';
import { GitBranch, Shield, Sparkles, Edit, RefreshCw, Trash2, User, Wand2, Plus, CheckSquare, X, Send, MessageCircle, Circle, AlertTriangle, FileText, ClipboardList, Activity, Bot, Lightbulb, Package } from '../components/Icons';
import TaskComments from '../components/TaskComments';
import { TaskAttachments } from '../components/TaskAttachments';
import MobileTaskDetail from './mobile/MobileTaskDetail';
import './TaskDetail.css';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: '待办', color: 'var(--text-secondary)', bg: 'var(--bg-surface-secondary)' },
  in_progress: { label: '进行中', color: 'var(--color-info)', bg: 'var(--color-info-alpha-10)' },
  review: { label: '审核中', color: 'var(--color-warning)', bg: 'var(--color-warning-alpha-10)' },
  done: { label: '已完成', color: 'var(--color-success)', bg: 'var(--color-success-alpha-10)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: '紧急', color: 'var(--color-danger)' },
  high: { label: '高', color: 'var(--color-warning)' },
  medium: { label: '中', color: 'var(--color-info)' },
  low: { label: '低', color: 'var(--text-tertiary)' },
};

// 状态转换规则已移到后端，前端使用专用 API 操作

const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  created: { label: '创建任务', color: 'var(--color-brand)' },
  status_changed: { label: '状态变更', color: 'var(--color-info)' },
  priority_changed: { label: '优先级变更', color: 'var(--color-warning)' },
  assigned: { label: '分配任务', color: 'var(--color-success)' },
  ai_analyzed: { label: 'AI 分析', color: 'var(--color-brand)' },
};

export default function TaskDetail() {
  const isMobile = useIsMobile();

  // 移动端渲染
  if (isMobile) {
    return <MobileTaskDetail />;
  }

  return <DesktopTaskDetail />;
}

function DesktopTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWorkspace, workspaceRole } = usePermissions();
  const { user: currentUser } = useAuth();

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
  // 状态选择弹窗已移除，使用专用状态操作按钮
  const [updating, setUpdating] = useState(false);
  
  // AI 功能状态
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisDirection, setAnalysisDirection] = useState('');
  
  // 删除任务状态
  const [deleting, setDeleting] = useState(false);
  
  // 审核状态
  const [submittingReview, setSubmittingReview] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // 成员列表（用于任务分配）
  const [members, setMembers] = useState<Member[]>([]);
  
  // 任务优化状态
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<SingleTaskOptimization | null>(null);
  const [applyingOptimization, setApplyingOptimization] = useState(false);

  // 子任务管理状态
  const [subtaskSelectionMode, setSubtaskSelectionMode] = useState(false);
  const [selectedSubtaskIds, setSelectedSubtaskIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  
  // 描述展开/收起
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  
  // AI 对话状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ===== 审核权限判断 =====
  // 是否可以提交审核（任务负责人/创建者）
  const canSubmitReview = useMemo(() => {
    if (!task || !currentUser) return false;
    if (task.status !== 'in_progress') return false;
    // 是任务负责人或创建者
    const isAssignee = task.assigneeId === currentUser.id;
    const isCreator = task.creatorId === currentUser.id;
    // 管理员也可以
    const isAdmin = ['owner', 'director', 'manager', 'admin', 'leader'].includes(workspaceRole || '');
    return isAssignee || isCreator || isAdmin;
  }, [task, currentUser, workspaceRole]);

  // 是否可以审核（项目负责人/管理员）
  const canApproveReject = useMemo(() => {
    if (!task || !currentUser) return false;
    if (task.status !== 'review') return false;
    // 是项目负责人
    const isProjectLeader = task.project?.leaderId === currentUser.id;
    // 是工作区管理员
    const isAdmin = ['owner', 'director', 'admin'].includes(workspaceRole || '');
    return isProjectLeader || isAdmin;
  }, [task, currentUser, workspaceRole]);

  // 是否可以开始任务（todo 状态，任务负责人/创建者/管理员）
  const canStartTask = useMemo(() => {
    if (!task || !currentUser) return false;
    if (task.status !== 'todo') return false;
    const isAssignee = task.assigneeId === currentUser.id;
    const isCreator = task.creatorId === currentUser.id;
    const isAdmin = ['owner', 'director', 'manager', 'admin', 'leader'].includes(workspaceRole || '');
    return isAssignee || isCreator || isAdmin;
  }, [task, currentUser, workspaceRole]);

  // 是否可以直接完成任务（in_progress 状态，任务负责人/创建者/管理员）
  const canCompleteTask = useMemo(() => {
    if (!task || !currentUser) return false;
    if (task.status !== 'in_progress') return false;
    const isAssignee = task.assigneeId === currentUser.id;
    const isCreator = task.creatorId === currentUser.id;
    const isAdmin = ['owner', 'director', 'manager', 'admin', 'leader'].includes(workspaceRole || '');
    return isAssignee || isCreator || isAdmin;
  }, [task, currentUser, workspaceRole]);

  // 是否可以重新打开任务（done 状态，任务负责人/项目负责人/管理员）
  const canReopenTask = useMemo(() => {
    if (!task || !currentUser) return false;
    if (task.status !== 'done') return false;
    const isAssignee = task.assigneeId === currentUser.id;
    const isProjectLeader = task.project?.leaderId === currentUser.id;
    const isAdmin = ['owner', 'director', 'admin'].includes(workspaceRole || '');
    return isAssignee || isProjectLeader || isAdmin;
  }, [task, currentUser, workspaceRole]);

  // 是否可以删除子任务（项目负责人/管理员/任务创建者可以批量删除）
  const canDeleteSubtasks = useMemo(() => {
    if (!task || !currentUser) return false;
    // 项目负责人
    const isProjectLeader = task.project?.leaderId === currentUser.id;
    // 工作区管理员 (owner, admin)
    const isAdmin = ['owner', 'director', 'admin'].includes(workspaceRole || '');
    // 主任务创建者（可以删除自己任务的子任务）
    const isTaskCreator = task.creatorId === currentUser.id;
    return isProjectLeader || isAdmin || isTaskCreator;
  }, [task, currentUser, workspaceRole]);

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

  // ==================== 任务审核功能 ====================

  // 提交审核
  const handleSubmitReview = async () => {
    if (!task) return;
    try {
      setSubmittingReview(true);
      await taskService.submitForReview(task.id);
      alert('任务已提交审核');
      loadTask();
      loadEvents();
    } catch (err: unknown) {
      console.error('提交审核失败:', err);
      const errorMessage = err instanceof Error ? err.message : '提交审核失败';
      alert(errorMessage);
    } finally {
      setSubmittingReview(false);
    }
  };

  // 审核通过
  const handleApprove = async () => {
    if (!task) return;
    try {
      setApproving(true);
      await taskService.approveTask(task.id);
      alert('审核通过！任务已完成');
      loadTask();
      loadEvents();
    } catch (err: unknown) {
      console.error('审核失败:', err);
      const errorMessage = err instanceof Error ? err.message : '审核失败';
      alert(errorMessage);
    } finally {
      setApproving(false);
    }
  };

  // 审核不通过
  const handleReject = async () => {
    if (!task) return;
    if (!rejectReason.trim()) {
      alert('请填写退回原因');
      return;
    }
    try {
      setRejecting(true);
      await taskService.rejectTask(task.id, rejectReason.trim());
      alert('已退回修改');
      setShowRejectModal(false);
      setRejectReason('');
      loadTask();
      loadEvents();
    } catch (err: unknown) {
      console.error('退回失败:', err);
      const errorMessage = err instanceof Error ? err.message : '退回失败';
      alert(errorMessage);
    } finally {
      setRejecting(false);
    }
  };

  // 开始任务
  const [starting, setStarting] = useState(false);
  const handleStartTask = async () => {
    if (!task) return;
    try {
      setStarting(true);
      await taskService.startTask(task.id);
      alert('任务已开始');
      loadTask();
      loadEvents();
    } catch (err: unknown) {
      console.error('开始任务失败:', err);
      const errorMessage = err instanceof Error ? err.message : '开始任务失败';
      alert(errorMessage);
    } finally {
      setStarting(false);
    }
  };

  // 重新打开任务
  const [reopening, setReopening] = useState(false);
  const handleReopenTask = async () => {
    if (!task) return;
    try {
      setReopening(true);
      await taskService.reopenTask(task.id);
      alert('任务已重新打开');
      loadTask();
      loadEvents();
    } catch (err: unknown) {
      console.error('重新打开失败:', err);
      const errorMessage = err instanceof Error ? err.message : '重新打开失败';
      alert(errorMessage);
    } finally {
      setReopening(false);
    }
  };

  // 直接完成任务（无需审核）
  const [completing, setCompleting] = useState(false);
  const handleCompleteTask = async () => {
    if (!task) return;
    try {
      setCompleting(true);
      await taskService.completeTask(task.id);
      alert('任务已完成');
      loadTask();
      loadEvents();
    } catch (err: unknown) {
      console.error('完成任务失败:', err);
      const errorMessage = err instanceof Error ? err.message : '完成任务失败';
      alert(errorMessage);
    } finally {
      setCompleting(false);
    }
  };

  // ==================== 子任务管理功能 ====================
  
  // 切换子任务选择
  const toggleSubtaskSelection = (subtaskId: string) => {
    const newSelection = new Set(selectedSubtaskIds);
    if (newSelection.has(subtaskId)) {
      newSelection.delete(subtaskId);
    } else {
      newSelection.add(subtaskId);
    }
    setSelectedSubtaskIds(newSelection);
  };

  // 全选/取消全选子任务
  const toggleSelectAllSubtasks = () => {
    if (!task?.subTasks) return;
    if (selectedSubtaskIds.size === task.subTasks.length) {
      setSelectedSubtaskIds(new Set());
    } else {
      setSelectedSubtaskIds(new Set(task.subTasks.map(st => st.id)));
    }
  };

  // 批量完成子任务
  const handleBatchCompleteSubtasks = async () => {
    if (selectedSubtaskIds.size === 0) {
      alert('请选择要完成的子任务');
      return;
    }
    
    setBatchProcessing(true);
    try {
      const result = await taskService.batchComplete(Array.from(selectedSubtaskIds));
      
      // 安全检查：确保 result 和 result.results 存在
      if (!result || !result.results) {
        console.error('批量完成返回数据格式错误:', result);
        alert('批量完成失败：返回数据格式错误');
        return;
      }
      
      // 显示详细结果
      const completed = result.results.success?.length || 0;
      const reviewed = result.results.autoReviewed?.length || 0;
      const failed = result.results.failed?.length || 0;
      
      let msg = '';
      if (completed > 0) {
        msg += `${completed} 个子任务已完成`;
      }
      if (reviewed > 0) {
        msg += (msg ? '，' : '') + `${reviewed} 个子任务已提交审核`;
      }
      if (failed > 0) {
        msg += (msg ? '，' : '') + `${failed} 个子任务失败`;
      }
      
      if (failed > 0) {
        // 有失败的任务，显示详细错误
        alert(`${msg}\n\n失败原因：\n${result.results.failed.map(f => `• ${f.reason}`).join('\n')}`);
      } else if (msg) {
        // 全部成功，显示成功消息
        alert(msg);
      }
      
      // 刷新任务数据
      await loadTask();
      // 清空选择并退出选择模式
      setSelectedSubtaskIds(new Set());
      setSubtaskSelectionMode(false);
    } catch (err: any) {
      console.error('批量完成子任务失败:', err);
      alert(err?.message || '批量完成失败，请重试');
    } finally {
      setBatchProcessing(false);
    }
  };

  // 批量删除子任务
  const handleBatchDeleteSubtasks = async () => {
    if (selectedSubtaskIds.size === 0) return;
    
    // 获取子任务详情以显示删除提示
    const subtasksToDelete = task?.subTasks?.filter(s => selectedSubtaskIds.has(s.id)) || [];
    const subtaskCount = subtasksToDelete.length;
    
    // 显示确认弹窗，包含权限提示
    const confirmMessage = [
      `确定要删除选中的 ${subtaskCount} 个子任务吗？`,
      '',
      '⚠️ 此操作无法撤销！',
      '',
      '删除权限说明：',
      '• 任务创建者可删除自己创建的任务',
      '• 项目负责人可删除项目内任务',
      '• 管理员可删除任何任务',
    ].join('\n');
    
    if (!window.confirm(confirmMessage)) return;
    
    setBatchProcessing(true);
    try {
      const result = await taskService.batchDelete(Array.from(selectedSubtaskIds));
      
      if (result.results.failed.length > 0) {
        const failedReasons = result.results.failed.map(f => `  • ${f.reason}`).join('\n');
        alert(`删除结果：\n✅ 成功: ${result.results.success.length} 个\n❌ 失败: ${result.results.failed.length} 个\n\n失败原因：\n${failedReasons}`);
      } else {
        const nestedInfo = result.results.subtaskCount > 0 ? `（含 ${result.results.subtaskCount} 个嵌套子任务）` : '';
        alert(`✅ 成功删除 ${result.results.success.length} 个子任务${nestedInfo}`);
      }
      
      await loadTask();
      setSelectedSubtaskIds(new Set());
      setSubtaskSelectionMode(false);
    } catch (err: any) {
      console.error('批量删除子任务失败:', err);
      alert(`批量删除失败：${err?.message || '未知错误'}`);
    } finally {
      setBatchProcessing(false);
    }
  };

  // 快速创建子任务
  const handleQuickCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;
    
    setCreatingSubtask(true);
    try {
      await taskService.createTask({
        projectId: task.projectId,
        title: newSubtaskTitle.trim(),
        parentId: task.id,
        priority: 'medium',
      });
      await loadTask();
      setNewSubtaskTitle('');
      setShowAddSubtask(false);
    } catch (err) {
      console.error('创建子任务失败:', err);
      alert('创建子任务失败');
    } finally {
      setCreatingSubtask(false);
    }
  };

  // 快速变更子任务状态
  const handleSubtaskStatusChange = async (subtaskId: string, newStatus: string) => {
    try {
      const result = await taskService.updateTaskStatus(subtaskId, newStatus);
      
      // 安全检查：确保 result 存在
      if (!result) {
        console.error('状态更新返回数据为空');
        alert('更新状态失败：返回数据为空');
        return;
      }
      
      // 显示反馈
      if (result.message) {
        if (result.actualStatus !== newStatus) {
          // 智能转换提示
          alert(result.message);
        } else {
          // 状态符合预期
          // 静默更新，不显示提示（避免频繁弹窗）
        }
      }
      
      // 本地更新子任务状态，使用实际状态
      setTask(prevTask => {
        if (!prevTask) return prevTask;
        return {
          ...prevTask,
          subTasks: prevTask.subTasks?.map(subtask =>
            subtask.id === subtaskId 
              ? { ...subtask, status: result.actualStatus || newStatus }
              : subtask
          ),
        };
      });
    } catch (err: any) {
      console.error('更新子任务状态失败:', err);
      alert(err?.message || '更新状态失败');
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

  // AI 对话处理
  const handleSendChat = async (message?: string) => {
    const msgToSend = message || chatInput.trim();
    if (!msgToSend || chatLoading) return;

    // 添加用户消息
    const userMessage: ChatMessage = { role: 'user', content: msgToSend };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    setChatSuggestions([]);

    try {
      const response = await aiService.chatWithTask(id!, msgToSend, chatMessages);
      
      // 添加AI回复
      const assistantMessage: ChatMessage = { role: 'assistant', content: response.reply };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // 设置建议问题
      if (response.suggestions && response.suggestions.length > 0) {
        setChatSuggestions(response.suggestions);
      }
    } catch (err) {
      console.error('AI 对话失败:', err);
      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: '抱歉，AI 暂时无法响应。请稍后再试。' 
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
      // 滚动到底部
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
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
          <span className="error-icon"><AlertTriangle size={16} /></span>
          <span className="error-text">{error || '任务不存在'}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            返回
          </button>
        </div>
      </div>
    );
  }

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
                
                {/* 状态操作按钮 - 根据当前状态显示不同操作 */}
                
                {/* TODO 状态：开始任务 */}
                {canStartTask && (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={handleStartTask}
                    disabled={starting}
                  >
                    <RefreshCw size={14} /> {starting ? '处理中...' : '开始任务'}
                  </button>
                )}
                
                {/* IN_PROGRESS 状态：提交审核 或 直接完成 */}
                {canSubmitReview && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                  >
                    <CheckSquare size={14} /> {submittingReview ? '提交中...' : '提交审核'}
                  </button>
                )}
                {canCompleteTask && (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={handleCompleteTask}
                    disabled={completing}
                    title="直接完成任务（不经过审核）"
                  >
                    <CheckSquare size={14} /> {completing ? '处理中...' : '直接完成'}
                  </button>
                )}
                
                {/* REVIEW 状态：审核通过/退回 */}
                {canApproveReject && (
                  <>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={handleApprove}
                      disabled={approving}
                    >
                      <CheckSquare size={14} /> {approving ? '处理中...' : '审核通过'}
                    </button>
                    <button 
                      className="btn btn-warning btn-sm"
                      onClick={() => setShowRejectModal(true)}
                      disabled={rejecting}
                    >
                      <X size={14} /> 退回修改
                    </button>
                  </>
                )}
                
                {/* 审核中状态提示（任务负责人不是审核人时） */}
                {task.status === 'review' && !canApproveReject && (
                  <span className="review-pending-hint">
                    等待项目负责人审核...
                  </span>
                )}
                
                {/* DONE 状态：重新打开 */}
                {canReopenTask && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={handleReopenTask}
                    disabled={reopening}
                  >
                    <RefreshCw size={14} /> {reopening ? '处理中...' : '重新打开'}
                  </button>
                )}
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
                <Circle size={10} fill={PRIORITY_CONFIG[task.priority]?.color} color={PRIORITY_CONFIG[task.priority]?.color} /> {PRIORITY_CONFIG[task.priority]?.label}
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
            <div className="task-section card description-section">
              <div className="description-header">
                <h3 className="section-title"><FileText size={16} /> 描述</h3>
                <button 
                  className="btn btn-ghost btn-sm expand-toggle"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                >
                  {descriptionExpanded ? '收起' : '展开'}
                </button>
              </div>
              <div className={`task-description-wrapper ${descriptionExpanded ? 'expanded' : 'collapsed'}`}>
                <p className="task-description">{task.description}</p>
                {!descriptionExpanded && task.description.length > 200 && (
                  <div className="description-fade" onClick={() => setDescriptionExpanded(true)} />
                )}
              </div>
            </div>
          )}

          {/* Subtasks Section */}
          <div className="task-section card subtasks-section">
            <div className="subtasks-header">
              <h3 className="section-title">
                <ClipboardList size={16} /> 子任务 
                {task.subTasks && task.subTasks.length > 0 && (
                  <span className="subtask-count">({task.subTasks.length})</span>
                )}
              </h3>
              <div className="subtasks-actions">
                {task.subTasks && task.subTasks.length > 0 && (
                  <button
                    className={`btn btn-sm ${subtaskSelectionMode ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setSubtaskSelectionMode(!subtaskSelectionMode);
                      setSelectedSubtaskIds(new Set());
                    }}
                  >
                    <CheckSquare size={14} />
                    {subtaskSelectionMode ? '取消' : '批量操作'}
                  </button>
                )}
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowAddSubtask(true)}
                >
                  <Plus size={14} />
                  添加子任务
                </button>
              </div>
            </div>

            {/* 批量操作工具栏 */}
            {subtaskSelectionMode && (
              <div className="subtask-batch-toolbar">
                <label className="select-all-checkbox">
                  <input
                    type="checkbox"
                    checked={task.subTasks && selectedSubtaskIds.size === task.subTasks.length}
                    onChange={toggleSelectAllSubtasks}
                  />
                  <span>全选 ({selectedSubtaskIds.size}/{task.subTasks?.length || 0})</span>
                </label>
                <div className="batch-actions">
                  <button
                    className={`btn btn-sm btn-success ${batchProcessing ? 'btn-loading' : ''}`}
                    onClick={handleBatchCompleteSubtasks}
                    disabled={selectedSubtaskIds.size === 0 || batchProcessing}
                  >
                    <CheckSquare size={14} /> 批量完成
                  </button>
                  {canDeleteSubtasks && (
                    <button
                      className={`btn btn-sm btn-danger ${batchProcessing ? 'btn-loading' : ''}`}
                      onClick={handleBatchDeleteSubtasks}
                      disabled={selectedSubtaskIds.size === 0 || batchProcessing}
                      title="删除权限：创建者/项目负责人/管理员"
                    >
                      <Trash2 size={14} />
                      批量删除
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 快速添加子任务表单 */}
            {showAddSubtask && (
              <form className="quick-add-subtask" onSubmit={handleQuickCreateSubtask}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="输入子任务标题..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className={`btn btn-sm btn-primary ${creatingSubtask ? 'btn-loading' : ''}`}
                  disabled={!newSubtaskTitle.trim() || creatingSubtask}
                >
                  创建
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    setShowAddSubtask(false);
                    setNewSubtaskTitle('');
                  }}
                >
                  <X size={14} />
                </button>
              </form>
            )}

            {/* 子任务列表 */}
            {!task.subTasks || task.subTasks.length === 0 ? (
              <div className="no-subtasks">
                <span className="empty-icon"><Package size={24} /></span>
                <p>暂无子任务</p>
                <p className="empty-hint">可以点击上方按钮添加子任务，或使用 AI 任务分解功能</p>
              </div>
            ) : (
              <div className="subtasks-list">
                {task.subTasks.map((subtask) => {
                  const statusConfig = STATUS_CONFIG[subtask.status] || STATUS_CONFIG.todo;
                  return (
                    <div 
                      key={subtask.id} 
                      className={`subtask-item ${selectedSubtaskIds.has(subtask.id) ? 'selected' : ''}`}
                    >
                      {subtaskSelectionMode && (
                        <input
                          type="checkbox"
                          className="subtask-checkbox"
                          checked={selectedSubtaskIds.has(subtask.id)}
                          onChange={() => toggleSubtaskSelection(subtask.id)}
                        />
                      )}
                      <div className="subtask-status-indicator">
                        <select
                          className="subtask-status-select"
                          value={subtask.status}
                          onChange={(e) => handleSubtaskStatusChange(subtask.id, e.target.value)}
                          style={{ 
                            color: statusConfig.color,
                            backgroundColor: statusConfig.bg 
                          }}
                        >
                          <option value="todo">待办</option>
                          <option value="in_progress">进行中</option>
                          <option value="review">审核中</option>
                          <option value="done">已完成</option>
                        </select>
                      </div>
                      <Link 
                        to={`/tasks/${subtask.id}`} 
                        className={`subtask-title ${subtask.status === 'done' ? 'completed' : ''}`}
                      >
                        {subtask.title}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <TaskAttachments taskId={id!} canEdit={canEditTask} />

          {/* Comments Section */}
          <TaskComments 
            taskId={id!} 
            projectMembers={members.map(m => ({
              id: m.userId,
              name: m.user?.name || '',
              avatar: m.user?.avatar || undefined,
            }))}
          />

          {/* Activity Timeline */}
          <div className="task-section card">
            <h3 className="section-title"><Activity size={16} /> 活动记录</h3>
            {events.length === 0 ? (
              <p className="no-events">暂无活动记录</p>
            ) : (
              <div className="events-timeline">
                {events.map((event) => {
                  const eventType = EVENT_TYPES[event.type] || { label: event.type, color: 'var(--text-tertiary)' };
                  return (
                    <div key={event.id} className="event-item">
                      <div 
                        className="event-dot" 
                        style={{ backgroundColor: eventType.color }}
                      />
                      <div className="event-content">
                        <span className="event-type">
                          {eventType.label}
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
              <h3 className="ai-panel-title"><Bot size={16} /> AI 分析</h3>
              <div className="ai-panel-actions">
                {analysis && (
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowAnalysis(!showAnalysis)}
                  >
                    {showAnalysis ? '收起' : '展开'}
                  </button>
                )}
                <button 
                  className={`btn btn-sm ${analysis ? 'btn-secondary' : 'btn-primary'} ${analyzing ? 'btn-loading' : ''}`}
                  onClick={() => setShowAnalysisModal(true)}
                  disabled={analyzing}
                >
                  {analysis ? '重新分析' : '开始分析'}
                </button>
              </div>
            </div>

            {!analysis ? (
              <div className="ai-empty">
                <span className="ai-empty-icon"><Sparkles size={32} /></span>
                <p className="ai-empty-text">尚未进行 AI 分析</p>
                <p className="ai-empty-hint">点击"开始分析"获取智能建议</p>
              </div>
            ) : !showAnalysis ? (
              <div className="ai-collapsed">
                <p>AI 分析结果已收起，点击"展开"查看详情</p>
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
                    <h4 className="ai-section-title"><ClipboardList size={14} /> 建议操作</h4>
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
                    <h4 className="ai-section-title"><AlertTriangle size={14} /> 风险提醒</h4>
                    <div className="risks-list">
                      {analysis.risks.map((risk: { risk: string; severity: string; mitigation: string }, index: number) => (
                        <div 
                          key={index} 
                          className={`risk-item severity-${risk.severity}`}
                        >
                          <span className="risk-description">{risk.risk}</span>
                          <span className="risk-mitigation"><Lightbulb size={12} /> {risk.mitigation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* AI 对话面板 */}
          <div className="ai-chat-panel card">
            <div className="ai-chat-header" onClick={() => setShowChat(!showChat)}>
              <h3 className="ai-chat-title">
                <MessageCircle size={16} />
                AI 对话助手
              </h3>
              <button className="btn btn-ghost btn-sm">
                {showChat ? '收起' : '展开'}
              </button>
            </div>
            
            {showChat && (
              <div className="ai-chat-content">
                {/* 对话消息区域 */}
                <div className="chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="chat-welcome">
                      <div className="welcome-icon"><MessageCircle size={32} /></div>
                      <p className="welcome-text">您好！我可以帮助您分析这个任务。</p>
                      <p className="welcome-hint">您可以问我关于任务的任何问题，例如：</p>
                      <div className="welcome-suggestions">
                        <button 
                          className="suggestion-chip"
                          onClick={() => handleSendChat('这个任务应该如何开始？')}
                        >
                          这个任务应该如何开始？
                        </button>
                        <button 
                          className="suggestion-chip"
                          onClick={() => handleSendChat('帮我分析这个任务的风险点')}
                        >
                          帮我分析风险点
                        </button>
                        <button 
                          className="suggestion-chip"
                          onClick={() => handleSendChat('给我一些执行建议')}
                        >
                          给我执行建议
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {chatMessages.map((msg, index) => (
                        <div 
                          key={index} 
                          className={`chat-message ${msg.role}`}
                        >
                          <div className="message-avatar">
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                          </div>
                          <div className="message-content">
                            <div className="message-text">{msg.content}</div>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="chat-message assistant">
                          <div className="message-avatar"><Bot size={16} /></div>
                          <div className="message-content">
                            <div className="message-text typing">
                              <span className="dot"></span>
                              <span className="dot"></span>
                              <span className="dot"></span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>
                
                {/* 建议问题 */}
                {chatSuggestions.length > 0 && (
                  <div className="chat-suggestions">
                    {chatSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="suggestion-chip"
                        onClick={() => handleSendChat(suggestion)}
                        disabled={chatLoading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* 输入区域 */}
                <div className="chat-input-area">
                  <textarea
                    className="chat-input"
                    placeholder="输入您的问题..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    disabled={chatLoading}
                    rows={2}
                  />
                  <button
                    className={`btn btn-primary btn-icon chat-send ${chatLoading ? 'btn-loading' : ''}`}
                    onClick={() => handleSendChat()}
                    disabled={!chatInput.trim() || chatLoading}
                  >
                    <Send size={16} />
                  </button>
                </div>
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
                  <option key={key} value={key}>{config.label}</option>
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
              'CRITICAL': 'critical',
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
        title="AI 任务优化"
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
                <h4><FileText size={16} /> 优化后的标题</h4>
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
                <h4><ClipboardList size={16} /> 优化后的描述</h4>
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
                  <h4><Lightbulb size={16} /> 其他建议</h4>
                  <ul className="suggestions-list">
                    {optimizationResult.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 优化理由 */}
              <div className="optimize-reason">
                <span className="reason-icon"><MessageCircle size={16} /></span>
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
                  {applyingOptimization ? '应用中...' : '应用优化'}
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

      {/* 退回原因弹窗 */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="退回任务"
      >
        <div className="reject-modal">
          <p className="reject-hint">任务将退回给负责人修改，请说明需要修改的内容：</p>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="请说明退回原因，帮助负责人了解需要修改的内容..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
          />
          <div className="reject-reason-count">{rejectReason.length}/500</div>
          <div className="modal-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}
            >
              取消
            </button>
            <button 
              className="btn btn-warning"
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? '处理中...' : '确认退回'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
