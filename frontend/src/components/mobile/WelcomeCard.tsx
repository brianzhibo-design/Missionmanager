import { Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface WelcomeCardProps {
  userName?: string;
  todayCompleted: number;
  todayTotal: number;
  totalPending?: number;
  streakDays?: number;
}

export default function WelcomeCard({
  userName,
  todayCompleted,
  todayTotal,
  totalPending = 0,
  streakDays = 0,
}: WelcomeCardProps) {
  const { user } = useAuth();
  const displayName = userName || user?.name || '用户';

  return (
    <section className="mm-welcome-section">
      <div className="mm-welcome-card">
        <div className="mm-welcome-header">
          <div>
            <h1 className="mm-welcome-title">Hello, {displayName}</h1>
            <p className="mm-welcome-subtitle">专注的一天开始了</p>
          </div>
          {streakDays > 0 && (
            <div className="mm-streak-badge">
              <Zap size={14} />
              <span>连续 {streakDays} 天</span>
            </div>
          )}
        </div>
        <div className="mm-daily-stats">
          <div className="mm-stat-item">
            <span className="mm-stat-value">{todayCompleted}/{todayTotal}</span>
            <span className="mm-stat-label">今日目标</span>
          </div>
          <div className="mm-stat-item">
            <span className="mm-stat-value">{totalPending}</span>
            <span className="mm-stat-label">待办总数</span>
          </div>
        </div>
      </div>
    </section>
  );
}
