/**
 * 错误状态组件
 */

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state">
      <span className="error-icon">⚠️</span>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}

export default ErrorState;

