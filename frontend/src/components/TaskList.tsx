/**
 * 任务列表组件 - 主任务可展开显示子任务
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task } from '../services/task';
import { ChevronRight, ChevronDown, Check } from './Icons';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  // 批量选择相关
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: '待办', color: '#9ca3af' },
  in_progress: { label: '进行中', color: '#3b82f6' },
  review: { label: '审核中', color: '#f59e0b' },
  done: { label: '已完成', color: '#22c55e' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: '紧急', color: '#ef4444' },
  high: { label: '高', color: '#f97316' },
  medium: { label: '中', color: '#3b82f6' },
  low: { label: '低', color: '#9ca3af' },
};

const STATUS_ORDER = ['todo', 'in_progress', 'review', 'done'];

// 根据子任务名称推断归属的主任务
function matchSubtaskToMain(subtaskTitle: string, mainTaskTitle: string): boolean {
  const cleanSubtask = subtaskTitle.replace('[子任务]', '').toLowerCase().trim();
  const cleanMain = mainTaskTitle.toLowerCase();
  
  // 关键词匹配
  if (cleanMain.includes('架构') && (cleanSubtask.includes('架构') || cleanSubtask.includes('设计') || cleanSubtask.includes('模块') || cleanSubtask.includes('技术栈'))) {
    return true;
  }
  if (cleanMain.includes('测试') && (cleanSubtask.includes('测试') || cleanSubtask.includes('环境'))) {
    return true;
  }
  if (cleanMain.includes('开发') && (cleanSubtask.includes('开发') || cleanSubtask.includes('实现') || cleanSubtask.includes('编码'))) {
    return true;
  }
  if (cleanMain.includes('计划') && (cleanSubtask.includes('计划') || cleanSubtask.includes('排期') || cleanSubtask.includes('安排'))) {
    return true;
  }
  
  return false;
}

export default function TaskList({ 
  tasks, 
  onTaskClick, 
  onStatusChange,
  selectionMode = false,
  selectedIds = new Set(),
  onSelectionChange,
}: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 处理复选框点击
  const handleCheckboxChange = (taskId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    onSelectionChange(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      // 只选择未完成的主任务
      const allMainTaskIds = new Set(mainTasks.filter(t => t.status !== 'done').map(t => t.id));
      onSelectionChange(allMainTaskIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  // 计算是否全选
  const selectableCount = tasks.filter(t => t.status !== 'done' && !t.parentId && !t.title.startsWith('[子任务]')).length;
  const isAllSelected = selectableCount > 0 && selectedIds.size === selectableCount;

  // 点击外部关闭菜单
  useEffect(() => {
    if (!openMenuId) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 检查是否点击在状态按钮上（这种情况由按钮自己处理）
      if (target.closest('.status-btn')) return;
      // 检查是否点击在下拉菜单内部
      if (target.closest('.status-dropdown-portal')) return;
      
      setOpenMenuId(null);
      setMenuPosition(null);
    };
    
    // 使用 setTimeout 延迟添加监听器，避免当前点击事件触发关闭
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  // 分组任务
  const { mainTasks, subtasksByMain } = useMemo(() => {
    const mainTasks: Task[] = [];
    const allSubtasks: Task[] = [];
    const subtasksByMain: Record<string, Task[]> = {};

    // 分类
    tasks.forEach(task => {
      if (task.title.startsWith('[子任务]') || task.parentId) {
        allSubtasks.push(task);
      } else {
        mainTasks.push(task);
      }
    });

    // 排序主任务
    mainTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 将子任务关联到主任务
    mainTasks.forEach(main => {
      subtasksByMain[main.id] = [];
    });

    allSubtasks.forEach(sub => {
      // 如果有明确的 parentId 且父任务存在于当前任务列表中
      if (sub.parentId && subtasksByMain[sub.parentId]) {
        subtasksByMain[sub.parentId].push(sub);
      } else if (sub.parentId) {
        // 有 parentId 但父任务不在当前列表中（可能被删除或不属于当前项目）
        // 将其作为独立任务显示，而不是错误地关联到其他主任务
        mainTasks.push({
          ...sub,
          // 将标题中的 [子任务] 前缀改为 [孤立]，提示用户需要处理
          title: sub.title.replace('[子任务]', '[孤立任务]')
        });
        subtasksByMain[sub.id] = [];
      } else {
        // 没有 parentId 但标题以 [子任务] 开头的情况（老数据兼容）
        // 尝试根据名称匹配
        let matched = false;
        for (const main of mainTasks) {
          if (matchSubtaskToMain(sub.title, main.title)) {
            subtasksByMain[main.id].push(sub);
            matched = true;
            break;
          }
        }
        // 如果匹配不到，作为独立任务显示
        if (!matched) {
          mainTasks.push(sub);
          subtasksByMain[sub.id] = [];
        }
      }
    });

    // 对每个主任务的子任务排序
    Object.values(subtasksByMain).forEach(subs => {
      subs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return { mainTasks, subtasksByMain };
  }, [tasks]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleStatusClick = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openMenuId === taskId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left });
      setOpenMenuId(taskId);
    }
  };

  const handleStatusSelect = (taskId: string, newStatus: string) => {
    onStatusChange(taskId, newStatus);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  // 渲染状态图标
  const renderStatusIcon = (status: string, size: number = 16) => {
    const color = STATUS_CONFIG[status]?.color || '#9ca3af';
    
    if (status === 'done') {
      return (
        <div className="status-icon done" style={{ borderColor: color, backgroundColor: color }}>
          <Check size={size * 0.65} strokeWidth={3} color="white" />
        </div>
      );
    }
    if (status === 'in_progress') {
      return (
        <div className="status-icon in-progress" style={{ borderColor: color }}>
          <div className="dot" style={{ backgroundColor: color }} />
        </div>
      );
    }
    if (status === 'review') {
      return (
        <div className="status-icon review" style={{ borderColor: color }}>
          <div className="ring" style={{ borderColor: color }} />
        </div>
      );
    }
    // todo - 明确设置边框颜色
    return <div className="status-icon todo" style={{ borderColor: color, backgroundColor: 'transparent' }} />;
  };

  // 渲染任务行
  const renderTaskRow = (task: Task, isSubtask: boolean = false) => {
    const hasSubtasks = !isSubtask && (subtasksByMain[task.id]?.length || 0) > 0;
    const isExpanded = expandedTasks.has(task.id);
    const isTitleSubtask = task.title.startsWith('[子任务]');
    const displayTitle = isTitleSubtask ? task.title.replace('[子任务] ', '').replace('[子任务]', '') : task.title;
    const priorityColor = PRIORITY_CONFIG[task.priority]?.color || '#9ca3af';
    const isMenuOpen = openMenuId === task.id;

    const isSelected = selectedIds.has(task.id);
    const canSelect = !isSubtask && task.status !== 'done';

    return (
      <div key={task.id} className="task-item-container">
        <div 
          className={`task-item ${task.status === 'done' ? 'completed' : ''} ${isSubtask ? 'is-subtask' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => onTaskClick(task)}
        >
          {/* 复选框 - 仅在选择模式下显示 */}
          {selectionMode && (
            <div className="col-checkbox" onClick={(e) => e.stopPropagation()}>
              {canSelect ? (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleCheckboxChange(task.id, e.target.checked)}
                />
              ) : (
                <span className="checkbox-placeholder" />
              )}
            </div>
          )}
          {/* 展开箭头 - 点击此区域不进入任务详情 */}
          <div className="col-expand" onClick={(e) => e.stopPropagation()}>
            {hasSubtasks ? (
              <button 
                className="expand-btn"
                onClick={() => toggleExpand(task.id)}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : isSubtask ? (
              <span className="subtask-line">└</span>
            ) : null}
          </div>

          {/* 状态标签 - 点击此区域不进入任务详情 */}
          <div 
            className="col-status" 
            ref={isMenuOpen ? menuRef : null}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className={`status-tag status-tag-${task.status}`}
              onClick={(e) => handleStatusClick(task.id, e)}
            >
              {renderStatusIcon(task.status, 12)}
              <span>{STATUS_CONFIG[task.status]?.label}</span>
            </button>

            {isMenuOpen && menuPosition && createPortal(
              <div 
                ref={menuRef}
                className="status-dropdown-portal"
                style={{
                  position: 'fixed',
                  top: menuPosition.top,
                  left: menuPosition.left,
                  zIndex: 99999,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                  padding: '6px',
                  minWidth: '130px',
                }}
              >
                {STATUS_ORDER.map(s => (
                  <button
                    key={s}
                    className={`dropdown-item ${task.status === s ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleStatusSelect(task.id, s); }}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: task.status === s ? '#f3f4f6' : '#ffffff',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      textAlign: 'left',
                    }}
                  >
                    {renderStatusIcon(s, 14)}
                    <span style={{ color: STATUS_CONFIG[s].color }}>{STATUS_CONFIG[s].label}</span>
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          {/* 优先级 */}
          <div className="col-priority">
            <div className="priority-bar" style={{ backgroundColor: priorityColor }} />
          </div>

          {/* 标题 */}
          <div className="col-title">
            {isTitleSubtask && <span className="subtask-tag">子任务</span>}
            <span className="title-text">{displayTitle}</span>
            {/* 子任务进度指示器：显示 完成数/总数 */}
            {hasSubtasks && (() => {
              const subtasks = subtasksByMain[task.id] || [];
              const completedCount = subtasks.filter(s => s.status === 'done').length;
              const allCompleted = completedCount === subtasks.length;
              return (
                <span className={`subtask-progress ${allCompleted ? 'all-completed' : ''}`}>
                  <span className="subtask-progress-text">{completedCount}/{subtasks.length}</span>
                  <span 
                    className="subtask-progress-bar"
                    style={{ 
                      width: `${(completedCount / subtasks.length) * 100}%`,
                      backgroundColor: allCompleted ? '#22c55e' : '#3b82f6'
                    }}
                  />
                </span>
              );
            })()}
          </div>

          {/* 创建日期 */}
          <div className="col-date">{formatDate(task.createdAt)}</div>

          {/* 截止日期 */}
          <div className="col-due">
            {task.dueDate ? (
              <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'overdue' : ''}>
                {new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
              </span>
            ) : '—'}
          </div>
        </div>

        {/* 子任务列表 */}
        {hasSubtasks && isExpanded && (
          <div className="subtasks-list">
            {subtasksByMain[task.id].map(sub => renderTaskRow(sub, true))}
          </div>
        )}
      </div>
    );
  };

  if (mainTasks.length === 0) {
    return (
      <div className="task-list-empty">
        <div className="empty-box" />
        <p>暂无任务</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {/* 表头 */}
      <div className="task-header">
        {selectionMode && (
          <div className="col-checkbox">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              title="全选未完成任务"
            />
          </div>
        )}
        <div className="col-expand" />
        <div className="col-status">状态</div>
        <div className="col-priority" />
        <div className="col-title">任务</div>
        <div className="col-date">创建于</div>
        <div className="col-due">截止</div>
      </div>

      {/* 任务列表 */}
      <div className="task-body">
        {mainTasks.map(task => renderTaskRow(task))}
      </div>
    </div>
  );
}
