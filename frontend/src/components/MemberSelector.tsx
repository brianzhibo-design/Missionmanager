/**
 * 成员选择器组件
 * 用于群发消息、项目成员选择等场景
 */
import React, { useState, useMemo } from 'react';
import { Search, Check, Users, Crown, X } from './Icons';
import RoleBadge from './RoleBadge';
import './MemberSelector.css';

export interface SelectableMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  role?: string;
  isLeader?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

interface MemberSelectorProps {
  members: SelectableMember[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showSelectAll?: boolean;
  maxHeight?: number;
  emptyMessage?: string;
  mode?: 'checkbox' | 'single';
}


export const MemberSelector: React.FC<MemberSelectorProps> = ({
  members,
  selectedIds,
  onSelectionChange,
  title = '选择成员',
  subtitle,
  showSearch = true,
  showSelectAll = true,
  maxHeight = 320,
  emptyMessage = '暂无可选成员',
  mode = 'checkbox',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.role && m.role.toLowerCase().includes(query))
    );
  }, [members, searchQuery]);

  const selectableMembers = useMemo(
    () => filteredMembers.filter((m) => !m.disabled),
    [filteredMembers]
  );

  const isAllSelected = selectableMembers.length > 0 && 
    selectableMembers.every((m) => selectedIds.includes(m.id));

  const handleToggle = (memberId: string) => {
    if (mode === 'single') {
      onSelectionChange([memberId]);
      return;
    }
    
    if (selectedIds.includes(memberId)) {
      onSelectionChange(selectedIds.filter((id) => id !== memberId));
    } else {
      onSelectionChange([...selectedIds, memberId]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      // 取消选择所有可选成员
      const selectableMemberIds = new Set(selectableMembers.map((m) => m.id));
      onSelectionChange(selectedIds.filter((id) => !selectableMemberIds.has(id)));
    } else {
      // 选择所有可选成员
      const newIds = new Set(selectedIds);
      selectableMembers.forEach((m) => newIds.add(m.id));
      onSelectionChange(Array.from(newIds));
    }
  };

  const getAvatarText = (name: string) => {
    return name.charAt(0).toUpperCase();
  };


  return (
    <div className="member-selector">
      {/* Header */}
      <div className="selector-header">
        <div className="selector-title-row">
          <div className="selector-title">
            <Users size={18} />
            <span>{title}</span>
          </div>
          {showSelectAll && mode === 'checkbox' && selectableMembers.length > 0 && (
            <button
              type="button"
              className={`select-all-btn ${isAllSelected ? 'active' : ''}`}
              onClick={handleSelectAll}
            >
              {isAllSelected ? (
                <>
                  <X size={14} /> 取消全选
                </>
              ) : (
                <>
                  <Check size={14} /> 全选
                </>
              )}
            </button>
          )}
        </div>
        {subtitle && <p className="selector-subtitle">{subtitle}</p>}
        
        {/* Selection stats */}
        {mode === 'checkbox' && selectedIds.length > 0 && (
          <div className="selection-stats">
            已选择 <strong>{selectedIds.length}</strong> / {members.length} 人
          </div>
        )}
      </div>

      {/* Search */}
      {showSearch && members.length > 5 && (
        <div className="selector-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="搜索成员..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Member List */}
      <div className="selector-list" style={{ maxHeight }}>
        {filteredMembers.length === 0 ? (
          <div className="selector-empty">
            {searchQuery ? (
              <>
                <Search size={24} />
                <p>未找到匹配的成员</p>
              </>
            ) : (
              <>
                <Users size={24} />
                <p>{emptyMessage}</p>
              </>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isSelected = selectedIds.includes(member.id);
            
            return (
              <div
                key={member.id}
                className={`selector-item ${isSelected ? 'selected' : ''} ${
                  member.disabled ? 'disabled' : ''
                }`}
                onClick={() => !member.disabled && handleToggle(member.id)}
                title={member.disabled ? member.disabledReason : undefined}
              >
                {/* Checkbox indicator */}
                <div className={`item-checkbox ${isSelected ? 'checked' : ''}`}>
                  {isSelected && <Check size={12} />}
                </div>

                {/* Avatar */}
                <div className="item-avatar">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} />
                  ) : (
                    <span>{getAvatarText(member.name)}</span>
                  )}
                  {member.isLeader && (
                    <div className="leader-badge">
                      <Crown size={10} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="item-info">
                  <div className="item-name">{member.name}</div>
                  {member.email && (
                    <div className="item-email">{member.email}</div>
                  )}
                </div>

                {/* Role tag */}
                {member.role && (
                  <RoleBadge role={member.role} size="xs" variant="dot" />
                )}

                {/* Disabled indicator */}
                {member.disabled && member.disabledReason && (
                  <div className="item-disabled-reason">{member.disabledReason}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MemberSelector;

