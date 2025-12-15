import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectService, ProjectMember } from '../services/project';
import { taskService, Task } from '../services/task';
import { memberService, Member } from '../services/member';
import { aiService, ProjectOptimizationResult, SuggestedTask } from '../services/ai';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import TaskList from '../components/TaskList';
import { ArrowUpDown, CheckSquare, X, Wand2, Sparkles, UserPlus, UserMinus, Crown } from 'lucide-react';
import './ProjectDetail.css';

interface ProjectLeader {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  leaderId: string | null;
  leader?: ProjectLeader | null;
  createdAt: string;
}

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

// 优先级权重（用于排序）
const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// 排序选项
type SortOption = 'created_desc' | 'created_asc' | 'priority_desc' | 'priority_asc' | 'due_asc' | 'due_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created_desc', label: '创建时间（最新）' },
  { value: 'created_asc', label: '创建时间（最早）' },
  { value: 'priority_desc', label: '优先级（高→低）' },
  { value: 'priority_asc', label: '优先级（低→高）' },
  { value: 'due_asc', label: '截止日期（最近）' },
  { value: 'due_desc', label: '截止日期（最远）' },
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWorkspace } = usePermissions();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_desc');
  
  // 新建任务 AI 建议状态
  const [newTaskAiLoading, setNewTaskAiLoading] = useState(false);
  const [newTaskSuggestions, setNewTaskSuggestions] = useState<SuggestedTask[]>([]);
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // 成员列表（用于任务分配）
  const [members, setMembers] = useState<Member[]>([]);
  
  // 批量选择状态
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  
  // AI 项目优化状态
  const [showProjectOptimization, setShowProjectOptimization] = useState(false);
  const [projectOptimizationResult, setProjectOptimizationResult] = useState<ProjectOptimizationResult | null>(null);
  const [projectOptimizationLoading, setProjectOptimizationLoading] = useState(false);
  const [applyingProjectOptimization, setApplyingProjectOptimization] = useState(false);

  // 项目团队管理状态
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
  const [addingMember, setAddingMember] = useState(false);
  const [selectedNewMemberId, setSelectedNewMemberId] = useState<string>('');
  const [showTeamModal, setShowTeamModal] = useState(false);

  // 权限检查
  const canCreateTask = canWorkspace('createTask');
  const canEditProject = canWorkspace('editProject');
  const canDeleteProject = canWorkspace('deleteProject');

  const loadProject = useCallback(async () => {
    try {
      const data = await projectService.getProject(id!);
      setProject(data);
      setSelectedLeaderId(data.leaderId || '');
      // 加载工作区成员列表
      if (data.workspaceId) {
        const memberList = await memberService.getMembers(data.workspaceId);
        setMembers(memberList);
      }
    } catch {
      setError('加载项目失败');
    }
  }, [id]);

  const loadTeamMembers = useCallback(async () => {
    if (!id) return;
    setLoadingTeam(true);
    try {
      const team = await projectService.getTeamMembers(id);
      setTeamMembers(team);
    } catch (err) {
      console.error('加载团队成员失败:', err);
    } finally {
      setLoadingTeam(false);
    }
  }, [id]);

  const openSettings = () => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || '');
      setSelectedLeaderId(project.leaderId || '');
      setShowSettings(true);
    }
  };

  const openTeamModal = () => {
    loadTeamMembers();
    setShowTeamModal(true);
  };

  const handleSetLeader = async (leaderId: string | null) => {
    try {
      await projectService.setLeader(id!, leaderId);
      await loadProject();
      setSelectedLeaderId(leaderId || '');
    } catch (err) {
      alert('设置负责人失败');
    }
  };

  const handleAddTeamMember = async () => {
    if (!selectedNewMemberId) return;
    setAddingMember(true);
    try {
      await projectService.addTeamMember(id!, selectedNewMemberId);
      await loadTeamMembers();
      setSelectedNewMemberId('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '添加失败';
      alert(errorMessage);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!confirm('确定移除该团队成员吗？')) return;
    try {
      await projectService.removeTeamMember(id!, memberId);
      await loadTeamMembers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '移除失败';
      alert(errorMessage);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    
    setSaving(true);
    try {
      await projectService.updateProject(id!, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      await loadProject();
      setShowSettings(false);
    } catch (err) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`确定要删除项目「${project?.name}」吗？此操作不可恢复！`)) {
      return;
    }
    
    try {
      await projectService.deleteProject(id!);
      navigate('/projects');
    } catch (err) {
      alert('删除失败');
    }
  };

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getTasks(id!);
      setTasks(data);
    } catch {
      setError('加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadProject();
      loadTasks();
    }
  }, [id, loadProject, loadTasks]);

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const dueDate = formData.get('dueDate') as string;
    const assigneeId = formData.get('assigneeId') as string;

    if (!title?.trim()) return;

    try {
      setCreating(true);
      await taskService.createTask({
        projectId: id!,
        title,
        description,
        priority,
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
      });
      setShowCreateTask(false);
      loadTasks();
    } catch (err) {
      alert('创建任务失败');
    } finally {
      setCreating(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      loadTasks();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // 过滤和排序任务
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      return true;
    });

    // 排序
    result.sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'priority_desc':
          return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
        case 'priority_asc':
          return (PRIORITY_WEIGHT[a.priority] || 0) - (PRIORITY_WEIGHT[b.priority] || 0);
        case 'due_asc':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'due_desc':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, statusFilter, priorityFilter, sortBy]);

  // 批量完成任务
  const handleBatchComplete = async () => {
    if (selectedTaskIds.size === 0) return;
    
    setBatchProcessing(true);
    try {
      const result = await taskService.batchUpdateStatus(Array.from(selectedTaskIds), 'done');
      
      // 显示结果
      if (result.results.failed.length > 0) {
        alert(`成功完成 ${result.results.success.length} 个任务\n失败 ${result.results.failed.length} 个：\n${result.results.failed.map(f => f.reason).join('\n')}`);
      }
      
      // 刷新任务列表
      loadTasks();
      // 退出选择模式
      setSelectionMode(false);
      setSelectedTaskIds(new Set());
    } catch (err) {
      console.error('批量完成失败:', err);
      alert('批量完成失败，请重试');
    } finally {
      setBatchProcessing(false);
    }
  };

  // 取消选择模式
  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedTaskIds(new Set());
  };

  // AI 项目优化
  const handleProjectOptimization = async () => {
    if (!project) {
      alert('项目未加载');
      return;
    }

    setProjectOptimizationLoading(true);
    setShowProjectOptimization(true);
    setProjectOptimizationResult(null);

    try {
      const result = await aiService.optimizeProject(id!);
      setProjectOptimizationResult(result);
    } catch (err) {
      console.error('AI 项目优化分析失败:', err);
      setProjectOptimizationResult({
        optimizedTitle: project.name,
        optimizedDescription: project.description || '',
        suggestedLeader: {
          role: '项目经理',
          skills: ['项目管理'],
          reason: 'AI 分析暂时不可用',
        },
        suggestedTeam: [],
        suggestions: ['请稍后再试'],
        reason: 'AI 分析暂时不可用',
      });
    } finally {
      setProjectOptimizationLoading(false);
    }
  };

  // 应用项目优化
  const handleApplyProjectOptimization = async () => {
    if (!projectOptimizationResult || !project) return;
    
    setApplyingProjectOptimization(true);
    try {
      await projectService.updateProject(id!, {
        name: projectOptimizationResult.optimizedTitle,
        description: projectOptimizationResult.optimizedDescription,
      });
      
      // 刷新项目数据
      await loadProject();
      setShowProjectOptimization(false);
      setProjectOptimizationResult(null);
    } catch (err) {
      console.error('应用项目优化失败:', err);
      alert('应用优化失败，请重试');
    } finally {
      setApplyingProjectOptimization(false);
    }
  };

  // 在新建任务弹窗中获取 AI 建议
  const handleGetNewTaskSuggestions = async () => {
    setNewTaskAiLoading(true);
    try {
      const taskData = tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        description: t.description,
      }));

      const response = await aiService.generateNextTasks(id!, taskData);
      // 防御性检查：确保 suggestedTasks 存在且为数组
      if (response && Array.isArray(response.suggestedTasks)) {
        setNewTaskSuggestions(response.suggestedTasks);
      } else if (response && Array.isArray(response)) {
        // 如果返回的直接是数组（兼容旧格式）
        setNewTaskSuggestions(response as unknown as typeof newTaskSuggestions);
      } else {
        console.warn('AI 返回数据格式不正确:', response);
        setNewTaskSuggestions([]);
      }
    } catch (err) {
      console.error('获取 AI 建议失败:', err);
      setNewTaskSuggestions([]);
    } finally {
      setNewTaskAiLoading(false);
    }
  };

  // 使用 AI 建议填充新建任务表单
  const handleUseSuggestion = (suggestion: SuggestedTask) => {
    const form = document.querySelector('form[data-create-task]') as HTMLFormElement;
    if (form) {
      const titleInput = form.querySelector('input[name="title"]') as HTMLInputElement;
      const descInput = form.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
      const prioritySelect = form.querySelector('select[name="priority"]') as HTMLSelectElement;
      
      if (titleInput) titleInput.value = suggestion.title;
      if (descInput) descInput.value = suggestion.description;
      if (prioritySelect) prioritySelect.value = suggestion.priority;
    }
    setNewTaskSuggestions([]); // 清空建议列表
  };

  // 计算统计
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  if (loading && !project) {
    return (
      <div className="project-detail-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="project-detail-page">
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>
            返回项目列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      {/* Header */}
      <div className="project-header">
        <Link to="/projects" className="back-link">
          ← 返回项目
        </Link>
        <div className="project-header-content">
          <div className="project-title-section">
            <div className="project-icon-large">
              {project?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="project-title-info">
              <h1 className="project-title">{project?.name}</h1>
              {project?.description && 
               project.description !== '项目描述' && 
               project.description.trim() && (
                <p className="project-description">{project.description}</p>
              )}
            </div>
          </div>
          <div className="project-actions">
            <button 
              className={`btn btn-secondary btn-sm ${projectOptimizationLoading ? 'btn-loading' : ''}`}
              onClick={handleProjectOptimization}
              disabled={projectOptimizationLoading}
              title="AI 项目优化"
            >
              <Wand2 size={14} />
              {projectOptimizationLoading ? '分析中...' : '项目优化'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={openTeamModal} title="团队管理">
              <UserPlus size={14} />
              团队
            </button>
            {canEditProject && (
              <button className="btn btn-secondary btn-sm" onClick={openSettings}>
                ⚙️ 设置
              </button>
            )}
          </div>
        </div>
        
        {/* 项目负责人信息 */}
        {project?.leader && (
          <div className="project-leader-info">
            <Crown size={14} className="leader-icon" />
            <span className="leader-label">负责人：</span>
            <span className="leader-name">{project.leader.name}</span>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">总任务</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">{stats.todo}</span>
          <span className="stat-label">待办</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value" style={{ color: 'var(--color-info)' }}>
            {stats.inProgress}
          </span>
          <span className="stat-label">进行中</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
            {stats.done}
          </span>
          <span className="stat-label">已完成</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          {selectionMode ? (
            <div className="batch-toolbar">
              <span className="selection-count">
                已选择 {selectedTaskIds.size} 个任务
              </span>
              <button
                className={`btn btn-success btn-sm ${batchProcessing ? 'btn-loading' : ''}`}
                onClick={handleBatchComplete}
                disabled={selectedTaskIds.size === 0 || batchProcessing}
              >
                <CheckSquare size={14} />
                {batchProcessing ? '处理中...' : '批量完成'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={cancelSelectionMode}
              >
                <X size={14} />
                取消
              </button>
            </div>
          ) : (
            <div className="filters">
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">所有状态</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <select 
                className="filter-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">所有优先级</option>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
              <select 
                className="filter-select sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    <ArrowUpDown size={12} /> {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="toolbar-right">
          {!selectionMode && (
            <>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectionMode(true)}
                title="批量操作"
              >
                <CheckSquare size={14} />
                批量操作
              </button>
              {canCreateTask && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateTask(true)}
                >
                  + 新建任务
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area">
        <div className="task-list-wrapper">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <h3 className="empty-state-title">暂无任务</h3>
              <p className="empty-state-description">
                {canCreateTask ? '创建第一个任务开始工作' : '暂无任务'}
              </p>
              {canCreateTask && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateTask(true)}
                >
                  + 新建任务
                </button>
              )}
            </div>
          ) : (
            <TaskList 
              tasks={filteredTasks}
              onTaskClick={(task) => navigate(`/tasks/${task.id}`)}
              onStatusChange={handleTaskStatusChange}
              selectionMode={selectionMode}
              selectedIds={selectedTaskIds}
              onSelectionChange={setSelectedTaskIds}
            />
          )}
        </div>
      </div>

      {/* AI 项目优化弹窗 */}
      <Modal
        isOpen={showProjectOptimization}
        onClose={() => {
          setShowProjectOptimization(false);
          setProjectOptimizationResult(null);
        }}
        title="✨ AI 项目优化"
      >
        <div className="project-optimization-modal">
          {projectOptimizationLoading ? (
            <div className="ai-loading">
              <div className="loading-spinner" />
              <p>AI 正在分析项目并生成优化建议...</p>
            </div>
          ) : projectOptimizationResult ? (
            <div className="project-optimization-content">
              {/* 优化后的标题 */}
              <div className="optimization-section">
                <h4>📝 项目标题优化</h4>
                <div className="optimization-comparison">
                  <div className="original">
                    <span className="label">原标题：</span>
                    <span className="value">{project?.name}</span>
                  </div>
                  <div className="optimized">
                    <span className="label">优化后：</span>
                    <span className="value highlight">{projectOptimizationResult.optimizedTitle}</span>
                  </div>
                </div>
              </div>

              {/* 优化后的描述 */}
              <div className="optimization-section">
                <h4>📋 项目描述优化</h4>
                <div className="optimization-description">
                  <div className="original-desc">
                    <span className="label">原描述：</span>
                    <pre className="desc-content">{project?.description || '（无描述）'}</pre>
                  </div>
                  <div className="optimized-desc">
                    <span className="label">优化后：</span>
                    <pre className="desc-content highlight">{projectOptimizationResult.optimizedDescription}</pre>
                  </div>
                </div>
              </div>

              {/* 建议负责人 */}
              <div className="optimization-section">
                <h4>👤 建议项目负责人</h4>
                <div className="leader-suggestion">
                  <div className="leader-role">{projectOptimizationResult.suggestedLeader.role}</div>
                  <div className="leader-skills">
                    <span className="label">需要技能：</span>
                    {projectOptimizationResult.suggestedLeader.skills.map((skill, i) => (
                      <span key={i} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                  <div className="leader-reason">💡 {projectOptimizationResult.suggestedLeader.reason}</div>
                </div>
              </div>

              {/* 建议团队构成 */}
              {projectOptimizationResult.suggestedTeam.length > 0 && (
                <div className="optimization-section">
                  <h4>👥 建议团队构成</h4>
                  <div className="team-suggestions">
                    {projectOptimizationResult.suggestedTeam.map((member, i) => (
                      <div key={i} className="team-member-card">
                        <div className="member-header">
                          <span className="member-role">{member.role}</span>
                          <span className="member-count">×{member.count}</span>
                        </div>
                        <div className="member-skills">
                          {member.skills.map((skill, j) => (
                            <span key={j} className="skill-tag">{skill}</span>
                          ))}
                        </div>
                        <div className="member-responsibilities">{member.responsibilities}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 其他建议 */}
              {projectOptimizationResult.suggestions.length > 0 && (
                <div className="optimization-section">
                  <h4>💡 其他建议</h4>
                  <ul className="other-suggestions">
                    {projectOptimizationResult.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 优化理由 */}
              <div className="optimization-reason">
                <span className="reason-icon">💬</span>
                <span className="reason-text">{projectOptimizationResult.reason}</span>
              </div>

              {/* 操作按钮 */}
              <div className="optimization-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowProjectOptimization(false);
                    setProjectOptimizationResult(null);
                  }}
                >
                  取消
                </button>
                <button 
                  className={`btn btn-primary ${applyingProjectOptimization ? 'btn-loading' : ''}`}
                  onClick={handleApplyProjectOptimization}
                  disabled={applyingProjectOptimization}
                >
                  {applyingProjectOptimization ? '应用中...' : '✓ 应用标题和描述优化'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateTask}
        onClose={() => {
          setShowCreateTask(false);
          setNewTaskSuggestions([]);
        }}
        title="新建任务"
      >
        <div className="create-task-container">
          {/* AI 建议区域 */}
          <div className="ai-suggestions-panel">
            <div className="ai-panel-header">
              <span>✨ AI 智能建议</span>
              <button
                type="button"
                className={`btn btn-sm btn-secondary ${newTaskAiLoading ? 'btn-loading' : ''}`}
                onClick={handleGetNewTaskSuggestions}
                disabled={newTaskAiLoading}
              >
                {newTaskAiLoading ? '生成中...' : '获取建议'}
              </button>
            </div>
            {newTaskSuggestions.length > 0 && (
              <div className="ai-suggestions-list">
                {newTaskSuggestions.map((suggestion, index) => (
                  <div 
                    key={index} 
                    className="ai-suggestion-item"
                    onClick={() => handleUseSuggestion(suggestion)}
                  >
                    <div className="suggestion-item-header">
                      <span className={`priority-dot priority-${suggestion.priority || 'medium'}`} />
                      <span className="suggestion-item-title">{suggestion.title || '未命名任务'}</span>
                    </div>
                    <p className="suggestion-item-desc">
                      {suggestion.description ? suggestion.description.substring(0, 100) : '无描述'}
                      {suggestion.description && suggestion.description.length > 100 ? '...' : ''}
                    </p>
                    <div className="suggestion-item-footer">
                      {suggestion.reason && (
                        <span className="suggestion-reason">💡 {suggestion.reason}</span>
                      )}
                      <span className="suggestion-item-hint">点击使用此建议 →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {newTaskAiLoading && (
              <div className="ai-loading-state">
                <div className="ai-loading-animation">
                  <div className="ai-loading-spinner"></div>
                  <div className="ai-loading-text">
                    <span className="loading-title">🤖 AI 正在分析项目...</span>
                    <span className="loading-subtitle">正在结合已有任务生成智能建议</span>
                  </div>
                </div>
                <div className="ai-loading-progress">
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                </div>
              </div>
            )}
            {newTaskSuggestions.length === 0 && !newTaskAiLoading && (
              <p className="ai-panel-hint">点击"获取建议"让 AI 分析项目并推荐下一步任务</p>
            )}
          </div>

          {/* 创建任务表单 */}
          <form onSubmit={handleCreateTask} data-create-task>
            <div className="form-group">
              <label className="form-label">任务标题 *</label>
              <input 
                name="title"
                type="text" 
                className="form-input" 
                placeholder="输入任务标题"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">描述</label>
              <textarea 
                name="description"
                className="form-textarea" 
                placeholder="可选：添加任务描述"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">负责人</label>
              <select name="assigneeId" className="form-select" defaultValue="">
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
                <select name="priority" className="form-select" defaultValue="medium">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.icon} {config.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">截止日期</label>
                <input name="dueDate" type="date" className="form-input" />
              </div>
            </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setShowCreateTask(false)}
            >
              取消
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${creating ? 'btn-loading' : ''}`}
              disabled={creating}
            >
              创建任务
            </button>
          </div>
        </form>
        </div>
      </Modal>

      {/* Project Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="项目设置"
      >
        <form onSubmit={handleSaveSettings}>
          <div className="form-group">
            <label className="form-label">项目名称 *</label>
            <input 
              type="text" 
              className="form-input" 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="输入项目名称"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">项目描述</label>
            <textarea 
              className="form-textarea" 
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="可选：添加项目描述"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setShowSettings(false)}
            >
              取消
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
              disabled={saving}
            >
              保存
            </button>
          </div>
          
          {canDeleteProject && (
            <div className="danger-zone">
              <h4>危险区域</h4>
              <p>删除项目将永久删除所有相关任务，此操作不可恢复。</p>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDeleteProject}
              >
                删除项目
              </button>
            </div>
          )}
        </form>
      </Modal>

      {/* Team Management Modal */}
      <Modal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title="👥 项目团队管理"
      >
        <div className="team-modal-content">
          {/* 项目负责人 */}
          <div className="team-section">
            <h3 className="team-section-title">
              <Crown size={16} />
              项目负责人
            </h3>
            <p className="team-section-desc">负责人可以修改项目设置和推进任务</p>
            <div className="leader-selector">
              <select
                className="form-select"
                value={selectedLeaderId}
                onChange={(e) => handleSetLeader(e.target.value || null)}
              >
                <option value="">-- 未指定 --</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name} ({member.user.email})
                  </option>
                ))}
              </select>
            </div>
            {project?.leader && (
              <div className="current-leader">
                <div className="leader-avatar">
                  {project.leader.name.charAt(0).toUpperCase()}
                </div>
                <div className="leader-info">
                  <span className="leader-name">{project.leader.name}</span>
                  <span className="leader-email">{project.leader.email}</span>
                </div>
              </div>
            )}
          </div>

          {/* 团队成员 */}
          <div className="team-section">
            <h3 className="team-section-title">
              <UserPlus size={16} />
              团队成员
            </h3>
            <p className="team-section-desc">团队成员可以创建任务和参与任务</p>

            {/* 添加成员 */}
            <div className="add-member-form">
              <select
                className="form-select"
                value={selectedNewMemberId}
                onChange={(e) => setSelectedNewMemberId(e.target.value)}
              >
                <option value="">-- 选择成员 --</option>
                {members
                  .filter(m => 
                    m.userId !== project?.leaderId && 
                    !teamMembers.some(tm => tm.userId === m.userId)
                  )
                  .map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name} ({member.user.email})
                    </option>
                  ))}
              </select>
              <button
                className={`btn btn-primary btn-sm ${addingMember ? 'btn-loading' : ''}`}
                onClick={handleAddTeamMember}
                disabled={!selectedNewMemberId || addingMember}
              >
                <UserPlus size={14} />
                添加
              </button>
            </div>

            {/* 成员列表 */}
            {loadingTeam ? (
              <div className="team-loading">加载中...</div>
            ) : teamMembers.length === 0 ? (
              <div className="team-empty">暂无团队成员</div>
            ) : (
              <div className="team-member-list">
                {teamMembers.map((member) => (
                  <div key={member.id} className="team-member-item">
                    <div className="member-avatar">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-info">
                      <span className="member-name">{member.user.name}</span>
                      <span className="member-email">{member.user.email}</span>
                    </div>
                    <span className="member-role">{member.role}</span>
                    <button
                      className="btn-icon btn-danger-icon"
                      onClick={() => handleRemoveTeamMember(member.userId)}
                      title="移除成员"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowTeamModal(false)}
            >
              完成
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
