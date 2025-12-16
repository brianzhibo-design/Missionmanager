/**
 * 定时任务服务
 * 处理每日上班提醒、咖啡抽奖等定时任务
 */
import { prisma } from '../infra/database';
import { emailService } from '../lib/emailService';
import { coffeeService } from './coffeeService';

// 简单的定时任务调度（生产环境建议使用 node-cron 或 agenda）
let schedulerInterval: NodeJS.Timeout | null = null;
let lastDailyReminderDate: string | null = null;

/**
 * 发送每日上班提醒
 */
async function sendDailyReminders(): Promise<void> {
  console.log('[Scheduler] 开始发送每日上班提醒...');

  try {
    // 获取所有工作区
    const workspaces = await prisma.workspace.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    for (const workspace of workspaces) {
      // 执行咖啡抽奖
      let coffeeWinner: { name: string; id: string } | null = null;
      try {
        const result = await coffeeService.drawLottery(workspace.id);
        coffeeWinner = result.winner;
        if (!result.alreadyDrawn) {
          console.log(`[Scheduler] ${workspace.name} 咖啡抽奖: ${coffeeWinner.name}`);
        }
      } catch (error) {
        console.error(`[Scheduler] ${workspace.name} 咖啡抽奖失败:`, error);
      }

      // 为每个成员发送提醒
      for (const member of workspace.members) {
        const user = member.user;
        if (!user.email) continue;

        try {
          // 获取用户今日任务
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const tasks = await prisma.task.findMany({
            where: {
              assigneeId: user.id,
              status: { in: ['todo', 'in_progress', 'review'] },
              OR: [
                { dueDate: { lte: tomorrow } }, // 今天或已逾期
                { dueDate: null }, // 没有截止日期的任务
              ],
            },
            include: {
              project: {
                select: { name: true },
              },
            },
            orderBy: [
              { priority: 'desc' },
              { dueDate: 'asc' },
            ],
            take: 10,
          });

          const taskInfos = tasks.map((task) => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate,
            projectName: task.project.name,
          }));

          // 发送邮件
          await emailService.sendDailyReminderEmail(
            user.email,
            user.name,
            taskInfos,
            coffeeWinner
              ? {
                  name: coffeeWinner.name,
                  isCurrentUser: coffeeWinner.id === user.id,
                }
              : undefined
          );

          console.log(`[Scheduler] 已发送提醒给 ${user.name} (${user.email})`);
        } catch (error) {
          console.error(`[Scheduler] 发送提醒给 ${user.email} 失败:`, error);
        }
      }
    }

    console.log('[Scheduler] 每日上班提醒发送完成');
  } catch (error) {
    console.error('[Scheduler] 发送每日提醒失败:', error);
  }
}

/**
 * 检查并执行定时任务
 */
async function checkScheduledTasks(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];

  // 每天凌晨0点刷新咖啡抽奖和发送提醒（只发送一次）
  if (currentHour === 0 && lastDailyReminderDate !== currentDate) {
    lastDailyReminderDate = currentDate;
    await sendDailyReminders();
  }
}

export const schedulerService = {
  /**
   * 启动定时任务调度器
   */
  start(): void {
    if (schedulerInterval) {
      console.log('[Scheduler] 调度器已在运行');
      return;
    }

    console.log('[Scheduler] 启动定时任务调度器...');

    // 每分钟检查一次
    schedulerInterval = setInterval(checkScheduledTasks, 60 * 1000);

    // 立即检查一次
    checkScheduledTasks();
  },

  /**
   * 停止定时任务调度器
   */
  stop(): void {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log('[Scheduler] 定时任务调度器已停止');
    }
  },

  /**
   * 手动触发每日提醒（用于测试）
   */
  async triggerDailyReminders(): Promise<void> {
    await sendDailyReminders();
  },
};

