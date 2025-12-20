/**
 * 移动端任务列表页面 - 暖阳主题
 * 保留桌面端所有功能，适配移动端交互逻辑
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Check, 
  Circle, 
  ChevronRight, 
  ChevronDown,
  Filter, 
  Loader2,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { MobileLayout, SheetModal } from '../../components/mobile';
import { taskService } from '../../services/task';

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
  done: number;
  overdue: number;
  dueToday: number;
}

type TabType = 'all' | 'today' | 'upcoming' | 'overdue';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: '待办', color: 'var(--warm-text-muted)' },
  in_progress: { label: '进行中', color: 'var(--warm-secondary)' },
  review: { label: '审核中', color: 'var(--warm-warning)' },
  done: { label: '已完成', color: 'var(--warm-success)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: { label: '紧急', className: 'danger' },
  high: { label: '高', className: 'warning' },
  medium: { label: '中', className: '' },
  low: { label: '低', className: '' },
};

export default function MobileTasks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['已逾期', '今天', '明天']);

  // 检查是否有创建任务的参数
  useEffect(() => {
    const action = searchParams.get('action');
    const title = searchParams.get('title');
    if (action === 'create' && title) {
      console.log('Create task with title:', title);
    }
  }, [searchParams]);

  // 加载任务
  const loadTasks = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, statusFilter, priorityFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 切换任务状态
  const handleToggleStatus = async (taskId: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      // 刷新统计数据
      loadTasks(true);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // 任务点击
  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  // 格式化日期
  const formatDueDate = (dateStr: string | null, taskStatus: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

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

  const toggleGroupExpand = (label: string) => {
    setExpandedGroups(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const taskGroups = groupTasksByDate(tasks);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'all', label: '全部', count: stats?.total },
    { key: 'today', label: '今天', count: stats?.dueToday },
    { key: 'upcoming', label: '即将', count: undefined },
    { key: 'overdue', label: '逾期', count: stats?.overdue },
  ];

  // 应用筛选
  const applyFilters = () => {
    setShowFilterSheet(false);
    loadTasks();
  };

  // 清除筛选
  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all';

  return (
    <MobileLayout>
      <div className="m-tasks-page">
        {/* 页面标题和操作 */}
        <div className="m-page-header">
          <h1 className="m-page-title">我的任务</h1>
          <div className="m-header-actions">
            <button 
              className={`m-icon-btn ${refreshing ? 'spinning' : ''}`}
              onClick={() => loadTasks(true)}
              disabled={refreshing}
            >
              <RefreshCw size={18} />
            </button>
            <button 
              className={`m-icon-btn ${hasActiveFilters ? 'active' : ''}`}
              onClick={() => setShowFilterSheet(true)}
            >
              <Filter size={18} />
              {hasActiveFilters && <span className="m-filter-badge" />}
            </button>
          </div>
        </div>

        {/* 任务统计卡片 */}
        {stats && (
          <div className="m-stats-row">
            <div className="m-stat-card">
              <span className="m-stat-value">{stats.total}</span>
              <span className="m-stat-label">全部</span>
            </div>
            <div className="m-stat-card warning">
              <span className="m-stat-value">{stats.todo + stats.inProgress}</span>
              <span className="m-stat-label">进行中</span>
            </div>
            <div className="m-stat-card success">
              <span className="m-stat-value">{stats.done}</span>
              <span className="m-stat-label">已完成</span>
            </div>
            <div className="m-stat-card danger">
              <span className="m-stat-value">{stats.overdue}</span>
              <span className="m-stat-label">逾期</span>
            </div>
          </div>
        )}

        {/* 标签页 */}
        <div className="m-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`m-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="m-tab-badge">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* 任务列表 */}
        <div className="m-task-list">
          {loading ? (
            <div className="m-loading">
              <Loader2 size={24} className="m-spin" />
              <span>加载中...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="m-empty-state">
              <div className="m-empty-icon">📝</div>
              <p className="m-empty-text">暂无任务</p>
              <p className="m-empty-hint">点击下方 + 按钮创建新任务</p>
            </div>
          ) : (
            taskGroups.map(group => (
              <div key={group.label} className="m-task-group">
                {/* 分组标题 */}
                <button
                  className={`m-group-header ${group.highlight ? 'highlight' : ''}`}
                  onClick={() => toggleGroupExpand(group.label)}
                >
                  <span className="m-group-title">
                    {group.label}
                    <span className="m-group-count">{group.tasks.length}</span>
                  </span>
                  {expandedGroups.includes(group.label) ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>

                {/* 任务列表 */}
                {expandedGroups.includes(group.label) && (
                  <div className="m-group-tasks">
                    {group.tasks.map(task => {
                      const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                      const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                      const dueInfo = formatDueDate(task.dueDate, task.status);

                      return (
                        <div 
                          key={task.id} 
                          className={`m-task-item ${task.status === 'done' ? 'completed' : ''}`}
                        >
                          {/* 完成按钮 */}
                          <button
                            className={`m-task-check ${task.status === 'done' ? 'checked' : ''}`}
                            onClick={(e) => handleToggleStatus(task.id, task.status, e)}
                            style={{ borderColor: statusConfig.color }}
                          >
                            {task.status === 'done' ? (
                              <Check size={16} />
                            ) : (
                              <Circle size={16} style={{ color: statusConfig.color }} />
                            )}
                          </button>

                          {/* 任务内容 */}
                          <div 
                            className="m-task-content"
                            onClick={() => handleTaskClick(task.id)}
                          >
                            <div className="m-task-title">{task.title}</div>
                            <div className="m-task-meta">
                              {task.project && (
                                <span className="m-tag project">{task.project.name}</span>
                              )}
                              {task.status !== 'done' && task.status !== 'todo' && (
                                <span className="m-tag" style={{ 
                                  background: `${statusConfig.color}20`, 
                                  color: statusConfig.color 
                                }}>
                                  {statusConfig.label}
                                </span>
                              )}
                              {priorityConfig.label && priorityConfig.className && (
                                <span className={`m-tag ${priorityConfig.className}`}>
                                  {priorityConfig.label}
                                </span>
                              )}
                              {dueInfo && (
                                <span className={`m-task-due ${dueInfo.className}`}>
                                  <Calendar size={12} />
                                  {dueInfo.text}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 箭头 */}
                          <ChevronRight size={18} className="m-task-arrow" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 筛选弹窗 */}
      <SheetModal
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="筛选任务"
      >
        {/* 状态筛选 */}
        <div className="m-filter-section">
          <h4 className="m-filter-label">状态</h4>
          <div className="m-filter-options">
            {[
              { key: 'all', label: '全部' },
              { key: 'todo', label: '待办' },
              { key: 'in_progress', label: '进行中' },
              { key: 'review', label: '审核中' },
              { key: 'done', label: '已完成' },
            ].map(s => (
              <button
                key={s.key}
                className={`m-filter-option ${statusFilter === s.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 优先级筛选 */}
        <div className="m-filter-section">
          <h4 className="m-filter-label">优先级</h4>
          <div className="m-filter-options">
            {[
              { key: 'all', label: '全部' },
              { key: 'urgent', label: '紧急' },
              { key: 'high', label: '高' },
              { key: 'medium', label: '中' },
              { key: 'low', label: '低' },
            ].map(p => (
              <button
                key={p.key}
                className={`m-filter-option ${priorityFilter === p.key ? 'active' : ''}`}
                onClick={() => setPriorityFilter(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="m-filter-actions">
          {hasActiveFilters && (
            <button className="m-btn m-btn-secondary" onClick={clearFilters}>
              清除筛选
            </button>
          )}
          <button className="m-btn m-btn-primary m-btn-block" onClick={applyFilters}>
            应用筛选
          </button>
        </div>
      </SheetModal>
    </MobileLayout>
  );
}
