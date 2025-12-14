/**
 * 加载状态组件
 */

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = '加载中...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

export default LoadingState;

