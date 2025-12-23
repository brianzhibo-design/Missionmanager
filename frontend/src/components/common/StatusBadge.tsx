/**
 * 状态徽章组件
 * 用于显示任务状态
 */
import React from 'react';
import { STATUS_CONFIG, getStatusLabel } from '../../constants/task';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  className = '' 
}) => {
  const normalized = status?.toLowerCase() || 'todo';
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.todo;
  const label = getStatusLabel(status);

  const sizeClasses = {
    sm: 'status-badge-sm',
    md: 'status-badge-md',
    lg: 'status-badge-lg',
  };

  return (
    <span
      className={`status-badge ${sizeClasses[size]} ${className}`}
      style={{
        color: config.color,
        backgroundColor: config.bg,
      }}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
