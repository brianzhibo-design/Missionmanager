/**
 * 移动端统一顶部导航组件
 * 支持4种类型：home（首页）、list（列表页）、detail（详情页）、manage（管理页）
 */
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, Search, SlidersHorizontal, 
  MoreHorizontal, ChevronDown 
} from '../Icons';
import '../../styles/mobile-minimal.css';

interface MobileHeaderProps {
  type?: 'home' | 'list' | 'detail' | 'manage';
  title?: string;
  
  // 首页类型
  workspaceName?: string;
  onWorkspaceClick?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onSearchClick?: () => void;
  
  // 列表类型
  onFilterClick?: () => void;
  
  // 详情/管理类型
  onBack?: () => void;
  onMoreClick?: () => void;
  
  // 右侧自定义内容
  rightContent?: React.ReactNode;
}

export default function MobileHeader({
  type = 'list',
  title,
  workspaceName = '我的工作区',
  onWorkspaceClick,
  notificationCount = 0,
  onNotificationClick,
  onSearchClick,
  onFilterClick,
  onBack,
  onMoreClick,
  rightContent
}: MobileHeaderProps) {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // 类型 A：首页
  if (type === 'home') {
    return (
      <header className="mm-header mm-header-home">
        <button className="mm-header-workspace" onClick={onWorkspaceClick}>
          {workspaceName}
          <ChevronDown size={16} />
        </button>
        <div className="mm-header-actions">
          <button className="mm-header-icon" onClick={onNotificationClick}>
            <Bell size={22} />
            {notificationCount > 0 && (
              <span className="mm-header-badge">{notificationCount > 99 ? '99+' : notificationCount}</span>
            )}
          </button>
          <button className="mm-header-icon" onClick={onSearchClick}>
            <Search size={22} />
          </button>
        </div>
      </header>
    );
  }

  // 类型 B：列表页
  if (type === 'list') {
    return (
      <header className="mm-header mm-header-list">
        <h1 className="mm-header-title">{title}</h1>
        <div className="mm-header-actions">
          {onSearchClick && (
            <button className="mm-header-icon" onClick={onSearchClick}>
              <Search size={22} />
            </button>
          )}
          {onFilterClick && (
            <button className="mm-header-icon" onClick={onFilterClick}>
              <SlidersHorizontal size={22} />
            </button>
          )}
          {rightContent}
        </div>
      </header>
    );
  }

  // 类型 C：详情页
  if (type === 'detail') {
    return (
      <header className="mm-header mm-header-detail">
        <button className="mm-header-back" onClick={handleBack}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="mm-header-title">{title}</h1>
        <div className="mm-header-actions">
          {onMoreClick ? (
            <button className="mm-header-icon" onClick={onMoreClick}>
              <MoreHorizontal size={22} />
            </button>
          ) : (
            <div style={{ width: 40 }} /> // 占位保持标题居中
          )}
          {rightContent}
        </div>
      </header>
    );
  }

  // 类型 D：管理页
  return (
    <header className="mm-header mm-header-manage">
      <button className="mm-header-back" onClick={handleBack}>
        <ArrowLeft size={24} />
      </button>
      <h1 className="mm-header-title">{title}</h1>
      <div style={{ width: 40 }} />
      {rightContent}
    </header>
  );
}






