/**
 * 邮件模板
 * 包含各种通知邮件的 HTML 模板
 */

// 基础模板包装
function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 30px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #6366F1;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      margin-top: 5px;
      text-transform: uppercase;
    }
    .task-list {
      margin: 20px 0;
    }
    .task-item {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      border-left: 4px solid #6366F1;
      background: #f8fafc;
      margin-bottom: 10px;
      border-radius: 0 8px 8px 0;
    }
    .task-item.urgent {
      border-left-color: #EF4444;
      background: #FEF2F2;
    }
    .task-item.warning {
      border-left-color: #F59E0B;
      background: #FFFBEB;
    }
    .task-item.success {
      border-left-color: #10B981;
      background: #ECFDF5;
    }
    .task-title {
      flex: 1;
      font-weight: 500;
    }
    .task-meta {
      font-size: 12px;
      color: #64748b;
    }
    .btn {
      display: inline-block;
      background: #6366F1;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin-top: 20px;
    }
    .btn:hover {
      background: #4F46E5;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #94a3b8;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      margin: 25px 0 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      margin-right: 8px;
    }
    .badge-urgent { background: #FEE2E2; color: #DC2626; }
    .badge-high { background: #FFEDD5; color: #EA580C; }
    .badge-medium { background: #DBEAFE; color: #2563EB; }
    .badge-low { background: #F3F4F6; color: #6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      ${content}
    </div>
  </div>
</body>
</html>
  `;
}

// ==================== 任务提醒模板 ====================

interface TaskReminderData {
  userName: string;
  tasks: Array<{
    title: string;
    projectName: string;
    dueDate: string;
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    daysLeft: number;
  }>;
  appUrl: string;
}

export function getTaskReminderTemplate(data: TaskReminderData): string {
  const priorityClass: Record<string, string> = {
    URGENT: 'urgent',
    HIGH: 'warning',
    MEDIUM: '',
    LOW: ''
  };

  const priorityLabel: Record<string, string> = {
    URGENT: '紧急',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低'
  };

  const taskItems = data.tasks.map(task => {
    const dueText = task.daysLeft < 0 
      ? `已逾期 ${Math.abs(task.daysLeft)} 天` 
      : task.daysLeft === 0 
        ? '今日到期' 
        : `${task.daysLeft} 天后到期`;
    
    return `
      <div class="task-item ${priorityClass[task.priority]}">
        <div class="task-title">
          <span class="badge badge-${task.priority.toLowerCase()}">${priorityLabel[task.priority]}</span>
          ${task.title}
        </div>
        <div class="task-meta">
          <div>${task.projectName}</div>
          <div>${dueText}</div>
        </div>
      </div>
    `;
  }).join('');

  const overdueCount = data.tasks.filter(t => t.daysLeft < 0).length;
  const todayCount = data.tasks.filter(t => t.daysLeft === 0).length;

  return wrapTemplate(`
    <div class="header">
      <h1>⏰ 任务提醒</h1>
      <p>您有 ${data.tasks.length} 个任务需要关注</p>
    </div>
    <div class="content">
      <p>您好，${data.userName}：</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" style="color: #EF4444;">${overdueCount}</div>
          <div class="stat-label">已逾期</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #F59E0B;">${todayCount}</div>
          <div class="stat-label">今日到期</div>
        </div>
      </div>

      <div class="section-title">📋 任务列表</div>
      <div class="task-list">
        ${taskItems}
      </div>

      <a href="${data.appUrl}/my-tasks" class="btn">查看全部任务</a>
    </div>
    <div class="footer">
      <p>此邮件由 TaskFlow 自动发送，请勿直接回复</p>
    </div>
  `);
}

// ==================== 任务分配通知模板 ====================

interface TaskAssignedData {
  userName: string;
  assignerName: string;
  task: {
    title: string;
    description?: string;
    projectName: string;
    priority: string;
    dueDate?: string;
  };
  appUrl: string;
}

export function getTaskAssignedTemplate(data: TaskAssignedData): string {
  return wrapTemplate(`
    <div class="header">
      <h1>📋 新任务分配</h1>
      <p>${data.assignerName} 给您分配了一个新任务</p>
    </div>
    <div class="content">
      <p>您好，${data.userName}：</p>
      
      <div class="task-item">
        <div class="task-title">${data.task.title}</div>
      </div>
      
      ${data.task.description ? `<p style="color: #64748b;">${data.task.description}</p>` : ''}
      
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>项目：</strong>${data.task.projectName}</p>
        <p style="margin: 5px 0;"><strong>优先级：</strong>${data.task.priority}</p>
        ${data.task.dueDate ? `<p style="margin: 5px 0;"><strong>截止日期：</strong>${data.task.dueDate}</p>` : ''}
      </div>

      <a href="${data.appUrl}/my-tasks" class="btn">查看任务详情</a>
    </div>
    <div class="footer">
      <p>此邮件由 TaskFlow 自动发送，请勿直接回复</p>
    </div>
  `);
}

// ==================== 每日工作摘要模板 ====================

interface DailySummaryData {
  userName: string;
  date: string;
  summary: {
    completedYesterday: number;
    todoToday: number;
    overdueCount: number;
    inProgressCount: number;
  };
  todayTasks: Array<{
    title: string;
    projectName: string;
    priority: string;
  }>;
  appUrl: string;
}

export function getDailySummaryTemplate(data: DailySummaryData): string {
  const taskItems = data.todayTasks.slice(0, 5).map(task => `
    <div class="task-item">
      <div class="task-title">${task.title}</div>
      <div class="task-meta">${task.projectName}</div>
    </div>
  `).join('');

  return wrapTemplate(`
    <div class="header">
      <h1>☀️ 每日工作摘要</h1>
      <p>${data.date}</p>
    </div>
    <div class="content">
      <p>早上好，${data.userName}！以下是您今天的工作安排：</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" style="color: #10B981;">${data.summary.completedYesterday}</div>
          <div class="stat-label">昨日完成</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.summary.todoToday}</div>
          <div class="stat-label">今日待办</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #3B82F6;">${data.summary.inProgressCount}</div>
          <div class="stat-label">进行中</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #EF4444;">${data.summary.overdueCount}</div>
          <div class="stat-label">已逾期</div>
        </div>
      </div>

      ${data.todayTasks.length > 0 ? `
        <div class="section-title">📋 今日任务</div>
        <div class="task-list">
          ${taskItems}
        </div>
        ${data.todayTasks.length > 5 ? `<p style="color: #64748b; font-size: 12px;">还有 ${data.todayTasks.length - 5} 个任务...</p>` : ''}
      ` : `
        <div style="text-align: center; padding: 30px; color: #64748b;">
          <p>🎉 今天没有待办任务，休息一下吧！</p>
        </div>
      `}

      <a href="${data.appUrl}/dashboard" class="btn">打开 TaskFlow</a>
    </div>
    <div class="footer">
      <p>此邮件由 TaskFlow 自动发送，请勿直接回复</p>
      <p>如需取消订阅，请在设置中关闭邮件通知</p>
    </div>
  `);
}

// ==================== 报告模板 ====================

interface ReportEmailData {
  title: string;
  workspaceName: string;
  period: string;
  type: 'daily' | 'weekly' | 'monthly';
  summary: {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    newTasks: number;
    blockedTasks: number;
    overdueCount: number;
  };
  projectBreakdown?: Array<{
    projectName: string;
    completedTasks: number;
    totalTasks: number;
    completionRate: number;
  }>;
  highlights?: string[];
  recipientName?: string;
  appUrl: string;
}

export function getReportEmailTemplate(data: ReportEmailData): string {
  const completionRate = data.summary.totalTasks > 0 
    ? Math.round((data.summary.completedTasks / data.summary.totalTasks) * 100) 
    : 0;

  const typeLabel = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报'
  };

  const typeEmoji = {
    daily: '📅',
    weekly: '📊',
    monthly: '📈'
  };

  const projectRows = data.projectBreakdown?.slice(0, 5).map(p => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${p.projectName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.completedTasks}/${p.totalTasks}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.completionRate}%</td>
    </tr>
  `).join('') || '';

  const highlightItems = data.highlights?.map(h => `<li style="margin: 8px 0;">${h}</li>`).join('') || '';

  return wrapTemplate(`
    <div class="header">
      <h1>${typeEmoji[data.type]} ${data.title}</h1>
      <p>${data.workspaceName} · ${data.period}</p>
    </div>
    <div class="content">
      ${data.recipientName ? `<p>您好，${data.recipientName}：</p>` : '<p>您好：</p>'}
      <p>以下是 ${data.workspaceName} 的${typeLabel[data.type]}摘要：</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.summary.totalProjects}</div>
          <div class="stat-label">项目总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.summary.totalTasks}</div>
          <div class="stat-label">任务总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #10B981;">${data.summary.completedTasks}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #6366F1;">${completionRate}%</div>
          <div class="stat-label">完成率</div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" style="color: #3B82F6;">${data.summary.newTasks}</div>
          <div class="stat-label">新建任务</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #EF4444;">${data.summary.overdueCount}</div>
          <div class="stat-label">逾期任务</div>
        </div>
      </div>

      ${data.projectBreakdown && data.projectBreakdown.length > 0 ? `
        <div class="section-title">📁 项目进度</div>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">项目</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">完成/总数</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">进度</th>
            </tr>
          </thead>
          <tbody>
            ${projectRows}
          </tbody>
        </table>
      ` : ''}

      ${data.highlights && data.highlights.length > 0 ? `
        <div class="section-title">✨ 重点事项</div>
        <ul style="padding-left: 20px; color: #475569;">
          ${highlightItems}
        </ul>
      ` : ''}

      <a href="${data.appUrl}/reports" class="btn">查看完整报告</a>
    </div>
    <div class="footer">
      <p>此邮件由 TaskFlow 自动发送</p>
      <p>详细报告请查看附件</p>
    </div>
  `);
}
