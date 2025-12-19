import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, Search, AlertTriangle, ClipboardList, CheckCircle2, LayoutGrid, List, Crown, Sparkles, Check, X, Loader2, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { projectService, SuggestedTask, InitialTask } from '../services/project';
import { workspaceService, WorkspaceMember } from '../services/workspace';
import Modal from '../components/Modal';
import MemberSelector from '../components/MemberSelector';
import './Projects.css';

interface Project {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
  leaderId?: string | null;
  leader?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  members?: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
  }>;
  taskStats?: {
    total: number;
    done: number;
  };
}

// 项目图标颜色
const PROJECT_COLORS = [
  { bg: '#6366F1', text: '#FFFFFF' }, // Indigo
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Purple
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
  { bg: '#F59E0B', text: '#FFFFFF' }, // Amber
  { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
];

const getProjectColor = (name: string) => {
  const index = name.charCodeAt(0) % PROJECT_COLORS.length;
  return PROJECT_COLORS[index];
};

export default function Projects() {
  const { currentWorkspace, canWorkspace } = usePermissions();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showCompletedSection, setShowCompletedSection] = useState(false);

  // Modals
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [creating, setCreating] = useState(false);

  // 创建项目表单
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  
  // AI 推荐任务
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<number[]>([]);
  const [expandedTaskIndices, setExpandedTaskIndices] = useState<number[]>([]);
  const [aiReasoning, setAiReasoning] = useState('');
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const loadProjects = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProjects(currentWorkspace.id);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace) {
      loadProjects();
      // 加载工作区成员用于创建项目时选择
      workspaceService.getMembers(currentWorkspace.id).then(setWorkspaceMembers).catch(console.error);
    } else {
      // 没有工作区时，停止加载状态
      setLoading(false);
    }
  }, [currentWorkspace, loadProjects]);

  const handleCreateWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name?.trim()) return;

    try {
      setCreating(true);
      await workspaceService.createWorkspace(name, description);
      setShowCreateWorkspace(false);
      window.location.reload();
    } catch (err) {
      console.error('Failed to create workspace:', err);
      alert('创建工作区失败');
    } finally {
      setCreating(false);
    }
  };

  // AI 优化项目并推荐任务
  const handleAiOptimize = async () => {
    if (!projectName.trim()) {
      alert('请先输入项目名称');
      return;
    }

    try {
      setAiOptimizing(true);
      const result = await projectService.suggestProjectTasks(projectName, projectDescription);
      
      // 更新优化后的标题和描述
      setProjectName(result.optimizedTitle);
      setProjectDescription(result.optimizedDescription);
      
      // 设置推荐的任务
      setSuggestedTasks(result.suggestedTasks);
      setSelectedTaskIndices(result.suggestedTasks.map((_, i) => i)); // 默认全选
      setAiReasoning(result.reasoning);
      setShowAiSuggestions(true);
    } catch (err) {
      console.error('AI 优化失败:', err);
      alert('AI 优化失败，请稍后重试');
    } finally {
      setAiOptimizing(false);
    }
  };

  // 切换任务选择
  const toggleTaskSelection = (index: number) => {
    setSelectedTaskIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // 全选/取消全选任务
  const toggleAllTasks = () => {
    if (selectedTaskIndices.length === suggestedTasks.length) {
      setSelectedTaskIndices([]);
    } else {
      setSelectedTaskIndices(suggestedTasks.map((_, i) => i));
    }
  };

  // 展开/收起任务详情
  const toggleTaskExpand = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    const name = projectName.trim();
    const description = projectDescription.trim();

    if (!name) return;

    // 收集选中的任务
    const initialTasks: InitialTask[] = selectedTaskIndices
      .sort((a, b) => a - b)
      .map((index, order) => ({
        title: suggestedTasks[index].title,
        description: suggestedTasks[index].description,
        priority: suggestedTasks[index].priority,
        order: order + 1,
      }));

    try {
      setCreating(true);
      const newProject = await projectService.createProject(
        currentWorkspace.id, 
        name, 
        description,
        selectedLeader || undefined,
        selectedTeamMembers.length > 0 ? selectedTeamMembers : undefined,
        initialTasks.length > 0 ? initialTasks : undefined
      );
      setShowCreateProject(false);
      // 重置表单
      resetCreateProjectForm();
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('创建项目失败');
    } finally {
      setCreating(false);
    }
  };

  // 重置创建项目表单
  const resetCreateProjectForm = () => {
    setProjectName('');
    setProjectDescription('');
    setSelectedLeader('');
    setSelectedTeamMembers([]);
    setSuggestedTasks([]);
    setSelectedTaskIndices([]);
    setExpandedTaskIndices([]);
    setAiReasoning('');
    setShowAiSuggestions(false);
  };

  const getProgress = (project: Project) => {
    const total = project.taskStats?.total || 0;
    const done = project.taskStats?.done || 0;
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  // 检查项目是否100%完成
  const isProjectCompleted = (project: Project) => {
    const total = project.taskStats?.total || 0;
    const done = project.taskStats?.done || 0;
    return total > 0 && done === total;
  };

  // 分离已完成和进行中的项目
  const searchFiltered = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedProjects = searchFiltered.filter(isProjectCompleted);
  const activeProjects = searchFiltered.filter(p => !isProjectCompleted(p));
  
  // 根据隐藏状态决定显示哪些项目
  const filteredProjects = hideCompleted ? activeProjects : searchFiltered;

  if (loading) {
    return (
      <div className="projects-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    );
  }

  // 没有工作区时显示创建提示
  if (!currentWorkspace) {
    return (
      <div className="projects-page">
        <div className="page-header">
          <div className="header-content">
            <div className="header-icon icon-purple"><FolderOpen size={28} /></div>
            <div className="header-text">
              <h1>项目</h1>
              <p>管理您的所有项目</p>
            </div>
          </div>
          <div className="page-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateWorkspace(true)}
            >
              + 新建工作区
            </button>
          </div>
        </div>
        <div className="empty-state">
          <FolderOpen size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">您还没有加入任何工作区</h3>
          <p className="empty-state-description">请先创建一个工作区来管理您的项目和任务。</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateWorkspace(true)}
          >
            + 新建工作区
          </button>
        </div>

        {/* Create Workspace Modal */}
        <Modal
          isOpen={showCreateWorkspace}
          onClose={() => setShowCreateWorkspace(false)}
          title="新建工作区"
          size="sm"
        >
          <form onSubmit={handleCreateWorkspace}>
            <div className="form-group">
              <label htmlFor="workspaceName" className="form-label">工作区名称</label>
              <input
                type="text"
                id="workspaceName"
                name="name"
                className="form-input"
                placeholder="输入工作区名称"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="workspaceDescription" className="form-label">描述 (可选)</label>
              <textarea
                id="workspaceDescription"
                name="description"
                className="form-textarea"
                placeholder="输入工作区描述"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateWorkspace(false)}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="projects-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon icon-purple"><FolderOpen size={28} /></div>
          <div className="header-text">
            <h1>项目</h1>
            <p>管理您的所有项目</p>
          </div>
        </div>
        <div className="page-actions">
          {canWorkspace('createWorkspace') && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowCreateWorkspace(true)}
            >
              + 新建工作区
            </button>
          )}
          {canWorkspace('createProject') && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateProject(true)}
            >
              + 新建项目
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="projects-toolbar">
        <div className="search-box">
          <span className="search-icon"><Search size={18} /></span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          {completedProjects.length > 0 && (
            <button
              className={`hide-completed-btn ${hideCompleted ? 'active' : ''}`}
              onClick={() => setHideCompleted(!hideCompleted)}
              title={hideCompleted ? '显示已完成项目' : '隐藏已完成项目'}
            >
              {hideCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>{hideCompleted ? '显示已完成' : '隐藏已完成'}</span>
              <span className="completed-count">{completedProjects.length}</span>
            </button>
          )}
          <div className="view-switcher">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="网格视图"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="列表视图"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-card">
          <span className="error-icon"><AlertTriangle size={18} /></span>
          <span className="error-text">{error}</span>
          <button className="btn btn-sm btn-secondary" onClick={loadProjects}>
            重试
          </button>
        </div>
      )}

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon"><FolderOpen size={48} /></span>
          <h3 className="empty-state-title">
            {searchQuery ? '未找到匹配的项目' : '暂无项目'}
          </h3>
          <p className="empty-state-description">
            {searchQuery ? '尝试使用其他关键词搜索' : '创建您的第一个项目开始协作'}
          </p>
          {!searchQuery && canWorkspace('createProject') && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateProject(true)}
            >
              + 新建项目
            </button>
          )}
        </div>
      ) : (
        <div className={`projects-${viewMode}`}>
          {filteredProjects.map((project) => {
            const color = getProjectColor(project.name);
            const progress = getProgress(project);
            
            return (
              <Link 
                key={project.id} 
                to={`/projects/${project.id}`}
                className="project-card card card-interactive"
              >
                {/* 头部：图标 + 名称 + 描述 */}
                <div className="project-card-header">
                  <div 
                    className="project-icon"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="project-info">
                    <h3 className="project-name">{project.name}</h3>
                    {project.description && 
                     project.description.trim() && 
                     project.description !== '项目描述' && (
                      <p className="project-description">{project.description}</p>
                    )}
                  </div>
                </div>
                
                {/* 进度条区域 */}
                <div className="project-progress-section">
                  <div className="project-progress-bar">
                    <div 
                      className="project-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="project-progress-text">{progress}%</span>
                </div>
                
                {/* 统计信息 */}
                <div className="project-stats">
                  <div className="project-stat">
                    <span className="stat-icon"><ClipboardList size={14} /></span>
                    <span className="stat-value">{project.taskStats?.total || 0}</span>
                    <span className="stat-label">任务</span>
                  </div>
                  <div className="project-stat">
                    <span className="stat-icon"><CheckCircle2 size={14} /></span>
                    <span className="stat-value">{project.taskStats?.done || 0}</span>
                    <span className="stat-label">完成</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 已完成项目折叠区域 */}
      {hideCompleted && completedProjects.length > 0 && (
        <div className="completed-projects-section">
          <button 
            className="completed-section-header"
            onClick={() => setShowCompletedSection(!showCompletedSection)}
          >
            {showCompletedSection ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <CheckCircle2 size={16} className="completed-icon" />
            <span>已完成的项目</span>
            <span className="completed-badge">{completedProjects.length}</span>
          </button>
          
          {showCompletedSection && (
            <div className={`projects-${viewMode} completed-projects-list`}>
              {completedProjects.map((project) => {
                const color = getProjectColor(project.name);
                
                return (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="project-card card card-interactive completed"
                  >
                    <div className="project-card-header">
                      <div 
                        className="project-icon"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="project-info">
                        <h3 className="project-name">{project.name}</h3>
                      </div>
                    </div>
                    <div className="project-progress-section">
                      <div className="project-progress-bar">
                        <div className="project-progress-fill" style={{ width: '100%' }} />
                      </div>
                      <span className="project-progress-text">100%</span>
                    </div>
                    <div className="project-stats">
                      <div className="project-stat">
                        <span className="stat-icon"><CheckCircle2 size={14} /></span>
                        <span className="stat-value">{project.taskStats?.done || 0}</span>
                        <span className="stat-label">已完成</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Workspace Modal */}
      <Modal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
        title="新建工作区"
        size="sm"
      >
        <form onSubmit={handleCreateWorkspace}>
          <div className="form-group">
            <label className="form-label">工作区名称 *</label>
            <input 
              name="name"
              type="text" 
              className="form-input" 
              placeholder="输入工作区名称"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea 
              name="description"
              className="form-textarea" 
              placeholder="可选：添加工作区描述"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setShowCreateWorkspace(false)}
            >
              取消
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${creating ? 'btn-loading' : ''}`}
              disabled={creating}
            >
              创建工作区
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateProject}
        onClose={() => {
          setShowCreateProject(false);
          resetCreateProjectForm();
        }}
        title="新建项目"
        size="lg"
      >
        <form ref={formRef} onSubmit={handleCreateProject}>
          {/* 项目基本信息 */}
          <div className="form-group">
            <label className="form-label">项目名称 *</label>
            <div className="input-with-ai">
              <input 
                name="name"
                type="text" 
                className="form-input" 
                placeholder="输入项目名称"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
              <button
                type="button"
                className={`btn btn-ai ${aiOptimizing ? 'btn-loading' : ''}`}
                onClick={handleAiOptimize}
                disabled={aiOptimizing || !projectName.trim()}
                title="AI 优化项目信息并推荐任务"
              >
                {aiOptimizing ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>{aiOptimizing ? 'AI 分析中...' : 'AI 优化'}</span>
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea 
              name="description"
              className="form-textarea" 
              placeholder="可选：添加项目描述"
              rows={3}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
          </div>

          {/* AI 推荐任务 */}
          {showAiSuggestions && suggestedTasks.length > 0 && (
            <div className="ai-suggestions-section">
              <div className="ai-suggestions-header">
                <div className="ai-suggestions-title">
                  <Sparkles size={18} className="ai-icon" />
                  <span>AI 推荐任务</span>
                  <span className="task-count">({selectedTaskIndices.length}/{suggestedTasks.length})</span>
                </div>
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  onClick={toggleAllTasks}
                >
                  {selectedTaskIndices.length === suggestedTasks.length ? '取消全选' : '全选'}
                </button>
              </div>
              {aiReasoning && (
                <p className="ai-reasoning">{aiReasoning}</p>
              )}
              <div className="suggested-tasks-list">
                {suggestedTasks.map((task, index) => {
                  const isExpanded = expandedTaskIndices.includes(index);
                  return (
                    <div 
                      key={index}
                      className={`suggested-task-item ${selectedTaskIndices.includes(index) ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleTaskSelection(index)}
                    >
                      <div className="task-checkbox">
                        {selectedTaskIndices.includes(index) ? (
                          <Check size={14} />
                        ) : null}
                      </div>
                      <div className="task-content">
                        <div className="task-header">
                          <span className="task-title">{task.title}</span>
                          <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                            {task.priority === 'URGENT' ? '紧急' : 
                             task.priority === 'HIGH' ? '高' : 
                             task.priority === 'MEDIUM' ? '中' : '低'}
                          </span>
                        </div>
                        <p className={`task-description ${isExpanded ? 'expanded' : ''}`}>{task.description}</p>
                        <div className="task-footer">
                          {task.estimatedDays && (
                            <span className="task-estimate">预计 {task.estimatedDays} 天</span>
                          )}
                          <button
                            type="button"
                            className="expand-toggle-btn"
                            onClick={(e) => toggleTaskExpand(index, e)}
                          >
                            {isExpanded ? '收起' : '展开详情'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn btn-text btn-sm clear-suggestions"
                onClick={() => {
                  setShowAiSuggestions(false);
                  setSuggestedTasks([]);
                  setSelectedTaskIndices([]);
                }}
              >
                <X size={14} />
                清除推荐
              </button>
            </div>
          )}
          
          {/* 负责人选择 */}
          <div className="form-group">
            <label className="form-label"><Crown size={16} /> 项目负责人</label>
            <div className="leader-selector">
              <button
                type="button"
                className={`leader-option ${selectedLeader === '' ? 'selected' : ''}`}
                onClick={() => setSelectedLeader('')}
              >
                不设置负责人
              </button>
              {workspaceMembers.map(member => (
                <button
                  key={member.userId}
                  type="button"
                  className={`leader-option ${selectedLeader === member.userId ? 'selected' : ''}`}
                  onClick={() => setSelectedLeader(member.userId)}
                >
                  <span className="leader-avatar">
                    {member.user.avatar ? (
                      <img src={member.user.avatar} alt={member.user.name} />
                    ) : (
                      member.user.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="leader-info">
                    <span className="leader-name">{member.user.name}</span>
                    <span className="leader-role">{member.role}</span>
                  </span>
                  {selectedLeader === member.userId && <Crown size={16} className="leader-crown" />}
                </button>
              ))}
            </div>
            <p className="form-hint">负责人可以管理项目设置和推进任务</p>
          </div>

          {/* 团队成员选择 */}
          <MemberSelector
            members={workspaceMembers.map(m => ({
              id: m.userId,
              name: m.user.name,
              email: m.user.email,
              avatar: m.user.avatar,
              role: m.role,
              isLeader: m.userId === selectedLeader,
              disabled: m.userId === selectedLeader,
              disabledReason: m.userId === selectedLeader ? '已设为负责人' : undefined,
            }))}
            selectedIds={selectedTeamMembers}
            onSelectionChange={setSelectedTeamMembers}
            title="团队成员"
            subtitle="选择参与项目的团队成员"
            maxHeight={240}
            emptyMessage="暂无可选成员"
          />

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setShowCreateProject(false);
                resetCreateProjectForm();
              }}
            >
              取消
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${creating ? 'btn-loading' : ''}`}
              disabled={creating}
            >
              {selectedTaskIndices.length > 0 
                ? `创建项目 (含 ${selectedTaskIndices.length} 个任务)`
                : '创建项目'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
