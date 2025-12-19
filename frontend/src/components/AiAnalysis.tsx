/**
 * AI 分析组件 - Zenith 风格
 */
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, AlertTriangle, Lightbulb, CheckCircle2, BarChart3, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { aiService, AiAnalysis, AiAnalysisResult } from '../services/ai';
import './AiAnalysis.css';

interface AiAnalysisProps {
  taskId: string;
}

type AnalysisState = 'idle' | 'loading' | 'success' | 'error';

export function AiAnalysisPanel({ taskId }: AiAnalysisProps) {
  const [state, setState] = useState<AnalysisState>('idle');
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [history, setHistory] = useState<AiAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [aiInfo, setAiInfo] = useState<{ name: string; isMock: boolean } | null>(null);

  const loadAiInfo = useCallback(async () => {
    try {
      const info = await aiService.getAiInfo();
      setAiInfo({
        name: info.provider,
        isMock: !info.enabled,
      });
    } catch (err) {
      console.error('获取 AI 信息失败:', err);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const analyses = await aiService.getAnalysisHistory(taskId);
      setHistory(analyses);
      if (analyses.length > 0) {
        setAnalysis(analyses[0]);
        setState('success');
      }
    } catch (err) {
      console.error('获取分析历史失败:', err);
    }
  }, [taskId]);

  useEffect(() => {
    loadAiInfo();
    loadHistory();
  }, [loadAiInfo, loadHistory]);

  const handleAnalyze = async () => {
    setState('loading');
    setError(null);
    try {
      const result = await aiService.analyzeTask(taskId);
      setAnalysis(result.analysis);
      setState('success');
      loadHistory();
    } catch (err: unknown) {
      setState('error');
      setError(err instanceof Error ? err.message : '分析失败');
    }
  };

  return (
    <div className="ai-analysis-panel">
      <div className="ai-analysis-header">
        <div className="ai-analysis-title">
          <Sparkles size={18} className="ai-icon" />
          <h3>AI 任务分析</h3>
          {aiInfo && (
            <span className={`ai-badge ${aiInfo.isMock ? 'mock' : 'live'}`}>
              {aiInfo.isMock ? '模拟模式' : aiInfo.name}
            </span>
          )}
        </div>
        <div className="ai-analysis-actions">
          {analysis && (
            <button 
              className="collapse-toggle" 
              onClick={() => setShowResult(!showResult)}
              title={showResult ? '收起分析结果' : '展开分析结果'}
            >
              {showResult ? <><ChevronUp size={16} /> 收起</> : <><ChevronDown size={16} /> 展开</>}
            </button>
          )}
          {history.length > 0 && (
            <button className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? '隐藏历史' : `历史 (${history.length})`}
            </button>
          )}
          <button
            className={`analyze-button ${state === 'loading' ? 'loading' : ''}`}
            onClick={handleAnalyze}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? <><span className="spinner"></span>分析中...</> : '开始分析'}
          </button>
        </div>
      </div>

      {error && (
        <div className="ai-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {state === 'idle' && !analysis && (
        <div className="ai-empty">
          <p>点击"开始分析"按钮，AI 将分析任务状态并给出建议。</p>
        </div>
      )}

      {analysis && showResult && (
        <div className="ai-result">
          <ProgressAssessment assessment={analysis.result.progress_assessment} />
          <NextActions actions={analysis.result.next_actions} />
          <Risks risks={analysis.result.risks} />
          {analysis.result.insights && analysis.result.insights.length > 0 && (
            <div className="ai-insights">
              <h4><Lightbulb size={16} /> 洞察</h4>
              <ul>{analysis.result.insights.map((insight, i) => <li key={i}>{insight}</li>)}</ul>
            </div>
          )}
          <div className="ai-meta">
            <span>时间: {new Date(analysis.createdAt).toLocaleString()}</span>
            <span>模型: {analysis.model}</span>
          </div>
        </div>
      )}

      {analysis && !showResult && (
        <div className="ai-collapsed-hint">
          <span>AI 分析结果已收起，点击"展开"查看详情</span>
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="ai-history">
          <h4><Clock size={16} /> 历史</h4>
          <div className="history-list">
            {history.map((item) => (
              <div
                key={item.id}
                className={`history-item ${analysis?.id === item.id ? 'active' : ''}`}
                onClick={() => { setAnalysis(item); setState('success'); }}
              >
                <span className="history-date">{new Date(item.createdAt).toLocaleString()}</span>
                <p>{item.result.summary?.slice(0, 50) || '暂无'}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressAssessment({ assessment }: { assessment: AiAnalysisResult['progress_assessment'] }) {
  if (!assessment) return null;
  const statusColors: Record<string, string> = { '需要关注': '#ef4444', '进展正常': '#f59e0b', '进展良好': '#10b981' };
  const color = statusColors[assessment.overall_status] || '#6b7280';

  return (
    <div className="progress-assessment">
      <h4><BarChart3 size={16} /> 进度评估</h4>
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${assessment.completion_percentage}%`, backgroundColor: color }} />
        <span className="progress-text">{assessment.completion_percentage}%</span>
      </div>
      <span className="status-badge" style={{ backgroundColor: color }}>{assessment.overall_status}</span>
      {assessment.key_findings?.length > 0 && <ul>{assessment.key_findings.map((f, i) => <li key={i}>{f}</li>)}</ul>}
    </div>
  );
}

function NextActions({ actions }: { actions: AiAnalysisResult['next_actions'] }) {
  if (!actions?.length) return null;
  const colors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  return (
    <div className="next-actions">
      <h4><CheckCircle2 size={16} /> 建议行动</h4>
      <ul>
        {actions.map((a: { action: string; priority: string; reason: string }, i: number) => (
          <li key={i} className="action-item">
            <span className="priority-dot" style={{ backgroundColor: colors[a.priority] || '#6b7280' }} />
            <span>{a.action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Risks({ risks }: { risks: AiAnalysisResult['risks'] }) {
  if (!risks?.length) return null;
  const colors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  const labels: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };
  return (
    <div className="risks">
      <h4><AlertTriangle size={16} /> 风险</h4>
      <ul>
        {risks.map((r: { risk: string; severity: string; mitigation: string }, i: number) => (
          <li key={i} className="risk-item">
            <span className="severity-badge" style={{ backgroundColor: colors[r.severity] || '#6b7280' }}>
              {labels[r.severity] || r.severity}
            </span>
            <span>{r.risk}</span>
            <p><strong>缓解:</strong> {r.mitigation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
