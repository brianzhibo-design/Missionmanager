// 工作区角色（从高到低）
export type WorkspaceRole = 'owner' | 'director' | 'manager' | 'member' | 'observer';

// 项目角色（从高到低）
export type ProjectRole = 'lead' | 'senior' | 'member';

// 角色层级（用于权限比较）
export const WORKSPACE_ROLE_HIERARCHY = ['observer', 'member', 'manager', 'director', 'owner'];
export const PROJECT_ROLE_HIERARCHY = ['member', 'senior', 'lead'];

// 权限定义
export const PERMISSIONS = {
  // 工作区级别权限
  workspace: {
    // 可以创建新工作区（任何已登录用户）
    createWorkspace: ['owner', 'director', 'manager', 'member', 'observer'],
    // 可以管理工作区设置（删除、重命名等）
    manage: ['owner'],
    // 可以管理所有成员角色
    manageAllRoles: ['owner', 'director'],
    // 可以邀请成员（掌门、长老、堂主）
    invite: ['owner', 'director', 'manager'],
    // 可以创建项目（owner, director, manager, member）
    createProject: ['owner', 'director', 'manager', 'member'],
    // 可以编辑项目（owner, director 可以编辑所有；manager 只能编辑自己负责的）
    editProject: ['owner', 'director'],
    // 可以删除项目（owner, director）
    deleteProject: ['owner', 'director'],
    // 可以查看成员
    viewMembers: ['owner', 'director', 'manager', 'member', 'observer'],
    // 可以管理成员（邀请、修改角色、移除）- 仅掌门和长老
    manageMembers: ['owner', 'director'],
    // 可以访问管理员树视图（成员任务树、项目总览）- 掌门、长老可编辑，堂主只读
    adminTree: ['owner', 'director', 'manager'],
    // 可以使用 AI 全局分析
    aiGlobalAnalysis: ['owner', 'director'],
    // 可以创建任务
    createTask: ['owner', 'director', 'manager', 'member'],
    // 可以编辑任务（owner, director, manager 可以编辑所有；member 只能编辑自己的）
    editTask: ['owner', 'director', 'manager', 'member'],
    // 可以删除任务（owner, director, manager）
    deleteTask: ['owner', 'director', 'manager'],
    // 可以分配任务（owner, director, manager）
    assignTask: ['owner', 'director', 'manager'],
    // 可以查看统计报告（周报/月报）
    viewReports: ['owner', 'director', 'manager', 'member'],
    // 可以填写日报（所有成员）
    writeDailyReport: ['owner', 'director', 'manager', 'member'],
    // 可以查看团队日报（owner, director 看全部；manager 看下属）
    viewTeamReports: ['owner', 'director', 'manager'],
    // 可以查看 AI 洞察
    viewAiInsights: ['owner', 'director', 'manager'],
    // 可以使用 AI 项目分析（owner, director, manager）
    aiProjectAnalysis: ['owner', 'director', 'manager'],
    // 可以使用 AI 任务分析（所有成员）
    aiTaskAnalysis: ['owner', 'director', 'manager', 'member'],
    // 可以评论（所有角色包括 observer）
    comment: ['owner', 'director', 'manager', 'member', 'observer'],
  },
  // 项目级别权限
  project: {
    // 可以管理项目设置
    manage: ['lead'],
    // 可以添加项目成员
    addMember: ['lead'],
    // 可以创建任务
    createTask: ['lead', 'senior', 'member'],
    // 可以分配任务给他人
    assignTask: ['lead', 'senior'],
    // 可以查看成员树
    viewMemberTree: ['lead', 'senior'],
    // 可以使用 AI 团队分析
    aiTeamAnalysis: ['lead'],
  },
} as const;

// 检查工作区权限
export function hasWorkspacePermission(
  role: WorkspaceRole | string | undefined,
  permission: keyof typeof PERMISSIONS.workspace
): boolean {
  if (!role) return false;
  return (PERMISSIONS.workspace[permission] as readonly string[]).includes(role);
}

// 检查项目权限
export function hasProjectPermission(
  role: ProjectRole | string | undefined,
  permission: keyof typeof PERMISSIONS.project
): boolean {
  if (!role) return false;
  return (PERMISSIONS.project[permission] as readonly string[]).includes(role);
}

// 比较角色层级
export function compareWorkspaceRoles(role1: string, role2: string): number {
  const index1 = WORKSPACE_ROLE_HIERARCHY.indexOf(role1);
  const index2 = WORKSPACE_ROLE_HIERARCHY.indexOf(role2);
  return index1 - index2;
}

// 角色显示名称（江湖风格命名）
export const ROLE_LABELS: Record<string, string> = {
  // 工作区角色
  owner: '扛把子',
  director: '狗头军师',
  manager: '带头大哥',
  member: '少侠',
  observer: '吃瓜群侠',
  // 项目角色
  lead: '掌舵人',
  project_admin: '掌舵人',
  team_lead: '老司机',
  senior: '扫地僧',
  // 兼容旧角色名
  super_admin: '狗头军师',
  admin: '带头大哥',
  guest: '吃瓜群侠',
};

// 项目角色显示名称（用于区分项目中的 member 和 observer）
export const PROJECT_ROLE_LABELS: Record<string, string> = {
  lead: '掌舵人',
  project_admin: '掌舵人',
  team_lead: '老司机',
  senior: '扫地僧',
  member: '行者', // 项目成员
  observer: '看客', // 项目观察者
};

// 角色图标
export const ROLE_ICONS: Record<string, string> = {
  // 工作区角色
  owner: '💪',
  director: '🐕',
  manager: '🤝',
  member: '🗡️', // 工作区成员
  observer: '🍉', // 工作区观察者
  // 项目角色
  lead: '🚢',
  project_admin: '🚢',
  team_lead: '🚗',
  senior: '🧹',
  // 兼容旧角色名
  super_admin: '🐕',
  admin: '🤝',
  guest: '🍉',
};

// 角色语录（可用于 tooltip 或欢迎语）
export const ROLE_QUOTES: Record<string, string> = {
  // 工作区角色
  owner: '这事儿我兜底',
  director: '主公，臣有一计',
  manager: '兄弟们，上！',
  member: '在下初来乍到，多多关照',
  observer: '诸位继续，我就看看',
  // 项目角色
  lead: '方向我来定',
  project_admin: '方向我来定',
  team_lead: '这条路我熟',
  senior: '贫僧只是随便扫扫',
};

// 项目角色语录
export const PROJECT_ROLE_QUOTES: Record<string, string> = {
  lead: '方向我来定',
  project_admin: '方向我来定',
  team_lead: '这条路我熟',
  senior: '贫僧只是随便扫扫',
  member: '路在脚下',
  observer: '你们继续，我听着呢',
};

// 角色描述（用于选择时显示）
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  // 工作区角色
  owner: '💪 这事儿我兜底 - 拥有最终决策权，可管理所有设置和成员',
  director: '🐕 主公，臣有一计 - 管理多个团队，有招聘和部分解雇权，可查看全局分析',
  manager: '🤝 兄弟们，上！ - 管理一个团队，可以招人，负责项目交付，可查看团队数据',
  member: '🗡️ 在下初来乍到，多多关照 - 执行具体工作，对自己的任务负责，可以提建议',
  observer: '🍉 诸位继续，我就看看 - 临时参与者，主要是了解情况、学习或提供建议',
  // 项目角色
  lead: '🚢 方向我来定 - 负责项目整体进度和团队管理',
  project_admin: '🚢 方向我来定 - 负责项目整体进度和团队管理',
  team_lead: '🚗 这条路我熟 - 可分配任务，协助管理团队',
  senior: '🧹 贫僧只是随便扫扫 - 经验丰富的核心成员',
};

// 项目角色描述
export const PROJECT_ROLE_DESCRIPTIONS: Record<string, string> = {
  lead: '🚢 方向我来定 - 负责项目整体进度和团队管理',
  project_admin: '🚢 方向我来定 - 负责项目整体进度和团队管理',
  team_lead: '🚗 这条路我熟 - 可分配任务，协助管理团队',
  senior: '🧹 贫僧只是随便扫扫 - 经验丰富的核心成员',
  member: '🚶 路在脚下 - 参与项目任务执行',
  observer: '👀 你们继续，我听着呢 - 只能查看项目内容，不能编辑',
};

// 角色徽章颜色
export const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  // 工作区角色 - 使用温暖、专业的颜色
  owner: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' },
  director: { bg: 'var(--accent-light)', color: 'var(--accent-primary)' },
  manager: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
  member: { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  observer: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  // 项目角色
  lead: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' },
  senior: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
  // 兼容旧角色
  super_admin: { bg: 'var(--accent-light)', color: 'var(--accent-primary)' },
  admin: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
  guest: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  project_admin: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' },
  team_lead: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
};

// 工作区角色选项（用于邀请/修改角色时）
export const WORKSPACE_ROLE_OPTIONS = [
  { value: 'observer', label: '🍉 吃瓜群侠', description: '诸位继续，我就看看 - 可查看项目，提供建议和反馈' },
  { value: 'member', label: '🗡️ 少侠', description: '在下初来乍到，多多关照 - 可创建项目和任务，全面参与协作' },
  { value: 'manager', label: '🤝 带头大哥', description: '兄弟们，上！ - 可邀请成员，管理项目进度，查看团队数据' },
  { value: 'director', label: '🐕 狗头军师', description: '主公，臣有一计 - 可管理团队，查看全局数据和分析' },
];

// 项目角色选项
export const PROJECT_ROLE_OPTIONS = [
  { value: 'member', label: '🚶 行者', description: '路在脚下 - 参与项目任务执行' },
  { value: 'senior', label: '🧹 扫地僧', description: '贫僧只是随便扫扫 - 经验丰富的核心成员' },
  { value: 'team_lead', label: '🚗 老司机', description: '这条路我熟 - 可分配任务，协助项目管理' },
  { value: 'lead', label: '🚢 掌舵人', description: '方向我来定 - 负责项目整体进度和决策' },
  { value: 'project_admin', label: '🚢 掌舵人', description: '方向我来定 - 负责项目整体进度和决策' },
];
