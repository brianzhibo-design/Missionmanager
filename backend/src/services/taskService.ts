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
import { notificationService } from './notificationService';

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
  async changeStatus(userId: string, taskId: string, newStatus: string) {
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

    // 5. 更新状态
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
        description: `将状态从「${STATUS_LABELS[oldStatus]}」变更为「${STATUS_LABELS[targetStatus]}」`,
        oldValue: oldStatus,
        newValue: targetStatus,
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

  /**
   * 提交任务审核
   * 任务负责人将任务从 in_progress 转为 review
   */
  async submitForReview(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 检查当前状态是否为进行中
    const currentStatus = (task.status || 'todo') as TaskStatusType;
    if (currentStatus !== TaskStatus.IN_PROGRESS) {
      throw new AppError('只有进行中的任务才能提交审核', 400, 'INVALID_STATUS');
    }

    // 检查是否是任务负责人或创建者
    if (task.assigneeId !== userId && task.creatorId !== userId) {
      // 检查是否是管理员
      const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
      if (!['owner', 'admin', 'leader'].includes(role || '')) {
        throw new AppError('只有任务负责人才能提交审核', 403, 'FORBIDDEN');
      }
    }

    // 更新状态为审核中
    const updatedTask = await taskRepository.update(taskId, { status: TaskStatus.REVIEW });

    // 记录事件
    await taskEventRepository.create({
      taskId,
      userId,
      type: 'status_changed',
      data: {
        description: `提交审核：将状态从「${STATUS_LABELS[currentStatus]}」变更为「${STATUS_LABELS[TaskStatus.REVIEW]}」`,
        oldValue: currentStatus,
        newValue: TaskStatus.REVIEW,
      },
    });

    // 通知项目负责人审核
    if (task.project.leaderId && task.project.leaderId !== userId) {
      await notificationService.create({
        userId: task.project.leaderId,
        type: 'task_review_request',
        title: '任务待审核',
        message: `任务「${task.title}」已提交审核，请及时处理`,
        taskId: task.id,
        projectId: task.projectId,
      });
    }

    return updatedTask;
  },

  /**
   * 审核通过
   * 项目负责人/管理员将任务从 review 转为 done
   */
  async approveTask(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 检查当前状态是否为审核中
    const currentStatus = (task.status || 'todo') as TaskStatusType;
    if (currentStatus !== TaskStatus.REVIEW) {
      throw new AppError('只有审核中的任务才能审核通过', 400, 'INVALID_STATUS');
    }

    // 检查是否是项目负责人或管理员
    const isProjectLeader = task.project.leaderId === userId;
    if (!isProjectLeader) {
      const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
      if (!['owner', 'admin'].includes(role || '')) {
        throw new AppError('只有项目负责人或管理员才能审核任务', 403, 'FORBIDDEN');
      }
    }

    // 更新状态为已完成
    const updatedTask = await taskRepository.update(taskId, { 
      status: TaskStatus.DONE,
      completedAt: new Date(),
    });

    // 记录事件
    await taskEventRepository.create({
      taskId,
      userId,
      type: 'status_changed',
      data: {
        description: `审核通过：将状态从「${STATUS_LABELS[currentStatus]}」变更为「${STATUS_LABELS[TaskStatus.DONE]}」`,
        oldValue: currentStatus,
        newValue: TaskStatus.DONE,
      },
    });

    // 通知任务负责人审核通过
    if (task.assigneeId && task.assigneeId !== userId) {
      await notificationService.create({
        userId: task.assigneeId,
        type: 'task_approved',
        title: '任务审核通过',
        message: `您的任务「${task.title}」已审核通过`,
        taskId: task.id,
        projectId: task.projectId,
      });
    }

    return updatedTask;
  },

  /**
   * 审核不通过
   * 项目负责人/管理员将任务从 review 退回 in_progress
   */
  async rejectTask(userId: string, taskId: string, reason?: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 检查当前状态是否为审核中
    const currentStatus = (task.status || 'todo') as TaskStatusType;
    if (currentStatus !== TaskStatus.REVIEW) {
      throw new AppError('只有审核中的任务才能退回修改', 400, 'INVALID_STATUS');
    }

    // 检查是否是项目负责人或管理员
    const isProjectLeader = task.project.leaderId === userId;
    if (!isProjectLeader) {
      const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
      if (!['owner', 'admin'].includes(role || '')) {
        throw new AppError('只有项目负责人或管理员才能退回任务', 403, 'FORBIDDEN');
      }
    }

    // 更新状态为进行中
    const updatedTask = await taskRepository.update(taskId, { status: TaskStatus.IN_PROGRESS });

    // 记录事件
    await taskEventRepository.create({
      taskId,
      userId,
      type: 'status_changed',
      data: {
        description: `审核不通过：将状态从「${STATUS_LABELS[currentStatus]}」退回「${STATUS_LABELS[TaskStatus.IN_PROGRESS]}」${reason ? `，原因: ${reason}` : ''}`,
        oldValue: currentStatus,
        newValue: TaskStatus.IN_PROGRESS,
        rejectReason: reason,
      },
    });

    // 通知任务负责人审核不通过
    if (task.assigneeId && task.assigneeId !== userId) {
      await notificationService.create({
        userId: task.assigneeId,
        type: 'task_rejected',
        title: '任务审核不通过',
        message: `您的任务「${task.title}」审核不通过${reason ? `，原因：${reason}` : ''}，请修改后重新提交`,
        taskId: task.id,
        projectId: task.projectId,
      });
    }

    return updatedTask;
  },

  /**
   * 开始任务
   * todo → in_progress
   * 权限：任务负责人/创建者
   */
  async startTask(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 检查当前状态
    const currentStatus = (task.status || 'todo') as TaskStatusType;
    if (currentStatus !== TaskStatus.TODO) {
      throw new AppError('只有待办任务可以开始', 400, 'INVALID_STATUS');
    }

    // 检查权限：任务负责人或创建者
    if (task.assigneeId !== userId && task.creatorId !== userId) {
      const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
      if (!['owner', 'admin', 'leader'].includes(role || '')) {
        throw new AppError('只有任务负责人或创建者可以开始任务', 403, 'FORBIDDEN');
      }
    }

    // 更新状态
    const updatedTask = await taskRepository.update(taskId, { status: TaskStatus.IN_PROGRESS });

    // 记录事件
    await taskEventRepository.create({
      taskId,
      userId,
      type: 'status_changed',
      data: {
        description: `开始任务：将状态从「${STATUS_LABELS[currentStatus]}」变更为「${STATUS_LABELS[TaskStatus.IN_PROGRESS]}」`,
        oldValue: currentStatus,
        newValue: TaskStatus.IN_PROGRESS,
      },
    });

    return updatedTask;
  },

  /**
   * 重新打开任务
   * done → in_progress
   * 权限：任务负责人/项目负责人/管理员
   */
  async reopenTask(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 检查当前状态
    const currentStatus = (task.status || 'todo') as TaskStatusType;
    if (currentStatus !== TaskStatus.DONE) {
      throw new AppError('只有已完成的任务可以重新打开', 400, 'INVALID_STATUS');
    }

    // 检查权限：任务负责人、项目负责人、管理员
    const isAssignee = task.assigneeId === userId;
    const isProjectLeader = task.project.leaderId === userId;
    if (!isAssignee && !isProjectLeader) {
      const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
      if (!['owner', 'admin'].includes(role || '')) {
        throw new AppError('只有任务负责人或管理员可以重新打开任务', 403, 'FORBIDDEN');
      }
    }

    // 更新状态
    const updatedTask = await taskRepository.update(taskId, { 
      status: TaskStatus.IN_PROGRESS,
      completedAt: null,
    });

    // 记录事件
    await taskEventRepository.create({
      taskId,
      userId,
      type: 'status_changed',
      data: {
        description: `重新打开任务：将状态从「${STATUS_LABELS[currentStatus]}」变更为「${STATUS_LABELS[TaskStatus.IN_PROGRESS]}」`,
        oldValue: currentStatus,
        newValue: TaskStatus.IN_PROGRESS,
      },
    });

    return updatedTask;
  },

  /**
   * 直接完成任务（无需审核）
   * in_progress → done
   * 权限：任务负责人/创建者/管理员
   * 注意：如果项目要求审核，应使用 submitForReview
   */
  async completeTask(userId: string, taskId: string) {
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 检查当前状态
    const currentStatus = (task.status || 'todo') as TaskStatusType;
    if (currentStatus !== TaskStatus.IN_PROGRESS) {
      throw new AppError('只有进行中的任务可以完成', 400, 'INVALID_STATUS');
    }

    // 检查权限：任务负责人或创建者
    if (task.assigneeId !== userId && task.creatorId !== userId) {
      const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
      if (!['owner', 'admin', 'leader'].includes(role || '')) {
        throw new AppError('只有任务负责人或创建者可以完成任务', 403, 'FORBIDDEN');
      }
    }

    // 更新状态
    const updatedTask = await taskRepository.update(taskId, { 
      status: TaskStatus.DONE,
      completedAt: new Date(),
    });

    // 记录事件
    await taskEventRepository.create({
      taskId,
      userId,
      type: 'status_changed',
      data: {
        description: `直接完成任务：将状态从「${STATUS_LABELS[currentStatus]}」变更为「${STATUS_LABELS[TaskStatus.DONE]}」`,
        oldValue: currentStatus,
        newValue: TaskStatus.DONE,
      },
    });

    return updatedTask;
  },
};
