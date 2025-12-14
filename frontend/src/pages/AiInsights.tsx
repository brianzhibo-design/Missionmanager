import { useState, useEffect } from 'react';
import { workspaceService, Workspace } from '../services/workspace';
import { treeAnalysisService, ProjectsOverviewResult } from '../services/treeAnalysis';
import './AiInsights.css';

export default function AiInsights() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [analysis, setAnalysis] = useState<ProjectsOverviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const data = await workspaceService.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0) {
        setSelectedWorkspace(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const result = await treeAnalysisService.analyzeProjectsOverview(selectedWorkspace);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; class: string }> = {
      healthy: { label: '健康', class: 'badge-success' },
      needs_attention: { label: '需关注', class: 'badge-warning' },
      at_risk: { label: '有风险', class: 'badge-danger' },
      critical: { label: '紧急', class: 'badge-danger' },
    };
    const { label, class: className } = config[status] || config.healthy;
    return <span className={`badge ${className}`}>{label}</span>;
  };

  const getRiskBadge = (risk: string) => {
    const config: Record<string, { label: string; class: string }> = {
      low: { label: '低', class: 'badge-success' },
      medium: { label: '中', class: 'badge-warning' },
      high: { label: '高', class: 'badge-danger' },
    };
    const { label, class: className } = config[risk] || config.low;
    return <span className={`badge ${className}`}>{label}</span>;
  };

  return (
    <div className="ai-insights-page fade-in">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">🧠</div>
          <div className="header-text">
            <h1>AI 洞察</h1>
            <p>AI 驱动的跨项目分析与风险识别</p>
          </div>
        </div>
        <div className="header-actions">
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            className="select-control"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={!selectedWorkspace || loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                分析中...
              </>
            ) : (
              <>🔍 开始分析</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-card card-static">
          ⚠️ {error}
        </div>
      )}

      {!analysis && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h3>AI 全局洞察</h3>
          <p>选择工作区并点击"开始分析"，AI 将为您生成跨项目的智能分析报告</p>
          <div className="empty-features">
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>组织健康度评估</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚠️</span>
              <span>风险热力图</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💡</span>
              <span>智能行动建议</span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>AI 正在分析您的项目数据...</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="insights-grid">
          {/* 组织健康度 */}
          <div className="card insight-card health-card">
            <div className="card-header">
              <h3>🏢 组织健康度</h3>
              {getStatusBadge(analysis.organization_health.status)}
            </div>
            <div className="health-score">
              <div className="score-circle">
                <svg viewBox="0 0 100 100">
                  <circle
                    className="score-bg"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    strokeWidth="8"
                  />
                  <circle
                    className="score-fill"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    strokeWidth="8"
                    strokeDasharray={`${analysis.organization_health.score * 2.83} 283`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="score-value">{analysis.organization_health.score}</span>
              </div>
            </div>
            <p className="health-summary">{analysis.organization_health.summary}</p>
          </div>

          {/* 风险热力图 */}
          <div className="card insight-card risk-card">
            <div className="card-header">
              <h3>🔥 风险热力图</h3>
            </div>
            <div className="risk-grid">
              <div className="risk-level high">
                <span className="risk-label">高风险</span>
                <span className="risk-count">{analysis.risk_heatmap.high_risk_projects.length}</span>
                <div className="risk-projects">
                  {analysis.risk_heatmap.high_risk_projects.map((p, i) => (
                    <span key={i} className="risk-project">{p}</span>
                  ))}
                </div>
              </div>
              <div className="risk-level medium">
                <span className="risk-label">中风险</span>
                <span className="risk-count">{analysis.risk_heatmap.medium_risk_projects.length}</span>
                <div className="risk-projects">
                  {analysis.risk_heatmap.medium_risk_projects.map((p, i) => (
                    <span key={i} className="risk-project">{p}</span>
                  ))}
                </div>
              </div>
              <div className="risk-level low">
                <span className="risk-label">低风险</span>
                <span className="risk-count">{analysis.risk_heatmap.low_risk_projects.length}</span>
                <div className="risk-projects">
                  {analysis.risk_heatmap.low_risk_projects.map((p, i) => (
                    <span key={i} className="risk-project">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 项目对比 */}
          <div className="card insight-card comparison-card">
            <div className="card-header">
              <h3>📈 项目对比</h3>
            </div>
            <div className="comparison-list">
              {analysis.project_comparison.map((project, i) => (
                <div key={i} className="comparison-item">
                  <div className="comparison-header">
                    <span className="project-name">{project.project_name}</span>
                    {getRiskBadge(project.risk_level)}
                  </div>
                  <div className="comparison-score">
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ width: `${project.health_score}%` }}
                      />
                    </div>
                    <span className="score-text">{project.health_score}分</span>
                  </div>
                  {project.key_issue && (
                    <p className="project-issue">⚠️ {project.key_issue}</p>
                  )}
                  <p className="project-recommendation">💡 {project.recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 优先行动 */}
          <div className="card insight-card priorities-card">
            <div className="card-header">
              <h3>🎯 优先行动</h3>
            </div>
            <div className="priorities-list">
              {analysis.top_priorities.map((priority, i) => (
                <div key={i} className={`priority-item urgency-${priority.urgency}`}>
                  <div className="priority-urgency">
                    {priority.urgency === 'high' ? '🔴' : priority.urgency === 'medium' ? '🟡' : '🟢'}
                  </div>
                  <div className="priority-content">
                    <span className="priority-action">{priority.action}</span>
                    <span className="priority-project">{priority.project}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 资源分析 */}
          <div className="card insight-card resource-card">
            <div className="card-header">
              <h3>⚖️ 资源分析</h3>
              <span className="utilization-score">
                利用率 {analysis.resource_analysis.utilization_score}%
              </span>
            </div>
            {analysis.resource_analysis.imbalances.length > 0 ? (
              <div className="imbalances-list">
                {analysis.resource_analysis.imbalances.map((imbalance, i) => (
                  <div key={i} className="imbalance-item">
                    <p className="imbalance-desc">{imbalance.description}</p>
                    <p className="imbalance-suggestion">💡 {imbalance.suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-imbalances">✅ 资源分配均衡</p>
            )}
          </div>

          {/* AI 洞察 */}
          {analysis.insights && (
            <div className="card insight-card insights-card">
              <div className="card-header">
                <h3>💭 AI 洞察</h3>
              </div>
              <p className="insights-text">{analysis.insights}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
