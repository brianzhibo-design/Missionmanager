import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Folder, Users, ChevronRight } from '../../components/Icons';
import MobileLayout from '../../components/mobile/MobileLayout';
import { projectService, Project } from '../../services/project';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/mobile-minimal.css';

// 项目状态配置
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: '进行中', className: 'active' },
  completed: { label: '已完成', className: 'completed' },
  archived: { label: '已归档', className: 'archived' },
  planning: { label: '规划中', className: 'planning' },
};

export default function MobileProjects() {
  const navigate = useNavigate();
  const { currentWorkspace } = usePermissions();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    try {
      setLoading(true);
      const data = await projectService.getProjects(currentWorkspace.id);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 筛选项目
  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    );
  });

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const getInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase();
  };

  // 截断描述
  const truncateDescription = (text: string | null, maxLength = 60) => {
    if (!text) return '暂无描述';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <MobileLayout
      headerType="list"
      headerTitle="我的项目"
      showHeader={!showSearch}
      headerProps={{
        onSearchClick: () => setShowSearch(true),
      }}
      showBottomNav={true}
    >
      {/* 搜索栏 */}
      {showSearch && (
        <nav className="mm-header">
          <div className="mm-search-bar" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} style={{ color: 'var(--min-text-muted)' }} />
            <input
              type="text"
              className="mm-search-input"
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 16 }}
            />
            <button 
              className="mm-search-cancel"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--min-primary)', fontSize: 15, cursor: 'pointer' }}
            >
              取消
            </button>
          </div>
        </nav>
      )}

      {/* 项目列表 */}
      <div className="mm-project-list">
        {loading ? (
          <div className="mm-loading">
            <div className="mm-spinner" />
          </div>
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map((project) => {
            const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
            const taskCount = project._count?.tasks || 0;

            return (
              <div
                key={project.id}
                className="mm-project-card"
                onClick={() => handleProjectClick(project.id)}
              >
                {/* 项目头部 */}
                <div className="mm-project-header">
                  <div className="mm-project-icon">
                    <Folder size={20} />
                  </div>
                  <div className="mm-project-info">
                    <h3 className="mm-project-name">{project.name}</h3>
                    <span className={`mm-project-status ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <ChevronRight size={20} className="mm-project-arrow" />
                </div>

                {/* 项目描述 */}
                <p className="mm-project-desc">
                  {truncateDescription(project.description)}
                </p>

                {/* 任务统计 */}
                <div className="mm-project-stats">
                  <div className="mm-stat-item">
                    <span className="mm-stat-value">{taskCount}</span>
                    <span className="mm-stat-label">任务</span>
                  </div>
                </div>

                {/* 负责人信息 */}
                <div className="mm-project-footer">
                  <div className="mm-project-members">
                    <Users size={14} />
                    <span>团队项目</span>
                  </div>
                  {project.leader && (
                    <div className="mm-project-leader">
                      <div className="mm-leader-avatar">
                        {getInitials(project.leader.name)}
                      </div>
                      <span>负责人: {project.leader.name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="mm-empty-state">
            <div className="mm-empty-icon">
              <Folder size={48} strokeWidth={1.5} />
            </div>
            <div className="mm-empty-title">
              {searchQuery ? '没有找到项目' : '暂无项目'}
            </div>
            <div className="mm-empty-desc">
              {searchQuery 
                ? '尝试使用其他关键词搜索'
                : '点击下方 + 按钮创建新项目'}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
