/**
 * AI 暖阳伙伴聊天界面
 * 温暖、鼓励型的生产力伙伴
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Sparkles } from '../Icons';
import { aiService } from '../../services/ai';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AICompanionChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  '📋 帮我规划今天的任务',
  '给我一些工作建议',
  '如何提高效率？',
  '😊 鼓励我一下',
];


export default function AICompanionChat({ isOpen, onClose }: AICompanionChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // 获取用户首字母
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // 调用 AI 服务
      const response = await aiService.chat({
        message: input.trim(),
        context: {
          userName: user?.name,
          role: 'productivity_companion',
          style: 'warm_encouraging',
        },
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.reply || '我在这里陪伴你！有什么我可以帮忙的吗？',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      // 友好的错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: '哎呀，我好像走神了一下 😅 能再说一遍吗？',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // 处理建议点击
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion.replace(/^[\p{Emoji}\s]+/u, '').trim());
    inputRef.current?.focus();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="m-chat-overlay">
      <div className="m-chat-container">
        {/* 头部 */}
        <div className="m-chat-header">
          <div className="m-chat-avatar">
            <Bot size={24} />
          </div>
          <div className="m-chat-title">
            <h3>暖阳 AI 伙伴</h3>
            <span>随时为你提供帮助 ☀️</span>
          </div>
          <button className="m-header-icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="m-chat-messages">
          {messages.length === 0 ? (
            <div className="m-chat-welcome">
              <div className="m-chat-welcome-icon">
                <Sparkles size={40} />
              </div>
              <h2>你好，{user?.name || '朋友'}！</h2>
              <p>
                我是暖阳，你的 AI 生产力伙伴。
                <br />
                有任何问题都可以问我，我会尽力帮助你！
              </p>
              <div className="m-chat-suggestions">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    className="m-chat-suggestion-btn"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`m-chat-message ${msg.role}`}>
                  <div className="m-msg-avatar">
                    {msg.role === 'ai' ? <Bot size={16} /> : getUserInitials()}
                  </div>
                  <div className="m-msg-bubble">{msg.content}</div>
                </div>
              ))}
              {isTyping && (
                <div className="m-chat-message ai">
                  <div className="m-msg-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="m-msg-bubble m-msg-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div className="m-chat-input-area">
          <input
            ref={inputRef}
            type="text"
            className="m-chat-input"
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            className="m-chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}



