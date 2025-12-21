/**
 * 权限管理控制器
 * 仅工作区创始人可以修改成员权限
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { prisma } from '../infra/database';

const router = Router();

// 所有路由需要认证
router.use(requireAuth);

// 可配置的权限列表
export const AVAILABLE_PERMISSIONS = [
  // 基础权限
  'VIEW_WORKSPACE',       // 查看工作区
  'VIEW_ALL_REPORTS',     // 查看所有日报
  
  // 管理权限
  'MANAGE_PROJECTS',      // 管理项目（创建、编辑、删除）
  'MANAGE_MEMBERS',       // 管理成员（邀请、移除、修改角色）
  'MANAGE_TASKS',         // 管理所有任务
  'MANAGE_SETTINGS',      // 管理工作区设置
  
  // 特殊功能
  'EXPORT_DATA',          // 导出数据
  'AI_ANALYSIS',          // 使用 AI 分析
  'BROADCAST_MESSAGES',   // 群发消息
  'COFFEE_LOTTERY',       // 咖啡抽奖
] as const;

export type WorkspacePermission = typeof AVAILABLE_PERMISSIONS[number];

/**
 * GET /permissions/:workspaceId/me - 获取当前用户在工作区的权限
 */
router.get('/:workspaceId/me', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;

    const workspaceMember = await prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    if (!workspaceMember) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '您不是该工作区成员' });
    }

    const isOwner = workspaceMember.role === 'owner';

    res.json({
      success: true,
      data: {
        userId: workspaceMember.userId,
        user: workspaceMember.user,
        role: workspaceMember.role,
        isOwner,
        permissions: isOwner ? [...AVAILABLE_PERMISSIONS] : (workspaceMember.permissions || []),
      },
    });
  } catch (error: any) {
    console.error('获取当前用户权限失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取权限失败' });
  }
});

/**
 * GET /permissions/:workspaceId/:userId - 获取用户在工作区的权限
 */
router.get('/:workspaceId/:userId', async (req: Request, res: Response) => {
  try {
    const { workspaceId, userId } = req.params;
    const requesterId = req.user!.userId;

    // 检查工作区是否存在
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId },
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '工作区不存在' });
    }

    const workspaceMember = workspace.members[0];
    if (!workspaceMember) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '用户不是工作区成员' });
    }

    // 查找创始人（owner 角色）
    const ownerMember = await prisma.workspaceUser.findFirst({
      where: { workspaceId, role: 'owner' },
    });

    const isOwner = ownerMember?.userId === userId;

    // 检查请求者权限（只有 owner 和 director 可以查看其他成员权限）
    const requesterMember = await prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });

    if (!requesterMember || !['owner', 'director'].includes(requesterMember.role)) {
      // 非管理者只能查看自己的权限
      if (requesterId !== userId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: '无权查看其他成员权限' });
      }
    }

    res.json({
      success: true,
      data: {
        userId: workspaceMember.userId,
        user: workspaceMember.user,
        role: workspaceMember.role,
        isOwner,
        permissions: isOwner ? [...AVAILABLE_PERMISSIONS] : (workspaceMember.permissions || []),
        availablePermissions: AVAILABLE_PERMISSIONS,
      },
    });
  } catch (error: any) {
    console.error('获取用户权限失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取权限失败' });
  }
});

/**
 * PUT /permissions/:workspaceId/:userId - 更新用户权限（仅创始人可操作）
 */
router.put('/:workspaceId/:userId', async (req: Request, res: Response) => {
  try {
    const { workspaceId, userId } = req.params;
    const { permissions } = req.body;
    const operatorId = req.user!.userId;

    // 调试日志
    console.log('更新权限请求:', { 
      workspaceId, 
      userId, 
      permissions, 
      permissionsType: typeof permissions,
      isArray: Array.isArray(permissions),
      operatorId 
    });

    // 验证 permissions 参数
    if (permissions === undefined || permissions === null) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR', 
        message: 'permissions 参数缺失' 
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR', 
        message: `权限必须是数组，当前类型: ${typeof permissions}` 
      });
    }

    // 验证权限值是否有效
    const invalidPermissions = permissions.filter(p => !AVAILABLE_PERMISSIONS.includes(p as any));
    if (invalidPermissions.length > 0) {
      console.log('无效的权限值:', invalidPermissions);
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `无效的权限值: ${invalidPermissions.join(', ')}`,
      });
    }

    // 检查操作者是否为创始人
    const operatorMember = await prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId: operatorId, workspaceId } },
    });

    if (!operatorMember || operatorMember.role !== 'owner') {
      return res.status(403).json({ error: 'FORBIDDEN', message: '仅工作区创始人可以修改权限' });
    }

    // 检查目标用户是否为创始人（不能修改创始人的权限）
    const targetMember = await prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '用户不是工作区成员' });
    }

    if (targetMember.role === 'owner') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: '不能修改创始人的权限' });
    }

    // 更新权限
    console.log('准备更新权限:', { userId, workspaceId, permissions });
    
    const updated = await prisma.workspaceUser.update({
      where: { userId_workspaceId: { userId, workspaceId } },
      data: { permissions },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    console.log('权限更新成功:', { userId, permissions: updated.permissions });

    res.json({
      success: true,
      data: {
        userId: updated.userId,
        user: updated.user,
        role: updated.role,
        permissions: updated.permissions,
      },
    });
  } catch (error: any) {
    console.error('更新用户权限失败:', error);
    console.error('错误详情:', { 
      message: error.message, 
      code: error.code,
      meta: error.meta 
    });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message || '更新权限失败' });
  }
});

/**
 * GET /permissions/:workspaceId - 获取工作区所有成员的权限（仅管理者可查看）
 */
router.get('/:workspaceId', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const requesterId = req.user!.userId;

    // 检查请求者权限（owner 和 director 可以查看）
    const requesterMember = await prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });

    if (!requesterMember || !['owner', 'director'].includes(requesterMember.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '无权查看成员权限列表' });
    }

    // 获取所有成员权限
    const members = await prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    const result = members.map(m => ({
      userId: m.userId,
      user: m.user,
      role: m.role,
      isOwner: m.role === 'owner',
      permissions: m.role === 'owner' ? [...AVAILABLE_PERMISSIONS] : (m.permissions || []),
      joinedAt: m.joinedAt,
    }));

    res.json({
      success: true,
      data: {
        members: result,
        availablePermissions: AVAILABLE_PERMISSIONS,
      },
    });
  } catch (error: any) {
    console.error('获取成员权限列表失败:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: '获取权限列表失败' });
  }
});

export default router;
