import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Inbox, Calendar, AlertCircle, Clock, CalendarDays } from 'lucide-react';
import MobileLayout from '../../components/mobile/MobileLayout';
import { taskService, TaskWithProject } from '../../services/task';
import '../../styles/mobile-minimal.css';

type StatusFilter = 'all' | 'todo' | 'in_progress' | 'done';

interface DateGroup {
  key: string;
  label: string;
  type: 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'nodate';
  tasks: TaskWithProject[];
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待办' },
  { key: 'in_progress', label: '进行中' },
  { key: 'done', label: '已完成' },
];

// 按日期分组任务（今天/明天/本周/以后/已逾期）
const groupTasksByDateRange = (tasks: TaskWithProject[]): DateGroup[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const groups: Record<string, TaskWithProject[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    week: [],
    later: [],
    nodate: [],
  };

  tasks.forEach((task) => {
    if (!task.dueDate) {
      groups.nodate.push(task);
      return;
    }

    const dueDate = new Date(task.dueDate);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (task.status !== 'done' && dueDateOnly < today) {
      groups.overdue.push(task);
    } else if (dueDateOnly.getTime() === today.getTime()) {
      groups.today.push(task);
    } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
      groups.tomorrow.push(task);
    } else if (dueDateOnly < weekEnd) {
      groups.week.push(task);
    } else {
      groups.later.push(task);
    }
  });

  const result: DateGroup[] = [];

  if (groups.overdue.length > 0) {
    result.push({
      key: 'overdue',
      label: '已逾期',
      type: 'overdue',
      tasks: groups.overdue.sort((a, b) => 
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      ),
    });
  }

  if (groups.today.length > 0) {
    result.push({
      key: 'today',
      label: '今天',
      type: 'today',
      tasks: groups.today,
    });
  }

  if (groups.tomorrow.length > 0) {
    result.push({
      key: 'tomorrow',
      label: '明天',
      type: 'tomorrow',
      tasks: groups.tomorrow,
    });
  }

  if (groups.week.length > 0) {
    result.push({
      key: 'week',
      label: '本周',
      type: 'week',
      tasks: groups.week.sort((a, b) => 
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      ),
    });
  }

  if (groups.later.length > 0) {
    result.push({
      key: 'later',
      label: '以后',
      type: 'later',
      tasks: groups.later.sort((a, b) => 
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      ),
    });
  }

  if (groups.nodate.length > 0) {
    result.push({
      key: 'nodate',
      label: '无日期',
      type: 'nodate',
      tasks: groups.nodate,
    });
  }

  return result;
};

// 获取优先级样式
const getPriorityClass = (priority: string): string => {
  switch (priority) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    default:
      return 'low';
  }
};

// 获取优先级标签文字
const getPriorityLabel = (priority: string): string | null => {
  switch (priority) {
    case 'critical':
      return '紧急';
    case 'high':
      return '高优';
    default:
      return null;
  }
};

// 获取分组图标
const getGroupIcon = (type: string) => {
  switch (type) {
    case 'overdue':
      return <AlertCircle size={16} />;
    case 'today':
      return <Clock size={16} />;
    case 'tomorrow':
      return <Calendar size={16} />;
    case 'week':
      return <CalendarDays size={16} />;
    default:
      return <Calendar size={16} />;
  }
};

// 格式化截止时间
const formatDueTime = (dueDate: string | null): string | null => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return null;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export default function MobileTaskList() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const loadTasks = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      const data = await taskService.getMyTasks();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();

    // 监听任务创建事件，刷新数据
    const handleTaskCreated = () => {
      loadTasks();
    };
    window.addEventListener('task-created', handleTaskCreated);

    return () => {
      window.removeEventListener('task-created', handleTaskCreated);
    };
  }, [loadTasks]);

  // 筛选任务
  const filteredTasks = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter((t) => {
      if (activeFilter === 'in_progress') {
        return t.status === 'in_progress' || t.status === 'review';
      }
      return t.status === activeFilter;
    });
  }, [tasks, activeFilter]);

  // 按日期范围分组
  const dateGroups = useMemo(() => groupTasksByDateRange(filteredTasks), [filteredTasks]);

  // 统计数量
  const counts = useMemo(() => {
    const all = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length;
    const done = tasks.filter(t => t.status === 'done').length;
    return { all, todo, in_progress: inProgress, done };
  }, [tasks]);

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleTaskToggle = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'done' ? 'todo' : 'done';

    try {
      await taskService.updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleRefresh = () => {
    loadTasks(true);
  };

  return (
    <MobileLayout
      headerType="list"
      headerTitle="我的任务"
      headerProps={{
        onSearchClick: () => {/* TODO: 搜索功能 */},
        onFilterClick: () => {/* TODO: 筛选功能 */},
      }}
      showBottomNav={true}
    >
      {/* 状态筛选标签栏 */}
      <div className="mm-filter-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`mm-filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
            <span className="mm-filter-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* 下拉刷新提示 */}
      {refreshing && (
        <div className="mm-refresh-indicator">
          <div className="mm-spinner" style={{ width: 20, height: 20 }} />
          <span>刷新中...</span>
        </div>
      )}

      {/* 任务列表 */}
      <div className="mm-task-groups" onClick={handleRefresh}>
        {loading ? (
          <div className="mm-loading">
            <div className="mm-spinner" />
          </div>
        ) : dateGroups.length > 0 ? (
          dateGroups.map((group) => (
            <div key={group.key} className={`mm-task-group ${group.type}`}>
              {/* 分组标题 */}
              <div className="mm-group-header">
                <div className="mm-group-title">
                  {getGroupIcon(group.type)}
                  <span>{group.label}</span>
                </div>
                <span className="mm-group-count">{group.tasks.length}</span>
              </div>

              {/* 任务卡片列表 */}
              <div className="mm-task-cards">
                {group.tasks.map((task) => {
                  const isCompleted = task.status === 'done';
                  const priorityLabel = getPriorityLabel(task.priority);
                  const priorityClass = getPriorityClass(task.priority);
                  const dueTime = formatDueTime(task.dueDate);

                  return (
                    <div
                      key={task.id}
                      className={`mm-task-card ${isCompleted ? 'completed' : ''} ${priorityClass}`}
                      onClick={() => handleTaskClick(task.id)}
                    >
                      {/* 完成按钮 */}
                      <button
                        className={`mm-task-checkbox ${isCompleted ? 'checked' : ''}`}
                        onClick={(e) => handleTaskToggle(e, task.id)}
                      >
                        {isCompleted && <Check size={14} />}
                      </button>

                      {/* 任务内容 */}
                      <div className="mm-task-content">
                        <h3 className="mm-task-title">{task.title}</h3>
                        <div className="mm-task-meta">
                          {priorityLabel && (
                            <span className={`mm-priority-tag ${priorityClass}`}>
                              {priorityLabel}
                            </span>
                          )}
                          {task.project?.name && (
                            <span className="mm-project-tag">{task.project.name}</span>
                          )}
                          {dueTime && (
                            <span className="mm-time-tag">{dueTime}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="mm-empty-state">
            <div className="mm-empty-icon">
              <Inbox size={48} strokeWidth={1.5} />
            </div>
            <div className="mm-empty-title">
              {activeFilter === 'all' ? '暂无任务' : '没有任务'}
            </div>
            <div className="mm-empty-desc">
              {activeFilter === 'all'
                ? '点击下方 + 按钮创建新任务'
                : `没有${STATUS_TABS.find(t => t.key === activeFilter)?.label}的任务`}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
