/**
 * 移动端成员任务树页面 - 简约蓝主题
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Crown,
  User,
  Check,
  Loader2,
  Users,
  Folder,
} from '../../components/Icons';
import MobileLayout from '../../components/mobile/MobileLayout';
import SheetModal from '../../components/mobile/SheetModal';
import { treeService, MemberNode, MemberTreeResponse } from '../../services/tree';
import { projectService, Project } from '../../services/project';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/mobile-minimal.css';

// 优先级配置
const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: '紧急', className: 'critical' },
  high: { label: '高', className: 'high' },
  medium: { label: '中', className: 'medium' },
  low: { label: '低', className: 'low' },
};

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  todo: { label: '待办', className: 'todo' },
  in_progress: { label: '进行中', className: 'in-progress' },
  review: { label: '审核', className: 'in-progress' },
  done: { label: '完成', className: 'done' },
};

// 角色选项
const ROLE_OPTIONS = [
  { value: 'owner', label: '负责人' },
  { value: 'admin', label: '管理员' },
  { value: 'member', label: '成员' },
];

export default function MobileMembersTree() {
  const navigate = useNavigate();
  const { currentWorkspace } = usePermissions();

  // 数据状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [treeData, setTreeData] = useState<MemberTreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 展开的成员ID列表
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // 弹窗状态
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberNode | null>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [showRoleEdit, setShowRoleEdit] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  // 加载函数定义
  const loadProjects = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const data = await projectService.getProjects(currentWorkspace.id);
      setProjects(data);

      // 自动选择第一个项目
      if (data.length > 0) {
        setSelectedProjectId(prev => prev || data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [currentWorkspace?.id]);

  const loadMemberTree = useCallback(async () => {
    if (!selectedProjectId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await treeService.getMemberTree(selectedProjectId);
      setTreeData(data);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  // 加载项目列表
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadProjects();
    }
  }, [currentWorkspace?.id, loadProjects]);

  // 加载成员树
  useEffect(() => {
    if (selectedProjectId) {
      loadMemberTree();
    }
  }, [selectedProjectId, loadMemberTree]);

  // 展开/折叠成员
  const toggleMemberExpand = (userId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // 查看成员详情
  const handleMemberClick = (member: MemberNode) => {
    setSelectedMember(member);
    setShowMemberDetail(true);
  };

  // 编辑成员角色
  const handleEditRole = (member: MemberNode) => {
    setSelectedMember(member);
    setShowMemberDetail(false);
    setShowRoleEdit(true);
  };

  // 保存角色修改
  const handleSaveRole = async (newRole: string) => {
    if (!selectedMember || !selectedProjectId) return;

    try {
      setUpdatingRole(true);
      await treeService.updateMemberRole(selectedProjectId, selectedMember.userId, newRole);
      await loadMemberTree();
      setShowRoleEdit(false);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdatingRole(false);
    }
  };

  // 点击任务跳转详情
  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  // 获取选中项目名称
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // 获取成员缩写
  const getInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase();
  };

  // 扁平化成员树（递归收集所有成员）
  const flattenMembers = (node: MemberNode): MemberNode[] => {
    const result: MemberNode[] = [node];
    if (node.children) {
      node.children.forEach(child => {
        result.push(...flattenMembers(child));
      });
    }
    return result;
  };

  const allMembers = treeData?.tree ? flattenMembers(treeData.tree) : [];

  return (
    <MobileLayout
      headerType="manage"
      headerTitle="成员任务树"
      showBottomNav={false}
    >
      {/* 项目选择器 */}
      <div className="mm-project-selector" onClick={() => setShowProjectSelect(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <Folder size={18} />
        <span className="mm-project-selector-text">
          {selectedProject?.name || '选择项目'}
        </span>
        <ChevronDown size={18} style={{ marginLeft: 'auto' }} />
      </div>

      {/* 项目信息卡片 */}
      {treeData && (
        <div className="mm-project-info">
          <h3 className="mm-project-title">{treeData.projectName}</h3>
          
          {/* 负责人 */}
          {treeData.leader && (
            <div className="mm-project-leader">
              <div className="mm-leader-avatar" style={{ background: 'var(--min-primary-light)', color: 'var(--min-primary)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                {treeData.leader.name.slice(0, 1)}
              </div>
              <div className="mm-leader-info">
                <div className="mm-leader-name">{treeData.leader.name}</div>
                <div className="mm-leader-badge">
                  <Crown size={12} />
                  负责人
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 成员列表 */}
      <div className="mm-members-list">
        {loading ? (
          <div className="mm-loading" style={{ padding: 40 }}>
            <Loader2 size={24} className="mm-spinner-icon" />
            <span>加载中...</span>
          </div>
        ) : error ? (
          <div className="mm-empty-state">
            <div className="mm-empty-title">加载失败</div>
            <div className="mm-empty-desc">{error}</div>
            <button className="mm-btn mm-btn-primary" onClick={() => loadMemberTree()}>
              重试
            </button>
          </div>
        ) : allMembers.length > 0 ? (
          allMembers.map((member) => {
            const isExpanded = expandedMembers.has(member.userId);
            const stats = member.taskStats;

            return (
              <div key={member.userId} className="mm-member-card">
                {/* 成员头部 */}
                <div 
                  className="mm-member-card-header"
                  onClick={() => toggleMemberExpand(member.userId)}
                >
                  <div className="mm-member-card-avatar">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} />
                    ) : (
                      getInitials(member.name)
                    )}
                  </div>
                  <div className="mm-member-card-info">
                    <div className="mm-member-card-name">
                      {member.name}
                      {member.isLeader && (
                        <span className="mm-member-leader-badge">
                          <Crown size={12} /> 负责人
                        </span>
                      )}
                    </div>
                    <div className="mm-member-card-stats">
                      {stats.total} 个任务
                      {stats.inProgress > 0 && ` · ${stats.inProgress} 进行中`}
                      {stats.done > 0 && ` · ${stats.done} 已完成`}
                    </div>
                  </div>
                  <div className="mm-member-card-expand">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* 展开的任务列表 */}
                {isExpanded && (
                  <div className="mm-member-card-tasks">
                    {member.tasks.length > 0 ? (
                      member.tasks.map((task) => {
                        const isDone = task.status === 'done';
                        const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;

                        return (
                          <div
                            key={task.id}
                            className={`mm-member-task-item ${isDone ? 'done' : ''}`}
                            onClick={() => handleTaskClick(task.id)}
                          >
                            <div className={`mm-member-task-check ${isDone ? 'done' : ''}`}>
                              {isDone && <Check size={12} style={{ color: 'white' }} />}
                            </div>
                            <span className="mm-member-task-title">{task.title}</span>
                            <span className={`mm-member-task-priority ${priorityConfig.className}`} />
                          </div>
                        );
                      })
                    ) : (
                      <div className="mm-member-no-tasks">暂无任务</div>
                    )}
                    
                    {/* 查看详情按钮 */}
                    <button 
                      className="mm-member-view-detail"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMemberClick(member);
                      }}
                    >
                      查看详情
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : selectedProjectId ? (
          <div className="mm-empty-state">
            <div className="mm-empty-icon">
              <Users size={48} />
            </div>
            <div className="mm-empty-title">暂无成员</div>
            <div className="mm-empty-desc">该项目还没有添加成员</div>
          </div>
        ) : (
          <div className="mm-empty-state">
            <div className="mm-empty-icon">
              <Folder size={48} />
            </div>
            <div className="mm-empty-title">请选择项目</div>
            <div className="mm-empty-desc">选择一个项目查看成员任务树</div>
          </div>
        )}
      </div>

      {/* 项目选择弹窗 */}
      <SheetModal
        isOpen={showProjectSelect}
        onClose={() => setShowProjectSelect(false)}
        title="选择项目"
      >
        <div className="mm-project-options">
          {projects.map((project) => (
            <button
              key={project.id}
              className={`mm-project-option ${selectedProjectId === project.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedProjectId(project.id);
                setShowProjectSelect(false);
              }}
            >
              <Folder size={18} />
              <span>{project.name}</span>
              {selectedProjectId === project.id && <Check size={18} />}
            </button>
          ))}
        </div>
      </SheetModal>

      {/* 成员详情弹窗 */}
      <SheetModal
        isOpen={showMemberDetail}
        onClose={() => setShowMemberDetail(false)}
        title="成员详情"
        height="70vh"
      >
        {selectedMember && (
          <div className="mm-member-detail">
            {/* 成员信息 */}
            <div className="mm-member-detail-header">
              <div className="mm-member-detail-avatar">
                {selectedMember.avatar ? (
                  <img src={selectedMember.avatar} alt={selectedMember.name} />
                ) : (
                  getInitials(selectedMember.name)
                )}
              </div>
              <div className="mm-member-detail-info">
                <h3>{selectedMember.name}</h3>
                <p>{selectedMember.email}</p>
              </div>
            </div>

            {/* 角色信息 */}
            <div className="mm-member-detail-role">
              <span className="mm-member-detail-label">角色</span>
              <span className="mm-member-detail-value">
                {selectedMember.isLeader ? '负责人' : 
                  ROLE_OPTIONS.find(r => r.value === selectedMember.role)?.label || selectedMember.role}
              </span>
              <button 
                className="mm-member-edit-btn"
                onClick={() => handleEditRole(selectedMember)}
              >
                修改
              </button>
            </div>

            {/* 任务统计 */}
            <div className="mm-member-detail-stats">
              <div className="mm-stat-item">
                <span className="mm-stat-value">{selectedMember.taskStats.total}</span>
                <span className="mm-stat-label">总任务</span>
              </div>
              <div className="mm-stat-item">
                <span className="mm-stat-value">{selectedMember.taskStats.inProgress}</span>
                <span className="mm-stat-label">进行中</span>
              </div>
              <div className="mm-stat-item">
                <span className="mm-stat-value">{selectedMember.taskStats.done}</span>
                <span className="mm-stat-label">已完成</span>
              </div>
            </div>

            {/* 任务列表 */}
            <div className="mm-member-detail-tasks">
              <h4>任务列表</h4>
              {selectedMember.tasks.map((task) => (
                <div
                  key={task.id}
                  className="mm-member-task-row"
                  onClick={() => {
                    setShowMemberDetail(false);
                    handleTaskClick(task.id);
                  }}
                >
                  <span className={`mm-task-status-dot ${STATUS_CONFIG[task.status]?.className || ''}`} />
                  <span className="mm-task-row-title">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SheetModal>

      {/* 角色编辑弹窗 */}
      <SheetModal
        isOpen={showRoleEdit}
        onClose={() => setShowRoleEdit(false)}
        title="修改角色"
      >
        <div className="mm-role-options">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role.value}
              className={`mm-role-option ${selectedMember?.role === role.value ? 'active' : ''}`}
              onClick={() => handleSaveRole(role.value)}
              disabled={updatingRole}
            >
              <User size={18} />
              <span>{role.label}</span>
              {selectedMember?.role === role.value && <Check size={18} />}
              {updatingRole && <Loader2 size={16} className="mm-spinner-icon" />}
            </button>
          ))}
        </div>
      </SheetModal>
    </MobileLayout>
  );
}






