import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, Search, AlertTriangle, ClipboardList, CheckCircle2, Plus } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { projectService } from '../services/project';
import { workspaceService, WorkspaceMember } from '../services/workspace';
import Modal from '../components/Modal';
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

  // Modals
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [creating, setCreating] = useState(false);

  // 创建项目表单
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);

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

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name?.trim()) return;

    try {
      setCreating(true);
      const newProject = await projectService.createProject(
        currentWorkspace.id, 
        name, 
        description,
        selectedLeader || undefined,
        selectedTeamMembers.length > 0 ? selectedTeamMembers : undefined
      );
      setShowCreateProject(false);
      // 重置表单
      setSelectedLeader('');
      setSelectedTeamMembers([]);
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('创建项目失败');
    } finally {
      setCreating(false);
    }
  };

  const handleTeamMemberToggle = (memberId: string) => {
    setSelectedTeamMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgress = (project: Project) => {
    const total = project.taskStats?.total || 0;
    const done = project.taskStats?.done || 0;
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

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
          <div className="page-header-content">
            <h1 className="page-title"><FolderOpen size={24} /> 项目</h1>
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
          <span className="empty-state-icon">🏢</span>
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
        <div className="page-header-content">
          <div className="page-title-row">
            <h1 className="page-title"><FolderOpen size={24} /> 项目</h1>
            <span className="badge badge-primary">{projects.length}</span>
          </div>
          <p className="page-description">管理您的所有项目</p>
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
        <div className="view-switcher">
          <button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="网格视图"
          >
            ▦
          </button>
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="列表视图"
          >
            ☰
          </button>
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
          setSelectedLeader('');
          setSelectedTeamMembers([]);
        }}
        title="新建项目"
        size="md"
      >
        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label className="form-label">项目名称 *</label>
            <input 
              name="name"
              type="text" 
              className="form-input" 
              placeholder="输入项目名称"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea 
              name="description"
              className="form-textarea" 
              placeholder="可选：添加项目描述"
              rows={3}
            />
          </div>
          
          {/* 负责人选择 */}
          <div className="form-group">
            <label className="form-label">项目负责人</label>
            <select 
              className="form-select"
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
            >
              <option value="">选择负责人（可选）</option>
              {workspaceMembers.map(member => (
                <option key={member.userId} value={member.userId}>
                  {member.user.name} ({member.user.email})
                </option>
              ))}
            </select>
            <p className="form-hint">负责人可以管理项目设置和推进任务</p>
          </div>

          {/* 团队成员选择 */}
          <div className="form-group">
            <label className="form-label">团队成员</label>
            <div className="team-member-selector">
              {workspaceMembers.length === 0 ? (
                <p className="form-hint">暂无可选成员</p>
              ) : (
                <div className="member-checkbox-list">
                  {workspaceMembers.map(member => (
                    <label key={member.userId} className="member-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedTeamMembers.includes(member.userId)}
                        onChange={() => handleTeamMemberToggle(member.userId)}
                        disabled={member.userId === selectedLeader}
                      />
                      <span className="member-avatar">
                        {member.user.avatar ? (
                          <img src={member.user.avatar} alt={member.user.name} />
                        ) : (
                          member.user.name.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="member-info">
                        <span className="member-name">{member.user.name}</span>
                        <span className="member-role">{member.role}</span>
                      </span>
                      {member.userId === selectedLeader && (
                        <span className="member-tag">负责人</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="form-hint">团队成员可以创建和参与项目任务</p>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setShowCreateProject(false);
                setSelectedLeader('');
                setSelectedTeamMembers([]);
              }}
            >
              取消
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${creating ? 'btn-loading' : ''}`}
              disabled={creating}
            >
              创建项目
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
