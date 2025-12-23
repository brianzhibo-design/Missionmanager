/**
 * 登录注册页面
 * 包含登录、注册、忘记密码、个人信息完善流程
 * 支持邮箱密码登录和手机验证码登录
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService, UserProfile } from '../services/auth';
import { 
  Mail, Phone, ClipboardList,
  Code, PaintBucket, Megaphone, TrendingUp, Users, Wallet, Handshake, BookOpen, Sparkles,
  Eye, EyeOff
} from '../components/Icons';
import './Login.css';

// 职业选项 - 使用Lucide图标组件
const PROFESSIONS = [
  { value: 'developer', label: '开发工程师', Icon: Code },
  { value: 'designer', label: '设计师', Icon: PaintBucket },
  { value: 'pm', label: '产品经理', Icon: ClipboardList },
  { value: 'marketing', label: '市场营销', Icon: Megaphone },
  { value: 'operation', label: '运营', Icon: TrendingUp },
  { value: 'hr', label: '人力资源', Icon: Users },
  { value: 'finance', label: '财务', Icon: Wallet },
  { value: 'sales', label: '销售', Icon: Handshake },
  { value: 'student', label: '学生', Icon: BookOpen },
  { value: 'other', label: '其他', Icon: Sparkles },
];

type ViewMode = 'login' | 'register' | 'forgot' | 'reset' | 'profile';
type LoginType = 'email' | 'phone';

// 密码强度检查
interface PasswordStrength {
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

function checkPasswordStrength(pwd: string): PasswordStrength {
  const checks = {
    minLength: pwd.length >= 8,
    hasLowercase: /[a-z]/.test(pwd),
    hasUppercase: /[A-Z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  let strength: 'weak' | 'medium' | 'strong';
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else strength = 'strong';
  return { strength, score, checks };
}

function Login() {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [loginType, setLoginType] = useState<LoginType>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showProfileStep, setShowProfileStep] = useState(false);
  
  // 手机验证码相关
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState(''); // 开发环境显示验证码
  
  // 密码相关状态
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // 表单引用
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  
  // 个人信息表单（支持职业多选）
  const [profileData, setProfileData] = useState<UserProfile>({
    profession: '',
    bio: '',
    company: '',
    location: '',
  });
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 如果已登录且已完善信息，重定向
  useEffect(() => {
    if (isAuthenticated && user?.profileCompleted && !showProfileStep) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/projects';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, location, navigate, showProfileStep]);

  // 检查是否需要完善个人信息
  useEffect(() => {
    if (isAuthenticated && user && !user.profileCompleted) {
      setShowProfileStep(true);
      setViewMode('profile');
    }
  }, [isAuthenticated, user]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // 邮箱密码登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const email = emailRef.current?.value || '';
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 发送手机验证码
  const handleSendCode = useCallback(async () => {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    
    if (countdown > 0) return;
    
    clearMessages();
    setIsLoading(true);
    
    try {
      const result = await authService.sendPhoneCode(phone);
      if (result.success) {
        setCountdown(60);
        setSuccess('验证码已发送');
        // 开发环境显示验证码
        if (result.code) {
          setDevCode(result.code);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setIsLoading(false);
    }
  }, [phone, countdown]);

  // 手机验证码登录
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    
    if (!code || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authService.loginByPhone(phone, code);
      // 登录成功后会触发 useAuth 更新
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    // 检查密码强度
    const strength = checkPasswordStrength(password);
    if (strength.score < 5) {
      setError('密码必须包含大小写字母、数字和特殊字符，且至少8位');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      const email = emailRef.current?.value || '';
      const name = nameRef.current?.value || '';
      await register(email, password, name);
      // 注册成功后会自动检测是否需要完善信息
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 忘记密码
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const email = emailRef.current?.value || '';
      const result = await authService.forgotPassword(email);
      setSuccess(result.message);
      // 演示环境：直接使用返回的token
      if (result.resetToken) {
        setResetToken(result.resetToken);
        setTimeout(() => {
          setViewMode('reset');
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    // 检查密码强度
    const strength = checkPasswordStrength(password);
    if (strength.score < 5) {
      setError('密码必须包含大小写字母、数字和特殊字符，且至少8位');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(resetToken, password);
      setSuccess('密码重置成功，请登录');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setViewMode('login');
        setResetToken('');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换职业选择（多选）
  const toggleProfession = (value: string) => {
    setSelectedProfessions(prev => {
      if (prev.includes(value)) {
        return prev.filter(p => p !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  // 完善个人信息
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (selectedProfessions.length === 0) {
      setError('请至少选择一个职业');
      return;
    }

    setIsLoading(true);
    try {
      // 将多选职业用逗号连接存储
      await authService.completeProfile({
        ...profileData,
        profession: selectedProfessions.join(','),
      });
      setShowProfileStep(false);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/projects';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 跳过个人信息完善
  const handleSkipProfile = () => {
    setShowProfileStep(false);
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/projects';
    navigate(from, { replace: true });
  };

  // 切换视图
  const switchView = (mode: ViewMode) => {
    clearMessages();
    setViewMode(mode);
  };

  // 渲染登录表单
  const renderLoginForm = () => (
    <div className="auth-form">
      <h2 className="form-title">欢迎回来</h2>
      <p className="form-subtitle">登录您的账号继续使用</p>

      {/* 登录方式切换 */}
      <div className="login-type-switch">
        <button 
          type="button" 
          className={`switch-btn ${loginType === 'email' ? 'active' : ''}`}
          onClick={() => { setLoginType('email'); clearMessages(); }}
        >
          <Mail size={16} /> 邮箱登录
        </button>
        <button 
          type="button" 
          className={`switch-btn ${loginType === 'phone' ? 'active' : ''}`}
          onClick={() => { setLoginType('phone'); clearMessages(); }}
        >
          <Phone size={16} /> 验证码登录
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loginType === 'email' ? (
        /* 邮箱密码登录 */
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">邮箱地址</label>
            <div className="input-wrapper no-icon">
              <input
                id="email"
                type="email"
                ref={emailRef}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="input-wrapper password-wrapper no-icon">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? '登录中...' : '登录'}
          </button>

          <div className="form-links">
            <button type="button" className="link-btn" onClick={() => switchView('forgot')}>
              忘记密码？
            </button>
          </div>
        </form>
      ) : (
        /* 手机验证码登录 */
        <form onSubmit={handlePhoneLogin}>
          <div className="form-group">
            <label htmlFor="phone">手机号</label>
            <div className="input-wrapper no-icon">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="请输入手机号"
                required
                maxLength={11}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="code">验证码</label>
            <div className="input-wrapper code-input-wrapper no-icon">
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6位验证码"
                required
                maxLength={6}
              />
              <button 
                type="button" 
                className="send-code-btn"
                onClick={handleSendCode}
                disabled={countdown > 0 || isLoading}
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
            {devCode && (
              <p className="dev-code-hint">
                开发模式验证码: <strong>{devCode}</strong>
              </p>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? '登录中...' : '登录 / 注册'}
          </button>
          
          <p className="phone-login-hint">
            未注册的手机号将自动创建账号
          </p>
        </form>
      )}

      <div className="form-divider">
        <span>还没有账号？</span>
      </div>

      <button type="button" className="secondary-btn" onClick={() => switchView('register')}>
        邮箱注册
      </button>
    </div>
  );

  // 渲染注册表单
  const renderRegisterForm = () => (
    <form className="auth-form" onSubmit={handleRegister}>
      <h2 className="form-title">创建账号</h2>
      <p className="form-subtitle">加入我们，开始高效协作</p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">您的姓名</label>
        <div className="input-wrapper no-icon">
          <input
            id="name"
            type="text"
            ref={nameRef}
            placeholder="请输入姓名"
            required
            autoComplete="name"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email">邮箱地址</label>
        <div className="input-wrapper no-icon">
          <input
            id="email"
            type="email"
            ref={emailRef}
            placeholder="your@email.com"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="reg-password">设置密码</label>
        <div className="input-wrapper password-wrapper no-icon">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="8位以上，含大小写+数字+特殊字符"
            required
            minLength={8}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {/* 密码强度指示器 */}
        {password && (
          <div className="password-strength-container">
            <div className="strength-bar-bg">
              <div 
                className={`strength-bar strength-${checkPasswordStrength(password).strength}`}
                style={{ 
                  width: checkPasswordStrength(password).strength === 'weak' ? '33%' : 
                         checkPasswordStrength(password).strength === 'medium' ? '66%' : '100%' 
                }}
              />
            </div>
            <span className={`strength-text strength-${checkPasswordStrength(password).strength}`}>
              {checkPasswordStrength(password).strength === 'weak' ? '弱' : 
               checkPasswordStrength(password).strength === 'medium' ? '中' : '强'}
            </span>
          </div>
        )}
        {/* 密码要求列表 */}
        {passwordFocused && password && (
          <ul className="password-requirements">
            <li className={checkPasswordStrength(password).checks.minLength ? 'passed' : ''}>
              {checkPasswordStrength(password).checks.minLength ? '✓' : '✗'} 至少8个字符
            </li>
            <li className={checkPasswordStrength(password).checks.hasLowercase ? 'passed' : ''}>
              {checkPasswordStrength(password).checks.hasLowercase ? '✓' : '✗'} 包含小写字母
            </li>
            <li className={checkPasswordStrength(password).checks.hasUppercase ? 'passed' : ''}>
              {checkPasswordStrength(password).checks.hasUppercase ? '✓' : '✗'} 包含大写字母
            </li>
            <li className={checkPasswordStrength(password).checks.hasNumber ? 'passed' : ''}>
              {checkPasswordStrength(password).checks.hasNumber ? '✓' : '✗'} 包含数字
            </li>
            <li className={checkPasswordStrength(password).checks.hasSpecialChar ? 'passed' : ''}>
              {checkPasswordStrength(password).checks.hasSpecialChar ? '✓' : '✗'} 包含特殊字符
            </li>
          </ul>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">确认密码</label>
        <div className="input-wrapper password-wrapper no-icon">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入密码"
            required
            minLength={8}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {confirmPassword && password !== confirmPassword && (
          <p className="field-error">两次输入的密码不一致</p>
        )}
        {confirmPassword && password === confirmPassword && (
          <p className="field-success">✓ 密码一致</p>
        )}
      </div>

      <button type="submit" className="submit-btn" disabled={isLoading}>
        {isLoading ? '注册中...' : '注册'}
      </button>

      <div className="form-divider">
        <span>已有账号？</span>
      </div>

      <button type="button" className="secondary-btn" onClick={() => switchView('login')}>
        返回登录
      </button>
    </form>
  );

  // 渲染忘记密码表单
  const renderForgotForm = () => (
    <form className="auth-form" onSubmit={handleForgotPassword}>
      <h2 className="form-title">找回密码</h2>
      <p className="form-subtitle">输入您的邮箱，我们将发送重置链接</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label htmlFor="email">邮箱地址</label>
        <div className="input-wrapper no-icon">
          <input
            id="email"
            type="email"
            ref={emailRef}
            placeholder="your@email.com"
            required
          />
        </div>
      </div>

      <button type="submit" className="submit-btn" disabled={isLoading}>
        {isLoading ? '发送中...' : '发送重置链接'}
      </button>

      <button type="button" className="secondary-btn" onClick={() => switchView('login')}>
        返回登录
      </button>
    </form>
  );

  // 渲染重置密码表单
  const renderResetForm = () => (
    <form className="auth-form" onSubmit={handleResetPassword}>
      <h2 className="form-title">设置新密码</h2>
      <p className="form-subtitle">请输入您的新密码</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label htmlFor="reset-password">新密码</label>
        <div className="input-wrapper password-wrapper no-icon">
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="8位以上，含大小写+数字+特殊字符"
            required
            minLength={8}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {/* 密码强度指示器 */}
        {password && (
          <div className="password-strength-container">
            <div className="strength-bar-bg">
              <div 
                className={`strength-bar strength-${checkPasswordStrength(password).strength}`}
                style={{ 
                  width: checkPasswordStrength(password).strength === 'weak' ? '33%' : 
                         checkPasswordStrength(password).strength === 'medium' ? '66%' : '100%' 
                }}
              />
            </div>
            <span className={`strength-text strength-${checkPasswordStrength(password).strength}`}>
              {checkPasswordStrength(password).strength === 'weak' ? '弱' : 
               checkPasswordStrength(password).strength === 'medium' ? '中' : '强'}
            </span>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="reset-confirmPassword">确认新密码</label>
        <div className="input-wrapper password-wrapper no-icon">
          <input
            id="reset-confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入新密码"
            required
            minLength={8}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {confirmPassword && password !== confirmPassword && (
          <p className="field-error">两次输入的密码不一致</p>
        )}
      </div>

      <button type="submit" className="submit-btn" disabled={isLoading}>
        {isLoading ? '重置中...' : '重置密码'}
      </button>
    </form>
  );

  // 渲染个人信息完善表单
  const renderProfileForm = () => (
    <form className="auth-form profile-form" onSubmit={handleCompleteProfile}>
      <h2 className="form-title">完善个人信息</h2>
      <p className="form-subtitle">让我们更好地了解您</p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>选择您的职业（可多选）<span className="required">*</span></label>
        <div className="profession-grid">
          {PROFESSIONS.map((prof) => (
            <button
              key={prof.value}
              type="button"
              className={`profession-item ${selectedProfessions.includes(prof.value) ? 'active' : ''}`}
              onClick={() => toggleProfession(prof.value)}
            >
              <span className="profession-icon"><prof.Icon size={20} /></span>
              <span className="profession-label">{prof.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="company">公司/组织</label>
        <div className="input-wrapper no-icon">
          <input
            id="company"
            type="text"
            value={profileData.company || ''}
            onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
            placeholder="您所在的公司或组织"
            autoComplete="organization"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="location">所在地</label>
        <div className="input-wrapper no-icon">
          <input
            id="location"
            type="text"
            value={profileData.location || ''}
            onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
            placeholder="城市"
            autoComplete="address-level2"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="bio">个人简介</label>
        <textarea
          id="bio"
          className="bio-textarea"
          value={profileData.bio || ''}
          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
          placeholder="简单介绍一下自己..."
          rows={3}
        />
      </div>

      <button type="submit" className="submit-btn" disabled={isLoading}>
        {isLoading ? '保存中...' : '完成设置'}
      </button>

      <button type="button" className="skip-btn" onClick={handleSkipProfile}>
        稍后完善
      </button>
    </form>
  );

  // 渲染当前视图
  const renderCurrentView = () => {
    if (showProfileStep || viewMode === 'profile') {
      return renderProfileForm();
    }
    
    switch (viewMode) {
      case 'login':
        return renderLoginForm();
      case 'register':
        return renderRegisterForm();
      case 'forgot':
        return renderForgotForm();
      case 'reset':
        return renderResetForm();
      default:
        return renderLoginForm();
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>
      
      <div className="login-container">
        <div className="login-header">
          <div className="logo-icon"><ClipboardList size={32} /></div>
          <h1 className="login-logo">TaskFlow</h1>
          <p className="login-subtitle">AI 驱动的智能任务管理平台</p>
        </div>

        {renderCurrentView()}
      </div>
    </div>
  );
}

export default Login;
