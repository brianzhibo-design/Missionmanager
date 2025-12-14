/**
 * 树节点组件
 * 可折叠/展开的通用树节点
 */
import { useState, ReactNode } from 'react';
import './TreeNode.css';

interface TreeNodeProps {
  label: ReactNode;
  icon?: ReactNode;  // 支持 ReactNode 类型，可传入 Avatar 组件
  badge?: ReactNode;
  defaultExpanded?: boolean;
  children?: ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  level?: number;
}

export function TreeNode({
  label,
  icon,
  badge,
  defaultExpanded = false,
  children,
  onClick,
  isSelected = false,
  level = 0,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = Boolean(children);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    onClick?.();
  };

  return (
    <div className="tree-node" style={{ '--level': level } as React.CSSProperties}>
      <div
        className={`tree-node-content ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
      >
        {/* 展开/收起按钮 */}
        <button
          className={`tree-toggle ${hasChildren ? '' : 'invisible'}`}
          onClick={handleToggle}
        >
          <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>
            ▶
          </span>
        </button>

        {/* 图标 */}
        {icon && <span className="tree-node-icon">{icon}</span>}

        {/* 标签 */}
        <span className="tree-node-label">{label}</span>

        {/* 徽章 */}
        {badge && <span className="tree-node-badge">{badge}</span>}
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="tree-node-children">{children}</div>
      )}
    </div>
  );
}

