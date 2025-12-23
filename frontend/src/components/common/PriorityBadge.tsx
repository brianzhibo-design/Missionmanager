/**
 * 优先级徽章组件
 * 用于显示任务优先级
 */
import React from 'react';
import { PRIORITY_CONFIG, getPriorityLabel } from '../../constants/task';

interface PriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ 
  priority, 
  size = 'md',
  showDot = true,
  className = '' 
}) => {
  const normalized = priority?.toLowerCase() || 'medium';
  const config = PRIORITY_CONFIG[normalized] || PRIORITY_CONFIG.medium;
  const label = getPriorityLabel(priority);

  const sizeClasses = {
    sm: 'priority-badge-sm',
    md: 'priority-badge-md',
    lg: 'priority-badge-lg',
  };

  return (
    <span
      className={`priority-badge ${sizeClasses[size]} ${className}`}
      style={{ color: config.color }}
    >
      {showDot && (
        <span 
          className="priority-dot" 
          style={{ backgroundColor: config.color }}
        />
      )}
      {label}
    </span>
  );
};

export default PriorityBadge;
