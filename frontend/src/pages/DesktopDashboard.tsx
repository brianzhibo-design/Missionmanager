import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Sparkles,
  TrendingUp,
  FolderKanban,
  Loader2
} from 'lucide-react';
import { aiService, DailySuggestions } from '../services/ai';
import { taskService } from '../services/task';
import { projectService } from '../services/project';
import { usePermissions } from '../hooks/usePermissions';
import './Dashboard.css';

interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  project?: { name: string };
}

// 优先级中文映射
const PRIORITY_LABELS: Record<string, string> = {
  URGENT: '紧急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

export default function DesktopDashboard() {
  const navigate = useNavigate();
  const { currentWorkspace, canWorkspace } = usePermissions();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<DailySuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const today = new Date().toLocaleDateString('zh-CN', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });

  // 加载基础数据（项目和任务）
  const loadDashboard = useCallback(async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      
      // 加载项目和我的任务
      const [projectsRes, tasksRes] = await Promise.all([
        projectService.getProjects(currentWorkspace.id),
        taskService.getMyTasks(),
      ]);

      // 从项目统计中汇总任务数据（显示工作区全部任务）
      const projectStats = (projectsRes as any[]).reduce((acc, project) => {
        const stats = project.taskStats || {};
        return {
          total: acc.total + (stats.total || 0),
          done: acc.done + (stats.done || 0),
          inProgress: acc.inProgress + (stats.inProgress || 0),
          todo: acc.todo + (stats.todo || 0),
          blocked: acc.blocked + (stats.blocked || 0),
        };
      }, { total: 0, done: 0, inProgress: 0, todo: 0, blocked: 0 });

      // 我的任务（用于显示最近任务）
      const myTasks = tasksRes.tasks || [];
      // 完成状态的所有可能值
      const doneStatuses = ['DONE', 'done', '已完成', 'completed'];
      const myOverdueTasks = myTasks.filter((t: RecentTask) => 
        t.dueDate && new Date(t.dueDate) < new Date() && !doneStatuses.includes(t.status)
      ).length;

      setStats({
        totalProjects: projectsRes.length || 0,
        totalTasks: projectStats.total,
        completedTasks: projectStats.done,
        overdueTasks: myOverdueTasks,
        inProgressTasks: projectStats.inProgress,
      });

      // 最近 5 个我的任务
      setRecentTasks(myTasks.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  // 单独加载AI建议（非阻塞）
  const loadAiSuggestions = useCallback(async () => {
    try {
      setAiLoading(true);
      const suggestions = await aiService.getDailySuggestions();
      setAiSuggestions(suggestions);
    } catch (e) {
      console.log('AI suggestions not available');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // 加载基础数据
  useEffect(() => {
    if (currentWorkspace) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [currentWorkspace, loadDashboard]);

  // 延迟加载AI建议（不阻塞主界面）
  useEffect(() => {
    if (currentWorkspace && !loading) {
      loadAiSuggestions();
    }
  }, [currentWorkspace, loading, loadAiSuggestions]);

  const completionRate = stats && stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  // 没有工作区时显示提示
  if (!currentWorkspace) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <h2>欢迎使用 TaskFlow</h2>
          <p>请先选择或创建一个工作区</p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            前往项目页面
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader2 className="spin" size={24} />
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* 顶部欢迎区 */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-greeting">{greeting}</h1>
          <p className="dashboard-date">{today}</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-ghost" onClick={() => navigate('/my-tasks')}>
            查看任务
            <ArrowRight size={16} />
          </button>
          {canWorkspace('createTask') && (
            <button className="btn-primary" onClick={() => navigate('/projects')}>
              <Plus size={16} />
              新建任务
            </button>
          )}
        </div>
      </header>

      {/* 统计卡片 */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">项目总数</span>
            <FolderKanban size={16} className="stat-icon" />
          </div>
          <div className="stat-value">{stats?.totalProjects || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">任务总数</span>
            <CheckCircle2 size={16} className="stat-icon" />
          </div>
          <div className="stat-value">{stats?.totalTasks || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">完成率</span>
            <TrendingUp size={16} className="stat-icon" />
          </div>
          <div className="stat-value">{completionRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">已逾期</span>
            <AlertCircle size={16} className="stat-icon" />
          </div>
          <div className="stat-value stat-danger">{stats?.overdueTasks || 0}</div>
        </div>
      </section>

      {/* AI 建议区 */}
      <section className="ai-section">
        <div className="section-header">
          <Sparkles size={16} className="section-icon" />
          <h2 className="section-title">AI 智能建议</h2>
          {aiLoading && <Loader2 size={14} className="spin ai-loading-icon" />}
        </div>
        
        {aiLoading && !aiSuggestions ? (
          <div className="ai-loading-placeholder">
            <div className="loading-shimmer" />
            <div className="loading-shimmer short" />
          </div>
        ) : aiSuggestions ? (
          <div className="ai-insights-list">
            {aiSuggestions.focusTask && (
              <div className="insight-item insight-focus">
                <div className="insight-indicator" />
                <div className="insight-content">
                  <span className="insight-label">今日重点</span>
                  <p className="insight-text">{aiSuggestions.focusTask.taskTitle}</p>
                  <span className="insight-reason">{aiSuggestions.focusTask.reason}</span>
                </div>
              </div>
            )}
            
            {aiSuggestions.insights?.slice(0, 3).map((insight: any, i: number) => (
              <div key={i} className={`insight-item insight-${insight.type}`}>
                <div className="insight-indicator" />
                <div className="insight-content">
                  <span className="insight-label">{insight.title}</span>
                  <p className="insight-text">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ai-empty-hint">
            AI 建议暂不可用
          </div>
        )}
      </section>

      {/* 最近任务 */}
      <section className="recent-section">
        <div className="section-header">
          <Clock size={16} className="section-icon" />
          <h2 className="section-title">最近任务</h2>
          <button className="btn-text" onClick={() => navigate('/my-tasks')}>
            查看全部
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="task-list">
          {recentTasks.length === 0 ? (
            <div className="empty-state">
              <p>暂无任务，创建您的第一个任务开始吧。</p>
            </div>
          ) : (
            recentTasks.map(task => (
              <div 
                key={task.id} 
                className="task-item"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className={`task-status-dot status-${task.status.toLowerCase()}`} />
                <div className="task-info">
                  <span className="task-title">{task.title}</span>
                  <span className="task-project">{task.project?.name || '无项目'}</span>
                </div>
                <span className={`task-priority priority-${task.priority.toLowerCase()}`}>
                  {PRIORITY_LABELS[task.priority] || task.priority}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
