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
  admin: '大管家',
  director: '大管家',
  leader: '带头大哥',
  manager: '带头大哥',
  member: '少侠',
  guest: '吃瓜群侠',
  observer: '吃瓜群侠',
};

// 尺寸配置
const sizeConfig = {
  xs: { text: 'text-[10px]', dot: 'w-1.5 h-1.5', gap: 'gap-1.5', padding: 'px-1.5 py-0.5' },
  sm: { text: 'text-xs', dot: 'w-2 h-2', gap: 'gap-2', padding: 'px-2 py-0.5' },
  md: { text: 'text-sm', dot: 'w-2.5 h-2.5', gap: 'gap-2.5', padding: 'px-2.5 py-1' },
};

// Dot 风格圆点颜色
const dotColors: Record<string, string> = {
  owner: 'bg-amber-500 shadow-[0_0_8px_-2px_rgba(245,158,11,0.6)]',
  admin: 'bg-orange-500 shadow-[0_0_8px_-2px_rgba(249,115,22,0.6)]',
  director: 'bg-orange-500 shadow-[0_0_8px_-2px_rgba(249,115,22,0.6)]',
  leader: 'bg-violet-500 shadow-[0_0_6px_-2px_rgba(139,92,246,0.5)]',
  manager: 'bg-violet-500 shadow-[0_0_6px_-2px_rgba(139,92,246,0.5)]',
  member: 'bg-emerald-500',
  guest: 'bg-slate-400',
  observer: 'bg-slate-400',
};

// Soft 风格颜色
const softColors: Record<string, string> = {
  owner: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-orange-50 text-orange-700 border-orange-200',
  director: 'bg-orange-50 text-orange-700 border-orange-200',
  leader: 'bg-violet-50 text-violet-700 border-violet-200',
  manager: 'bg-violet-50 text-violet-700 border-violet-200',
  member: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  guest: 'bg-slate-100 text-slate-600 border-slate-200',
  observer: 'bg-slate-100 text-slate-600 border-slate-200',
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
    const dotClass = dotColors[role] || dotColors.guest;
    return (
      <span className={`inline-flex items-center ${currentSize.gap} font-medium text-slate-700 dark:text-slate-300 ${currentSize.text} transition-opacity hover:opacity-80 ${className}`}>
        <span className={`rounded-full flex-shrink-0 ${currentSize.dot} ${dotClass}`} />
        {label}
      </span>
    );
  }

  // Soft 风格（柔和微光）
  if (variant === 'soft') {
    const colorClass = softColors[role] || softColors.guest;
    return (
      <span className={`inline-flex items-center ${currentSize.padding} rounded-md border ${currentSize.text} font-medium ${colorClass} ${className}`}>
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
