import { useState } from 'react';
import { Sparkles, Loader2, Clock } from 'lucide-react';
import { Modal } from '../Modal';
import { aiService, TaskBreakdownResult, SubTask } from '../../services/ai';
import './AIComponents.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  onCreateSubtasks?: (subtasks: SubTask[]) => void;
}

const priorityColors: Record<string, string> = {
  URGENT: '#EF4444', HIGH: '#F97316', MEDIUM: '#3B82F6', LOW: '#6B7280',
};

export function TaskBreakdownModal({ isOpen, onClose, taskId, taskTitle, onCreateSubtasks }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskBreakdownResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<'fine' | 'medium' | 'coarse'>('medium');

  const handleBreakdown = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.breakdownTask(taskId, { granularity });
      setResult(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'AI 服务暂时不可用';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (result?.subtasks && onCreateSubtasks) {
      onCreateSubtasks(result.subtasks);
      onClose();
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI 任务分解" size="lg">
      <div className="ai-modal-content">
        <div className="ai-task-info">
          <Sparkles size={20} className="ai-icon" />
          <span>将 "{taskTitle}" 分解为子任务</span>
        </div>

        {!result && !error && (
          <>
            <div className="ai-options">
              <label className="form-label">分解粒度</label>
              <div className="granularity-options">
                {(['fine', 'medium', 'coarse'] as const).map(g => (
                  <button
                    key={g}
                    className={`granularity-btn ${granularity === g ? 'active' : ''}`}
                    onClick={() => setGranularity(g)}
                  >
                    {g === 'fine' ? '细粒度 (1-2h)' : g === 'medium' ? '中等 (2-4h)' : '粗粒度 (4-8h)'}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary ai-generate-btn" onClick={handleBreakdown} disabled={loading}>
              {loading ? <><Loader2 size={18} className="spin" /> AI 分析中...</> : <><Sparkles size={18} /> 开始分解</>}
            </button>
          </>
        )}

        {error && (
          <div className="ai-error-container">
            <div className="ai-error">{error}</div>
            <button className="btn btn-secondary" onClick={handleRetry}>重试</button>
          </div>
        )}

        {result && (
          <div className="ai-result">
            <div className="ai-result-header">
              <h4>分解结果</h4>
              <span className="ai-result-summary">{result.subtasks.length} 个子任务 · {result.totalEstimatedHours}h</span>
            </div>

            <div className="subtask-list">
              {result.subtasks.map((st, i) => (
                <div key={i} className="subtask-item">
                  <div className="subtask-header">
                    <span className="subtask-index">{i + 1}</span>
                    <span className="subtask-title">{st.title}</span>
                    <span className="subtask-priority" style={{ backgroundColor: priorityColors[st.priority] }}>{st.priority}</span>
                  </div>
                  <p className="subtask-description">{st.description}</p>
                  <div className="subtask-meta">
                    <span><Clock size={12} /> {st.estimatedHours}h</span>
                    {st.dependencies.length > 0 && <span>依赖: {st.dependencies.map(d => d + 1).join(', ')}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="ai-reasoning">
              <strong>分解理由：</strong>
              <p>{result.reasoning}</p>
            </div>

            <div className="ai-actions">
              <button className="btn btn-secondary" onClick={handleRetry}>重新分解</button>
              <button className="btn btn-primary" onClick={handleCreate}>创建子任务</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

