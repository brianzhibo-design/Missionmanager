import { Sparkles } from 'lucide-react';

interface AIAssistantCardProps {
  message?: string;
  onOpenChat?: () => void;
}

export default function AIAssistantCard({
  message = '需要帮忙规划今天的任务吗？',
  onOpenChat,
}: AIAssistantCardProps) {
  return (
    <section className="mm-ai-section">
      <div className="mm-ai-card">
        <div className="mm-ai-avatar">
          <Sparkles size={20} />
        </div>
        <span className="mm-ai-content">{message}</span>
        <button className="mm-ai-btn" onClick={onOpenChat}>
          打开助手
        </button>
      </div>
    </section>
  );
}
