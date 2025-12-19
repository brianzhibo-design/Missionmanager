/**
 * 成员任务树页面
 * 只显示当前工作区的项目和成员
 */
import { useState, useEffect, useMemo } from 'react';
import { Network, Brain, RefreshCw, AlertTriangle, Edit2, Users, Crown, User, FolderOpen } from 'lucide-react';
import { treeService, MemberNode, MemberTreeResponse } from '../../services/tree';
import { projectService, Project } from '../../services/project';
import { treeAnalysisService, TeamAnalysisResult } from '../../services/treeAnalysis';
import { api } from '../../services/api';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { TreeNode } from '../../components/tree/TreeNode';
import { TaskStatsBadge } from '../../components/tree/TaskStatsBadge';
import { MemberDetailPanel } from '../../components/tree/MemberDetailPanel';
import { TeamAnalysisPanel } from '../../components/tree/AiAnalysisPanel';
import { MemberEditModal, MemberEditData } from '../../components/tree/MemberEditModal';
import { Avatar } from '../../components/Avatar';
import './MembersTree.css';

export default function MembersTree() {
  // 使用全局当前工作区，确保工作区隔离
  const { currentWorkspace, workspaceRole } = usePermissions();
  const { user: currentUser } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [treeData, setTreeData] = useState<MemberTreeResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI 分析状态
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TeamAnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // 成员编辑状态
  const [editingMember, setEditingMember] = useState<MemberNode | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 当工作区变化时，加载项目列表
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadProjects(currentWorkspace.id);
    } else {
      setProjects([]);
      setSelectedProject('');
      setTreeData(null);
    }
  }, [currentWorkspace?.id]);

  // 当项目变化时，加载树数据
  useEffect(() => {
    if (selectedProject) {
      loadMemberTree(selectedProject);
    } else {
      setTreeData(null);
    }
  }, [selectedProject]);

  const loadProjects = async (workspaceId: string) => {
    try {
      setError(null);
      const data = await projectService.getProjects(workspaceId);
      setProjects(data);
      // 重置选中的项目
      setSelectedProject('');
      setTreeData(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadMemberTree = async (projectId: string) => {
    setLoading(true);
    setError(null);
    setShowAnalysis(false);
    setAnalysisResult(null);
    try {
      const data = await treeService.getMemberTree(projectId);
      setTreeData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // AI 分析团队
  const handleAnalyze = async () => {
    if (!selectedProject) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await treeAnalysisService.analyzeTeam(selectedProject);
      setAnalysisResult(result);
      setShowAnalysis(true);
    } catch (err: any) {
      setError(`AI 分析失败: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // 编辑成员
  const handleEditMember = (member: MemberNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMember(member);
    setShowEditModal(true);
  };

  // 保存成员编辑
  const handleSaveMember = async (memberId: string, data: MemberEditData) => {
    if (!selectedProject) {
      throw new Error('请先选择项目');
    }
    
    // 调用后端API保存项目成员（isReviewer = 验收人标记）
    await api.post(`/admin/projects/${selectedProject}/members`, {
      userId: memberId,
      isReviewer: data.isReviewer,
    });
    
    // 重新加载树数据（保持当前项目选择）
    await loadMemberTree(selectedProject);
  };

  // 获取角色标签
  const getRoleLabel = (member: MemberNode) => {
    // isLeader 在新设计中表示验收人
    if (member.isLeader) {
      return { label: '✅ 验收人', color: '#10b981' };
    }
    return { label: '成员', color: '#6b7280' };
  };

  // 检查是否可以编辑成员（owner、admin 可以编辑所有；leader 只能编辑自己负责的项目）
  const canEditMembers = useMemo(() => {
    if (!workspaceRole || !treeData) return false;
    
    // owner 和 admin 可以编辑所有项目
    if (['owner', 'admin'].includes(workspaceRole)) {
      return true;
    }
    
    // leader 只能编辑自己负责的项目（需要检查项目负责人）
    if (workspaceRole === 'leader' && treeData.leader && currentUser) {
      return treeData.leader.id === currentUser.id;
    }
    
    return false;
  }, [workspaceRole, treeData, currentUser]);

  // 检查是否可以运行 AI 分析（owner、admin 或项目负责人）
  const canRunAiAnalysis = useMemo(() => {
    if (!workspaceRole || !treeData || !currentUser) return false;
    
    // owner 和 admin 可以运行 AI 分析
    if (['owner', 'admin'].includes(workspaceRole)) {
      return true;
    }
    
    // 项目负责人可以运行 AI 分析
    if (treeData.leader && treeData.leader.id === currentUser.id) {
      return true;
    }
    
    return false;
  }, [workspaceRole, treeData, currentUser]);

  const renderMemberNode = (member: MemberNode, level: number = 0): JSX.Element => {
    const roleInfo = getRoleLabel(member);
    const isRootNode = member.userId === 'team-root';

    return (
      <TreeNode
        key={member.userId}
        level={level}
        icon={<Avatar name={member.name} src={member.avatar ?? undefined} size="sm" />}
        label={
          <span className="member-label">
            <span className="member-name">{member.name}</span>
            {/* 根节点不显示角色标签 */}
            {!isRootNode && (
              <span 
                className="role-tag" 
                style={{ backgroundColor: `${roleInfo.color}20`, color: roleInfo.color }}
              >
                {roleInfo.label}
              </span>
            )}
            {/* 根节点不显示编辑按钮 */}
            {canEditMembers && !isRootNode && (
              <button
                className="edit-member-btn"
                onClick={(e) => handleEditMember(member, e)}
                title="编辑成员信息"
              >
                <Edit2 size={12} />
              </button>
            )}
          </span>
        }
        badge={<TaskStatsBadge stats={member.taskStats} compact />}
        isSelected={selectedMember?.userId === member.userId}
        onClick={() => setSelectedMember(member)}
        defaultExpanded={level === 0}
      >
        {member.children.length > 0 && 
          member.children.map((child) => renderMemberNode(child, level + 1))
        }
      </TreeNode>
    );
  };

  return (
    <div className="members-tree-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon icon-purple"><Network size={28} /></div>
          <div className="header-text">
            <h1>成员任务树</h1>
            <p>查看项目成员的任务分布和层级关系</p>
          </div>
        </div>
        <div className="header-controls">
          {/* 显示当前工作区名称 */}
          <div className="current-workspace-badge">
            <FolderOpen size={14} /> {currentWorkspace?.name || '未选择工作区'}
          </div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="select-control"
            disabled={!currentWorkspace}
          >
            <option value="">选择项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {/* AI 分析按钮：只有 owner、admin 或项目负责人可见 */}
          {canRunAiAnalysis && (
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={!selectedProject || analyzing || loading}
            >
              {analyzing ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>分析中...</span>
                </>
              ) : (
                <>
                  <Brain size={16} />
                  <span>AI 分析团队</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="tree-layout">
        <div className="tree-panel">
          {/* 工作区和项目信息卡片 */}
          {treeData && (
            <div className="project-info-card">
              <div className="workspace-info">
                <span className="info-label">工作区</span>
                <span className="info-value">{treeData.workspaceName}</span>
              </div>
              <div className="project-info">
                <span className="info-label">项目</span>
                <span className="info-value">{treeData.projectName}</span>
              </div>
              
              {/* 项目团队信息 */}
              <div className="team-info">
                <h4 className="team-title">
                  <Users size={16} />
                  项目团队
                </h4>
                
                {/* 项目负责人 */}
                {treeData.leader && (
                  <div className="team-section">
                    <span className="section-label">
                      <Crown size={14} />
                      负责人
                    </span>
                    <div className="team-member-item leader">
                      <Avatar name={treeData.leader.name} src={treeData.leader.avatar ?? undefined} size="sm" />
                      <div className="member-details">
                        <span className="member-name">{treeData.leader.name}</span>
                        <span className="member-email">{treeData.leader.email}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 团队成员（排除主负责人，避免重复显示） */}
                {(() => {
                  const leaderId = treeData.leader?.id;
                  const otherMembers = treeData.teamMembers.filter(m => m.userId !== leaderId);
                  // 找到验收人
                  const reviewer = otherMembers.find(m => m.isLeader);
                  const regularMembers = otherMembers.filter(m => !m.isLeader);
                  
                  return (
                    <>
                      {/* 验收人 */}
                      {reviewer && (
                        <div className="team-section">
                          <span className="section-label">
                            <User size={14} />
                            验收人
                          </span>
                          <div className="team-member-item reviewer">
                            <Avatar name={reviewer.name} src={reviewer.avatar ?? undefined} size="sm" />
                            <span className="member-name">{reviewer.name}</span>
                            <span className="reviewer-badge">✅</span>
                          </div>
                        </div>
                      )}
                      
                      {/* 普通成员 */}
                      {regularMembers.length > 0 && (
                        <div className="team-section">
                          <span className="section-label">
                            <User size={14} />
                            成员 ({regularMembers.length})
                          </span>
                          <div className="team-members-list">
                            {regularMembers.map(member => (
                              <div key={member.userId} className="team-member-item">
                                <Avatar name={member.name} src={member.avatar ?? undefined} size="sm" />
                                <span className="member-name">{member.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
                
                {/* 无团队成员提示 */}
                {!treeData.leader && treeData.teamMembers.length === 0 && (
                  <div className="no-team-hint">
                    暂未设置项目团队，显示工作区全体成员
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="tree-panel-header">
            <h3>成员任务分布</h3>
          </div>
          <div className="tree-panel-content">
            {loading ? (
              <div className="loading-state">加载中...</div>
            ) : treeData ? (
              <div className="tree-container">
                {renderMemberNode(treeData.tree)}
              </div>
            ) : (
              <div className="empty-state">
                请选择项目查看成员任务树
              </div>
            )}
          </div>
        </div>

        <div className="detail-panel">
          {showAnalysis && analysisResult ? (
            <TeamAnalysisPanel
              analysis={analysisResult}
              onClose={() => setShowAnalysis(false)}
            />
          ) : (
            <MemberDetailPanel
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
            />
          )}
        </div>
      </div>

      {/* 成员编辑弹窗 */}
      <MemberEditModal
        isOpen={showEditModal}
        member={editingMember}
        onClose={() => {
          setShowEditModal(false);
          setEditingMember(null);
        }}
        onSave={handleSaveMember}
      />
    </div>
  );
}
