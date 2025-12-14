/**
 * 任务统计徽章组件
 */
import { TaskStats } from '../../services/tree';
import './TaskStatsBadge.css';

interface TaskStatsBadgeProps {
  stats: TaskStats;
  compact?: boolean;
}

export function TaskStatsBadge({ stats, compact = false }: TaskStatsBadgeProps) {
  if (compact) {
    return (
      <div className="task-stats-badge compact">
        <span className="stat-total">{stats.total}</span>
      </div>
    );
  }

  return (
    <div className="task-stats-badge">
      {stats.done > 0 && (
        <span className="stat-item done" title="已完成">
          ✅ {stats.done}
        </span>
      )}
      {stats.inProgress > 0 && (
        <span className="stat-item in-progress" title="进行中">
          🔵 {stats.inProgress}
        </span>
      )}
      {stats.todo > 0 && (
        <span className="stat-item todo" title="待办">
          ⚪ {stats.todo}
        </span>
      )}
      {stats.review > 0 && (
        <span className="stat-item review" title="审核中">
          🟡 {stats.review}
        </span>
      )}
    </div>
  );
}

