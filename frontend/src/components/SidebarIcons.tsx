/**
 * 侧边栏专用图标 - Phosphor Duotone 风格
 * 激活时带有填充效果，未激活时为线框
 */
import React from 'react';

interface IconProps {
  active?: boolean;
  className?: string;
}

// 仪表盘图标
export const DashboardIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="4" y="4" width="7" height="7" rx="1.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
  </svg>
);

// 任务图标
export const TasksIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.12" : "0"} />
    <path d="M9 12L11 14L15 10" />
  </svg>
);

// 项目图标
export const ProjectsIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
    <path d="M2 17L12 22L22 17" />
    <path d="M2 12L12 17L22 12" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
  </svg>
);

// 日报图标
export const ReportsIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path 
      d="M14.5 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V6.5L14.5 2Z" 
      fill={active ? "currentColor" : "none"} 
      fillOpacity={active ? "0.12" : "0"} 
    />
    <path d="M14 2V7H19" />
    <path d="M8 13H16" />
    <path d="M8 17H16" />
    <path d="M8 9H10" />
  </svg>
);

// 成员管理图标
export const MembersIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// 任务树图标
export const TaskTreeIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="9" y="3" width="6" height="5" rx="1" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
    <path d="M12 8v4" />
    <path d="M12 12h-5v3" />
    <path d="M12 12h5v3" />
    <rect x="4" y="15" width="6" height="5" rx="1" />
    <rect x="14" y="15" width="6" height="5" rx="1" />
  </svg>
);

// 项目总览图标
export const OverviewIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 3v18h18" />
    <rect x="7" y="13" width="3" height="5" rx="0.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
    <rect x="12" y="8" width="3" height="10" rx="0.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
    <rect x="17" y="5" width="3" height="13" rx="0.5" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
    <path d="M8.5 13v5" />
    <path d="M13.5 8v10" />
    <path d="M18.5 5v13" />
  </svg>
);

// 报告中心图标
export const ReportCenterIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path 
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" 
      fill={active ? "currentColor" : "none"} 
      fillOpacity={active ? "0.12" : "0"} 
    />
    <path d="M9 15h6" />
    <path d="M9 18h4" />
  </svg>
);

// AI 功能图标 - 渐变效果
export const AIIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none"
    className={className}
  >
    <defs>
      <linearGradient id="ai-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <path 
      d="M12 2L13.5 9L20.5 10.5L13.5 12L12 19L10.5 12L3.5 10.5L10.5 9L12 2Z" 
      fill={active ? "url(#ai-gradient)" : "currentColor"} 
      stroke={active ? "none" : "currentColor"} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fillOpacity={active ? "1" : "0.1"}
    />
    <path 
      d="M19 16L19.5 18.5L22 19L19.5 19.5L19 22L18.5 19.5L16 19L18.5 18.5L19 16Z" 
      fill="currentColor" 
      fillOpacity={active ? "0.7" : "0.4"} 
    />
    <path 
      d="M5 16L5.5 17.5L7 18L5.5 18.5L5 20L4.5 18.5L3 18L4.5 17.5L5 16Z" 
      fill="currentColor" 
      fillOpacity={active ? "0.5" : "0.3"} 
    />
  </svg>
);

// 设置图标
export const SettingsIcon: React.FC<IconProps> = ({ active, className }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="3" fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.15" : "0"} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default {
  DashboardIcon,
  TasksIcon,
  ProjectsIcon,
  ReportsIcon,
  MembersIcon,
  TaskTreeIcon,
  OverviewIcon,
  ReportCenterIcon,
  AIIcon,
  SettingsIcon,
};


