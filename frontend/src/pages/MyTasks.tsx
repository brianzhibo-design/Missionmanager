import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  ClipboardList, 
  AlertCircle, 
  Calendar, 
  RefreshCw, 
  CheckSquare,
  Circle,
  Inbox
} from 'lucide-react';
import { taskService } from '../services/task';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileTaskList from './mobile/MobileTaskList';
import './MyTasks.css';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project?: { id: string; name: string };
}

interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  blocked: number;
  done: number;
  overdue: number;
  dueToday: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  todo: { label: '待办', color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  in_progress: { label: '进行中', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  review: { label: '审核中', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  done: { label: '已完成', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  urgent: { label: '紧急', color: 'var(--color-danger)', border: 'var(--color-danger)' },
  high: { label: '高', color: 'var(--color-warning)', border: 'var(--color-warning)' },
  medium: { label: '中', color: 'var(--color-info)', border: 'var(--color-info)' },
  low: { label: '低', color: 'var(--text-tertiary)', border: 'var(--text-tertiary)' },
};

type TabType = 'all' | 'today' | 'upcoming' | 'overdue';

export default function MyTasks() {
  const isMobile = useIsMobile();

  // 移动端：渲染简约蓝主题任务列表
  if (isMobile) {
    return <MobileTaskList />;
  }

  return <DesktopMyTasks />;
}

function DesktopMyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: Record<string, string> = {};
      
      if (activeTab === 'today') filters.dueFilter = 'today';
      else if (activeTab === 'upcoming') filters.dueFilter = 'upcoming';
      else if (activeTab === 'overdue') filters.dueFilter = 'overdue';
      
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;

      const response = await taskService.getMyTasks(filters);
      setTasks(response.tasks || []);
      setStats(response.stats || null);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, priorityFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const formatDueDate = (dateStr: string | null, taskStatus: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    // 已完成的任务不显示逾期状态
    if (taskStatus === 'done') {
      return { text: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }), className: 'completed' };
    }

    if (date < today) return { text: '已逾期', className: 'overdue' };
    if (date.getTime() === today.getTime()) return { text: '今天', className: 'today' };
    if (date.getTime() === tomorrow.getTime()) return { text: '明天', className: 'tomorrow' };
    return { text: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }), className: '' };
  };

  // 按日期分组任务
  const groupTasksByDate = (tasks: Task[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const groups: { label: string; tasks: Task[]; highlight?: boolean }[] = [
      { label: '已逾期', tasks: [], highlight: true },
      { label: '今天', tasks: [], highlight: true },
      { label: '明天', tasks: [] },
      { label: '本周', tasks: [] },
      { label: '更晚', tasks: [] },
      { label: '已完成', tasks: [] },
      { label: '未设置日期', tasks: [] },
    ];

    tasks.forEach(task => {
      // 已完成的任务单独分组
      if (task.status === 'done') {
        groups[5].tasks.push(task);
        return;
      }

      if (!task.dueDate) {
        groups[6].tasks.push(task);
        return;
      }

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        groups[0].tasks.push(task);
      } else if (dueDate.getTime() === today.getTime()) {
        groups[1].tasks.push(task);
      } else if (dueDate.getTime() === tomorrow.getTime()) {
        groups[2].tasks.push(task);
      } else if (dueDate < nextWeek) {
        groups[3].tasks.push(task);
      } else {
        groups[4].tasks.push(task);
      }
    });

    return groups.filter(g => g.tasks.length > 0);
  };

  const taskGroups = groupTasksByDate(tasks);
  const tabs = [
    { key: 'all' as TabType, label: '全部', count: stats?.total || 0 },
    { key: 'today' as TabType, label: '今日到期', count: stats?.dueToday || 0 },
    { key: 'upcoming' as TabType, label: '即将到期', count: null },
    { key: 'overdue' as TabType, label: '已逾期', count: stats?.overdue || 0 },
  ];

  if (loading && tasks.length === 0) {
    return (
      <div className="my-tasks-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-tasks-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon icon-green"><CheckCircle2 size={28} /></div>
          <div className="header-text">
            <h1>我的任务</h1>
            <p>管理和跟踪您的所有任务</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="quick-stat-card">
          <span className="quick-stat-icon"><ClipboardList size={20} /></span>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{stats?.total || 0}</span>
            <span className="quick-stat-label">总任务</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <span className="quick-stat-icon"><AlertCircle size={20} /></span>
          <div className="quick-stat-content">
            <span className="quick-stat-value danger">{stats?.overdue || 0}</span>
            <span className="quick-stat-label">已逾期</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <span className="quick-stat-icon"><Calendar size={20} /></span>
          <div className="quick-stat-content">
            <span className="quick-stat-value warning">{stats?.dueToday || 0}</span>
            <span className="quick-stat-label">今日到期</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <span className="quick-stat-icon"><RefreshCw size={20} /></span>
          <div className="quick-stat-content">
            <span className="quick-stat-value info">{stats?.inProgress || 0}</span>
            <span className="quick-stat-label">进行中</span>
          </div>
        </div>
        <div className="quick-stat-card">
          <span className="quick-stat-icon"><CheckSquare size={20} /></span>
          <div className="quick-stat-content">
            <span className="quick-stat-value success">{stats?.done || 0}</span>
            <span className="quick-stat-label">已完成</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        
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
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-card">
          <span className="error-icon"><AlertCircle size={16} /></span>
          <span className="error-text">{error}</span>
          <button className="btn btn-sm btn-secondary" onClick={loadTasks}>重试</button>
        </div>
      )}

      {/* Task Groups */}
      {tasks.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon"><Inbox size={48} /></span>
          <h3 className="empty-state-title">暂无任务</h3>
          <p className="empty-state-description">您当前没有分配的任务</p>
        </div>
      ) : (
        <div className="task-groups">
          {taskGroups.map((group, index) => (
            <div key={index} className="task-group">
              <h3 className={`group-title ${group.highlight ? 'highlight' : ''}`}>
                {group.label}
                <span className="group-count">{group.tasks.length}</span>
              </h3>
              <div className="task-list">
                {group.tasks.map(task => {
                  const dueInfo = formatDueDate(task.dueDate, task.status);
                  const priorityConfig = PRIORITY_CONFIG[task.priority];
                  
                  return (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className={`task-card ${task.status === 'done' ? 'is-done' : ''}`}
                      style={{ borderLeftColor: priorityConfig?.border }}
                    >
                      <div className="task-card-content">
                        <span className="task-priority-icon"><Circle size={10} fill={priorityConfig?.color} color={priorityConfig?.color} /></span>
                        <div className="task-info">
                          <span className="task-title">{task.title}</span>
                          <span className="task-project">{task.project?.name || '未分配项目'}</span>
                        </div>
                      </div>
                      <div className="task-card-meta">
                        {dueInfo && (
                          <span className={`task-due ${dueInfo.className}`}>
                            {dueInfo.text}
                          </span>
                        )}
                        <span className={`task-status status-${task.status}`}>
                          {STATUS_CONFIG[task.status]?.label || task.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
