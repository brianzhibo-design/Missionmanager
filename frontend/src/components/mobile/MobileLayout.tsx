/**
 * 移动端布局组件
 * 提供统一的 Header、底部导航和新建任务弹窗
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import SheetModal from './SheetModal';
import CreateTaskForm from './CreateTaskForm';
import MobileHeader from './MobileHeader';
import '../../styles/theme-minimal.css';
import '../../styles/mobile-minimal.css';

// 导出 MobileHeader 的 Props 类型供外部使用
export interface MobileHeaderProps {
  type?: 'home' | 'list' | 'detail' | 'manage';
  title?: string;
  workspaceName?: string;
  onWorkspaceClick?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onSearchClick?: () => void;
  onFilterClick?: () => void;
  onBack?: () => void;
  onMoreClick?: () => void;
  rightContent?: React.ReactNode;
}

interface MobileLayoutProps {
  children: React.ReactNode;
  
  // Header 配置
  headerType?: 'home' | 'list' | 'detail' | 'manage' | 'none';
  headerTitle?: string;
  showHeader?: boolean;
  headerProps?: Partial<MobileHeaderProps>;
  
  // 底部导航
  showBottomNav?: boolean;
  
  // FAB 按钮配置
  fabType?: 'task' | 'custom' | 'none';  // task=创建任务（默认），custom=自定义行为，none=不显示
  onFabClick?: () => void;  // fabType='custom' 时的点击回调
}

export default function MobileLayout({
  children,
  headerType = 'list',
  headerTitle,
  showHeader = true,
  headerProps = {},
  showBottomNav = true,
  fabType = 'task',
  onFabClick,
}: MobileLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  // FAB 点击处理
  const handleFabClick = () => {
    if (fabType === 'custom' && onFabClick) {
      onFabClick();
    } else if (fabType === 'task') {
      setSheetOpen(true);
    }
    // fabType === 'none' 不做任何操作
  };

  const handleTaskCreated = () => {
    setSheetOpen(false);
    // 通过自定义事件通知页面刷新数据
    window.dispatchEvent(new CustomEvent('task-created'));
  };

  return (
    <div className="mm-layout">
      <div className="mm-safe-top" />
      
      {showHeader && headerType !== 'none' && (
        <MobileHeader
          type={headerType as 'home' | 'list' | 'detail' | 'manage'}
          title={headerTitle}
          onSearchClick={() => navigate('/search')}
          onNotificationClick={() => navigate('/notifications')}
          {...headerProps}
        />
      )}
      
      <main className="mm-content">
        {children}
      </main>
      
      {showBottomNav && (
        <BottomNav 
          onAddClick={handleFabClick}
          showFab={fabType !== 'none'}
        />
      )}
      
      <SheetModal
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="新建任务"
        height="80vh"
      >
        <CreateTaskForm
          onSuccess={handleTaskCreated}
          onCancel={() => setSheetOpen(false)}
        />
      </SheetModal>
    </div>
  );
}
