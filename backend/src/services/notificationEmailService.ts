/**
 * 邮件通知服务
 * 处理各种邮件通知的发送
 */
import { prisma } from '../infra/database';
import { sendEmail } from '../lib/emailService';
import {
  getTaskReminderTemplate,
  getTaskAssignedTemplate,
  getDailySummaryTemplate,
  getReportEmailTemplate
} from '../lib/emailTemplates';
import { generateReportPDF } from '../lib/pdfService';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// ==================== 任务到期提醒 ====================

export async function sendTaskReminders(): Promise<void> {
  console.log('📧 Sending task reminders...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  // 查找需要提醒的任务（3天内到期或已逾期）
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: {
        lte: in3Days,
      },
      status: {
        notIn: ['DONE'],
      },
      assigneeId: {
        not: null,
      },
    },
    include: {
      assignee: true,
      project: true,
    },
  });

  // 按用户分组
  const tasksByUser = new Map<string, typeof tasks>();
  
  for (const task of tasks) {
    if (!task.assignee?.email) continue;
    
    const userId = task.assigneeId!;
    if (!tasksByUser.has(userId)) {
      tasksByUser.set(userId, []);
    }
    tasksByUser.get(userId)!.push(task);
  }

  // 发送邮件
  let sentCount = 0;
  for (const [, userTasks] of tasksByUser) {
    const user = userTasks[0].assignee!;
    
    const taskData = userTasks.map(task => {
      const dueDate = new Date(task.dueDate!);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        title: task.title,
        projectName: task.project.name,
        dueDate: dueDate.toLocaleDateString('zh-CN'),
        priority: task.priority as 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW',
        daysLeft,
      };
    });

    // 按紧急程度排序
    taskData.sort((a, b) => a.daysLeft - b.daysLeft);

    try {
      await sendEmail({
        to: user.email,
        subject: `[TaskFlow] 您有 ${userTasks.length} 个任务需要关注`,
        html: getTaskReminderTemplate({
          userName: user.name,
          tasks: taskData,
          appUrl: APP_URL,
        }),
      });
      sentCount++;
      console.log(`✅ Reminder sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send reminder to ${user.email}:`, error);
    }
  }
  
  console.log(`📧 Task reminders completed: ${sentCount} emails sent`);
}

// ==================== 任务分配通知 ====================

export async function sendTaskAssignedNotification(
  taskId: string,
  assignerId: string
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      project: true,
    },
  });

  if (!task || !task.assignee?.email) return;

  const assigner = await prisma.user.findUnique({
    where: { id: assignerId },
  });

  try {
    await sendEmail({
      to: task.assignee.email,
      subject: `[TaskFlow] ${assigner?.name || '有人'} 给您分配了新任务`,
      html: getTaskAssignedTemplate({
        userName: task.assignee.name,
        assignerName: assigner?.name || '未知用户',
        task: {
          title: task.title,
          description: task.description || undefined,
          projectName: task.project.name,
          priority: task.priority,
          dueDate: task.dueDate?.toLocaleDateString('zh-CN'),
        },
        appUrl: APP_URL,
      }),
    });
    console.log(`✅ Task assigned notification sent to ${task.assignee.email}`);
  } catch (error) {
    console.error('❌ Failed to send task assigned notification:', error);
  }
}

// ==================== 每日工作摘要 ====================

export async function sendDailySummaries(): Promise<void> {
  console.log('📧 Sending daily summaries...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 获取所有用户
  const users = await prisma.user.findMany();

  let sentCount = 0;
  for (const user of users) {
    // 获取用户的任务统计
    const [completedYesterday, todoToday, overdueCount, inProgressCount, todayTasks] = await Promise.all([
      prisma.task.count({
        where: {
          assigneeId: user.id,
          status: 'DONE',
          updatedAt: {
            gte: yesterday,
            lt: today,
          },
        },
      }),
      prisma.task.count({
        where: {
          assigneeId: user.id,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.task.count({
        where: {
          assigneeId: user.id,
          status: { notIn: ['DONE'] },
          dueDate: { lt: today },
        },
      }),
      prisma.task.count({
        where: {
          assigneeId: user.id,
          status: 'IN_PROGRESS',
        },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: user.id,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          project: true,
        },
        take: 10,
        orderBy: { priority: 'desc' },
      }),
    ]);

    // 只有有任务的用户才发送
    if (todoToday === 0 && overdueCount === 0 && inProgressCount === 0) {
      continue;
    }

    try {
      await sendEmail({
        to: user.email,
        subject: `[TaskFlow] ${today.toLocaleDateString('zh-CN')} 每日工作摘要`,
        html: getDailySummaryTemplate({
          userName: user.name,
          date: today.toLocaleDateString('zh-CN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          summary: {
            completedYesterday,
            todoToday,
            overdueCount,
            inProgressCount,
          },
          todayTasks: todayTasks.map(t => ({
            title: t.title,
            projectName: t.project.name,
            priority: t.priority,
          })),
          appUrl: APP_URL,
        }),
      });
      sentCount++;
      console.log(`✅ Daily summary sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send daily summary to ${user.email}:`, error);
    }
  }
  
  console.log(`📧 Daily summaries completed: ${sentCount} emails sent`);
}

// ==================== 发送报告邮件 ====================

export async function sendReportEmail(
  reportId: string,
  toEmail: string,
  recipientName?: string
): Promise<void> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { workspace: true },
  });

  if (!report) {
    throw new Error('报告不存在');
  }

  const content = report.content as any || {};
  const typeMap: Record<string, 'daily' | 'weekly' | 'monthly'> = {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
  };

  const typeLabel = report.type === 'weekly' ? '周报' : report.type === 'monthly' ? '月报' : '日报';

  // 生成 PDF
  const pdfBuffer = await generateReportPDF({
    id: report.id,
    type: typeMap[report.type] || 'weekly',
    title: `${report.workspace.name} ${typeLabel}`,
    period: {
      start: new Date(report.startDate).toLocaleDateString('zh-CN'),
      end: new Date(report.endDate).toLocaleDateString('zh-CN'),
    },
    workspace: { name: report.workspace.name },
    data: {
      summary: {
        totalProjects: content.totalProjects || 0,
        totalTasks: content.totalTasks || 0,
        completedTasks: content.tasksCompleted || 0,
        newTasks: content.tasksCreated || 0,
        blockedTasks: content.tasksBlocked || 0,
        overdueCount: content.overdueCount || 0,
      },
      projectBreakdown: (content.projectStats || []).map((p: any) => ({
        projectName: p.name || '未知项目',
        totalTasks: p.total || 0,
        completedTasks: p.completed || 0,
        completionRate: p.completionRate || 0,
      })),
      aiInsights: report.highlights as string[] || [],
    },
    createdAt: report.createdAt.toISOString(),
  });

  const period = `${new Date(report.startDate).toLocaleDateString('zh-CN')} ~ ${new Date(report.endDate).toLocaleDateString('zh-CN')}`;

  await sendEmail({
    to: toEmail,
    subject: `[TaskFlow] ${report.workspace.name} ${typeLabel} - ${period}`,
    html: getReportEmailTemplate({
      title: `${report.workspace.name} ${typeLabel}`,
      workspaceName: report.workspace.name,
      period,
      type: typeMap[report.type] || 'weekly',
      summary: {
        totalProjects: content.totalProjects || 0,
        totalTasks: content.totalTasks || 0,
        completedTasks: content.tasksCompleted || 0,
        newTasks: content.tasksCreated || 0,
        blockedTasks: content.tasksBlocked || 0,
        overdueCount: content.overdueCount || 0,
      },
      projectBreakdown: (content.projectStats || []).map((p: any) => ({
        projectName: p.name || '未知项目',
        totalTasks: p.total || 0,
        completedTasks: p.completed || 0,
        completionRate: p.completionRate || 0,
      })),
      highlights: report.highlights as string[] || [],
      recipientName,
      appUrl: APP_URL,
    }),
    attachments: [{
      filename: `${report.workspace.name}-${typeLabel}-${period}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  console.log(`✅ Report email sent to ${toEmail}`);
}

