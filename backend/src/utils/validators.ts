/**
 * 验证工具函数
 * 密码强度验证、邮箱验证等
 */

// 常见弱密码列表
const COMMON_WEAK_PASSWORDS = [
  '123456', '123456789', 'password', '12345678', '111111',
  '123123', '12345', '1234567', 'qwerty', 'abc123',
  '000000', '654321', '666666', '888888', 'password1',
  'iloveyou', 'admin', 'welcome', 'monkey', 'dragon',
  'master', 'letmein', 'login', 'princess', 'sunshine',
];

/**
 * 密码强度检查结果
 */
export interface PasswordStrengthResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-5
  checks: {
    minLength: boolean;      // ≥8位
    hasLowercase: boolean;   // 包含小写字母
    hasUppercase: boolean;   // 包含大写字母
    hasNumber: boolean;      // 包含数字
    hasSpecialChar: boolean; // 包含特殊字符
  };
  errors: string[];
}

/**
 * 检查密码强度
 * @param password 密码
 * @param email 用户邮箱（可选，用于检查密码是否与邮箱相似）
 * @param name 用户名（可选，用于检查密码是否与用户名相似）
 */
export function validatePasswordStrength(
  password: string,
  email?: string,
  name?: string
): PasswordStrengthResult {
  const errors: string[] = [];
  
  // 各项检查
  const checks = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  // 计算得分 (0-5)
  const score = Object.values(checks).filter(Boolean).length;

  // 检查最小长度
  if (!checks.minLength) {
    errors.push('密码长度至少8位');
  }

  // 检查小写字母
  if (!checks.hasLowercase) {
    errors.push('密码必须包含小写字母');
  }

  // 检查大写字母
  if (!checks.hasUppercase) {
    errors.push('密码必须包含大写字母');
  }

  // 检查数字
  if (!checks.hasNumber) {
    errors.push('密码必须包含数字');
  }

  // 检查特殊字符
  if (!checks.hasSpecialChar) {
    errors.push('密码必须包含特殊字符 (!@#$%^&*等)');
  }

  // 检查是否是常见弱密码
  if (COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('密码过于简单，请使用更复杂的密码');
  }

  // 检查是否与邮箱相似
  if (email) {
    const emailPrefix = email.split('@')[0].toLowerCase();
    if (password.toLowerCase().includes(emailPrefix) || emailPrefix.includes(password.toLowerCase())) {
      errors.push('密码不能与邮箱相似');
    }
  }

  // 检查是否与用户名相似
  if (name) {
    const nameLower = name.toLowerCase().replace(/\s/g, '');
    if (password.toLowerCase().includes(nameLower) || nameLower.includes(password.toLowerCase())) {
      errors.push('密码不能与用户名相似');
    }
  }

  // 判断密码强度
  let strength: 'weak' | 'medium' | 'strong';
  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  // 密码有效性：必须满足所有基本要求
  const isValid = errors.length === 0;

  return {
    isValid,
    strength,
    score,
    checks,
    errors,
  };
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: false, error: '请输入邮箱地址' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: '邮箱格式不正确' };
  }

  return { isValid: true };
}

/**
 * 验证用户名
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  if (!name) {
    return { isValid: false, error: '请输入姓名' };
  }

  if (name.length < 2) {
    return { isValid: false, error: '姓名至少2个字符' };
  }

  if (name.length > 20) {
    return { isValid: false, error: '姓名最多20个字符' };
  }

  return { isValid: true };
}

/**
 * 验证手机号（中国大陆）
 */
export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  if (!phone) {
    return { isValid: false, error: '请输入手机号' };
  }

  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: '手机号格式不正确' };
  }

  return { isValid: true };
}






