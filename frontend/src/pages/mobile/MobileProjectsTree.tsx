/**
 * 移动端项目任务树页面 - 简约蓝主题
 * 用于管理员查看所有项目和任务分布
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder,
  ChevronDown,
  Users,
  CheckSquare,
  MoreHorizontal,
  Plus,
  Edit,
  Eye,
  Trash2,
  Loader2,
} from '../../components/Icons';
import MobileLayout from '../../components/mobile/MobileLayout';
import SheetModal from '../../components/mobile/SheetModal';
import { treeService, ProjectNode, ProjectTreeResponse } from '../../services/tree';
import { projectService } from '../../services/project';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/mobile-minimal.css';

export default function MobileProjectsTree() {
  const navigate = useNavigate();
  const { currentWorkspace } = usePermissions();

  const [treeData, setTreeData] = useState<ProjectTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectNode | null>(null);

  const loadProjects = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      const data = await treeService.getProjectTree(currentWorkspace.id);
      setTreeData(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const toggleExpand = (projectId: string) => {
    setExpandedId(expandedId === projectId ? null : projectId);
  };

  const handleProjectMenu = (project: ProjectNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setMenuOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    
    if (!window.confirm(`确定要删除项目 "${selectedProject.name}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      await projectService.deleteProject(selectedProject.projectId);
      setMenuOpen(false);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const projects = treeData?.projects || [];

  return (
    <MobileLayout
      headerType="manage"
      headerTitle="项目管理"
      showBottomNav={false}
      headerProps={{
        rightContent: (
          <button
            className="mm-header-icon"
            onClick={() => navigate('/projects/create')}
          >
            <Plus size={22} />
          </button>
        ),
      }}
    >
      {/* 整体统计 */}
      {treeData && (
        <div className="mm-tree-overview">
          <div className="mm-tree-overview-item">
            <span className="mm-tree-overview-value">{treeData.totalProjects}</span>
            <span className="mm-tree-overview-label">项目</span>
          </div>
          <div className="mm-tree-overview-item">
            <span className="mm-tree-overview-value">{treeData.overallStats.total}</span>
            <span className="mm-tree-overview-label">总任务</span>
          </div>
          <div className="mm-tree-overview-item">
            <span className="mm-tree-overview-value">{treeData.overallStats.inProgress}</span>
            <span className="mm-tree-overview-label">进行中</span>
          </div>
          <div className="mm-tree-overview-item">
            <span className="mm-tree-overview-value">{treeData.overallStats.done}</span>
            <span className="mm-tree-overview-label">已完成</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mm-loading" style={{ marginTop: 60 }}>
          <Loader2 size={24} className="mm-spinner-icon" />
          <span>加载中...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="mm-empty-state">
          <Folder size={48} className="mm-empty-icon" />
          <div className="mm-empty-title">暂无项目</div>
          <div className="mm-empty-desc">点击右上角创建新项目</div>
        </div>
      ) : (
        <div className="mm-project-tree">
          {projects.map((project) => (
            <div
              key={project.projectId}
              className={`mm-project-tree-card ${expandedId === project.projectId ? 'expanded' : ''}`}
            >
              <div
                className="mm-project-tree-header"
                onClick={() => toggleExpand(project.projectId)}
              >
                <div className="mm-project-tree-icon">
                  <Folder size={20} />
                </div>
                <div className="mm-project-tree-info">
                  <div className="mm-project-tree-name">{project.name}</div>
                  <div className="mm-project-tree-meta">
                    <span>
                      <Users size={12} /> {project.topMembers.length}
                    </span>
                    <span>
                      <CheckSquare size={12} /> {project.taskStats.total}
                    </span>
                  </div>
                </div>
                <button
                  className="mm-project-tree-more"
                  onClick={(e) => handleProjectMenu(project, e)}
                >
                  <MoreHorizontal size={20} />
                </button>
                <div className="mm-project-tree-toggle">
                  <ChevronDown size={20} />
                </div>
              </div>

              <div className="mm-project-tree-content">
                {/* 进度条 */}
                <div className="mm-project-tree-progress">
                  <div className="mm-progress-bar">
                    <div
                      className="mm-progress-fill"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="mm-progress-text">{project.progress}%</span>
                </div>

                {/* 任务统计 */}
                <div className="mm-project-tree-stats">
                  <div className="mm-mini-stat">
                    <span className="mm-mini-stat-value">{project.taskStats.todo}</span>
                    <span className="mm-mini-stat-label">待办</span>
                  </div>
                  <div className="mm-mini-stat">
                    <span className="mm-mini-stat-value">{project.taskStats.inProgress}</span>
                    <span className="mm-mini-stat-label">进行中</span>
                  </div>
                  <div className="mm-mini-stat">
                    <span className="mm-mini-stat-value">{project.taskStats.done}</span>
                    <span className="mm-mini-stat-label">已完成</span>
                  </div>
                </div>

                {/* 成员头像 */}
                {project.topMembers.length > 0 && (
                  <div className="mm-project-tree-members">
                    <span className="mm-label">成员</span>
                    <div className="mm-avatar-stack">
                      {project.topMembers.slice(0, 5).map((member) => (
                        <div key={member.userId} className="mm-avatar-stack-item">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} />
                          ) : (
                            member.name.slice(0, 1)
                          )}
                        </div>
                      ))}
                      {project.topMembers.length > 5 && (
                        <div className="mm-avatar-stack-item mm-avatar-more">
                          +{project.topMembers.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="mm-project-tree-actions">
                  <button
                    className="mm-btn mm-btn-secondary mm-btn-sm"
                    onClick={() => navigate(`/projects/${project.projectId}`)}
                  >
                    查看详情
                  </button>
                  <button
                    className="mm-btn mm-btn-primary mm-btn-sm"
                    onClick={() => navigate(`/admin/members-tree?projectId=${project.projectId}`)}
                  >
                    成员任务
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 项目操作菜单 */}
      <SheetModal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={selectedProject?.name || '项目操作'}
      >
        <div className="mm-action-menu">
          <button
            className="mm-action-menu-item"
            onClick={() => {
              setMenuOpen(false);
              navigate(`/projects/${selectedProject?.projectId}`);
            }}
          >
            <Eye size={20} />
            查看详情
          </button>
          <button
            className="mm-action-menu-item"
            onClick={() => {
              setMenuOpen(false);
              navigate(`/projects/${selectedProject?.projectId}/edit`);
            }}
          >
            <Edit size={20} />
            编辑项目
          </button>
          <button
            className="mm-action-menu-item"
            onClick={() => {
              setMenuOpen(false);
              navigate(`/admin/members-tree?projectId=${selectedProject?.projectId}`);
            }}
          >
            <Users size={20} />
            成员任务
          </button>
          <button
            className="mm-action-menu-item danger"
            onClick={handleDeleteProject}
          >
            <Trash2 size={20} />
            删除项目
          </button>
        </div>
      </SheetModal>
    </MobileLayout>
  );
}











