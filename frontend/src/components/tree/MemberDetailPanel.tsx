/**
 * 成员详情面板组件
 */
import { MemberNode } from '../../services/tree';
import { Link } from 'react-router-dom';
import './MemberDetailPanel.css';

interface MemberDetailPanelProps {
  member: MemberNode | null;
  onClose: () => void;
}

const roleLabels: Record<string, string> = {
  project_admin: '项目管理员',
  team_lead: '组长',
  member: '成员',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  todo: { label: '待办', color: 'var(--color-muted)' },
  in_progress: { label: '进行中', color: 'var(--color-info)' },
  review: { label: '审核中', color: 'var(--color-warning)' },
  done: { label: '已完成', color: 'var(--color-success)' },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'var(--color-danger)' },
  high: { label: '高', color: 'var(--color-warning)' },
  medium: { label: '中', color: 'var(--color-info)' },
  low: { label: '低', color: 'var(--color-muted)' },
};

export function MemberDetailPanel({ member, onClose }: MemberDetailPanelProps) {
  if (!member) {
    return (
      <div className="member-detail-panel empty">
        <p>选择一个成员查看详情</p>
      </div>
    );
  }

  const totalSubordinates = countSubordinates(member);

  return (
    <div className="member-detail-panel">
      <div className="panel-header">
        <div className="member-avatar">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="member-info">
          <h3 className="member-name">{member.name}</h3>
          <p className="member-email">{member.email}</p>
          <span className="member-role">{roleLabels[member.role] || member.role}</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-section">
        <h4>📊 任务统计</h4>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{member.taskStats.total}</span>
            <span className="stat-label">总任务</span>
          </div>
          <div className="stat-card done">
            <span className="stat-value">{member.taskStats.done}</span>
            <span className="stat-label">已完成</span>
          </div>
          <div className="stat-card in-progress">
            <span className="stat-value">{member.taskStats.inProgress}</span>
            <span className="stat-label">进行中</span>
          </div>
        </div>
      </div>

      {totalSubordinates > 0 && (
        <div className="panel-section">
          <h4>👥 下属</h4>
          <p className="subordinate-count">共 {totalSubordinates} 人</p>
        </div>
      )}

      <div className="panel-section">
        <h4>📋 任务列表 ({member.tasks.length})</h4>
        {member.tasks.length === 0 ? (
          <p className="empty-text">暂无任务</p>
        ) : (
          <ul className="task-list">
            {member.tasks.map((task) => (
              <li key={task.id} className="task-item">
                <Link to={`/tasks/${task.id}`} className="task-link">
                  <span
                    className="task-status"
                    style={{ backgroundColor: statusLabels[task.status]?.color }}
                  />
                  <span className="task-title">{task.title}</span>
                  <span
                    className="task-priority"
                    style={{ color: priorityLabels[task.priority]?.color }}
                  >
                    {priorityLabels[task.priority]?.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function countSubordinates(member: MemberNode): number {
  let count = member.children.length;
  for (const child of member.children) {
    count += countSubordinates(child);
  }
  return count;
}

