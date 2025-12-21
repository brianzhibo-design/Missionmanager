// 工作区角色（从高到低）
// owner (扛把子) = 工作区创始人
// admin/director (大管家) = 总监/主管
// leader (带头大哥) = 项目负责人
// member (少侠) = 普通成员
// guest (吃瓜) = 访客
export type WorkspaceRole = 'owner' | 'admin' | 'director' | 'leader' | 'member' | 'guest';

// 角色层级（用于权限比较）
// admin 和 director 同级（都是大管家）
export const WORKSPACE_ROLE_HIERARCHY = ['guest', 'member', 'leader', 'director', 'admin', 'owner'];

// 兼容旧角色代码（向后兼容）
export const ROLE_MAPPING: Record<string, WorkspaceRole> = {
  // 旧角色 -> 新角色
  manager: 'leader',
  observer: 'guest',
  super_admin: 'admin',
  // 角色保持不变
  owner: 'owner',
  admin: 'admin',
  director: 'director',
  leader: 'leader',
  member: 'member',
  guest: 'guest',
};

// 权限定义
// owner (扛把子) = 工作区创始人，拥有所有权限
// admin/director (大管家) = 总监/主管，管理多个项目
// leader (带头大哥) = 项目负责人，仅项目内权限
// member (少侠) = 普通成员
// guest (吃瓜) = 访客，只读权限
export const PERMISSIONS = {
  // 工作区级别权限
  workspace: {
    // 可以创建新工作区（任何已登录用户）
    createWorkspace: ['owner', 'admin', 'director', 'leader', 'member', 'guest'],
    // 可以管理工作区设置（删除、重命名等）- 仅扛把子
    manage: ['owner'],
    // 可以管理所有成员角色
    manageAllRoles: ['owner', 'admin', 'director'],
    // 可以邀请成员
    invite: ['owner', 'admin', 'director', 'leader'],
    // 可以创建项目
    createProject: ['owner', 'admin', 'director', 'leader', 'member'],
    // 可以编辑项目（owner, admin, director 可以编辑所有；项目负责人可以编辑自己的项目）
    editProject: ['owner', 'admin', 'director'],
    // 可以删除项目
    deleteProject: ['owner', 'admin', 'director'],
    // 可以查看成员
    viewMembers: ['owner', 'admin', 'director', 'leader', 'member', 'guest'],
    // 可以管理成员（邀请、修改角色、移除）
    manageMembers: ['owner', 'admin', 'director'],
    // 可以移除成员
    removeMember: ['owner', 'admin', 'director'],
    // 可以访问管理员树视图
    adminTree: ['owner', 'admin', 'director'],
    // 可以使用 AI 全局分析
    aiGlobalAnalysis: ['owner', 'admin', 'director'],
    // 可以创建任务
    createTask: ['owner', 'admin', 'director', 'leader', 'member'],
    // 可以编辑任务
    editTask: ['owner', 'admin', 'director', 'leader', 'member'],
    // 可以删除任务
    deleteTask: ['owner', 'admin', 'director', 'leader'],
    // 可以分配任务
    assignTask: ['owner', 'admin', 'director', 'leader'],
    // 可以查看统计报告
    viewReports: ['owner', 'admin', 'director', 'leader', 'member'],
    // 可以填写日报
    writeDailyReport: ['owner', 'admin', 'director', 'leader', 'member'],
    // 可以查看团队日报（owner, admin, director 看全部；leader 看项目内）
    viewTeamReports: ['owner', 'admin', 'director', 'leader'],
    // 可以查看 AI 洞察
    viewAiInsights: ['owner', 'admin', 'director', 'leader'],
    // 可以使用 AI 项目分析
    aiProjectAnalysis: ['owner', 'admin', 'director'],
    // 可以使用 AI 任务分析（所有非访客成员）
    aiTaskAnalysis: ['owner', 'admin', 'director', 'leader', 'member'],
    // 可以评论
    comment: ['owner', 'admin', 'director', 'leader', 'member', 'guest'],
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
      return ['owner', 'admin', 'director'].includes(mappedRole);
    case 'deleteProject':
      return ['owner', 'admin', 'director'].includes(mappedRole);
    case 'addMember':
      return ['owner', 'admin', 'director'].includes(mappedRole) || isProjectLeader;
    case 'editTask':
      return ['owner', 'admin', 'director', 'leader', 'member'].includes(mappedRole) || isProjectLeader;
    case 'deleteTask':
      return ['owner', 'admin', 'director', 'leader'].includes(mappedRole) || isProjectLeader;
    case 'assignTask':
      return ['owner', 'admin', 'director', 'leader'].includes(mappedRole) || isProjectLeader;
    case 'adminTree':
      return ['owner', 'admin', 'director'].includes(mappedRole) || isProjectLeader;
    case 'viewReports':
      return ['owner', 'admin', 'director', 'leader', 'member'].includes(mappedRole) || isProjectLeader;
    case 'viewTeamReports':
      return ['owner', 'admin', 'director', 'leader'].includes(mappedRole) || isProjectLeader;
    case 'aiProjectAnalysis':
      return ['owner', 'admin', 'director'].includes(mappedRole) || isProjectLeader;
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
  owner: '扛把子',      // 工作区创始人
  admin: '大管家',      // 总监/主管（同 director）
  director: '大管家',   // 总监/主管
  leader: '带头大哥',   // 项目负责人
  member: '少侠',       // 普通成员
  guest: '吃瓜群侠',    // 访客
  // 兼容旧角色代码
  manager: '带头大哥',
  observer: '吃瓜群侠',
  super_admin: '大管家',
};

// 项目负责人标记显示
export const PROJECT_LEADER_LABEL = '🎯 项目负责人';

// 角色图标
export const ROLE_ICONS: Record<string, string> = {
  // 工作区角色
  owner: '💪',      // 扛把子
  admin: '🎩',      // 大管家（同 director）
  director: '🎩',   // 大管家
  leader: '🤝',     // 带头大哥
  member: '🗡️',    // 少侠
  guest: '🍉',      // 吃瓜群侠
  // 兼容旧角色代码
  manager: '🤝',
  observer: '🍉',
  super_admin: '🎩',
};

// 角色语录（可用于 tooltip 或欢迎语）
export const ROLE_QUOTES: Record<string, string> = {
  // 工作区角色
  owner: '这事儿我兜底',       // 扛把子
  admin: '这事儿我来安排',     // 大管家（同 director）
  director: '这事儿我来安排',  // 大管家
  leader: '兄弟们，上！',      // 带头大哥
  member: '在下初来乍到，多多关照',  // 少侠
  guest: '诸位继续，我就看看', // 吃瓜群侠
  // 兼容旧角色代码
  manager: '兄弟们，上！',
  observer: '诸位继续，我就看看',
};

// 项目负责人语录
export const PROJECT_LEADER_QUOTE = '方向我来定';

// 角色描述（用于选择时显示）
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  // 工作区角色
  owner: '💪 这事儿我兜底 - 工作区创始人，拥有所有权限，可管理所有设置和成员',
  admin: '🎩 这事儿我来安排 - 总监/主管，管理多个项目，可查看全局数据',
  director: '🎩 这事儿我来安排 - 总监/主管，管理多个项目，可查看全局数据',
  leader: '🤝 兄弟们，上！ - 项目负责人，管理项目内任务和成员',
  member: '🗡️ 在下初来乍到，多多关照 - 普通成员，完成分配的任务',
  guest: '🍉 诸位继续，我就看看 - 访客，只读权限，可查看和评论',
  // 兼容旧角色代码
  manager: '🤝 兄弟们，上！ - 项目负责人',
  observer: '🍉 诸位继续，我就看看 - 访客',
};

// 角色徽章颜色 - 现代微色背景 + 深色文字风格
export const ROLE_COLORS: Record<string, { bg: string; color: string; border?: string }> = {
  // 工作区角色 - 扛把子使用渐变，其他使用微色背景
  owner: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' },  // 扛把子 - 金色
  admin: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },      // 大管家 - 橙色系
  director: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },   // 大管家 - 橙色系
  leader: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },     // 带头大哥 - 紫色系
  member: { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' },     // 少侠 - 绿色系
  guest: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },      // 吃瓜 - 灰色系
  // 兼容旧角色代码
  manager: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
  observer: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  super_admin: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
};

// 工作区角色选项（用于邀请/修改角色时）
// 注意：owner(扛把子) 不在选项中，只能通过创建工作区获得
export const WORKSPACE_ROLE_OPTIONS = [
  { value: 'guest', label: '🍉 吃瓜群侠', description: '诸位继续，我就看看 - 访客，只读权限' },
  { value: 'member', label: '🗡️ 少侠', description: '在下初来乍到，多多关照 - 普通成员，完成分配的任务' },
  { value: 'leader', label: '🤝 带头大哥', description: '兄弟们，上！ - 项目负责人，管理项目内任务和成员' },
  { value: 'director', label: '🎩 大管家', description: '这事儿我来安排 - 总监/主管，管理多个项目' },
];
