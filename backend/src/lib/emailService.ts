/**
 * 邮件服务
 * 使用 Outlook SMTP (STARTTLS) 发送邮件
 */
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

interface TaskInfo {
  id: string;
  title: string;
  priority: string;
  dueDate?: Date | null;
  projectName?: string;
}

// 支持两种环境变量命名: SMTP_* 或 EMAIL_*
const SMTP_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.office365.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587');
const SMTP_SECURE = (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true';
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const SMTP_FROM = process.env.SMTP_FROM || process.env.EMAIL_FROM || SMTP_USER;

// 创建 SMTP 传输器 (Outlook 使用 STARTTLS)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // Outlook 使用 STARTTLS，设为 false
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

// 友善幽默的早安问候语
const MORNING_GREETINGS = [
  '早安，打工人！新的一天，新的摸鱼机会（不是）',
  '早上好！今天也是元气满满的一天，让我们一起创造奇迹吧！',
  '叮咚！您的工作小助手上线啦~今天也要加油鸭！',
  '嗨，早安！喝杯咖啡，准备大展身手吧！',
  '新的一天开始了！记住：你可以的，加油！',
  '早安！今天的你一定比昨天更厉害！',
  '起床啦！今天也是充满可能性的一天！',
  '早上好！带着微笑开始工作，效率翻倍哦~',
  '嗨，又是美好的一天！让我们一起把任务清空吧！',
  '早安，小可爱！今天的任务已经迫不及待想被你完成了！',
];

// 鼓励语
const ENCOURAGEMENTS = [
  '相信自己，你可以的！',
  '一步一步来，稳扎稳打！',
  '今天完成一点，明天就轻松一点！',
  '你是最棒的，加油！',
  '专注当下，其他的交给时间！',
  '每完成一个任务，就离成功更近一步！',
  '保持热情，享受工作的乐趣！',
  '深呼吸，你一定能搞定的！',
];

/**
 * 发送邮件
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  
  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: recipients,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }))
    });
    console.log('Email sent:', info.messageId, '->', recipients);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('邮件发送失败: ' + (error as Error).message);
  }
}

/**
 * 验证 SMTP 连接
 */
export async function verifyEmailConnection(): Promise<boolean> {
  // 检查是否配置了邮件凭据
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('SMTP credentials not configured, email service disabled');
    return false;
  }
  
  console.log(`Connecting to SMTP: ${SMTP_HOST}:${SMTP_PORT} (secure: ${SMTP_SECURE})`);
  console.log(`SMTP User: ${SMTP_USER}`);
  
  try {
    await transporter.verify();
    console.log('SMTP connection verified');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}

/**
 * 邮件服务封装对象
 */
export const emailService = {
  /**
   * 发送通知邮件
   */
  async sendNotificationEmail(
    to: string,
    userName: string,
    title: string,
    message: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
          .title { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0 0 16px 0; }
          .message { font-size: 16px; color: #4b5563; line-height: 1.6; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">TaskFlow</div>
            </div>
            <h2 class="title">${title}</h2>
            <p class="message">你好，${userName}！</p>
            <p class="message">${message}</p>
            <div class="footer">
              此邮件由 TaskFlow 自动发送，请勿回复
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      subject: `[TaskFlow] ${title}`,
      html,
    });
  },

  /**
   * 发送每日上班提醒邮件
   */
  async sendDailyReminderEmail(
    to: string,
    userName: string,
    tasks: TaskInfo[],
    coffeeWinner?: { name: string; isCurrentUser: boolean }
  ): Promise<void> {
    const greeting = MORNING_GREETINGS[Math.floor(Math.random() * MORNING_GREETINGS.length)];
    const encouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    
    const today = new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });

    const priorityColors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#3b82f6',
      low: '#6b7280',
    };

    const priorityLabels: Record<string, string> = {
      critical: '紧急',
      high: '高',
      medium: '中',
      low: '低',
    };

    const taskListHtml = tasks.length > 0
      ? tasks.map(task => {
          const dueDateStr = task.dueDate 
            ? new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
            : '';
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
          return `
            <div style="display: flex; align-items: center; padding: 12px 16px; background: ${isOverdue ? '#fef2f2' : '#f9fafb'}; border-radius: 8px; margin-bottom: 8px;">
              <span style="display: inline-block; padding: 2px 8px; font-size: 12px; font-weight: 500; color: white; background: ${priorityColors[task.priority] || '#6b7280'}; border-radius: 4px; margin-right: 12px;">
                ${priorityLabels[task.priority] || '中'}
              </span>
              <span style="flex: 1; font-size: 14px; color: #374151;">${task.title}</span>
              ${dueDateStr ? `<span style="font-size: 12px; color: ${isOverdue ? '#ef4444' : '#6b7280'};">${isOverdue ? '已逾期 ' : ''}${dueDateStr}</span>` : ''}
            </div>
          `;
        }).join('')
      : '<p style="text-align: center; color: #6b7280; padding: 20px;">今天没有待办任务，可以放松一下啦！</p>';

    const coffeeSection = coffeeWinner
      ? `
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 8px;">☕</div>
          <div style="font-size: 16px; font-weight: 600; color: #92400e;">
            ${coffeeWinner.isCurrentUser 
              ? '恭喜！你是今日的幸运咖啡获得者！' 
              : `今日幸运咖啡获得者：${coffeeWinner.name}`}
          </div>
          ${coffeeWinner.isCurrentUser 
            ? '<div style="font-size: 14px; color: #b45309; margin-top: 8px;">请向管理员领取你的咖啡奖励吧~</div>' 
            : ''}
        </div>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .date { font-size: 14px; color: #6b7280; margin-top: 8px; }
          .greeting { font-size: 18px; color: #374151; margin: 20px 0; line-height: 1.6; }
          .section-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 24px 0 16px 0; display: flex; align-items: center; gap: 8px; }
          .task-count { background: #6366f1; color: white; font-size: 12px; padding: 2px 8px; border-radius: 10px; }
          .encouragement { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 12px; padding: 16px; margin-top: 24px; text-align: center; }
          .encouragement-text { font-size: 15px; color: #047857; font-weight: 500; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">TaskFlow</div>
              <div class="date">${today}</div>
            </div>
            
            <div class="greeting">
              ${greeting}
            </div>
            
            <div class="greeting">
              你好，<strong>${userName}</strong>！
            </div>

            ${coffeeSection}
            
            <div class="section-title">
              今日任务
              <span class="task-count">${tasks.length} 项</span>
            </div>
            
            ${taskListHtml}
            
            <div class="encouragement">
              <div class="encouragement-text">${encouragement}</div>
            </div>
            
            <div class="footer">
              此邮件由 TaskFlow 每日自动发送 · <a href="#" style="color: #6366f1;">取消订阅</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      subject: `[TaskFlow] 早安！你今天有 ${tasks.length} 项任务待完成`,
      html,
    });
  },

  /**
   * 发送群发消息邮件
   */
  async sendBroadcastEmail(
    to: string,
    userName: string,
    senderName: string,
    title: string,
    content: string,
    workspaceName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
          .sender-info { background: #f3f4f6; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
          .sender-label { font-size: 12px; color: #6b7280; }
          .sender-name { font-size: 14px; font-weight: 600; color: #374151; }
          .title { font-size: 20px; font-weight: 600; color: #1f2937; margin: 0 0 16px 0; }
          .content { font-size: 15px; color: #4b5563; line-height: 1.8; white-space: pre-wrap; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">TaskFlow</div>
            </div>
            
            <div class="sender-info">
              <div class="sender-label">来自 ${workspaceName} 的消息</div>
              <div class="sender-name">${senderName}</div>
            </div>
            
            <h2 class="title">${title}</h2>
            <div class="content">${content}</div>
            
            <div class="footer">
              此邮件由 TaskFlow 发送 · 请勿直接回复
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      subject: `[${workspaceName}] ${title}`,
      html,
    });
  },

  /**
   * 发送咖啡中奖通知邮件
   */
  async sendCoffeeWinnerEmail(
    to: string,
    userName: string,
    workspaceName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #fef3c7, #fde68a); min-height: 100vh; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); text-align: center; }
          .emoji { font-size: 64px; margin-bottom: 20px; }
          .title { font-size: 28px; font-weight: bold; color: #92400e; margin-bottom: 16px; }
          .message { font-size: 16px; color: #78350f; line-height: 1.6; margin-bottom: 24px; }
          .workspace { background: #fef3c7; padding: 8px 16px; border-radius: 20px; font-size: 14px; color: #92400e; display: inline-block; }
          .footer { margin-top: 32px; font-size: 12px; color: #b45309; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="emoji">☕🎉</div>
            <h1 class="title">恭喜你！${userName}</h1>
            <p class="message">
              你是今日的幸运咖啡获得者！<br>
              请向管理员领取你的咖啡奖励吧~
            </p>
            <div class="workspace">${workspaceName}</div>
            <div class="footer">
              TaskFlow 每日咖啡抽奖 · 好运常伴
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      subject: `[TaskFlow] 恭喜！你获得了今日幸运咖啡 ☕`,
      html,
    });
  },
};
