/**
 * 移动端项目详情页面 - 简约蓝主题
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Crown,
  Check,
  Circle,
  Plus,
  Edit,
  Trash2,
  Share2,
  Loader2,
  Sparkles,
} from '../../components/Icons';
import MobileLayout from '../../components/mobile/MobileLayout';
import SheetModal from '../../components/mobile/SheetModal';
import CreateTaskForm from '../../components/mobile/CreateTaskForm';
import { projectService, Project, ProjectMember } from '../../services/project';
import { taskService, TaskWithProject } from '../../services/task';
import '../../styles/mobile-minimal.css';

// 优先级配置
const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: '紧急', className: 'critical' },
  high: { label: '高', className: 'high' },
  medium: { label: '中', className: 'medium' },
  low: { label: '低', className: 'low' },
};

export default function MobileProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const loadProjectData = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const [projectData, tasksData, membersData] = await Promise.all([
        projectService.getProject(projectId),
        taskService.getMyTasks().then(res => res.tasks.filter(t => t.projectId === projectId)),
        projectService.getTeamMembers(projectId),
      ]);
      setProject(projectData);
      setTasks(tasksData);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleTaskCreated = () => {
    setShowCreateTask(false);
    loadProjectData();
  };

  const handleDeleteProject = async () => {
    if (!projectId || !window.confirm('确定要删除这个项目吗？')) return;

    try {
      await projectService.deleteProject(projectId);
      navigate('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase();
  };

  // 统计数据
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const memberCount = members.length;

  // 按状态分组任务
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const progressTasks = tasks.filter(t => ['in_progress', 'review'].includes(t.status));
  const doneTasks = tasks.filter(t => t.status === 'done');

  if (loading) {
    return (
      <MobileLayout
        headerType="detail"
        headerTitle="项目详情"
        showBottomNav={false}
        headerProps={{ onBack: handleBack }}
      >
        <div className="mm-loading" style={{ marginTop: 100 }}>
          <Loader2 size={24} className="mm-spinner-icon" />
          <span>加载中...</span>
        </div>
      </MobileLayout>
    );
  }

  if (!project) {
    return (
      <MobileLayout
        headerType="detail"
        headerTitle="项目详情"
        showBottomNav={false}
        headerProps={{ onBack: handleBack }}
      >
        <div className="mm-empty-state">
          <div className="mm-empty-title">项目不存在</div>
          <div className="mm-empty-desc">该项目可能已被删除</div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      headerType="detail"
      headerTitle={project.name}
      showBottomNav={false}
      headerProps={{
        onBack: handleBack,
        onMoreClick: () => setShowMenu(true),
      }}
    >
      {/* 项目统计卡片 */}
      <div className="mm-project-stats">
        <div className="mm-stat-card">
          <span className="mm-stat-number">{totalTasks}</span>
          <span className="mm-stat-label">总任务</span>
        </div>
        <div className="mm-stat-card">
          <span className="mm-stat-number">{completedTasks}</span>
          <span className="mm-stat-label">已完成</span>
        </div>
        <div className="mm-stat-card">
          <span className="mm-stat-number">{memberCount}</span>
          <span className="mm-stat-label">成员</span>
        </div>
      </div>

      {/* 项目描述 */}
      {project.description && (
        <div className="mm-detail-section">
          <div className="mm-section-title">项目描述</div>
          <p className="mm-project-description">{project.description}</p>
        </div>
      )}

      {/* 负责人 */}
      {project.leader && (
        <div className="mm-detail-section">
          <div className="mm-section-title">负责人</div>
          <div className="mm-leader-card">
            <div className="mm-leader-avatar">
              {project.leader.avatar ? (
                <img src={project.leader.avatar} alt={project.leader.name} />
              ) : (
                getInitials(project.leader.name)
              )}
            </div>
            <div className="mm-leader-info">
              <div className="mm-leader-name">{project.leader.name}</div>
              <div className="mm-leader-email">{project.leader.email}</div>
            </div>
            <Crown size={18} className="mm-leader-icon" />
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="mm-detail-section">
        <div className="mm-section-header">
          <div className="mm-section-title">任务列表</div>
          <button className="mm-section-action" onClick={() => setShowCreateTask(true)}>
            <Plus size={16} />
            添加
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="mm-empty-inline">
            <span>暂无任务</span>
            <button onClick={() => setShowCreateTask(true)}>创建第一个任务</button>
          </div>
        ) : (
          <>
            {/* 进行中 */}
            {progressTasks.length > 0 && (
              <div className="mm-task-group">
                <div className="mm-task-group-title">进行中 ({progressTasks.length})</div>
                {progressTasks.map((task) => {
                  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                  return (
                    <div
                      key={task.id}
                      className="mm-task-card-mini"
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <Circle size={16} className="mm-task-icon in-progress" />
                      <span className="mm-task-card-title">{task.title}</span>
                      <span className={`mm-task-priority-dot ${priorityConfig.className}`} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* 待办 */}
            {todoTasks.length > 0 && (
              <div className="mm-task-group">
                <div className="mm-task-group-title">待办 ({todoTasks.length})</div>
                {todoTasks.map((task) => {
                  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                  return (
                    <div
                      key={task.id}
                      className="mm-task-card-mini"
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <Circle size={16} className="mm-task-icon" />
                      <span className="mm-task-card-title">{task.title}</span>
                      <span className={`mm-task-priority-dot ${priorityConfig.className}`} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* 已完成 */}
            {doneTasks.length > 0 && (
              <div className="mm-task-group">
                <div className="mm-task-group-title">已完成 ({doneTasks.length})</div>
                {doneTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="mm-task-card-mini done"
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <Check size={16} className="mm-task-icon done" />
                    <span className="mm-task-card-title">{task.title}</span>
                  </div>
                ))}
                {doneTasks.length > 5 && (
                  <div className="mm-task-more">还有 {doneTasks.length - 5} 个已完成任务</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 成员列表 */}
      <div className="mm-detail-section">
        <div className="mm-section-title">项目成员 ({memberCount})</div>
        {members.length > 0 ? (
          <div className="mm-member-list-horizontal">
            {members.map((member) => (
              <div key={member.id} className="mm-member-chip">
                <div className="mm-member-chip-avatar">
                  {member.user.avatar ? (
                    <img src={member.user.avatar} alt={member.user.name} />
                  ) : (
                    getInitials(member.user.name)
                  )}
                </div>
                <span className="mm-member-chip-name">{member.user.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mm-empty-inline">
            <span>暂无成员</span>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="mm-detail-actions">
        <button 
          className="mm-btn mm-btn-secondary"
          onClick={() => navigate(`/projects/${projectId}/edit`)}
        >
          <Edit size={16} />
          编辑项目
        </button>
        <button 
          className="mm-btn mm-btn-primary"
          onClick={() => setShowCreateTask(true)}
        >
          <Plus size={16} />
          添加任务
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
              navigate(`/ai/projects/${projectId}/analysis?type=project`);
            }}
          >
            <Sparkles size={20} />
            AI 分析
          </button>
          <button 
            className="mm-action-menu-item"
            onClick={() => {
              setShowMenu(false);
              navigate(`/projects/${projectId}/edit`);
            }}
          >
            <Edit size={20} />
            编辑项目
          </button>
          <button 
            className="mm-action-menu-item"
            onClick={() => {
              setShowMenu(false);
              // TODO: 分享功能
            }}
          >
            <Share2 size={20} />
            分享项目
          </button>
          <button 
            className="mm-action-menu-item danger"
            onClick={() => {
              setShowMenu(false);
              handleDeleteProject();
            }}
          >
            <Trash2 size={20} />
            删除项目
          </button>
        </div>
      </SheetModal>

      {/* 创建任务弹窗 */}
      <SheetModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        title="新建任务"
        height="80vh"
      >
        <CreateTaskForm
          onSuccess={handleTaskCreated}
          onCancel={() => setShowCreateTask(false)}
          defaultProjectId={projectId}
        />
      </SheetModal>
    </MobileLayout>
  );
}


