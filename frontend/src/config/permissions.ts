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
    // 可以邀请成员
    invite: ['owner', 'director'],
    // 可以创建项目（owner, director, manager）
    createProject: ['owner', 'director', 'manager'],
    // 可以编辑项目（owner, director）
    editProject: ['owner', 'director'],
    // 可以删除项目（仅 owner）
    deleteProject: ['owner'],
    // 可以查看成员
    viewMembers: ['owner', 'director', 'manager', 'member', 'observer'],
    // 可以管理成员（邀请、修改角色、移除）
    manageMembers: ['owner', 'director'],
    // 可以访问管理员树视图（成员任务树、项目总览）
    adminTree: ['owner', 'director'],
    // 可以使用 AI 全局分析
    aiGlobalAnalysis: ['owner', 'director'],
    // 可以创建任务
    createTask: ['owner', 'director', 'manager', 'member'],
    // 可以编辑任务
    editTask: ['owner', 'director', 'manager', 'member'],
    // 可以删除任务
    deleteTask: ['owner', 'director', 'manager'],
    // 可以查看报告
    viewReports: ['owner', 'director'],
    // 可以查看 AI 洞察
    viewAiInsights: ['owner', 'director', 'manager'],
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

// 角色显示名称（人性化命名）
export const ROLE_LABELS: Record<string, string> = {
  // 工作区角色
  owner: '创始人',
  director: '总监',
  manager: '经理',
  member: '同事',
  observer: '协作者',
  // 项目角色
  lead: '项目负责人',
  senior: '核心成员',
  // 兼容旧角色名
  super_admin: '总监',
  admin: '经理',
  guest: '协作者',
  project_admin: '项目负责人',
  team_lead: '核心成员',
};

// 角色描述（用于选择时显示）
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  // 工作区角色
  owner: '拥有最高权限，可管理所有设置和成员',
  director: '可管理项目和团队，查看全局分析',
  manager: '可邀请成员，创建和管理项目',
  member: '可创建项目和任务，参与协作',
  observer: '可查看项目和任务，提供建议',
  // 项目角色
  lead: '负责项目整体进度和团队管理',
  senior: '可分配任务，协助管理团队',
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
  { value: 'observer', label: '协作者', description: '可查看项目，提供建议和反馈' },
  { value: 'member', label: '同事', description: '可创建项目和任务，全面参与协作' },
  { value: 'manager', label: '经理', description: '可邀请成员，管理项目进度' },
  { value: 'director', label: '总监', description: '可管理团队，查看全局数据和分析' },
];

// 项目角色选项
export const PROJECT_ROLE_OPTIONS = [
  { value: 'member', label: '项目成员', description: '参与项目任务执行' },
  { value: 'senior', label: '核心成员', description: '可分配任务，协助项目管理' },
  { value: 'lead', label: '项目负责人', description: '负责项目整体进度和决策' },
];
