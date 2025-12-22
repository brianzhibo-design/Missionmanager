import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText } from '../../components/Icons';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import MobileLayout from '../../components/mobile/MobileLayout';
import WelcomeCard from '../../components/mobile/WelcomeCard';
import TaskTimeline from '../../components/mobile/TaskTimeline';
import ChatModal from '../../components/mobile/ChatModal';
import { taskService, TaskWithProject } from '../../services/task';

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
  const { currentWorkspace } = usePermissions();
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

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

  return (
    <MobileLayout
      headerType="home"
      headerProps={{
        workspaceName: currentWorkspace?.name || '我的工作区',
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
          <div className="mm-quick-action-icon ai">✨</div>
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
    </MobileLayout>
  );
}
