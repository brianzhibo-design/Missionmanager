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
    console.log('✅ Email sent:', info.messageId, '→', recipients);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw new Error('邮件发送失败: ' + (error as Error).message);
  }
}

/**
 * 验证 SMTP 连接
 */
export async function verifyEmailConnection(): Promise<boolean> {
  // 检查是否配置了邮件凭据
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('⚠️ SMTP credentials not configured, email service disabled');
    return false;
  }
  
  console.log(`📧 Connecting to SMTP: ${SMTP_HOST}:${SMTP_PORT} (secure: ${SMTP_SECURE})`);
  console.log(`📧 SMTP User: ${SMTP_USER}`);
  
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    return false;
  }
}
