import { useState } from 'react';
import { Sparkles, Loader2, Clock } from '../Icons';
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
  CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#3B82F6', LOW: '#6B7280',
};

// 预设的拆解方向
const BREAKDOWN_DIRECTIONS = [
  { label: '按开发阶段', value: '请按照需求分析、设计、开发、测试、上线的阶段拆解任务' },
  { label: '按功能模块', value: '请按照不同的功能模块拆解任务' },
  { label: '按团队分工', value: '请按照前端、后端、设计、测试等团队角色拆解任务' },
  { label: '按时间周期', value: '请按照每周的工作量拆解任务，确保每个子任务1-3天内完成' },
  { label: '按执行步骤', value: '请按照任务执行的先后顺序拆解，确保步骤清晰可执行' },
];

export function TaskBreakdownModal({ isOpen, onClose, taskId, taskTitle, onCreateSubtasks }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskBreakdownResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<'fine' | 'medium' | 'coarse'>('medium');
  const [direction, setDirection] = useState('');

  const handleBreakdown = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.breakdownTask(taskId, { 
        granularity, 
        direction: direction.trim() || undefined 
      });
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

            <div className="ai-options">
              <label className="form-label">拆解方向（可选）</label>
              <div className="direction-quick-options">
                {BREAKDOWN_DIRECTIONS.map(d => (
                  <button
                    key={d.label}
                    className={`direction-btn ${direction === d.value ? 'active' : ''}`}
                    onClick={() => setDirection(direction === d.value ? '' : d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <textarea
                className="direction-input"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                placeholder="自定义拆解方向，例如：按照用户角色拆解、按照数据流程拆解..."
                rows={2}
              />
              <p className="ai-hint">提供拆解方向可以让 AI 更精准地理解您的需求</p>
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

