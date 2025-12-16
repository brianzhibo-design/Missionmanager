/**
 * 短信服务
 * 支持阿里云短信、腾讯云短信，开发环境模拟发送
 */
import { config } from '../infra/config';
import { logger } from '../infra/logger';

// 验证码存储（生产环境应使用Redis）
const codeStore = new Map<string, { code: string; expiry: Date }>();

/**
 * 生成6位数字验证码
 */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 验证手机号格式
 */
export function isValidPhone(phone: string): boolean {
  // 中国大陆手机号：11位，以1开头
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * SMS服务配置类型
 */
interface SmsConfig {
  provider: 'aliyun' | 'tencent' | 'mock';
  aliyun?: {
    accessKeyId: string;
    accessKeySecret: string;
    signName: string;
    templateCode: string;
  };
  tencent?: {
    secretId: string;
    secretKey: string;
    appId: string;
    signName: string;
    templateId: string;
  };
}

/**
 * 短信服务
 */
export const smsService = {
  /**
   * 发送验证码
   * @param phone 手机号
   * @returns 发送结果
   */
  async sendCode(phone: string): Promise<{ success: boolean; message: string; code?: string }> {
    if (!isValidPhone(phone)) {
      return { success: false, message: '手机号格式不正确' };
    }

    // 检查发送频率（1分钟内不能重复发送）
    const existing = codeStore.get(phone);
    if (existing && existing.expiry > new Date(Date.now() - 60000)) {
      const waitTime = Math.ceil((existing.expiry.getTime() - Date.now() + 60000) / 1000);
      if (waitTime > 240) { // 如果还有超过4分钟，说明刚发送不久
        return { success: false, message: `请${Math.ceil((300 - (300 - waitTime)) / 60)}分钟后再试` };
      }
    }

    const code = generateCode();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效

    // 存储验证码
    codeStore.set(phone, { code, expiry });

    // 根据环境选择发送方式
    const provider = process.env.SMS_PROVIDER || 'mock';
    
    try {
      switch (provider) {
        case 'aliyun':
          await this.sendAliyunSms(phone, code);
          break;
        case 'tencent':
          await this.sendTencentSms(phone, code);
          break;
        default:
          // 开发环境模拟发送
          logger.info(`📱 [模拟短信] 手机号: ${phone}, 验证码: ${code}`);
          console.log('\n========================================');
          console.log(`📱 短信验证码（开发模式）`);
          console.log(`   手机号: ${phone}`);
          console.log(`   验证码: ${code}`);
          console.log(`   有效期: 5分钟`);
          console.log('========================================\n');
      }

      return { 
        success: true, 
        message: '验证码已发送',
        // 开发环境返回验证码便于测试
        code: provider === 'mock' ? code : undefined
      };
    } catch (error) {
      logger.error('发送短信失败', error);
      return { success: false, message: '发送失败，请稍后重试' };
    }
  },

  /**
   * 验证验证码
   * @param phone 手机号
   * @param code 验证码
   * @returns 验证结果
   */
  verifyCode(phone: string, code: string): { valid: boolean; message: string } {
    const stored = codeStore.get(phone);
    
    if (!stored) {
      return { valid: false, message: '请先获取验证码' };
    }

    if (stored.expiry < new Date()) {
      codeStore.delete(phone);
      return { valid: false, message: '验证码已过期' };
    }

    if (stored.code !== code) {
      return { valid: false, message: '验证码错误' };
    }

    // 验证成功后删除验证码
    codeStore.delete(phone);
    return { valid: true, message: '验证成功' };
  },

  /**
   * 阿里云短信发送
   */
  async sendAliyunSms(phone: string, code: string): Promise<void> {
    // 阿里云短信SDK集成
    // npm install @alicloud/dysmsapi20170525
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const signName = process.env.ALIYUN_SMS_SIGN_NAME;
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
      throw new Error('阿里云短信配置不完整');
    }

    // 实际发送逻辑（需要安装阿里云SDK）
    // const client = new Dysmsapi20170525({...});
    // await client.sendSms({...});
    
    logger.info(`阿里云短信发送: ${phone} -> ${code}`);
    
    // 这里添加实际的阿里云短信发送代码
    throw new Error('请配置阿里云短信SDK');
  },

  /**
   * 腾讯云短信发送
   */
  async sendTencentSms(phone: string, code: string): Promise<void> {
    // 腾讯云短信SDK集成
    // npm install tencentcloud-sdk-nodejs
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    const appId = process.env.TENCENT_SMS_APP_ID;
    const signName = process.env.TENCENT_SMS_SIGN_NAME;
    const templateId = process.env.TENCENT_SMS_TEMPLATE_ID;

    if (!secretId || !secretKey || !appId || !signName || !templateId) {
      throw new Error('腾讯云短信配置不完整');
    }

    // 实际发送逻辑（需要安装腾讯云SDK）
    // const client = new smsClient({...});
    // await client.SendSms({...});
    
    logger.info(`腾讯云短信发送: ${phone} -> ${code}`);
    
    // 这里添加实际的腾讯云短信发送代码
    throw new Error('请配置腾讯云短信SDK');
  },

  /**
   * 清理过期验证码
   */
  cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [phone, data] of codeStore.entries()) {
      if (data.expiry < now) {
        codeStore.delete(phone);
      }
    }
  }
};

// 定期清理过期验证码（每5分钟）
setInterval(() => {
  smsService.cleanupExpiredCodes();
}, 5 * 60 * 1000);

