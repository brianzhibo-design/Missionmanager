/**
 * 项目工作树页面
 * 只显示当前工作区的项目
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { treeService, ProjectTreeResponse, ProjectNode, TaskStats } from '../../services/tree';
import { treeAnalysisService, ProjectsOverviewResult } from '../../services/treeAnalysis';
import { usePermissions } from '../../hooks/usePermissions';
import { TaskStatsBadge } from '../../components/tree/TaskStatsBadge';
import { ProjectsAnalysisPanel } from '../../components/tree/AiAnalysisPanel';
import './ProjectsTree.css';

export default function ProjectsTree() {
  // 使用全局当前工作区，确保工作区隔离
  const { currentWorkspace } = usePermissions();
  
  const [treeData, setTreeData] = useState<ProjectTreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI 分析状态
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProjectsOverviewResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // 当工作区变化时，加载项目树
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadProjectTree(currentWorkspace.id);
    } else {
      setTreeData(null);
    }
  }, [currentWorkspace?.id]);

  const loadProjectTree = async (workspaceId: string) => {
    setLoading(true);
    setError(null);
    setShowAnalysis(false);
    setAnalysisResult(null);
    try {
      const data = await treeService.getProjectTree(workspaceId);
      setTreeData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // AI 分析项目全景
  const handleAnalyze = async () => {
    if (!currentWorkspace?.id) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await treeAnalysisService.analyzeProjectsOverview(currentWorkspace.id);
      setAnalysisResult(result);
      setShowAnalysis(true);
    } catch (err: any) {
      setError(`AI 分析失败: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="projects-tree-page">
      <div className="page-header">
        <div className="header-left">
          <h1>🏢 项目总览</h1>
          <p className="page-description">查看所有项目的工作情况和整体进度</p>
        </div>
        <div className="header-controls">
          {/* 显示当前工作区名称 */}
          <div className="current-workspace-badge">
            📁 {currentWorkspace?.name || '未选择工作区'}
          </div>
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!currentWorkspace || analyzing || loading}
          >
            {analyzing ? '🔄 分析中...' : '🤖 AI 分析全局'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* AI 分析结果 */}
      {showAnalysis && analysisResult && (
        <div className="analysis-container">
          <ProjectsAnalysisPanel
            analysis={analysisResult}
            onClose={() => setShowAnalysis(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="loading-state">加载中...</div>
      ) : treeData ? (
        <>
          {/* 总体统计 */}
          <div className="overall-stats">
            <div className="stat-card large">
              <span className="stat-value">{treeData.totalProjects}</span>
              <span className="stat-label">项目总数</span>
            </div>
            <div className="stat-card large">
              <span className="stat-value">{treeData.overallStats.total}</span>
              <span className="stat-label">任务总数</span>
            </div>
            <div className="stat-card large done">
              <span className="stat-value">{treeData.overallStats.done}</span>
              <span className="stat-label">已完成</span>
            </div>
            <div className="stat-card large in-progress">
              <span className="stat-value">{treeData.overallStats.inProgress}</span>
              <span className="stat-label">进行中</span>
            </div>
            <div className="stat-card large blocked">
              <span className="stat-value">{treeData.overallStats.blocked}</span>
              <span className="stat-label">阻塞</span>
            </div>
          </div>

          {/* 项目列表 */}
          <div className="projects-grid">
            {treeData.projects.map((project) => (
              <ProjectCard key={project.projectId} project={project} />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          {currentWorkspace ? '当前工作区暂无项目' : '请先选择工作区'}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectNode }) {
  const health = getHealthStatus(project.taskStats);

  return (
    <div className="project-card">
      <div className="card-header">
        <Link to={`/projects/${project.projectId}`} className="project-name">
          {project.name}
        </Link>
        <span className="health-badge" style={{ backgroundColor: health.color }}>
          {health.label}
        </span>
      </div>

      {project.description && (
        <p className="project-description">{project.description}</p>
      )}

      <div className="progress-section">
        <div className="progress-header">
          <span>进度</span>
          <span>{project.progress}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="stats-row">
        <TaskStatsBadge stats={project.taskStats} />
      </div>

      <div className="members-section">
        <h4>主要成员</h4>
        <div className="members-list">
          {project.topMembers.slice(0, 3).map((member) => (
            <div key={member.userId} className="member-item">
              <div className="member-avatar-sm">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span className="member-name">{member.name}</span>
              <span className="member-tasks">{member.taskCount} 任务</span>
            </div>
          ))}
        </div>
      </div>

      {project.recentActivity && (
        <div className="activity-info">
          最近活动: {new Date(project.recentActivity).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function getHealthStatus(stats: TaskStats) {
  const blockedRatio = stats.total > 0 ? stats.blocked / stats.total : 0;
  if (blockedRatio > 0.2) return { status: 'critical', label: '需要关注', color: 'var(--color-danger)' };
  if (blockedRatio > 0.1) return { status: 'warning', label: '有风险', color: 'var(--color-warning)' };
  return { status: 'healthy', label: '健康', color: 'var(--color-success)' };
}
