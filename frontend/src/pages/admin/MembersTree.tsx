/**
 * 成员任务树页面
 */
import { useState, useEffect } from 'react';
import { Network, Brain, RefreshCw, AlertTriangle, Edit2 } from 'lucide-react';
import { treeService, MemberNode, MemberTreeResponse } from '../../services/tree';
import { workspaceService, Workspace } from '../../services/workspace';
import { projectService, Project } from '../../services/project';
import { treeAnalysisService, TeamAnalysisResult } from '../../services/treeAnalysis';
import { TreeNode } from '../../components/tree/TreeNode';
import { TaskStatsBadge } from '../../components/tree/TaskStatsBadge';
import { MemberDetailPanel } from '../../components/tree/MemberDetailPanel';
import { TeamAnalysisPanel } from '../../components/tree/AiAnalysisPanel';
import { MemberEditModal, MemberEditData } from '../../components/tree/MemberEditModal';
import { Avatar } from '../../components/Avatar';
import './MembersTree.css';

export default function MembersTree() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
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

  // 加载工作区列表
  useEffect(() => {
    loadWorkspaces();
  }, []);

  // 当工作区变化时，加载项目列表
  useEffect(() => {
    if (selectedWorkspace) {
      loadProjects(selectedWorkspace);
    } else {
      setProjects([]);
      setSelectedProject('');
    }
  }, [selectedWorkspace]);

  // 当项目变化时，加载树数据
  useEffect(() => {
    if (selectedProject) {
      loadMemberTree(selectedProject);
    } else {
      setTreeData(null);
    }
  }, [selectedProject]);

  const loadWorkspaces = async () => {
    try {
      const data = await workspaceService.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadProjects = async (workspaceId: string) => {
    try {
      const data = await projectService.getProjects(workspaceId);
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
      }
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
    
    // 调用后端API保存成员角色
    const role = data.customRole || data.role;
    await treeService.updateMemberRole(selectedProject, memberId, role);
    
    // 重新加载树数据
    await loadMemberTree(selectedProject);
  };

  // 获取角色标签
  const getRoleLabel = (role: string) => {
    // 预设角色
    const presetRoles: Record<string, { label: string; color: string }> = {
      project_admin: { label: '管理员', color: '#8b5cf6' },
      team_lead: { label: '负责人', color: '#3b82f6' },
      senior: { label: '高级', color: '#10b981' },
      member: { label: '成员', color: '#6b7280' },
      observer: { label: '观察者', color: '#9ca3af' },
      // 工作区角色（回退显示）
      owner: { label: '所有者', color: '#ec4899' },
      director: { label: '总监', color: '#8b5cf6' },
      manager: { label: '经理', color: '#3b82f6' },
      team: { label: '团队', color: '#10b981' },
    };
    
    // 如果是预设角色，使用预设样式
    if (presetRoles[role]) {
      return presetRoles[role];
    }
    
    // 如果是自定义角色，使用自定义样式（绿色系，表示自定义）
    return { label: role, color: '#059669' };
  };

  const renderMemberNode = (member: MemberNode, level: number = 0): JSX.Element => {
    const roleInfo = getRoleLabel(member.role);

    return (
      <TreeNode
        key={member.userId}
        level={level}
        icon={<Avatar name={member.name} size="sm" />}
        label={
          <span className="member-label">
            <span className="member-name">{member.name}</span>
            <span 
              className="role-tag" 
              style={{ backgroundColor: `${roleInfo.color}20`, color: roleInfo.color }}
            >
              {roleInfo.label}
            </span>
            <button
              className="edit-member-btn"
              onClick={(e) => handleEditMember(member, e)}
              title="编辑成员信息"
            >
              <Edit2 size={12} />
            </button>
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
        <div className="header-left">
          <div className="header-title-row">
            <Network size={28} className="page-icon" />
            <h1>成员任务树</h1>
          </div>
          <p className="page-description">查看项目成员的任务分布和层级关系</p>
        </div>
        <div className="header-controls">
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            className="select-control"
          >
            <option value="">选择工作区</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="select-control"
            disabled={!selectedWorkspace}
          >
            <option value="">选择项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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
          <div className="tree-panel-header">
            <h3>{treeData?.projectName || '成员结构'}</h3>
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
