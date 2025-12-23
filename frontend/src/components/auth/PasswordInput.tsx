/**
 * 密码输入组件
 * 包含眼睛图标切换显示、密码强度指示器
 */
import React, { useState, useMemo } from 'react';
import { Lock, Eye, EyeOff, Check, X } from '../Icons';
import './PasswordInput.css';

/**
 * 密码强度检查结果
 */
interface PasswordStrengthResult {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  checks: {
    minLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * 检查密码强度
 */
function checkPasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let strength: 'weak' | 'medium' | 'strong';
  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return { strength, score, checks };
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  showStrength?: boolean;
  showRequirements?: boolean;
  required?: boolean;
  autoComplete?: string;
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  value,
  onChange,
  placeholder = '输入密码',
  label = '密码',
  showStrength = false,
  showRequirements = false,
  required = false,
  autoComplete = 'current-password',
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const strengthResult = useMemo(() => {
    if (!value) return null;
    return checkPasswordStrength(value);
  }, [value]);

  const strengthLabel = {
    weak: '弱',
    medium: '中',
    strong: '强',
  };

  const requirements = [
    { key: 'minLength', label: '至少8个字符' },
    { key: 'hasLowercase', label: '包含小写字母' },
    { key: 'hasUppercase', label: '包含大写字母' },
    { key: 'hasNumber', label: '包含数字' },
    { key: 'hasSpecialChar', label: '包含特殊字符' },
  ];

  return (
    <div className={`password-input-container ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={id} className="password-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      
      <div className={`password-input-wrapper ${isFocused ? 'focused' : ''} ${error ? 'error' : ''}`}>
        <span className="password-icon-left">
          <Lock size={18} />
        </span>
        
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="password-input"
        />
        
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
          aria-label={showPassword ? '隐藏密码' : '显示密码'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && <p className="password-error">{error}</p>}

      {/* 密码强度条 */}
      {showStrength && value && strengthResult && (
        <div className="password-strength">
          <div className="strength-bar-container">
            <div 
              className={`strength-bar strength-${strengthResult.strength}`}
              style={{ 
                width: strengthResult.strength === 'weak' ? '33%' : 
                       strengthResult.strength === 'medium' ? '66%' : '100%' 
              }}
            />
          </div>
          <span className={`strength-label strength-${strengthResult.strength}`}>
            {strengthLabel[strengthResult.strength]}
          </span>
        </div>
      )}

      {/* 密码要求列表 */}
      {showRequirements && isFocused && value && strengthResult && (
        <ul className="password-requirements">
          {requirements.map((req) => {
            const passed = strengthResult.checks[req.key as keyof typeof strengthResult.checks];
            return (
              <li key={req.key} className={`requirement ${passed ? 'passed' : 'failed'}`}>
                {passed ? <Check size={14} /> : <X size={14} />}
                <span>{req.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PasswordInput;

