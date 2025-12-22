import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ChevronDown, User, Settings, CreditCard, LogOut } from './Icons';
import './UserMenu.css';

interface UserMenuProps {
  onLogout?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 获取用户名首字母
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  // 处理菜单项点击
  const handleMenuClick = (action: string) => {
    setIsOpen(false);
    
    switch (action) {
      case 'profile':
        navigate('/settings');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'billing':
        // TODO: 实现计费页面导航
        console.log('Navigate to billing');
        break;
      case 'logout':
        logout();
        if (onLogout) onLogout();
        break;
    }
  };

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      
      {/* 向上弹出的菜单 */}
      {isOpen && (
        <div className="user-menu-popup">
          <div className="user-menu-content">
            {/* 用户信息摘要 */}
            <div className="user-menu-header">
              <p className="user-menu-label">登录账户</p>
              <p className="user-menu-email">{user?.email || 'user@example.com'}</p>
            </div>
            
            {/* 菜单选项 */}
            <div className="user-menu-items">
              <button 
                className="user-menu-item"
                onClick={() => handleMenuClick('profile')}
              >
                <User size={16} />
                <span>我的资料</span>
              </button>
              <button 
                className="user-menu-item"
                onClick={() => handleMenuClick('settings')}
              >
                <Settings size={16} />
                <span>设置</span>
              </button>
              <button 
                className="user-menu-item"
                onClick={() => handleMenuClick('billing')}
              >
                <CreditCard size={16} />
                <span>订阅计划</span>
              </button>
            </div>
            
            {/* 登出区域 */}
            <div className="user-menu-logout-section">
              <button 
                className="user-menu-logout"
                onClick={() => handleMenuClick('logout')}
              >
                <LogOut size={16} />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部触发按钮 */}
      <div className="user-menu-trigger-wrapper">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`user-menu-trigger ${isOpen ? 'active' : ''}`}
        >
          {/* 头像容器 */}
          <div className="user-menu-avatar-wrapper">
            <div className={`user-menu-avatar ${isOpen ? 'active' : ''}`}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                getUserInitials()
              )}
            </div>
            {/* 在线状态指示器 */}
            <div className="user-menu-status-dot"></div>
          </div>
          
          {/* 文本信息 */}
          <div className="user-menu-info">
            <span className={`user-menu-name ${isOpen ? 'active' : ''}`}>
              {user?.name || '用户'}
            </span>
            <span className="user-menu-role">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </div>

          {/* 箭头图标 */}
          <div className={`user-menu-chevron ${isOpen ? 'rotated' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default UserMenu;
