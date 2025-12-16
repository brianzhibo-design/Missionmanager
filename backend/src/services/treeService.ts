/**
 * 树状视图查询服务
 * 提供成员任务树和项目树查询功能
 */
import { prisma } from '../infra/database';
import { projectMemberRepository } from '../repositories/projectMemberRepository';
import { workspaceRepository } from '../repositories/workspaceRepository';
import { projectRepository } from '../repositories/projectRepository';
import { AppError } from '../middleware/errorHandler';
import {
  MemberNode,
  MemberTreeResponse,
  ProjectNode,
  ProjectTreeResponse,
  TaskStats,
  ProjectLeaderInfo,
  ProjectTeamMember,
} from '../types/tree';

export const treeService = {
  // ==================== 成员任务树 ====================

  /**
   * 获取项目的成员任务树
   * 只显示项目团队成员（负责人 + 团队成员）及其任务
   */
  async getMemberTree(userId: string, projectId: string): Promise<MemberTreeResponse> {
    // 1. 获取项目详情（包含负责人和团队成员）
    const project = await projectRepository.findByIdWithTeam(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 2. 验证用户权限
    const workspaceMembership = await workspaceRepository.getMembership(project.workspaceId, userId);
    if (!workspaceMembership) {
      throw new AppError('无权访问此项目', 403, 'ACCESS_DENIED');
    }

    // 3. 构建项目团队成员列表
    const teamMembers: Array<{
      userId: string;
      name: string;
      email: string;
      avatar: string | null;
      role: string;
      isLeader: boolean;
    }> = [];

    // 添加负责人
    if (project.leader) {
      teamMembers.push({
        userId: project.leader.id,
        name: project.leader.name,
        email: project.leader.email,
        avatar: project.leader.avatar,
        role: 'leader',
        isLeader: true,
      });
    }

    // 添加团队成员（排除负责人）
    for (const member of project.members) {
      if (project.leaderId && member.userId === project.leaderId) {
        continue; // 跳过负责人，避免重复
      }
      teamMembers.push({
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role,
        isLeader: false,
      });
    }

    // 如果项目没有任何团队成员，获取工作区所有成员作为备选
    if (teamMembers.length === 0) {
      const workspaceMembers = await prisma.workspaceUser.findMany({
        where: { workspaceId: project.workspaceId },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: [
          { role: 'asc' },
          { joinedAt: 'asc' },
        ],
      });

      for (const member of workspaceMembers) {
        teamMembers.push({
          userId: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatar: member.user.avatar,
          role: member.role,
          isLeader: false,
        });
      }
    }

    // 4. 构建成员节点
    const children: MemberNode[] = [];
    
    for (const member of teamMembers) {
      // 获取该成员在此项目中的任务
      const tasks = await prisma.task.findMany({
        where: { projectId, assigneeId: member.userId },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      // 计算任务统计
      const taskStats = this.calculateTaskStats(tasks);

      // 显示正确的项目角色
      let displayRole = member.role;
      if (member.isLeader) {
        displayRole = '负责人';
      } else if (member.role === 'project_admin') {
        displayRole = '项目管理员';
      } else if (member.role === 'team_lead') {
        displayRole = '团队负责人';
      } else if (member.role === 'member') {
        displayRole = '团队成员';
      }

      children.push({
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: displayRole,
        taskStats,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() || null,
        })),
        children: [],
      });
    }

    // 5. 计算整体统计
    const allTasks = await prisma.task.findMany({
      where: { projectId },
      select: { status: true },
    });
    const overallStats = this.calculateTaskStats(allTasks);

    // 6. 获取工作区信息
    const workspace = await workspaceRepository.findById(project.workspaceId);

    // 7. 构建负责人信息
    let leaderInfo: ProjectLeaderInfo | null = null;
    if (project.leader) {
      leaderInfo = {
        id: project.leader.id,
        name: project.leader.name,
        email: project.leader.email,
        avatar: project.leader.avatar,
      };
    }

    // 8. 构建团队成员信息
    const teamMembersInfo: ProjectTeamMember[] = teamMembers.map(m => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      role: m.role,
      isLeader: m.isLeader,
    }));

    // 9. 构建根节点
    const tree: MemberNode = {
      userId: 'team-root',
      name: project.name + ' 团队',
      email: '',
      role: 'team',
      taskStats: overallStats,
      tasks: [],
      children,
    };

    return {
      workspaceId: project.workspaceId,
      workspaceName: workspace?.name || '未知工作区',
      projectId,
      projectName: project.name,
      projectDescription: project.description,
      leader: leaderInfo,
      teamMembers: teamMembersInfo,
      tree,
    };
  },

  /**
   * 递归构建成员节点
   */
  async buildMemberNode(
    projectId: string,
    userId: string,
    visited: Set<string>
  ): Promise<MemberNode> {
    // 防止循环引用
    if (visited.has(userId)) {
      throw new AppError('检测到循环汇报关系', 500, 'CIRCULAR_REFERENCE');
    }
    visited.add(userId);

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // 获取项目成员信息
    const membership = await projectMemberRepository.findByProjectAndUser(projectId, userId);
    const role = membership?.role || 'member';

    // 获取该成员负责的任务
    const tasks = await prisma.task.findMany({
      where: { projectId, assigneeId: userId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // 计算任务统计
    const taskStats = this.calculateTaskStats(tasks);

    // 获取直属下属
    const subordinates = await projectMemberRepository.findSubordinates(projectId, userId);

    // 递归构建下属节点
    const children: MemberNode[] = [];
    for (const sub of subordinates) {
      const childNode = await this.buildMemberNode(projectId, sub.userId, new Set(visited));
      children.push(childNode);
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role,
      taskStats,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() || null,
      })),
      children,
    };
  },

  // ==================== 项目树 ====================

  /**
   * 获取工作区的项目树
   * 最高管理员视角：查看所有项目的工作情况
   */
  async getProjectTree(userId: string, workspaceId: string): Promise<ProjectTreeResponse> {
    // 1. 验证工作区存在
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new AppError('工作区不存在', 404, 'WORKSPACE_NOT_FOUND');
    }

    // 2. 验证用户是 owner 或 director
    const membership = await workspaceRepository.getMembership(workspaceId, userId);
    if (!membership || !['owner', 'director'].includes(membership.role)) {
      throw new AppError('需要管理员权限', 403, 'REQUIRE_ADMIN');
    }

    // 3. 获取工作区下所有项目
    const projects = await projectRepository.findByWorkspaceId(workspaceId);

    // 4. 构建每个项目的节点
    const projectNodes: ProjectNode[] = [];
    const overallStats: TaskStats = {
      total: 0,
      todo: 0,
      inProgress: 0,
      review: 0,
      blocked: 0,
      done: 0,
    };

    for (const project of projects) {
      const node = await this.buildProjectNode(project.id);
      projectNodes.push(node);

      // 累加总体统计
      overallStats.total += node.taskStats.total;
      overallStats.todo += node.taskStats.todo;
      overallStats.inProgress += node.taskStats.inProgress;
      overallStats.review += node.taskStats.review;
      overallStats.blocked += node.taskStats.blocked;
      overallStats.done += node.taskStats.done;
    }

    // 按进度排序（进度低的排前面，优先关注）
    projectNodes.sort((a, b) => a.progress - b.progress);

    return {
      workspaceId,
      workspaceName: workspace.name,
      totalProjects: projects.length,
      overallStats,
      projects: projectNodes,
    };
  },

  /**
   * 构建单个项目节点
   */
  async buildProjectNode(projectId: string): Promise<ProjectNode> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: { id: true, status: true, updatedAt: true },
        },
        members: {
          where: { role: { in: ['project_admin', 'team_lead'] } },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 计算任务统计
    const taskStats = this.calculateTaskStats(project.tasks);

    // 计算进度百分比
    const progress = taskStats.total > 0
      ? Math.round((taskStats.done / taskStats.total) * 100)
      : 0;

    // 获取主要成员及其任务数
    const topMembers = await Promise.all(
      project.members.map(async (m) => {
        const taskCount = await prisma.task.count({
          where: { projectId, assigneeId: m.userId },
        });
        return {
          userId: m.userId,
          name: m.user.name,
          role: m.role,
          taskCount,
        };
      })
    );

    // 获取最近活动时间
    const recentTask = project.tasks.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0];

    return {
      projectId: project.id,
      name: project.name,
      description: project.description,
      progress,
      taskStats,
      topMembers,
      recentActivity: recentTask?.updatedAt.toISOString() || null,
    };
  },

  // ==================== 辅助方法 ====================

  /**
   * 计算任务统计
   * 注意：数据库中的状态值是小写的 (todo, in_progress, review, blocked, done)
   */
  calculateTaskStats(tasks: Array<{ status: string }>): TaskStats {
    const stats: TaskStats = {
      total: tasks.length,
      todo: 0,
      inProgress: 0,
      review: 0,
      blocked: 0,
      done: 0,
    };

    for (const task of tasks) {
      switch (task.status) {
        case 'todo':
          stats.todo++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'review':
          stats.review++;
          break;
        case 'blocked':
          stats.blocked++;
          break;
        case 'done':
          stats.done++;
          break;
      }
    }

    return stats;
  },
};

