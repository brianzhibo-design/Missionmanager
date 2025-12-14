import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function requireTaskAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: taskId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: { workspace: { include: { members: { where: { userId } } } } },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '任务不存在' } });
    }

    if (task.project.workspace.members.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此任务' } });
    }

    (req as any).task = task;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireProjectAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: projectId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: { include: { members: { where: { userId } } } } },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '项目不存在' } });
    }

    if (project.workspace.members.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此项目' } });
    }

    (req as any).project = project;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireWorkspaceAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.query.workspaceId as string || req.body.workspaceId;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
    }

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '缺少 workspaceId' } });
    }

    const membership = await prisma.workspaceUser.findFirst({ where: { workspaceId, userId } });

    if (!membership) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问此工作区' } });
    }

    (req as any).workspaceId = workspaceId;
    next();
  } catch (error) {
    next(error);
  }
}

