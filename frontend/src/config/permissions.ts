// 工作区角色（从高到低）- 简化后的角色体系
export type WorkspaceRole = 'owner' | 'admin' | 'leader' | 'member' | 'guest';

// 角色层级（用于权限比较）
export const WORKSPACE_ROLE_HIERARCHY = ['guest', 'member', 'leader', 'admin', 'owner'];

// 兼容旧角色代码（向后兼容）
export const ROLE_MAPPING: Record<string, WorkspaceRole> = {
  // 旧角色 -> 新角色
  director: 'admin',
  manager: 'leader',
  observer: 'guest',
  // 新角色保持不变
  owner: 'owner',
  admin: 'admin',
  leader: 'leader',
  member: 'member',
  guest: 'guest',
};

// 权限定义（简化后的角色体系）
export const PERMISSIONS = {
  // 工作区级别权限
  workspace: {
    // 可以创建新工作区（任何已登录用户）
    createWorkspace: ['owner', 'admin', 'leader', 'member', 'guest'],
    // 可以管理工作区设置（删除、重命名等）
    manage: ['owner'],
    // 可以管理所有成员角色
    manageAllRoles: ['owner', 'admin'],
    // 可以邀请成员
    invite: ['owner', 'admin', 'leader'],
    // 可以创建项目
    createProject: ['owner', 'admin', 'leader', 'member'],
    // 可以编辑项目（owner, admin 可以编辑所有；项目负责人可以编辑自己的项目）
    // 注意：项目负责人的权限通过 isLeader 标记检查，不在这里定义
    editProject: ['owner', 'admin'],
    // 可以删除项目
    deleteProject: ['owner', 'admin'],
    // 可以查看成员
    viewMembers: ['owner', 'admin', 'leader', 'member', 'guest'],
    // 可以管理成员（邀请、修改角色、移除）
    manageMembers: ['owner', 'admin'],
    // 可以移除成员
    removeMember: ['owner', 'admin'],
    // 可以访问管理员树视图
    adminTree: ['owner', 'admin'],
    // 可以使用 AI 全局分析
    aiGlobalAnalysis: ['owner', 'admin'],
    // 可以创建任务
    createTask: ['owner', 'admin', 'leader', 'member'],
    // 可以编辑任务（owner, admin, leader 可以编辑所有；member 只能编辑自己的；项目负责人可以编辑项目内所有）
    editTask: ['owner', 'admin', 'leader', 'member'],
    // 可以删除任务（owner, admin, leader；项目负责人可以删除项目内任务）
    deleteTask: ['owner', 'admin', 'leader'],
    // 可以分配任务（owner, admin, leader；项目负责人可以分配项目内任务）
    assignTask: ['owner', 'admin', 'leader'],
    // 可以查看统计报告
    viewReports: ['owner', 'admin', 'leader', 'member'],
    // 可以填写日报
    writeDailyReport: ['owner', 'admin', 'leader', 'member'],
    // 可以查看团队日报（owner, admin 看全部；leader 看下属；项目负责人看项目内）
    viewTeamReports: ['owner', 'admin', 'leader'],
    // 可以查看 AI 洞察
    viewAiInsights: ['owner', 'admin', 'leader'],
    // 可以使用 AI 项目分析（owner, admin；项目负责人可以分析自己的项目）
    aiProjectAnalysis: ['owner', 'admin'],
    // 可以使用 AI 任务分析
    aiTaskAnalysis: ['owner', 'admin', 'leader', 'member'],
    // 可以评论
    comment: ['owner', 'admin', 'leader', 'member', 'guest'],
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
      return ['owner', 'admin'].includes(mappedRole);
    case 'deleteProject':
      return ['owner', 'admin'].includes(mappedRole);
    case 'addMember':
      return ['owner', 'admin'].includes(mappedRole) || isProjectLeader;
    case 'editTask':
      return ['owner', 'admin', 'leader', 'member'].includes(mappedRole) || isProjectLeader;
    case 'deleteTask':
      return ['owner', 'admin', 'leader'].includes(mappedRole) || isProjectLeader;
    case 'assignTask':
      return ['owner', 'admin', 'leader'].includes(mappedRole) || isProjectLeader;
    case 'adminTree':
      return ['owner', 'admin'].includes(mappedRole) || isProjectLeader;
    case 'viewReports':
      return ['owner', 'admin', 'leader', 'member'].includes(mappedRole) || isProjectLeader;
    case 'viewTeamReports':
      return ['owner', 'admin', 'leader'].includes(mappedRole) || isProjectLeader;
    case 'aiProjectAnalysis':
      return ['owner', 'admin'].includes(mappedRole) || isProjectLeader;
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
  // 工作区角色（新体系）
  owner: '扛把子',
  admin: '大管家',
  leader: '带头大哥',
  member: '少侠',
  guest: '吃瓜群侠',
  // 兼容旧角色代码
  director: '大管家',
  manager: '带头大哥',
  observer: '吃瓜群侠',
  super_admin: '大管家',
};

// 项目负责人标记显示
export const PROJECT_LEADER_LABEL = '🎯 项目负责人';

// 角色图标
export const ROLE_ICONS: Record<string, string> = {
  // 工作区角色（新体系）
  owner: '💪',
  admin: '🎩',
  leader: '🤝',
  member: '🗡️',
  guest: '🍉',
  // 兼容旧角色代码
  director: '🎩',
  manager: '🤝',
  observer: '🍉',
  super_admin: '🎩',
};

// 角色语录（可用于 tooltip 或欢迎语）
export const ROLE_QUOTES: Record<string, string> = {
  // 工作区角色（新体系）
  owner: '这事儿我兜底',
  admin: '这事儿我来安排',
  leader: '兄弟们，上！',
  member: '在下初来乍到，多多关照',
  guest: '诸位继续，我就看看',
  // 兼容旧角色代码
  director: '这事儿我来安排',
  manager: '兄弟们，上！',
  observer: '诸位继续，我就看看',
};

// 项目负责人语录
export const PROJECT_LEADER_QUOTE = '方向我来定';

// 角色描述（用于选择时显示）
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  // 工作区角色（新体系）
  owner: '💪 这事儿我兜底 - 老板，最终负责，拥有最终决策权，可管理所有设置和成员',
  admin: '🎩 这事儿我来安排 - 管理层，统筹全局，管理成员和项目，可查看全局数据',
  leader: '🤝 兄弟们，上！ - 团队负责人，带团队干活，任务分配，可查看团队数据',
  member: '🗡️ 在下初来乍到，多多关照 - 执行者，完成任务，对自己的任务负责',
  guest: '🍉 诸位继续，我就看看 - 观察者，查看和评论，不能编辑',
  // 兼容旧角色代码
  director: '🎩 这事儿我来安排 - 管理层，统筹全局',
  manager: '🤝 兄弟们，上！ - 团队负责人',
  observer: '🍉 诸位继续，我就看看 - 观察者',
};

// 角色徽章颜色 - 现代微色背景 + 深色文字风格
export const ROLE_COLORS: Record<string, { bg: string; color: string; border?: string }> = {
  // 工作区角色（新体系）- 扛把子使用渐变，其他使用微色背景
  owner: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' },
  admin: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },      // 大管家 - 橙色系
  leader: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },     // 带头大哥 - 紫色系
  member: { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' },     // 少侠 - 绿色系
  guest: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },      // 吃瓜 - 灰色系
  // 兼容旧角色代码
  director: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  manager: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
  observer: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  super_admin: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
};

// 工作区角色选项（用于邀请/修改角色时）
export const WORKSPACE_ROLE_OPTIONS = [
  { value: 'guest', label: '🍉 吃瓜群侠', description: '诸位继续，我就看看 - 可查看项目，提供建议和反馈' },
  { value: 'member', label: '🗡️ 少侠', description: '在下初来乍到，多多关照 - 可创建项目和任务，全面参与协作' },
  { value: 'leader', label: '🤝 带头大哥', description: '兄弟们，上！ - 可邀请成员，管理项目进度，查看团队数据' },
  { value: 'admin', label: '🎩 大管家', description: '这事儿我来安排 - 可管理团队，查看全局数据和分析' },
];
