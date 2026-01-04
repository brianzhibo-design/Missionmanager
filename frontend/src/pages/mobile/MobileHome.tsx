import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, Check, Plus } from '../../components/Icons';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import MobileLayout from '../../components/mobile/MobileLayout';
import WelcomeCard from '../../components/mobile/WelcomeCard';
import TaskTimeline from '../../components/mobile/TaskTimeline';
import ChatModal from '../../components/mobile/ChatModal';
import SheetModal from '../../components/mobile/SheetModal';
import { taskService, TaskWithProject } from '../../services/task';
import { workspaceService, Workspace } from '../../services/workspace';

type TimelineStatus = 'todo' | 'in_progress' | 'done';
type TimelinePriority = 'high' | 'medium' | 'low';

// 将后端状态映射到时间轴状态
const mapStatus = (status: string): TimelineStatus => {
  if (status === 'done') return 'done';
  if (status === 'in_progress' || status === 'review') return 'in_progress';
  return 'todo';
};

// 将后端优先级映射到时间轴优先级
const mapPriority = (priority: string): TimelinePriority => {
  if (priority === 'critical' || priority === 'high') return 'high';
  if (priority === 'medium') return 'medium';
  return 'low';
};

export default function MobileHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace, setCurrentWorkspace } = usePermissions();
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  
  // 工作区切换相关状态
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  useEffect(() => {
    loadTodayTasks();

    // 监听任务创建事件，刷新数据
    const handleTaskCreated = () => {
      loadTodayTasks();
    };
    window.addEventListener('task-created', handleTaskCreated);

    return () => {
      window.removeEventListener('task-created', handleTaskCreated);
    };
  }, []);

  const loadTodayTasks = async () => {
    try {
      const data = await taskService.getMyTasks();
      
      // 筛选今日任务
      const today = new Date().toDateString();
      const todayTasks = data.tasks.filter((t) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate).toDateString() === today;
      });
      
      setTasks(todayTasks);
      
      // 计算待办总数（所有未完成的任务）
      const pendingCount = data.tasks.filter((t) => t.status !== 'done').length;
      setTotalPending(pendingCount);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'done').length;

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleTaskToggle = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      // 更新本地状态
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  // 打开工作区切换弹窗
  const handleOpenWorkspaceSwitcher = async () => {
    setWorkspaceSwitcherOpen(true);
    setLoadingWorkspaces(true);
    try {
      const data = await workspaceService.getWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  // 切换工作区
  const handleSwitchWorkspace = (workspace: Workspace) => {
    // 将 Workspace 转换为 WorkspaceWithRole（role 类型转换）
    setCurrentWorkspace({
      ...workspace,
      role: workspace.role as 'owner' | 'director' | 'manager' | 'member' | 'observer',
    });
    setWorkspaceSwitcherOpen(false);
    // 刷新页面数据
    loadTodayTasks();
  };

  return (
    <MobileLayout
      headerType="home"
      headerProps={{
        workspaceName: currentWorkspace?.name || '我的工作区',
        onWorkspaceClick: handleOpenWorkspaceSwitcher,
        onNotificationClick: () => navigate('/notifications'),
        onSearchClick: () => navigate('/search'),
      }}
    >
      <WelcomeCard
        userName={user?.name}
        todayCompleted={completedCount}
        todayTotal={tasks.length}
        totalPending={totalPending}
        streakDays={7}
      />

      {/* 快捷入口 */}
      <div className="mm-quick-actions">
        <button className="mm-quick-action-btn" onClick={() => setChatOpen(true)}>
          <div className="mm-quick-action-icon ai"><span className="text-indigo-500">AI</span></div>
          <span>AI 助手</span>
        </button>
        <button className="mm-quick-action-btn" onClick={() => navigate('/daily-report')}>
          <div className="mm-quick-action-icon report">
            <FileText size={18} />
          </div>
          <span>写日报</span>
        </button>
      </div>

      {loading ? (
        <div className="mm-loading">
          <div className="mm-spinner" />
        </div>
      ) : tasks.length > 0 ? (
        <TaskTimeline
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            time: t.dueDate
              ? new Date(t.dueDate).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : undefined,
            status: mapStatus(t.status),
            priority: mapPriority(t.priority),
            tags: t.project?.name ? [t.project.name] : [],
          }))}
          onTaskClick={handleTaskClick}
          onTaskToggle={handleTaskToggle}
        />
      ) : (
        <div className="mm-empty-state">
          <div className="mm-empty-icon">
            <CheckCircle size={32} />
          </div>
          <div className="mm-empty-title">今日无任务</div>
          <div className="mm-empty-desc">点击下方 + 创建新任务</div>
        </div>
      )}

      <ChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* 工作区切换弹窗 */}
      <SheetModal
        isOpen={workspaceSwitcherOpen}
        onClose={() => setWorkspaceSwitcherOpen(false)}
        title="切换工作区"
        height="50vh"
      >
        <div className="mm-workspace-switcher">
          {loadingWorkspaces ? (
            <div className="mm-loading">
              <div className="mm-spinner" />
            </div>
          ) : (
            <>
              <div className="mm-workspace-list">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    className={`mm-workspace-item ${ws.id === currentWorkspace?.id ? 'active' : ''}`}
                    onClick={() => handleSwitchWorkspace(ws)}
                  >
                    <div 
                      className="mm-workspace-avatar"
                      style={{
                        background: `linear-gradient(135deg, ${
                          ['#6366f1', '#ec4899', '#10b981', '#f97316', '#06b6d4'][
                            ws.name.charCodeAt(0) % 5
                          ]
                        }, ${
                          ['#8b5cf6', '#f43f5e', '#14b8a6', '#f59e0b', '#3b82f6'][
                            ws.name.charCodeAt(0) % 5
                          ]
                        })`
                      }}
                    >
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="mm-workspace-info">
                      <span className="mm-workspace-name">{ws.name}</span>
                      <span className="mm-workspace-role">
                        {ws.role === 'owner' ? '创始人' : 
                         ws.role === 'director' ? '管理员' : 
                         ws.role === 'manager' ? '组长' : '成员'}
                      </span>
                    </div>
                    {ws.id === currentWorkspace?.id && (
                      <Check size={20} className="mm-workspace-check" />
                    )}
                  </button>
                ))}
              </div>
              
              <button 
                className="mm-workspace-create"
                onClick={() => {
                  setWorkspaceSwitcherOpen(false);
                  navigate('/workspace-setup');
                }}
              >
                <div className="mm-workspace-create-icon">
                  <Plus size={18} />
                </div>
                创建新工作区
              </button>
            </>
          )}
        </div>
      </SheetModal>
    </MobileLayout>
  );
}
