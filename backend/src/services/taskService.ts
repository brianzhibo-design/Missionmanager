/**
 * 任务服务
 */
import { taskRepository, CreateTaskInput, UpdateTaskInput } from '../repositories/taskRepository';
import { taskEventRepository } from '../repositories/taskEventRepository';
import { projectRepository } from '../repositories/projectRepository';
import { workspaceService } from './workspaceService';
import { mapRole } from '../repositories/workspaceRepository';
import { prisma } from '../lib/prisma';
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

/**
 * 规范化状态值（统一转为小写）
 * 兼容大写、小写、混合大小写输入
 */
function normalizeStatus(status?: string): TaskStatusType {
  if (!status) return TaskStatus.TODO;
  const normalized = status.toLowerCase() as TaskStatusType;
  // 验证是否是有效状态
  if (isValidStatus(normalized)) return normalized;
  return TaskStatus.TODO;
}

/**
 * 规范化优先级值（统一转为小写）
 */
function normalizePriority(priority?: string): string {
  if (!priority) return 'medium';
  const normalized = priority.toLowerCase();
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  return validPriorities.includes(normalized) ? normalized : 'medium';
}

// 所有角色（可查看）
const ALL_ROLES = ['owner', 'director', 'manager', 'member', 'observer'] as const;
// 可编辑角色（工作区级别）
const EDIT_ROLES = ['owner', 'director', 'manager', 'member'] as const;
// 可删除角色
const DELETE_ROLES = ['owner', 'director', 'manager'] as const;

/**
 * 检查用户是否有任务编辑权限
 * 权限条件:
 * 1. owner, director, manager: 可以编辑所有任务
 * 2. member: 创建任务时可以创建，编辑时只能编辑自己创建或被分配的任务
 * 3. observer: 无编辑权限
 * 4. 项目负责人: 可以编辑项目内所有任务
 */
async function canEditTask(
  projectId: string, 
  workspaceId: string, 
  userId: string, 
  task?: { creatorId: string; assigneeId: string | null },
  isProjectLeader?: boolean,
  isCreating?: boolean  // 是否是创建任务操作
): Promise<boolean> {
  // 1. 检查工作区角色（owner, director, manager 可以编辑所有任务）
  const hasAdminRole = await workspaceService.hasRole(workspaceId, userId, ['owner', 'director', 'manager']);
  if (hasAdminRole) return true;
  
  // 2. 项目负责人可以编辑项目内所有任务
  if (isProjectLeader) return true;

  // 3. 检查工作区成员资格
  const membership = await workspaceService.getMembership(workspaceId, userId);
  if (!membership) return false;
  
  const mappedRole = mapRole(membership.role);
  
  // observer 无编辑权限
  if (mappedRole === 'observer') return false;

  // 4. 创建任务时，member 作为项目成员或工作区成员可以创建
  if (isCreating && mappedRole === 'member') {
    // 检查是否是项目成员（使用 projectRepository 避免循环依赖）
    const projectMember = await projectRepository.findProjectMember(projectId, userId);
    // 项目成员或工作区 member 都可以创建任务
    return !!projectMember || true;
  }

  // 5. 编辑任务时，member 只能编辑自己创建或被分配的任务
  if (task && mappedRole === 'member') {
    const isCreator = task.creatorId === userId;
    const isAssignee = task.assigneeId === userId;
    if (isCreator || isAssignee) {
      return true;
    }
  }

  return false;
}

/**
 * 检查用户是否有权限删除任务
 * 删除权限（严格）：
 * 1. 工作区 owner, director, manager 可以删除
 * 2. 项目负责人可以删除项目内任务
 * 注意：member 不能删除任务（包括自己创建的）
 */
async function canDeleteTask(
  task: {
    creatorId: string;
    project: {
      leaderId: string | null;
      workspaceId: string;
      members?: Array<{ userId: string; isLeader: boolean }>;
      workspace?: { members: Array<{ userId: string; role: string }> };
    };
  },
  userId: string
): Promise<boolean> {
  // 1. 项目负责人可以删除项目内任务
  if (task.project.leaderId === userId) return true;

  // 2. 项目成员中标记为 leader 的用户
  if (task.project.members?.some(m => m.userId === userId && m.isLeader)) {
    return true;
  }

  // 3. 工作区 owner, director, manager 可以删除
  if (task.project.workspace?.members) {
    const canDelete = task.project.workspace.members.some(
      m => m.userId === userId && ['owner', 'director', 'manager'].includes(mapRole(m.role))
    );
    if (canDelete) return true;
  } else {
    // 如果 workspace.members 未加载，使用 workspaceService 查询
    const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
    if (role && ['owner', 'director', 'manager'].includes(mapRole(role))) return true;
  }

  // member 和 observer 不能删除任务
  return false;
}

export const taskService = {
  // 暴露 canDeleteTask 供内部使用
  canDeleteTask,
  /**
   * 创建任务
   * 权限：工作区编辑角色、项目负责人、项目团队成员 可以创建
   * 规则：
   * - member 创建任务时自动成为负责人，不能分配给他人
   * - observer 不能创建任务，也不能被分配任务
   */
  async create(userId: string, data: Omit<CreateTaskInput, 'creatorId'>) {
    // 1. 检查项目是否存在并获取 workspaceId
    const project = await projectRepository.findById(data.projectId);
    if (!project) {
      throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
    }

    // 2. 检查用户是否有权限创建任务（isCreating = true）
    const hasPermission = await canEditTask(data.projectId, project.workspaceId, userId, undefined, undefined, true);
    if (!hasPermission) {
      throw new AppError('没有权限创建任务', 403, 'FORBIDDEN');
    }

    // 3. 获取创建者的工作区角色
    const creatorMembership = await workspaceService.getMembership(project.workspaceId, userId);
    const creatorRole = creatorMembership ? mapRole(creatorMembership.role) : 'observer';

    // 4. member 创建任务时，必须分配给自己（不能分配给他人）
    let finalAssigneeId = data.assigneeId;
    if (creatorRole === 'member') {
      if (data.assigneeId && data.assigneeId !== userId) {
        throw new AppError('您只能创建分配给自己的任务', 403, 'MEMBER_CANNOT_ASSIGN_OTHERS');
      }
      // member 创建任务时自动成为负责人
      finalAssigneeId = userId;
    }

    // 5. 检查被分配者不能是 observer
    if (finalAssigneeId) {
      const assigneeMembership = await workspaceService.getMembership(project.workspaceId, finalAssigneeId);
      if (assigneeMembership) {
        const assigneeRole = mapRole(assigneeMembership.role);
        if (assigneeRole === 'observer') {
          throw new AppError('不能将任务分配给观察者', 400, 'CANNOT_ASSIGN_TO_OBSERVER');
        }
      }
    }

    // 6. 禁止在创建时设置状态（新任务必须为 todo）
    // 使用规范化后的状态进行比较，兼容大小写输入
    if (data.status && normalizeStatus(data.status) !== TaskStatus.TODO) {
      throw new AppError('新创建的任务状态必须为「待办」，请使用状态转换 API 修改状态', 400, 'INVALID_INITIAL_STATUS');
    }

    // 7. 验证并规范化优先级（兼容大小写）
    const normalizedPriority = data.priority ? normalizePriority(data.priority) : undefined;
    if (normalizedPriority && !isValidPriority(normalizedPriority)) {
      throw new AppError(`无效的优先级: ${data.priority}`, 400, 'INVALID_PRIORITY');
    }

    // 8. 如果指定了父任务，检查父任务是否存在且属于同一项目
    // 同时校验层级深度（最多支持3级任务嵌套）
    if (data.parentId) {
      const parentTask = await taskRepository.findById(data.parentId);
      if (!parentTask) {
        throw new AppError('父任务不存在', 404, 'PARENT_TASK_NOT_FOUND');
      }
      if (parentTask.projectId !== data.projectId) {
        throw new AppError('子任务必须与父任务属于同一项目', 400, 'INVALID_PARENT');
      }
      
      // 计算父任务的层级（通过递归查找 parentId 链）
      const parentLevel = await this.getTaskLevel(data.parentId);
      if (parentLevel >= 3) {
        throw new AppError('最多支持3级任务嵌套，无法创建更深层级的子任务', 400, 'MAX_DEPTH_EXCEEDED');
      }
    }

    // 9. 创建任务（强制状态为 todo，使用处理后的 assigneeId）
    const task = await taskRepository.create({
      ...data,
      assigneeId: finalAssigneeId,
      status: TaskStatus.TODO, // 强制新任务为 todo
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
   * 规则：
   * - member 不能将任务分配给他人
   * - observer 不能被分配任务
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

    // 4. 获取操作者的工作区角色
    const operatorMembership = await workspaceService.getMembership(task.project.workspaceId, userId);
    const operatorRole = operatorMembership ? mapRole(operatorMembership.role) : 'observer';

    // 5. member 不能将任务分配给他人（只能分配给自己或不改变）
    if (operatorRole === 'member' && data.assigneeId !== undefined) {
      if (data.assigneeId !== null && data.assigneeId !== userId && data.assigneeId !== task.assigneeId) {
        throw new AppError('您没有权限将任务分配给他人', 403, 'MEMBER_CANNOT_ASSIGN_OTHERS');
      }
    }

    // 6. 检查被分配者不能是 observer
    if (data.assigneeId) {
      const assigneeMembership = await workspaceService.getMembership(task.project.workspaceId, data.assigneeId);
      if (assigneeMembership) {
        const assigneeRole = mapRole(assigneeMembership.role);
        if (assigneeRole === 'observer') {
          throw new AppError('不能将任务分配给观察者', 400, 'CANNOT_ASSIGN_TO_OBSERVER');
        }
      }
    }

    // 7. 验证并规范化优先级（兼容大小写）
    if (data.priority) {
      const normalizedUpdatePriority = normalizePriority(data.priority);
      if (!isValidPriority(normalizedUpdatePriority)) {
        throw new AppError(`无效的优先级: ${data.priority}`, 400, 'INVALID_PRIORITY');
      }
      // 使用规范化后的优先级
      data.priority = normalizedUpdatePriority;
    }

    // 8. 如果要更新状态，使用专门的状态变更方法
    const normalizedTaskStatus = normalizeStatus(task.status);
    const normalizedDataStatus = data.status ? normalizeStatus(data.status) : undefined;
    if (normalizedDataStatus && normalizedDataStatus !== normalizedTaskStatus) {
      throw new AppError('请使用 PATCH /tasks/:id/status 接口变更状态', 400, 'USE_STATUS_ENDPOINT');
    }

    // 9. 更新任务
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
   * 删除任务（支持级联删除子任务）
   * 权限：owner, admin, leader 可以删除；项目负责人可以删除项目内任务
   * 返回：删除的子任务数量
   */
  async delete(userId: string, taskId: string): Promise<{ deletedCount: number; subtaskCount: number }> {
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

    // 获取所有后代子任务（用于级联删除）
    const descendants = await this.getAllDescendants(taskId);
    const subtaskCount = descendants.length;

    // 删除所有后代子任务（从叶子节点开始）
    // 使用数据库级联删除或逐个删除
    for (const descendantId of descendants.reverse()) {
      await taskRepository.delete(descendantId);
    }

    // 删除主任务
    await taskRepository.delete(taskId);

    return { deletedCount: 1 + subtaskCount, subtaskCount };
  },

  /**
   * 获取任务的子任务数量（用于删除确认弹窗）
   */
  async getSubtaskCount(taskId: string): Promise<number> {
    const descendants = await this.getAllDescendants(taskId);
    return descendants.length;
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
   * 批量完成任务（智能实现 - 使用智能状态转换）
   * 逻辑：
   * - 使用 changeStatusSmart 处理每个任务
   * - 自动处理审核流程
   * - 统计自动提交审核的任务
   */
  async batchComplete(userId: string, taskIds: string[]) {
    if (!taskIds || taskIds.length === 0) {
      throw new AppError('请提供要完成的任务ID列表', 400, 'MISSING_TASK_IDS');
    }

    const results: { 
      success: string[]; 
      failed: Array<{ id: string; reason: string }>;
      autoReviewed: string[];  // 自动提交审核的任务
    } = {
      success: [],
      failed: [],
      autoReviewed: [],
    };

    for (const taskId of taskIds) {
      try {
        // 使用智能状态转换
        const result = await this.changeStatusSmart(userId, taskId, 'done');

        if (result.actualStatus === TaskStatus.DONE) {
          results.success.push(taskId);
        } else if (result.actualStatus === TaskStatus.REVIEW) {
          results.autoReviewed.push(taskId);
        } else {
          results.failed.push({ 
            id: taskId, 
            reason: `状态转换为「${STATUS_LABELS[result.actualStatus]}」，未完成` 
          });
        }
      } catch (error) {
        results.failed.push({ 
          id: taskId, 
          reason: error instanceof AppError ? error.message : '未知错误' 
        });
      }
    }

    // 智能级联：检查父任务是否应该自动完成
    if (results.success.length > 0) {
      const completedTasks = await prisma.task.findMany({
        where: { id: { in: results.success } },
        select: { parentId: true },
      });

      const parentIds = [...new Set(
        completedTasks.map((t: { parentId: string | null }) => t.parentId).filter(Boolean) as string[]
      )];

      for (const parentId of parentIds) {
        const allSubtasks = await prisma.task.findMany({
          where: { parentId },
          select: { status: true },
        });

        const allDone = allSubtasks.length > 0 && allSubtasks.every((t: { status: string }) => t.status === TaskStatus.DONE);

        if (allDone) {
          try {
            await prisma.task.update({
              where: { id: parentId },
              data: { 
                status: TaskStatus.DONE,
                completedAt: new Date(),
              },
            });
            await taskEventRepository.create({
              taskId: parentId,
              userId,
              type: 'status_changed',
              data: {
                description: `所有子任务已完成，父任务自动完成`,
                oldValue: 'in_progress',
                newValue: TaskStatus.DONE,
              },
            });
          } catch (error) {
            // 级联完成失败不影响主操作结果
            console.error(`级联完成父任务 ${parentId} 失败:`, error);
          }
        }
      }
    }

    return results;
  },

  /**
   * 批量删除任务（含级联删除子任务）
   * 权限：owner, admin, leader, 项目负责人, 任务创建者
   */
  async batchDelete(userId: string, taskIds: string[]) {
    if (!taskIds || taskIds.length === 0) {
      throw new AppError('请提供要删除的任务ID列表', 400, 'MISSING_TASK_IDS');
    }

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: {
        project: {
          include: {
            members: true,
            workspace: {
              include: { members: true },
            },
          },
        },
        subTasks: {
          select: { id: true },
        },
      },
    });

    if (tasks.length === 0) {
      throw new AppError('未找到要删除的任务', 404, 'TASKS_NOT_FOUND');
    }

    const results: {
      success: string[];
      failed: Array<{ id: string; reason: string }>;
      subtaskCount: number;
    } = {
      success: [],
      failed: [],
      subtaskCount: 0,
    };

    // 检查权限并统计子任务
    for (const task of tasks) {
      const canDelete = await this.canDeleteTask(task, userId);
      
      if (!canDelete) {
        results.failed.push({ 
          id: task.id, 
          reason: '无权删除此任务（需要：创建者/项目负责人/管理员）' 
        });
        continue;
      }

      results.success.push(task.id);
      results.subtaskCount += task.subTasks.length;
    }

    // 执行删除（级联删除子任务）
    if (results.success.length > 0) {
      await prisma.task.deleteMany({
        where: {
          OR: [
            { id: { in: results.success } },
            { parentId: { in: results.success } },
          ],
        },
      });
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
      if (!['owner', 'director', 'manager'].includes(role || '')) {
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
      if (!['owner', 'director'].includes(role || '')) {
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
      if (!['owner', 'director'].includes(role || '')) {
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
   * 智能状态转换 - 保留用户习惯，后端智能处理
   * 根据用户选择的状态，智能判断实际应该执行的操作
   */
  async changeStatusSmart(userId: string, taskId: string, newStatus: string) {
    // 1. 获取任务信息
    const task = await taskRepository.findByIdWithDetails(taskId);
    if (!task) {
      throw new AppError('任务不存在', 404, 'TASK_NOT_FOUND');
    }

    // 规范化状态值（兼容大小写输入）
    const oldStatus = normalizeStatus(task.status);
    newStatus = normalizeStatus(newStatus);

    // 2. 权限检查
    const isProjectLeader = task.project.leaderId === userId;
    const hasPermission = await canEditTask(
      task.projectId,
      task.project.workspaceId,
      userId,
      { creatorId: task.creatorId, assigneeId: task.assigneeId },
      isProjectLeader
    );
    if (!hasPermission) {
      throw new AppError('无权修改此任务', 403, 'FORBIDDEN');
    }

    // 3. 状态值验证
    const validStatuses = ['todo', 'in_progress', 'review', 'done'];
    if (!validStatuses.includes(newStatus)) {
      throw new AppError('无效的状态', 400, 'INVALID_STATUS');
    }

    // 3.5 子任务（L2/L3）禁止进入 review 状态
    const taskLevel = await this.getTaskLevel(taskId);
    if (taskLevel > 1 && newStatus === 'review') {
      throw new AppError('子任务无需审核，请直接完成', 400, 'SUBTASK_NO_REVIEW');
    }

    // 4. 智能转换逻辑
    let actualStatus = newStatus as TaskStatusType;
    let message = '';
    let needsNotification = false;

    try {
      // === 各种状态转换场景 ===

      // 场景1: todo → done (禁止)
      if (oldStatus === TaskStatus.TODO && newStatus === 'done') {
        throw new AppError('待办任务需要先开始，才能完成', 400, 'INVALID_TRANSITION');
      }

      // 场景2: todo → review (禁止)
      if (oldStatus === TaskStatus.TODO && newStatus === 'review') {
        throw new AppError('待办任务需要先开始，才能提交审核', 400, 'INVALID_TRANSITION');
      }

      // 场景3: todo → in_progress (开始任务)
      if (oldStatus === TaskStatus.TODO && newStatus === 'in_progress') {
        await this.startTask(userId, taskId);
        actualStatus = TaskStatus.IN_PROGRESS;
        message = '任务已开始';
      }

      // 场景4: in_progress → todo (退回待办)
      else if (oldStatus === TaskStatus.IN_PROGRESS && newStatus === 'todo') {
        if (!canTransition(oldStatus, TaskStatus.TODO)) {
          throw new AppError('不能从「进行中」转换到「待办」', 400, 'INVALID_TRANSITION');
        }
        await taskRepository.update(taskId, {
          status: TaskStatus.TODO,
          completedAt: null,
        });
        await taskEventRepository.create({
          taskId,
          userId,
          type: 'status_changed',
          data: {
            description: `将状态从「${STATUS_LABELS[oldStatus]}」变更为「${STATUS_LABELS[TaskStatus.TODO]}」`,
            oldValue: oldStatus,
            newValue: TaskStatus.TODO,
          },
        });
        actualStatus = TaskStatus.TODO;
        message = '任务已退回待办';
      }

      // 场景5: in_progress → review (提交审核)
      else if (oldStatus === TaskStatus.IN_PROGRESS && newStatus === 'review') {
        await this.submitForReview(userId, taskId);
        actualStatus = TaskStatus.REVIEW;
        message = '任务已提交审核';
        needsNotification = true;
      }

      // 场景6: in_progress → done (智能完成)
      else if (oldStatus === TaskStatus.IN_PROGRESS && newStatus === 'done') {
        // 检查是否有审核权限（项目负责人或管理员）
        const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
        const canApprove = isProjectLeader || ['owner', 'director'].includes(role || '');

        // 当前系统不强制审核，允许直接完成
        // 如果需要审核且用户无审核权限，则自动提交审核
        // 注意：当前项目模型中没有 requireReview 字段，默认不强制审核
        // 如果需要强制审核，可以在项目设置中添加此字段
        const requiresReview = false; // 默认不强制审核
        if (requiresReview && !canApprove) {
          // 自动提交审核
          await this.submitForReview(userId, taskId);
          actualStatus = TaskStatus.REVIEW;
          message = '任务已提交审核，等待项目负责人审核通过';
          needsNotification = true;
        } else {
          // 直接完成
          await this.completeTask(userId, taskId);
          actualStatus = TaskStatus.DONE;
          message = '任务已完成';
        }
      }

      // 场景7: review → in_progress (退回修改)
      else if (oldStatus === TaskStatus.REVIEW && newStatus === 'in_progress') {
        if (!isProjectLeader) {
          const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
          if (!['owner', 'director'].includes(role || '')) {
            throw new AppError('只有项目负责人可以退回任务', 403, 'FORBIDDEN');
          }
        }
        await this.rejectTask(userId, taskId, '手动退回');
        actualStatus = TaskStatus.IN_PROGRESS;
        message = '任务已退回修改';
        needsNotification = true;
      }

      // 场景8: review → done (审核通过)
      else if (oldStatus === TaskStatus.REVIEW && newStatus === 'done') {
        if (!isProjectLeader) {
          const role = await workspaceService.getUserRole(task.project.workspaceId, userId);
          if (!['owner', 'director'].includes(role || '')) {
            throw new AppError('只有项目负责人可以审核通过', 403, 'FORBIDDEN');
          }
        }
        await this.approveTask(userId, taskId);
        actualStatus = TaskStatus.DONE;
        message = '审核通过，任务已完成';
        needsNotification = true;
      }

      // 场景9: done → in_progress (重新打开)
      else if (oldStatus === TaskStatus.DONE && newStatus === 'in_progress') {
        await this.reopenTask(userId, taskId);
        actualStatus = TaskStatus.IN_PROGRESS;
        message = '任务已重新打开';
      }

      // 场景10: done → todo/review (禁止)
      else if (oldStatus === TaskStatus.DONE && (newStatus === 'todo' || newStatus === 'review')) {
        throw new AppError('已完成的任务只能重新打开为「进行中」状态', 400, 'INVALID_TRANSITION');
      }

      // 场景11: 相同状态 (无变化)
      else if (oldStatus === newStatus) {
        message = '状态未改变';
      }

      // 场景12: 其他非法转换
      else {
        throw new AppError(
          `不能从「${STATUS_LABELS[oldStatus] || oldStatus}」转换到「${STATUS_LABELS[newStatus as TaskStatusType] || newStatus}」`,
          400,
          'INVALID_TRANSITION'
        );
      }

      // 5. 状态联动触发
      const normalizedActualStatus = (actualStatus || 'todo').toLowerCase() as TaskStatusType;
      
      // 5.1 子任务完成时，检查是否需要更新父任务
      if (normalizedActualStatus === TaskStatus.DONE && task.parentId) {
        await this.triggerParentStatusUpdate(taskId, userId);
      }
      
      // 5.2 子任务开始时，触发父任务开始
      if (normalizedActualStatus === TaskStatus.IN_PROGRESS && oldStatus === TaskStatus.TODO && task.parentId) {
        await this.triggerParentStart(taskId, userId);
      }
      
      // 5.3 子任务被重新打开时（从 done 变回其他状态），检查父任务
      if (oldStatus === TaskStatus.DONE && normalizedActualStatus !== TaskStatus.DONE && task.parentId) {
        await this.triggerParentStatusRevert(taskId, userId);
      }

      // 6. 获取更新后的任务
      const updatedTask = await taskRepository.findByIdWithDetails(taskId);

      return {
        task: {
          ...updatedTask,
          status: normalizedActualStatus, // 确保状态值是小写
        },
        actualStatus: normalizedActualStatus,
        message,
        statusChanged: oldStatus !== normalizedActualStatus,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error instanceof Error ? error.message : '状态转换失败', 400, 'STATUS_CHANGE_FAILED');
    }
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
      if (!['owner', 'director', 'manager'].includes(role || '')) {
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
      if (!['owner', 'director'].includes(role || '')) {
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
      if (!['owner', 'director', 'manager'].includes(role || '')) {
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

  // ========================================
  // 三级任务体系辅助方法
  // ========================================

  /**
   * 获取任务的层级（Level 1/2/3）
   * Level 1 = 主任务（无 parentId）
   * Level 2 = 子任务（父任务是 Level 1）
   * Level 3 = 子子任务（父任务是 Level 2）
   */
  async getTaskLevel(taskId: string): Promise<number> {
    let level = 1;
    let currentId: string | null = taskId;
    
    while (currentId) {
      const task = await taskRepository.findById(currentId);
      if (!task || !task.parentId) break;
      level++;
      currentId = task.parentId;
    }
    
    return level;
  },

  /**
   * 检查任务是否是子任务（Level 2 或 Level 3）
   */
  async isSubtask(taskId: string): Promise<boolean> {
    const task = await taskRepository.findById(taskId);
    return task?.parentId != null;
  },

  /**
   * 获取任务的所有子任务（直接子任务，不递归）
   */
  async getDirectChildren(taskId: string) {
    return prisma.task.findMany({
      where: { parentId: taskId },
    });
  },

  /**
   * 获取任务的所有后代子任务（递归）
   */
  async getAllDescendants(taskId: string): Promise<string[]> {
    const descendants: string[] = [];
    const queue = [taskId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await prisma.task.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });
      
      for (const child of children) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }
    
    return descendants;
  },

  /**
   * 状态联动：检查并更新父任务状态
   * 规则：
   * - 如果所有子任务都完成，父任务自动进入下一状态
   * - L3 全完成 → L2 自动 done
   * - L2 全完成 → L1 自动 review（需要审核）
   */
  async triggerParentStatusUpdate(taskId: string, userId: string): Promise<void> {
    const task = await taskRepository.findById(taskId);
    if (!task?.parentId) return;

    const parentTask = await taskRepository.findByIdWithDetails(task.parentId);
    if (!parentTask) return;

    // 获取所有兄弟任务（包括自己）
    const siblings = await prisma.task.findMany({
      where: { parentId: task.parentId },
      select: { status: true },
    });

    // 检查是否所有子任务都已完成
    const allCompleted = siblings.every(s => s.status === 'done');
    if (!allCompleted) return;

    // 获取父任务层级
    const parentLevel = await this.getTaskLevel(task.parentId);

    if (parentLevel === 1) {
      // L1 主任务：子任务全完成 → 自动进入 review（需要审核）
      if (parentTask.status === 'in_progress') {
        await taskRepository.update(task.parentId, { status: TaskStatus.REVIEW });
        await taskEventRepository.create({
          taskId: task.parentId,
          userId,
          type: 'status_changed',
          data: {
            description: '所有子任务已完成，自动提交审核',
            oldValue: 'in_progress',
            newValue: 'review',
            autoTriggered: true,
          },
        });
      }
    } else {
      // L2/L3 子任务：子任务全完成 → 自动完成（不需要审核）
      if (parentTask.status !== 'done') {
        await taskRepository.update(task.parentId, { 
          status: TaskStatus.DONE,
          completedAt: new Date(),
        });
        await taskEventRepository.create({
          taskId: task.parentId,
          userId,
          type: 'status_changed',
          data: {
            description: '所有子任务已完成，自动完成',
            oldValue: parentTask.status,
            newValue: 'done',
            autoTriggered: true,
          },
        });
        
        // 递归检查更上层的父任务
        await this.triggerParentStatusUpdate(task.parentId, userId);
      }
    }
  },

  /**
   * 逆向联动：子任务被重新打开时，检查父任务状态
   * 规则：
   * - 如果 L1 主任务在 review 状态，子任务被重新打开 → L1 自动退回 in_progress
   */
  async triggerParentStatusRevert(taskId: string, userId: string): Promise<void> {
    const task = await taskRepository.findById(taskId);
    if (!task?.parentId) return;

    // 递归查找顶层父任务（L1）
    let currentParentId = task.parentId;
    while (currentParentId) {
      const parentTask = await taskRepository.findById(currentParentId);
      if (!parentTask) break;
      
      // 如果父任务在 review 状态，退回 in_progress
      if (parentTask.status === 'review') {
        await taskRepository.update(currentParentId, { status: TaskStatus.IN_PROGRESS });
        await taskEventRepository.create({
          taskId: currentParentId,
          userId,
          type: 'status_changed',
          data: {
            description: '子任务被重新打开，自动退回进行中',
            oldValue: 'review',
            newValue: 'in_progress',
            autoTriggered: true,
          },
        });
      }
      
      // 继续向上检查
      currentParentId = parentTask.parentId || '';
      if (!currentParentId) break;
    }
  },

  /**
   * 子任务开始时，触发父任务状态更新
   * 规则：父任务 todo → in_progress
   */
  async triggerParentStart(taskId: string, userId: string): Promise<void> {
    const task = await taskRepository.findById(taskId);
    if (!task?.parentId) return;

    const parentTask = await taskRepository.findById(task.parentId);
    if (!parentTask) return;

    // 如果父任务还是 todo，自动开始
    if (parentTask.status === 'todo') {
      await taskRepository.update(task.parentId, { status: TaskStatus.IN_PROGRESS });
      await taskEventRepository.create({
        taskId: task.parentId,
        userId,
        type: 'status_changed',
        data: {
          description: '子任务开始，自动开始父任务',
          oldValue: 'todo',
          newValue: 'in_progress',
          autoTriggered: true,
        },
      });
      
      // 递归向上触发
      await this.triggerParentStart(task.parentId, userId);
    }
  },
};
