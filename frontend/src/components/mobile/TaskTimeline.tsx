import { Check } from '../Icons';

interface Task {
  id: string;
  title: string;
  time?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
}

interface TaskTimelineProps {
  tasks: Task[];
  title?: string;
  filterLabel?: string;
  onTaskClick?: (taskId: string) => void;
  onTaskToggle?: (taskId: string) => void;
}

export default function TaskTimeline({
  tasks,
  title = 'Timeline',
  filterLabel = 'Today',
  onTaskClick,
  onTaskToggle,
}: TaskTimelineProps) {
  const getTimelineItemClass = (status: Task['status']) => {
    if (status === 'in_progress') return 'active';
    if (status === 'done') return 'done';
    return '';
  };

  const getStatusDotClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'mm-dot-red';
      case 'medium':
        return 'mm-dot-yellow';
      case 'low':
      default:
        return 'mm-dot-blue';
    }
  };

  const getPriorityTag = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return { label: '紧急', className: 'danger' };
      case 'medium':
        return { label: '重点', className: 'warning' };
      default:
        return null;
    }
  };

  const handleCardClick = (taskId: string) => {
    onTaskClick?.(taskId);
  };

  const handleToggleClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    onTaskToggle?.(taskId);
  };

  return (
    <section className="mm-section">
      <div className="mm-section-header">
        <h2 className="mm-section-title">{title}</h2>
        <span className="mm-section-filter">{filterLabel}</span>
      </div>
      <div className="mm-timeline">
        {tasks.map((task) => {
          const priorityTag = getPriorityTag(task.priority);
          const isCompleted = task.status === 'done';

          return (
            <div
              key={task.id}
              className={`mm-timeline-item ${getTimelineItemClass(task.status)}`}
            >
              <div className="mm-timeline-dot" />
              <div
                className={`mm-task-card ${isCompleted ? 'completed' : ''}`}
                onClick={() => handleCardClick(task.id)}
              >
                <div className="mm-task-header">
                  <div>
                    {task.time && (
                      <span className="mm-task-time">{task.time}</span>
                    )}
                    <h3 className="mm-task-title">
                      <span className={`mm-status-dot ${getStatusDotClass(task.priority)}`} />
                      {task.title}
                    </h3>
                  </div>
                  <button
                    className="mm-checkbox"
                    onClick={(e) => handleToggleClick(e, task.id)}
                  >
                    {isCompleted && <Check size={14} />}
                  </button>
                </div>
                <div className="mm-task-footer">
                  <div className="mm-task-tags">
                    {priorityTag && (
                      <span className={`mm-tag ${priorityTag.className}`}>
                        {priorityTag.label}
                      </span>
                    )}
                    {task.tags?.map((tag, index) => (
                      <span key={index} className="mm-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
