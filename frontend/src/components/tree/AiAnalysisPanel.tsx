/**
 * AI 分析结果展示面板
 * 用于展示团队树分析和项目全景分析结果
 */
import { TeamAnalysisResult, ProjectsOverviewResult } from '../../services/treeAnalysis';
import './AiAnalysisPanel.css';

// ==================== 健康状态配置 ====================

const STATUS_CONFIG = {
  healthy: { label: '健康', color: 'var(--color-success)', emoji: '✅' },
  needs_attention: { label: '需关注', color: 'var(--color-warning)', emoji: '⚠️' },
  at_risk: { label: '有风险', color: '#f97316', emoji: '🔶' },
  critical: { label: '严重', color: 'var(--color-danger)', emoji: '🔴' },
};

const PRIORITY_CONFIG = {
  high: { label: '高', color: 'var(--color-danger)' },
  medium: { label: '中', color: 'var(--color-warning)' },
  low: { label: '低', color: 'var(--color-success)' },
};

// ==================== 团队分析面板 ====================

interface TeamAnalysisPanelProps {
  analysis: TeamAnalysisResult;
  onClose: () => void;
}

export function TeamAnalysisPanel({ analysis, onClose }: TeamAnalysisPanelProps) {
  const healthConfig = STATUS_CONFIG[analysis.team_health.status];

  return (
    <div className="ai-analysis-panel">
      <div className="analysis-header">
        <h3>🤖 AI 团队分析报告</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* 健康评分 */}
      <div className="health-section">
        <div className="health-score">
          <div 
            className="score-circle"
            style={{ borderColor: healthConfig.color }}
          >
            <span className="score-number">{analysis.team_health.score}</span>
            <span className="score-label">健康分</span>
          </div>
          <div className="health-info">
            <span 
              className="health-status"
              style={{ color: healthConfig.color }}
            >
              {healthConfig.emoji} {healthConfig.label}
            </span>
            <p className="health-summary">{analysis.team_health.summary}</p>
          </div>
        </div>
      </div>

      {/* 工作负载分析 */}
      <div className="analysis-section">
        <h4>📊 工作负载分析</h4>
        <div className="balance-score">
          <span>均衡度：</span>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${analysis.workload_analysis.balance_score}%`,
                backgroundColor: analysis.workload_analysis.balance_score > 70 
                  ? 'var(--color-success)' 
                  : analysis.workload_analysis.balance_score > 40 
                    ? 'var(--color-warning)' 
                    : 'var(--color-danger)'
              }}
            />
          </div>
          <span className="score-value">{analysis.workload_analysis.balance_score}%</span>
        </div>

        {analysis.workload_analysis.overloaded_members.length > 0 && (
          <div className="member-list">
            <h5>⚠️ 超负荷成员</h5>
            {analysis.workload_analysis.overloaded_members.map((m, i) => (
              <div key={i} className="member-item overloaded">
                <div className="member-header">
                  <span className="member-name">{m.name}</span>
                  <span className="task-count">{m.task_count} 任务 | {m.blocked_count} 阻塞</span>
                </div>
                <p className="member-suggestion">{m.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {analysis.workload_analysis.idle_members.length > 0 && (
          <div className="member-list">
            <h5>💤 空闲成员</h5>
            {analysis.workload_analysis.idle_members.map((m, i) => (
              <div key={i} className="member-item idle">
                <div className="member-header">
                  <span className="member-name">{m.name}</span>
                  <span className="task-count">{m.task_count} 任务</span>
                </div>
                <p className="member-suggestion">{m.suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 瓶颈分析 */}
      {analysis.bottlenecks.length > 0 && (
        <div className="analysis-section">
          <h4>🚧 瓶颈分析</h4>
          <div className="bottleneck-list">
            {analysis.bottlenecks.map((b, i) => (
              <div key={i} className="bottleneck-item">
                <div className="bottleneck-header">
                  <span 
                    className="priority-badge"
                    style={{ backgroundColor: PRIORITY_CONFIG[b.priority].color }}
                  >
                    {PRIORITY_CONFIG[b.priority].label}优先级
                  </span>
                  <span className="bottleneck-type">{b.type}</span>
                </div>
                <p className="bottleneck-desc">{b.description}</p>
                <div className="affected-members">
                  影响成员：{b.affected_members.join(', ') || '无'}
                </div>
                <p className="bottleneck-suggestion">💡 {b.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 建议 */}
      {analysis.recommendations.length > 0 && (
        <div className="analysis-section">
          <h4>💡 改进建议</h4>
          <div className="recommendation-list">
            {analysis.recommendations.map((r, i) => (
              <div key={i} className="recommendation-item">
                <div className="recommendation-badges">
                  <span 
                    className="impact-badge"
                    style={{ backgroundColor: PRIORITY_CONFIG[r.impact].color }}
                  >
                    影响: {PRIORITY_CONFIG[r.impact].label}
                  </span>
                  <span className="effort-badge">
                    工作量: {PRIORITY_CONFIG[r.effort].label}
                  </span>
                </div>
                <p className="recommendation-action">{r.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 洞察 */}
      {analysis.insights && (
        <div className="analysis-section insights">
          <h4>🔍 其他洞察</h4>
          <p>{analysis.insights}</p>
        </div>
      )}
    </div>
  );
}

// ==================== 项目全景分析面板 ====================

interface ProjectsAnalysisPanelProps {
  analysis: ProjectsOverviewResult;
  onClose: () => void;
}

export function ProjectsAnalysisPanel({ analysis, onClose }: ProjectsAnalysisPanelProps) {
  const healthConfig = STATUS_CONFIG[analysis.organization_health.status];

  return (
    <div className="ai-analysis-panel">
      <div className="analysis-header">
        <h3>🤖 AI 组织分析报告</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* 组织健康评分 */}
      <div className="health-section">
        <div className="health-score">
          <div 
            className="score-circle"
            style={{ borderColor: healthConfig.color }}
          >
            <span className="score-number">{analysis.organization_health.score}</span>
            <span className="score-label">组织健康</span>
          </div>
          <div className="health-info">
            <span 
              className="health-status"
              style={{ color: healthConfig.color }}
            >
              {healthConfig.emoji} {healthConfig.label}
            </span>
            <p className="health-summary">{analysis.organization_health.summary}</p>
          </div>
        </div>
      </div>

      {/* 风险热图 */}
      <div className="analysis-section">
        <h4>🔥 风险热图</h4>
        <div className="risk-heatmap">
          {analysis.risk_heatmap.high_risk_projects.length > 0 && (
            <div className="risk-group high">
              <span className="risk-label">🔴 高风险</span>
              <div className="risk-projects">
                {analysis.risk_heatmap.high_risk_projects.map((p, i) => (
                  <span key={i} className="project-tag">{p}</span>
                ))}
              </div>
            </div>
          )}
          {analysis.risk_heatmap.medium_risk_projects.length > 0 && (
            <div className="risk-group medium">
              <span className="risk-label">🟠 中风险</span>
              <div className="risk-projects">
                {analysis.risk_heatmap.medium_risk_projects.map((p, i) => (
                  <span key={i} className="project-tag">{p}</span>
                ))}
              </div>
            </div>
          )}
          {analysis.risk_heatmap.low_risk_projects.length > 0 && (
            <div className="risk-group low">
              <span className="risk-label">🟢 低风险</span>
              <div className="risk-projects">
                {analysis.risk_heatmap.low_risk_projects.map((p, i) => (
                  <span key={i} className="project-tag">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 项目对比 */}
      <div className="analysis-section">
        <h4>📊 项目对比</h4>
        <div className="project-comparison">
          {analysis.project_comparison.map((p, i) => (
            <div key={i} className="project-compare-item">
              <div className="project-compare-header">
                <span className="project-name">{p.project_name}</span>
                <span 
                  className="health-score-mini"
                  style={{ 
                    color: p.health_score > 70 
                      ? 'var(--color-success)' 
                      : p.health_score > 40 
                        ? 'var(--color-warning)' 
                        : 'var(--color-danger)'
                  }}
                >
                  {p.health_score}分
                </span>
              </div>
              {p.key_issue && (
                <p className="project-issue">⚠️ {p.key_issue}</p>
              )}
              <p className="project-recommendation">💡 {p.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 资源分析 */}
      <div className="analysis-section">
        <h4>📦 资源分析</h4>
        <div className="resource-score">
          <span>资源利用率：</span>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${analysis.resource_analysis.utilization_score}%`,
                backgroundColor: analysis.resource_analysis.utilization_score > 70 
                  ? 'var(--color-success)' 
                  : analysis.resource_analysis.utilization_score > 40 
                    ? 'var(--color-warning)' 
                    : 'var(--color-danger)'
              }}
            />
          </div>
          <span className="score-value">{analysis.resource_analysis.utilization_score}%</span>
        </div>

        {analysis.resource_analysis.imbalances.length > 0 && (
          <div className="imbalance-list">
            {analysis.resource_analysis.imbalances.map((im, i) => (
              <div key={i} className="imbalance-item">
                <p className="imbalance-desc">{im.description}</p>
                <div className="affected-projects">
                  影响项目：{im.affected_projects.join(', ')}
                </div>
                <p className="imbalance-suggestion">💡 {im.suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 优先行动 */}
      {analysis.top_priorities.length > 0 && (
        <div className="analysis-section">
          <h4>🎯 优先行动</h4>
          <div className="priority-list">
            {analysis.top_priorities.map((p, i) => (
              <div key={i} className="priority-item">
                <span 
                  className="urgency-badge"
                  style={{ backgroundColor: PRIORITY_CONFIG[p.urgency].color }}
                >
                  {PRIORITY_CONFIG[p.urgency].label}
                </span>
                <span className="priority-project">{p.project}</span>
                <span className="priority-action">{p.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 洞察 */}
      {analysis.insights && (
        <div className="analysis-section insights">
          <h4>🔍 全局洞察</h4>
          <p>{analysis.insights}</p>
        </div>
      )}
    </div>
  );
}

