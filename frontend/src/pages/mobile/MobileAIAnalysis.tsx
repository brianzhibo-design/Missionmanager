/**
 * 移动端 AI 分析页面 - 简约蓝主题
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import MobileLayout from '../../components/mobile/MobileLayout';
import { aiService, RiskPredictionResult, ProgressEstimation, DailySuggestions } from '../../services/ai';
import '../../styles/mobile-minimal.css';

type AnalysisType = 'task' | 'project' | 'efficiency';

interface AnalysisResult {
  summary: string;
  highlights: string[];
  concerns: string[];
  suggestions: string[];
  efficiency?: number;
}

export default function MobileAIAnalysis() {
  const { taskId, projectId } = useParams();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') || 'task') as AnalysisType;

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transformRiskToAnalysis = (risk: RiskPredictionResult): AnalysisResult => {
    const riskLevelText = risk.overallRisk === 'high' ? '高风险' : risk.overallRisk === 'medium' ? '中等风险' : '低风险';
    
    return {
      summary: `任务当前状态为${riskLevelText}，风险评分 ${risk.riskScore}/100。延迟概率为 ${Math.round(risk.delayProbability * 100)}%。`,
      highlights: risk.riskFactors
        .filter(f => f.severity === 'low')
        .map(f => f.description),
      concerns: risk.riskFactors
        .filter(f => f.severity !== 'low')
        .map(f => `${f.description}（建议：${f.mitigation}）`),
      suggestions: risk.recommendations,
      efficiency: 100 - risk.riskScore,
    };
  };

  const transformProgressToAnalysis = (progress: ProgressEstimation): AnalysisResult => {
    return {
      summary: `项目当前进度 ${progress.currentProgress}%，预计完成日期：${new Date(progress.estimatedCompletionDate).toLocaleDateString('zh-CN')}。置信度 ${Math.round(progress.confidence * 100)}%。`,
      highlights: progress.milestones
        .filter(m => m.blockers.length === 0)
        .map(m => `${m.name} - 预计 ${new Date(m.estimatedDate).toLocaleDateString('zh-CN')}`),
      concerns: progress.risks,
      suggestions: progress.recommendations,
      efficiency: progress.currentProgress,
    };
  };

  const transformDailyToAnalysis = (daily: DailySuggestions): AnalysisResult => {
    return {
      summary: daily.greeting,
      highlights: daily.insights
        .filter(i => i.type === 'positive')
        .map(i => `${i.title}：${i.description}`),
      concerns: daily.insights
        .filter(i => i.type !== 'positive')
        .map(i => `${i.title}：${i.description}`),
      suggestions: daily.focusTask
        ? [`建议优先处理：${daily.focusTask.taskTitle}（${daily.focusTask.reason}）`]
        : ['继续保持当前工作节奏'],
      efficiency: daily.productivity.score,
    };
  };

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result: AnalysisResult;

      if (type === 'task' && taskId) {
        const risk = await aiService.predictRisk(taskId);
        result = transformRiskToAnalysis(risk);
      } else if (type === 'project' && projectId) {
        const progress = await aiService.estimateProgress(projectId);
        result = transformProgressToAnalysis(progress);
      } else {
        const daily = await aiService.getDailySuggestions();
        result = transformDailyToAnalysis(daily);
      }

      setAnalysis(result);
    } catch (err) {
      console.error('Failed to load analysis:', err);
      setError('分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId, type]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    await loadAnalysis();
    setRegenerating(false);
  };

  const getTitle = () => {
    switch (type) {
      case 'task':
        return '任务分析';
      case 'project':
        return '项目分析';
      default:
        return '效率分析';
    }
  };

  return (
    <MobileLayout
      headerType="manage"
      headerTitle={getTitle()}
      showBottomNav={false}
      headerProps={{
        rightContent: (
          <button
            className="mm-header-icon"
            onClick={handleRegenerate}
            disabled={regenerating || loading}
          >
            <RefreshCw size={20} className={regenerating ? 'mm-spinning' : ''} />
          </button>
        ),
      }}
    >
      {loading ? (
        <div className="mm-ai-loading">
          <div className="mm-ai-loading-icon">
            <Sparkles size={32} />
          </div>
          <div className="mm-ai-loading-text">AI 正在分析中...</div>
        </div>
      ) : error ? (
        <div className="mm-empty-state">
          <AlertTriangle size={48} className="mm-empty-icon" />
          <div className="mm-empty-title">{error}</div>
          <button className="mm-btn mm-btn-primary" onClick={handleRegenerate}>
            重新分析
          </button>
        </div>
      ) : analysis ? (
        <div className="mm-ai-content">
          {/* 效率评分（如果有） */}
          {analysis.efficiency !== undefined && (
            <div className="mm-ai-score-card">
              <div className="mm-ai-score-value">{analysis.efficiency}</div>
              <div className="mm-ai-score-label">
                {type === 'efficiency' ? '效率评分' : type === 'project' ? '项目进度' : '健康指数'}
              </div>
              <div className="mm-ai-score-bar">
                <div
                  className="mm-ai-score-fill"
                  style={{ width: `${analysis.efficiency}%` }}
                />
              </div>
            </div>
          )}

          {/* 总结 */}
          <div className="mm-ai-section">
            <div className="mm-ai-section-header">
              <Sparkles size={18} />
              <span>AI 总结</span>
            </div>
            <div className="mm-ai-section-content">{analysis.summary}</div>
          </div>

          {/* 亮点 */}
          {analysis.highlights.length > 0 && (
            <div className="mm-ai-section">
              <div className="mm-ai-section-header mm-success">
                <CheckCircle size={18} />
                <span>亮点</span>
              </div>
              <ul className="mm-ai-list">
                {analysis.highlights.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 需要关注 */}
          {analysis.concerns.length > 0 && (
            <div className="mm-ai-section">
              <div className="mm-ai-section-header mm-warning">
                <AlertTriangle size={18} />
                <span>需要关注</span>
              </div>
              <ul className="mm-ai-list">
                {analysis.concerns.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 建议 */}
          {analysis.suggestions.length > 0 && (
            <div className="mm-ai-section">
              <div className="mm-ai-section-header mm-primary">
                <TrendingUp size={18} />
                <span>改进建议</span>
              </div>
              <ul className="mm-ai-list">
                {analysis.suggestions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </MobileLayout>
  );
}
