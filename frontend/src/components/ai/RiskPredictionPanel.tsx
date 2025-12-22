import { useState, useEffect, useCallback } from 'react';
import { Shield, Loader2, AlertTriangle, RefreshCw } from '../Icons';
import { aiService, RiskPredictionResult } from '../../services/ai';
import './AIComponents.css';

interface Props {
  taskId: string;
}

const riskColors = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
const riskLabels = { high: '高风险', medium: '中风险', low: '低风险' };

export function RiskPredictionPanel({ taskId }: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RiskPredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.predictRisk(taskId);
      setResult(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'AI 暂不可用';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { 
    analyze(); 
  }, [analyze]);

  if (loading) {
    return (
      <div className="risk-panel loading">
        <Loader2 size={24} className="spin" />
        <span>分析风险中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="risk-panel error">
        <AlertTriangle size={20} />
        <span>{error}</span>
        <button className="btn btn-sm btn-secondary" onClick={analyze}><RefreshCw size={14} /> 重试</button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="risk-panel">
      <div className="risk-header">
        <h4><Shield size={18} /> 风险评估</h4>
        <button className="btn-icon" onClick={analyze}><RefreshCw size={14} /></button>
      </div>

      <div className="risk-score-container">
        <div className="risk-score-circle" style={{ borderColor: riskColors[result.overallRisk] }}>
          <span className="risk-score-value">{result.riskScore}</span>
          <span className="risk-score-label">风险分</span>
        </div>
        <div className="risk-summary">
          <span className="risk-level" style={{ backgroundColor: riskColors[result.overallRisk] }}>
            {riskLabels[result.overallRisk]}
          </span>
          <p>延期概率: {result.delayProbability}%</p>
          {result.estimatedDelayDays > 0 && <p>预计延期: {result.estimatedDelayDays} 天</p>}
        </div>
      </div>

      {result.riskFactors.length > 0 && (
        <div className="risk-factors">
          <h5>风险因素</h5>
          {result.riskFactors.map((f, i) => (
            <div key={i} className={`risk-factor risk-${f.severity}`}>
              <div className="risk-factor-header">
                <span className="risk-factor-type">{f.type}</span>
                <span className={`risk-severity risk-severity-${f.severity}`}>{f.severity}</span>
              </div>
              <p className="risk-factor-desc">{f.description}</p>
              <p className="risk-factor-mitigation"><strong>缓解:</strong> {f.mitigation}</p>
            </div>
          ))}
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div className="risk-recommendations">
          <h5>建议</h5>
          <ul>{result.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
