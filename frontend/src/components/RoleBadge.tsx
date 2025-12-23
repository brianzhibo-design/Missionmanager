/**
 * 角色标签组件 - 商务圆点风格
 */

// 支持新旧角色代码
type Role = 'owner' | 'admin' | 'director' | 'leader' | 'manager' | 'member' | 'guest' | 'observer';
type Size = 'xs' | 'sm' | 'md';
type Variant = 'dot' | 'soft';

interface RoleBadgeProps {
  role: Role | string;
  size?: Size;
  variant?: Variant;
  className?: string;
}

// 角色名称映射（江湖风格）
const roleLabels: Record<string, string> = {
  owner: '扛把子',
  admin: '大管家',      // 兼容旧代码
  director: '大管家',
  leader: '堂主',       // 兼容旧代码
  manager: '堂主',
  member: '少侠',
  guest: '吃瓜群侠',    // 兼容旧代码
  observer: '吃瓜群侠',
};

// 尺寸配置
const sizeConfig: Record<Size, { fontSize: string; dotSize: number; gap: number; padding: string }> = {
  xs: { fontSize: '10px', dotSize: 6, gap: 6, padding: '2px 6px' },
  sm: { fontSize: '12px', dotSize: 8, gap: 8, padding: '2px 8px' },
  md: { fontSize: '14px', dotSize: 10, gap: 10, padding: '4px 10px' },
};

// 圆点颜色配置
const dotColorConfig: Record<string, { bg: string; shadow?: string }> = {
  owner: { bg: '#f59e0b', shadow: '0 0 8px -2px rgba(245,158,11,0.6)' },
  admin: { bg: '#f97316', shadow: '0 0 8px -2px rgba(249,115,22,0.6)' },
  director: { bg: '#f97316', shadow: '0 0 8px -2px rgba(249,115,22,0.6)' },
  leader: { bg: '#8b5cf6', shadow: '0 0 6px -2px rgba(139,92,246,0.5)' },
  manager: { bg: '#8b5cf6', shadow: '0 0 6px -2px rgba(139,92,246,0.5)' },
  member: { bg: '#10b981' },
  guest: { bg: '#94a3b8' },
  observer: { bg: '#94a3b8' },
};

// Soft 风格颜色配置
const softColorConfig: Record<string, { bg: string; color: string; border: string }> = {
  owner: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  admin: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  director: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  leader: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  manager: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  member: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  guest: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  observer: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
};

export default function RoleBadge({ 
  role, 
  size = 'sm', 
  variant = 'dot',
  className = '',
}: RoleBadgeProps) {
  const currentSize = sizeConfig[size] || sizeConfig.sm;
  const label = roleLabels[role] || role;

  // Dot 风格（商务圆点 - 默认）
  if (variant === 'dot') {
    const dotColor = dotColorConfig[role] || dotColorConfig.guest;
    return (
      <span 
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: `${currentSize.gap}px`,
          fontSize: currentSize.fontSize,
          fontWeight: 500,
          color: '#475569',
        }}
      >
        <span 
          style={{
            width: currentSize.dotSize,
            height: currentSize.dotSize,
            borderRadius: '50%',
            backgroundColor: dotColor.bg,
            boxShadow: dotColor.shadow,
            flexShrink: 0,
          }}
        />
        {label}
      </span>
    );
  }

  // Soft 风格（柔和微光）
  if (variant === 'soft') {
    const softColor = softColorConfig[role] || softColorConfig.guest;
    return (
      <span 
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: currentSize.padding,
          borderRadius: '6px',
          border: `1px solid ${softColor.border}`,
          fontSize: currentSize.fontSize,
          fontWeight: 500,
          backgroundColor: softColor.bg,
          color: softColor.color,
        }}
      >
        {label}
      </span>
    );
  }

  return null;
}

// 导出角色名称获取函数
export const getRoleName = (role: string): string => {
  return roleLabels[role] || role;
};

// 导出类型供其他组件使用
export type { Role, RoleBadgeProps };




