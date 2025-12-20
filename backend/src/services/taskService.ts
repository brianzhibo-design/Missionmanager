/**
 * 任务服务
 */
import { taskRepository, CreateTaskInput, UpdateTaskInput } from '../repositories/taskRepository';
import { taskEventRepository } from '../repositories/taskEventRepository';
import { projectRepository } from '../repositories/projectRepository';
import { workspaceService } from './workspaceService';
import { mapRole } from '../repositories/workspaceRepository';
import {
  TaskStatus,
  TaskStatusType,
  canTransition,
  getAvailableTransitions,
  isValidStatus,
  isValidPriority,
  STATUS_LABELS,
} from '../domain/taskStateMachine';
import { AppError } from '../middleware/errorHandler';

// 所有角色（可查看）
const ALL_ROLES = ['owner', 'admin', 'leader', 'member', 'guest'] as const;
// 可编辑角色（工作区级别）
const EDIT_ROLES = ['owner', 'admin', 'leader', 'member'] as const;
// 可删除角色
const DELETE_ROLES = ['owner', 'admin', 'leader'] as const;

/**
 * 检查用户是否有任务编辑权限
 * 权限条件:
 * 1. owner, admin, leader: 可以编辑所有任务
 * 2. member: 只能编辑自己创建或被分配的任务
 * 3. guest: 无编辑权限
 * 4. 项目负责人: 可以编辑项目内所有任务
 */
async function canEditTask(
  projectId: string, 
  workspaceId: string, 
  userId: string, 
  task?: { creatorId: string; assigneeId: string | null },
  isProjectLeader?: boolean
): Promise<boolean> {
  // 1. 检查工作区角色（owner, admin, leader 可以编辑所有任务）
  const hasAdminRole = await workspaceService.hasRole(workspaceId, userId, ['owner', 'admin', 'leader']);
  if (hasAdminRole) return true;
  
  // 2. 项目负责人可以编辑项目内所有任务
  if (isProjectLeader) return true;

  // 3. member 只能编辑自己创建或被分配的任务
  if (task) {
    const isCreator = task.creatorId === userId;
    const isAssignee = task.assigneeId === userId;
    if (isCreator || isAssignee) {
      // 验证用户是工作区成员且角色为member
      const membership = await workspaceService.getMembership(workspaceId, userId);
      if (membership) {
        const mappedRole = mapRole(membership.role);
        if (mappedRole === 'member') {
          return true;
        }
      }
    }
  }

  return false;
}

export const taskService = {
  /**
   * 创建任务
   * 权限：工作区编辑角色、项目负责人、项目团队成员 可以创建
   */
  async create(userId: string, data: Omit<CreateTaskInput, 'creatorId'>) {
    // 1. 检查项目是否存在并获取 workspaceId
    const project = await projectRepository.findById(data.projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 2. 检查用户是否有权限创建任务
    const hasPermission = await canEditTask(data.projectId, project.workspaceId, userId);
    if (!hasPermission) {
      throw new AppError('没有权限创建任务', 403, 'FORBIDDEN');
    }

    // 3. 验证状态和优先级
    if (data.status && !isValidStatus(data.status)) {
      throw new AppError(`无效的状态: ${data.status}`, 400, 'INVALID_STATUS');
    }
    if (data.priority && !isValidPriority(data.priority)) {
      throw new AppError(`无效的优先级: ${data.priority}`, 400, 'INVALID_PRIORITY');
    }

    // 4. 如果指定了父任务，检查父任务是否存在且属于同一项目
    if (data.parentId) {
      const parentTask = await taskRepository.findById(data.parentId);
      if (!parentTask) {
        throw new AppError('父任务不存在', 404, 'PARENT_TASK_NOT_FOUND');
      }
      if (parentTask.projectId !== data.projectId) {
        throw new AppError('子任务必须与父任务属于同一项目', 400, 'INVALID_PARENT');
      }
    }

    // 5. 创建任务
    const task = await taskRepository.create({
      ...data,
      creatorId: userId,
    });

    // 6. 记录事件
    await taskEventRepository.create({
      taskId: task.id,
      userId,
      type: 'created',
      data: {
        description: `创建了任务「${task.title}」`,
      },
    });

    return task;
  },

  /**
   * 获取项目下的任务列表
   * 权限：所有角色都可以查看
   */
  async getByProject(userId: string, projectId: string, options?: { status?: string; assigneeId?: string }) {
    // 1. 检查项目是否存在
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 2. 检查权限
    await workspaceService.requireRole(project.workspaceId, userId, [...ALL_ROLES]);

    // 3. 获取任务列表
    return taskRepository.findByProjectId(projectId, options);
  },

  /**
   * 获取任务详情
   * 权限：所有角色都可以查看
   */
  async getById(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 检查权限
    await workspaceService.requireRole(task.project.workspaceId, userId, [...ALL_ROLES]);

    // 获取可转换的状态
    const availableTransitions = getAvailableTransitions(task.status as TaskStatusType);

    return {
      ...task,
      availableTransitions,
    };
  },

  /**
   * 更新任务
   * 权限：owner, admin, leader 可以编辑所有任务；member 只能编辑自己创建或被分配的任务；项目负责人可以编辑项目内所有任务
   */
  async update(userId: string, taskId: string, data: UpdateTaskInput) {
    // 1. 获取原任务
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 2. 检查是否是项目负责人
    const isProjectLeader = task.project.leaderId === userId;

    // 3. 检查权限（传入任务信息以便检查member权限）
    const hasPermission = await canEditTask(
      task.projectId, 
      task.project.workspaceId, 
      userId,
      { creatorId: task.creatorId, assigneeId: task.assigneeId },
      isProjectLeader
    );
    if (!hasPermission) {
      throw new AppError('没有权限编辑任务', 403, 'FORBIDDEN');
    }

    // 3. 验证优先级
    if (data.priority && !isValidPriority(data.priority)) {
      throw new AppError(`无效的优先级: ${data.priority}`, 400, 'INVALID_PRIORITY');
    }

    // 4. 如果要更新状态，使用专门的状态变更方法
    if (data.status && data.status !== task.status) {
      throw new AppError('请使用 PATCH /tasks/:id/status 接口变更状态', 400, 'USE_STATUS_ENDPOINT');
    }

    // 5. 更新任务
    const updatedTask = await taskRepository.update(taskId, data);

    // 6. 记录变更事件
    const changes: string[] = [];
    if (data.title && data.title !== task.title) changes.push('标题');
    if (data.description !== undefined && data.description !== task.description) changes.push('描述');
    if (data.priority && data.priority !== task.priority) changes.push('优先级');
    if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) changes.push('负责人');
    if (data.dueDate !== undefined) changes.push('截止日期');

    if (changes.length > 0) {
      await taskEventRepository.create({
        taskId,
        userId,
        type: 'updated',
        data: {
          description: `更新了${changes.join('、')}`,
        },
      });
    }

    return updatedTask;
  },

  /**
   * 变更任务状态（核心状态机逻辑）
   * 权限：owner, admin, leader 可以变更所有任务状态；member 只能变更自己创建或被分配的任务状态；项目负责人可以变更项目内所有任务状态
   */
  async changeStatus(userId: string, taskId: string, newStatus: string, blockedReason?: string) {
    // 1. 验证状态值
    if (!isValidStatus(newStatus)) {
      throw new AppError(`无效的状态: ${newStatus}`, 400, 'INVALID_STATUS');
    }

    // 2. 获取原任务
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 3. 检查是否是项目负责人
    const isProjectLeader = task.project.leaderId === userId;

    // 4. 检查权限（传入任务信息以便检查member权限）
    const hasPermission = await canEditTask(
      task.projectId, 
      task.project.workspaceId, 
      userId,
      { creatorId: task.creatorId, assigneeId: task.assigneeId },
      isProjectLeader
    );
    if (!hasPermission) {
      throw new AppError('没有权限变更任务状态', 403, 'FORBIDDEN');
    }

    // 如果任务没有状态，默认为 todo
    const oldStatus = (task.status || 'todo') as TaskStatusType;
    const targetStatus = newStatus as TaskStatusType;

    // 4. 检查状态转换是否合法
    if (!canTransition(oldStatus, targetStatus)) {
      const available = getAvailableTransitions(oldStatus);
      throw new AppError(
        `不能从「${STATUS_LABELS[oldStatus] || oldStatus}」转换到「${STATUS_LABELS[targetStatus] || targetStatus}」，可选: ${available.map(s => STATUS_LABELS[s]).join(', ')}`,
        400,
        'INVALID_TRANSITION'
      );
    }

    // 5. BLOCKED 状态需要提供原因
    if (targetStatus === TaskStatus.BLOCKED && !blockedReason) {
      throw new AppError('设置为阻塞状态时请提供原因', 400, 'BLOCKED_REASON_REQUIRED');
    }

    // 6. 更新状态
    const updateData: UpdateTaskInput = {
      status: targetStatus,
    };

    // 如果变为 DONE，设置完成时间
    if (targetStatus === TaskStatus.DONE) {
      updateData.completedAt = new Date();
    } else if (oldStatus === TaskStatus.DONE) {
      // 从 DONE 重新打开，清除完成时间
      updateData.completedAt = null;
    }

    const updatedTask = await taskRepository.update(taskId, updateData);

    // 7. 记录状态变更事件
    await taskEventRepository.create({
      taskId,
      userId,
      type: 'status_changed',
      data: {
        description: `将状态从「${STATUS_LABELS[oldStatus]}」变更为「${STATUS_LABELS[targetStatus]}」${blockedReason ? `，原因: ${blockedReason}` : ''}`,
        oldValue: oldStatus,
        newValue: targetStatus,
        blockedReason,
      },
    });

    return {
      ...updatedTask,
      availableTransitions: getAvailableTransitions(targetStatus),
    };
  },

  /**
   * 删除任务
   * 权限：owner, admin, leader 可以删除；项目负责人可以删除项目内任务
   */
  async delete(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 检查是否是项目负责人
    const isProjectLeader = task.project.leaderId === userId;
    
    // 检查权限
    if (!isProjectLeader) {
      await workspaceService.requireRole(task.project.workspaceId, userId, [...DELETE_ROLES]);
    }

    await taskRepository.delete(taskId);
  },

  /**
   * 获取任务事件历史
   * 权限：所有角色都可以查看
   */
  async getEvents(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    await workspaceService.requireRole(task.project.workspaceId, userId, [...ALL_ROLES]);

    return taskEventRepository.findByTaskId(taskId);
  },

  /**
   * 获取项目任务统计
   * 权限：所有角色都可以查看
   */
  async getProjectStats(userId: string, projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    await workspaceService.requireRole(project.workspaceId, userId, [...ALL_ROLES]);

    return taskRepository.getProjectStats(projectId);
  },

  /**
   * 批量更新任务状态
   * 权限：owner, director, manager, member 可以编辑
   */
  async batchUpdateStatus(userId: string, taskIds: string[], newStatus: string) {
    if (!taskIds || taskIds.length === 0) {
      throw new AppError('请提供要更新的任务ID列表', 400, 'MISSING_TASK_IDS');
    }

    if (!isValidStatus(newStatus)) {
      throw new AppError(`无效的状态: ${newStatus}`, 400, 'INVALID_STATUS');
    }

    const results: { success: string[]; failed: Array<{ id: string; reason: string }> } = {
      success: [],
      failed: [],
    };

    for (const taskId of taskIds) {
      try {
        const task = await taskRepository.findByIdWithDetails(taskId);
        if (!task) {
          results.failed.push({ id: taskId, reason: '任务不存在' });
          continue;
        }

        // 检查是否是项目负责人
        const isProjectLeader = task.project.leaderId === userId;

        // 检查权限（传入任务信息以便检查member权限）
        const hasPermission = await canEditTask(
          task.projectId, 
          task.project.workspaceId, 
          userId,
          { creatorId: task.creatorId, assigneeId: task.assigneeId },
          isProjectLeader
        );
        if (!hasPermission) {
          results.failed.push({ id: taskId, reason: '没有权限' });
          continue;
        }

        // 如果任务没有状态，默认为 todo
        const oldStatus = (task.status || 'todo') as TaskStatusType;
        const targetStatus = newStatus as TaskStatusType;

        // 检查状态转换是否合法
        if (!canTransition(oldStatus, targetStatus)) {
          results.failed.push({ 
            id: taskId, 
            reason: `不能从「${STATUS_LABELS[oldStatus] || oldStatus}」转换到「${STATUS_LABELS[targetStatus] || targetStatus}」` 
          });
          continue;
        }

        // 更新状态
        const updateData: UpdateTaskInput = { status: targetStatus };
        if (targetStatus === TaskStatus.DONE) {
          updateData.completedAt = new Date();
        } else if (oldStatus === TaskStatus.DONE) {
          updateData.completedAt = null;
        }

        await taskRepository.update(taskId, updateData);

        // 记录事件
        await taskEventRepository.create({
          taskId,
          userId,
          type: 'status_changed',
          data: {
            description: `批量操作：将状态从「${STATUS_LABELS[oldStatus]}」变更为「${STATUS_LABELS[targetStatus]}」`,
            oldValue: oldStatus,
            newValue: targetStatus,
          },
        });

        results.success.push(taskId);
      } catch (error) {
        results.failed.push({ 
          id: taskId, 
          reason: error instanceof AppError ? error.message : '未知错误' 
        });
      }
    }

    return results;
  },
};
