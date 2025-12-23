// 工作区角色（从高到低）
// owner (扛把子) = 工作区创始人
// director (大管家) = 总监/主管
// manager (堂主) = 项目经理/组长
// member (少侠) = 普通成员
// observer (吃瓜) = 观察者
export type WorkspaceRole = 'owner' | 'director' | 'manager' | 'member' | 'observer';

// 角色层级（用于权限比较）
export const WORKSPACE_ROLE_HIERARCHY = ['observer', 'member', 'manager', 'director', 'owner'];

// 兼容旧角色代码（向后兼容）
export const ROLE_MAPPING: Record<string, WorkspaceRole> = {
  // 旧角色 -> 新角色
  admin: 'director',      // admin 映射到 director
  leader: 'manager',      // leader 映射到 manager
  guest: 'observer',      // guest 映射到 observer
  super_admin: 'director',
  // 角色保持不变
  owner: 'owner',
  director: 'director',
  manager: 'manager',
  member: 'member',
  observer: 'observer',
};

// 权限定义
// owner (扛把子) = 工作区创始人，拥有所有权限
// director (大管家) = 总监/主管，管理多个项目
// manager (堂主) = 项目经理/组长
// member (少侠) = 普通成员
// observer (吃瓜) = 观察者，只读权限
export const PERMISSIONS = {
  // 工作区级别权限
  workspace: {
    // === 组织管理 ===
    // 可以创建新工作区（任何已登录用户）
    createWorkspace: ['owner', 'director', 'manager', 'member', 'observer'],
    // 可以管理工作区设置（删除、重命名等）- 仅扛把子
    manage: ['owner'],
    // 可以解散工作区 - 仅扛把子
    dissolve: ['owner'],
    
    // === 人事管理 ===
    // 可以邀请成员 (owner/director/manager)
    invite: ['owner', 'director', 'manager'],
    // 可以设置角色 (owner 全部, director ≤manager)
    manageAllRoles: ['owner', 'director'],
    // 可以移除成员 (owner 全部, director ≤manager)
    removeMember: ['owner', 'director'],
    // 可以查看成员
    viewMembers: ['owner', 'director', 'manager', 'member', 'observer'],
    // 可以管理成员（邀请、修改角色、移除）
    manageMembers: ['owner', 'director'],
    
    // === 项目管理 ===
    // 可以创建项目 (owner/director/manager/member)
    createProject: ['owner', 'director', 'manager', 'member'],
    // 可以编辑项目 (owner/director 全部, manager 自己的)
    editProject: ['owner', 'director'],
    // 可以删除项目 (owner/director)
    deleteProject: ['owner', 'director'],
    
    // === 任务管理 ===
    // 可以创建任务 (owner/director/manager/member)
    createTask: ['owner', 'director', 'manager', 'member'],
    // 可以编辑任务 (owner/director/manager 全部, member 自己的)
    editTask: ['owner', 'director', 'manager', 'member'],
    // 可以删除任务 (owner/director/manager)
    deleteTask: ['owner', 'director', 'manager'],
    // 可以分配任务 (owner/director/manager)
    assignTask: ['owner', 'director', 'manager'],
    
    // === 数据访问 ===
    // 可以访问管理员视图 (owner/director 完整, manager 只读)
    adminTree: ['owner', 'director', 'manager'],
    // 可以查看统计报告 (owner/director 全部, manager 团队, member 自己)
    viewReports: ['owner', 'director', 'manager', 'member'],
    // 可以查看团队日报 (owner/director 全部, manager 下属)
    viewTeamReports: ['owner', 'director', 'manager'],
    
    // === AI 功能 ===
    // 可以使用 AI 全局分析 (owner/director)
    aiGlobalAnalysis: ['owner', 'director'],
    // 可以使用 AI 项目分析 (owner/director/manager)
    aiProjectAnalysis: ['owner', 'director', 'manager'],
    // 可以使用 AI 任务分析 (owner/director/manager/member)
    aiTaskAnalysis: ['owner', 'director', 'manager', 'member'],
    // 可以查看 AI 洞察
    viewAiInsights: ['owner', 'director', 'manager'],
    
    // === 日常操作 ===
    // 可以填写日报 (除 observer 外)
    writeDailyReport: ['owner', 'director', 'manager', 'member'],
    // 可以评论 (所有角色)
    comment: ['owner', 'director', 'manager', 'member', 'observer'],
    
    // === 特殊功能 ===
    // 可以群发消息 (owner/director)
    broadcast: ['owner', 'director'],
    // 可以发起咖啡抽奖 (owner/director)
    coffeeLottery: ['owner', 'director'],
    // 可以导出数据 (owner/director)
    exportData: ['owner', 'director'],
  },
} as const;

// 检查工作区权限（支持旧角色代码自动映射）
export function hasWorkspacePermission(
  role: WorkspaceRole | string | undefined,
  permission: keyof typeof PERMISSIONS.workspace
): boolean {
  if (!role) return false;
  // 映射旧角色代码到新角色代码
  const mappedRole = ROLE_MAPPING[role] || role;
  return (PERMISSIONS.workspace[permission] as readonly string[]).includes(mappedRole);
}

// 检查项目权限（基于工作区角色 + 是否项目负责人）
export function hasProjectPermission(
  workspaceRole: WorkspaceRole | string | undefined,
  isProjectLeader: boolean,
  permission: 'editProject' | 'deleteProject' | 'addMember' | 'editTask' | 'deleteTask' | 'assignTask' | 'adminTree' | 'viewReports' | 'viewTeamReports' | 'aiProjectAnalysis'
): boolean {
  if (!workspaceRole) return false;
  const mappedRole = ROLE_MAPPING[workspaceRole] || workspaceRole;

  // 项目负责人有额外的项目权限
  if (isProjectLeader) {
    switch (permission) {
      case 'editProject':
      case 'addMember':
      case 'editTask':
      case 'deleteTask':
      case 'assignTask':
      case 'adminTree':
      case 'viewReports':
      case 'viewTeamReports':
      case 'aiProjectAnalysis':
        return true; // 项目负责人有这些权限
      default:
        break;
    }
  }

  // 工作区角色权限
  switch (permission) {
    case 'editProject':
      // owner/director 全部，manager 自己的（通过 isProjectLeader）
      return ['owner', 'director'].includes(mappedRole);
    case 'deleteProject':
      return ['owner', 'director'].includes(mappedRole);
    case 'addMember':
      return ['owner', 'director'].includes(mappedRole) || isProjectLeader;
    case 'editTask':
      // owner/director/manager 全部，member 自己的（由 taskService 控制）
      return ['owner', 'director', 'manager', 'member'].includes(mappedRole) || isProjectLeader;
    case 'deleteTask':
      return ['owner', 'director', 'manager'].includes(mappedRole) || isProjectLeader;
    case 'assignTask':
      return ['owner', 'director', 'manager'].includes(mappedRole) || isProjectLeader;
    case 'adminTree':
      // owner/director 完整，manager 只读
      return ['owner', 'director', 'manager'].includes(mappedRole) || isProjectLeader;
    case 'viewReports':
      // owner/director 全部，manager 团队，member 自己
      return ['owner', 'director', 'manager', 'member'].includes(mappedRole) || isProjectLeader;
    case 'viewTeamReports':
      // owner/director 全部，manager 下属
      return ['owner', 'director', 'manager'].includes(mappedRole) || isProjectLeader;
    case 'aiProjectAnalysis':
      return ['owner', 'director', 'manager'].includes(mappedRole) || isProjectLeader;
    default:
      return false;
  }
}

// 比较角色层级（支持旧角色代码自动映射）
export function compareWorkspaceRoles(role1: string, role2: string): number {
  const mappedRole1 = ROLE_MAPPING[role1] || role1;
  const mappedRole2 = ROLE_MAPPING[role2] || role2;
  const index1 = WORKSPACE_ROLE_HIERARCHY.indexOf(mappedRole1);
  const index2 = WORKSPACE_ROLE_HIERARCHY.indexOf(mappedRole2);
  return index1 - index2;
}

// 角色显示名称（江湖风格命名）
export const ROLE_LABELS: Record<string, string> = {
  // 工作区角色
  owner: '扛把子',      // 工作区创始人，最高权限
  director: '大管家',   // 高管/VP，全局管理
  manager: '带头大哥',  // 经理/主管，团队管理
  member: '少侠',       // 普通员工，执行任务
  observer: '吃瓜群侠', // 观察者，只读权限
  // 兼容旧角色代码
  admin: '大管家',      // 映射到 director
  leader: '带头大哥',   // 映射到 manager
  guest: '吃瓜群侠',    // 映射到 observer
  super_admin: '大管家',
};

// 项目负责人标记显示
export const PROJECT_LEADER_LABEL = '项目负责人';

// 角色图标
export const ROLE_ICONS: Record<string, string> = {
  // 工作区角色
  owner: '💪',       // 扛把子
  director: '🐕',    // 大管家
  manager: '🤝',     // 带头大哥
  member: '🗡️',     // 少侠
  observer: '🍉',    // 吃瓜群侠
  // 兼容旧角色代码
  admin: '🐕',       // 映射到 director
  leader: '🤝',      // 映射到 manager
  guest: '🍉',       // 映射到 observer
  super_admin: '🐕',
};

// 角色语录（可用于 tooltip 或欢迎语）
export const ROLE_QUOTES: Record<string, string> = {
  // 工作区角色
  owner: '这事儿我兜底',       // 扛把子
  director: '这事儿我来安排',  // 大管家
  manager: '兄弟们，上！',     // 带头大哥
  member: '在下初来乍到，多多关照',  // 少侠
  observer: '诸位继续，我就看看', // 吃瓜群侠
  // 兼容旧角色代码
  admin: '这事儿我来安排',     // 映射到 director
  leader: '兄弟们，上！',      // 映射到 manager
  guest: '诸位继续，我就看看', // 映射到 observer
};

// 项目负责人语录
export const PROJECT_LEADER_QUOTE = '方向我来定';

// 角色描述（用于选择时显示）
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  // 工作区角色
  owner: '💪 这事儿我兜底 - 工作区创建者，最高权限',
  director: '🐕 这事儿我来安排 - 高管/VP，全局管理',
  manager: '🤝 兄弟们，上！ - 经理/主管，团队管理',
  member: '🗡️ 在下初来乍到，多多关照 - 普通员工，执行任务',
  observer: '🍉 诸位继续，我就看看 - 观察者，只读权限',
  // 兼容旧角色代码
  admin: '🐕 这事儿我来安排 - 高管/VP',  // 映射到 director
  leader: '🤝 兄弟们，上！ - 带头大哥',   // 映射到 manager
  guest: '🍉 诸位继续，我就看看 - 观察者',  // 映射到 observer
};

// 角色徽章颜色 - 现代微色背景 + 深色文字风格
export const ROLE_COLORS: Record<string, { bg: string; color: string; border?: string }> = {
  // 工作区角色 - 扛把子使用渐变，其他使用微色背景
  owner: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' },  // 扛把子 - 金色
  director: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },   // 大管家 - 橙色系
  manager: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },    // 带头大哥 - 紫色系
  member: { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' },     // 少侠 - 绿色系
  observer: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },   // 吃瓜 - 灰色系
  // 兼容旧角色代码
  admin: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },      // 映射到 director
  leader: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },     // 映射到 manager
  guest: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },      // 映射到 observer
  super_admin: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
};

// 工作区角色选项（用于邀请/修改角色时）
// 注意：owner(扛把子) 不在选项中，只能通过创建工作区获得
export const WORKSPACE_ROLE_OPTIONS = [
  { value: 'observer', label: '🍉 吃瓜群侠', description: '诸位继续，我就看看 - 观察者，只读权限' },
  { value: 'member', label: '🗡️ 少侠', description: '在下初来乍到，多多关照 - 普通员工，执行任务' },
  { value: 'manager', label: '🤝 带头大哥', description: '兄弟们，上！ - 经理/主管，团队管理' },
  { value: 'director', label: '🐕 大管家', description: '这事儿我来安排 - 高管/VP，全局管理' },
];
