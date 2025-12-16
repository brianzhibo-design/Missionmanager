/**
 * 登录注册页面
 * 包含登录、注册、忘记密码、个人信息完善流程
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService, UserProfile } from '../services/auth';
import './Login.css';

// 职业选项
const PROFESSIONS = [
  { value: 'developer', label: '开发工程师', icon: '💻' },
  { value: 'designer', label: '设计师', icon: '🎨' },
  { value: 'pm', label: '产品经理', icon: '📋' },
  { value: 'marketing', label: '市场营销', icon: '📢' },
  { value: 'operation', label: '运营', icon: '📈' },
  { value: 'hr', label: '人力资源', icon: '👥' },
  { value: 'finance', label: '财务', icon: '💰' },
  { value: 'sales', label: '销售', icon: '🤝' },
  { value: 'student', label: '学生', icon: '📚' },
  { value: 'other', label: '其他', icon: '✨' },
];

type ViewMode = 'login' | 'register' | 'forgot' | 'reset' | 'profile';

function Login() {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showProfileStep, setShowProfileStep] = useState(false);
  
  // 表单引用
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  
  // 个人信息表单
  const [profileData, setProfileData] = useState<UserProfile>({
    profession: '',
    bio: '',
    company: '',
    location: '',
  });
  
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const email = emailRef.current?.value || '';
      const password = passwordRef.current?.value || '';
      await login(email, password);
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

    const password = passwordRef.current?.value || '';
    const confirmPassword = confirmPasswordRef.current?.value || '';
    
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

    const password = passwordRef.current?.value || '';
    const confirmPassword = confirmPasswordRef.current?.value || '';
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(resetToken, password);
      setSuccess('密码重置成功，请登录');
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

  // 完善个人信息
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!profileData.profession) {
      setError('请选择您的职业');
      return;
    }

    setIsLoading(true);
    try {
      await authService.completeProfile(profileData);
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
    <form className="auth-form" onSubmit={handleLogin}>
      <h2 className="form-title">欢迎回来</h2>
      <p className="form-subtitle">登录您的账号继续使用</p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">邮箱地址</label>
        <div className="input-wrapper">
          <span className="input-icon">📧</span>
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
        <div className="input-wrapper">
          <span className="input-icon">🔒</span>
          <input
            id="password"
            type="password"
            ref={passwordRef}
            placeholder="输入密码"
            required
            minLength={6}
          />
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

      <div className="form-divider">
        <span>还没有账号？</span>
      </div>

      <button type="button" className="secondary-btn" onClick={() => switchView('register')}>
        创建新账号
      </button>
    </form>
  );

  // 渲染注册表单
  const renderRegisterForm = () => (
    <form className="auth-form" onSubmit={handleRegister}>
      <h2 className="form-title">创建账号</h2>
      <p className="form-subtitle">加入我们，开始高效协作</p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">您的姓名</label>
        <div className="input-wrapper">
          <span className="input-icon">👤</span>
          <input
            id="name"
            type="text"
            ref={nameRef}
            placeholder="请输入姓名"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email">邮箱地址</label>
        <div className="input-wrapper">
          <span className="input-icon">📧</span>
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
        <label htmlFor="password">设置密码</label>
        <div className="input-wrapper">
          <span className="input-icon">🔒</span>
          <input
            id="password"
            type="password"
            ref={passwordRef}
            placeholder="至少6位字符"
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">确认密码</label>
        <div className="input-wrapper">
          <span className="input-icon">🔒</span>
          <input
            id="confirmPassword"
            type="password"
            ref={confirmPasswordRef}
            placeholder="再次输入密码"
            required
            minLength={6}
          />
        </div>
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
        <div className="input-wrapper">
          <span className="input-icon">📧</span>
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
        <label htmlFor="password">新密码</label>
        <div className="input-wrapper">
          <span className="input-icon">🔒</span>
          <input
            id="password"
            type="password"
            ref={passwordRef}
            placeholder="至少6位字符"
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">确认新密码</label>
        <div className="input-wrapper">
          <span className="input-icon">🔒</span>
          <input
            id="confirmPassword"
            type="password"
            ref={confirmPasswordRef}
            placeholder="再次输入新密码"
            required
            minLength={6}
          />
        </div>
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
        <label>选择您的职业 <span className="required">*</span></label>
        <div className="profession-grid">
          {PROFESSIONS.map((prof) => (
            <button
              key={prof.value}
              type="button"
              className={`profession-item ${profileData.profession === prof.value ? 'active' : ''}`}
              onClick={() => setProfileData({ ...profileData, profession: prof.value })}
            >
              <span className="profession-icon">{prof.icon}</span>
              <span className="profession-label">{prof.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="company">公司/组织</label>
        <div className="input-wrapper">
          <span className="input-icon">🏢</span>
          <input
            id="company"
            type="text"
            value={profileData.company || ''}
            onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
            placeholder="您所在的公司或组织"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="location">所在地</label>
        <div className="input-wrapper">
          <span className="input-icon">📍</span>
          <input
            id="location"
            type="text"
            value={profileData.location || ''}
            onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
            placeholder="城市"
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
          <div className="logo-icon">📋</div>
          <h1 className="login-logo">TaskFlow</h1>
          <p className="login-subtitle">AI 驱动的智能任务管理平台</p>
        </div>

        {renderCurrentView()}
      </div>
    </div>
  );
}

export default Login;
