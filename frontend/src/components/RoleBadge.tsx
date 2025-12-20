/**
 * 角色标签组件 - 统一全局角色显示样式
 */
import React from 'react';
import './RoleBadge.css';

// 支持新旧角色代码
type Role = 'owner' | 'admin' | 'director' | 'leader' | 'manager' | 'member' | 'guest' | 'observer';

interface RoleBadgeProps {
  role: Role | string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'soft';
  className?: string;
}

// 角色配置 - 与 ROLE_LABELS 保持一致
const roleConfig: Record<string, { 
  name: string; 
  solidBg: string; 
  solidColor: string;
  softBg: string; 
  softColor: string; 
  softBorder: string;
}> = {
  // 新角色体系
  owner: {
    name: '扛把子',
    solidBg: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    solidColor: '#fff',
    softBg: '#fef3c7',
    softColor: '#b45309',
    softBorder: '#fde68a',
  },
  admin: {
    name: '大管家',
    solidBg: 'linear-gradient(135deg, #f97316, #ea580c)',
    solidColor: '#fff',
    softBg: '#fef3c7',
    softColor: '#d97706',
    softBorder: '#fde68a',
  },
  leader: {
    name: '带头大哥',
    solidBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    solidColor: '#fff',
    softBg: '#ede9fe',
    softColor: '#7c3aed',
    softBorder: '#ddd6fe',
  },
  member: {
    name: '少侠',
    solidBg: 'linear-gradient(135deg, #10b981, #059669)',
    solidColor: '#fff',
    softBg: '#d1fae5',
    softColor: '#059669',
    softBorder: '#a7f3d0',
  },
  guest: {
    name: '吃瓜群侠',
    solidBg: '#64748b',
    solidColor: '#fff',
    softBg: '#f1f5f9',
    softColor: '#64748b',
    softBorder: '#e2e8f0',
  },
  // 兼容旧角色代码
  director: {
    name: '大管家',
    solidBg: 'linear-gradient(135deg, #f97316, #ea580c)',
    solidColor: '#fff',
    softBg: '#fef3c7',
    softColor: '#d97706',
    softBorder: '#fde68a',
  },
  manager: {
    name: '带头大哥',
    solidBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    solidColor: '#fff',
    softBg: '#ede9fe',
    softColor: '#7c3aed',
    softBorder: '#ddd6fe',
  },
  observer: {
    name: '吃瓜群侠',
    solidBg: '#64748b',
    solidColor: '#fff',
    softBg: '#f1f5f9',
    softColor: '#64748b',
    softBorder: '#e2e8f0',
  },
};

export default function RoleBadge({ 
  role, 
  size = 'sm', 
  variant = 'solid',
  className = '',
}: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig.guest;
  
  const sizeClasses = {
    sm: 'role-badge-sm',
    md: 'role-badge-md',
    lg: 'role-badge-lg',
  };

  const style: React.CSSProperties = variant === 'solid' 
    ? {
        background: config.solidBg,
        color: config.solidColor,
      }
    : {
        background: config.softBg,
        color: config.softColor,
        borderColor: config.softBorder,
      };

  return (
    <span 
      className={`role-badge ${sizeClasses[size]} role-badge-${variant} ${className}`}
      style={style}
    >
      {config.name}
    </span>
  );
}

// 导出角色名称映射，供其他组件使用
export const getRoleName = (role: string): string => {
  return roleConfig[role]?.name || role;
};
