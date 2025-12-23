import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from '../Icons';
import SheetModal from './SheetModal';
import { aiService } from '../../services/ai';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'ai' | 'user';
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'ai',
  content: '你好！我是你的智能助手。保持专注，高效完成今天的目标吧。',
};

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 重置对话
  useEffect(() => {
    if (!isOpen) {
      // 关闭后重置状态
      setMessages([INITIAL_MESSAGE]);
      setInputValue('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    // 添加用户消息
    const userMessage: Message = { role: 'user', content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 调用 AI API
      const response = await aiService.chat({
        message: trimmedInput,
        context: { style: 'friendly' },
      });

      // 添加 AI 回复
      const aiMessage: Message = { role: 'ai', content: response.reply };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI 请求失败:', error);
      const errorMessage: Message = {
        role: 'ai',
        content: '抱歉，我暂时无法回应。请稍后再试。',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <SheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI 助手"
      height="85vh"
    >
      {/* 对话列表 */}
      <div className="mm-chat-container" ref={chatContainerRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mm-chat-bubble ${msg.role === 'ai' ? 'ai' : 'user'}`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="mm-chat-bubble ai">正在思考...</div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="mm-chat-input-row">
        <input
          type="text"
          className="mm-chat-input"
          placeholder="输入消息..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="mm-btn-send"
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </SheetModal>
  );
}




