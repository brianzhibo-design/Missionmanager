/**
 * 群发消息面板组件
 */
import React, { useState, useEffect } from 'react';
import { Send, Mail, Coffee, History, X, Users, Wand2, Loader2 } from 'lucide-react';
import { broadcastService, BroadcastMessage, CoffeeWinner, CoffeeLottery } from '../services/broadcast';
import { workspaceService } from '../services/workspace';
import { aiService } from '../services/ai';
import MemberSelector, { SelectableMember } from './MemberSelector';
import './BroadcastPanel.css';

interface BroadcastPanelProps {
  workspaceId: string;
  onClose: () => void;
}

export const BroadcastPanel: React.FC<BroadcastPanelProps> = ({ workspaceId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'coffee'>('send');
  const [members, setMembers] = useState<SelectableMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastMessage[]>([]);
  const [coffeeWinner, setCoffeeWinner] = useState<CoffeeWinner | null>(null);
  const [coffeeHistory, setCoffeeHistory] = useState<CoffeeLottery[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [messageContext, setMessageContext] = useState<'announcement' | 'reminder' | 'notification' | 'general'>('general');

  useEffect(() => {
    loadMembers();
    loadCoffeeWinner();
  }, [workspaceId]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'coffee') {
      loadCoffeeHistory();
    }
  }, [activeTab, workspaceId]);

  const loadMembers = async () => {
    try {
      const data = await workspaceService.getMembers(workspaceId);
      setMembers(data.map(m => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar || undefined,
        role: m.role,
      })));
    } catch (error) {
      console.error('加载成员失败:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await broadcastService.getHistory(workspaceId);
      setHistory(data.messages);
    } catch (error) {
      console.error('加载历史失败:', error);
    }
  };

  const loadCoffeeWinner = async () => {
    try {
      const winner = await broadcastService.getTodayCoffeeWinner(workspaceId);
      setCoffeeWinner(winner);
    } catch (error) {
      console.error('获取咖啡获奖者失败:', error);
    }
  };

  const loadCoffeeHistory = async () => {
    try {
      const data = await broadcastService.getCoffeeHistory(workspaceId);
      setCoffeeHistory(data);
    } catch (error) {
      console.error('加载咖啡历史失败:', error);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim() || selectedIds.length === 0) {
      alert('请填写标题、内容，并选择至少一位接收者');
      return;
    }

    try {
      setSending(true);
      await broadcastService.send(workspaceId, {
        title: title.trim(),
        content: content.trim(),
        recipientIds: selectedIds,
        sendEmail,
      });
      alert(`消息已发送给 ${selectedIds.length} 位成员`);
      setTitle('');
      setContent('');
      setSelectedIds([]);
    } catch (error) {
      console.error('发送失败:', error);
      alert('发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  const handleDrawCoffee = async () => {
    try {
      setDrawing(true);
      const result = await broadcastService.drawCoffeeLottery(workspaceId);
      setCoffeeWinner(result.winner);
      if (result.alreadyDrawn) {
        alert('今天已经抽过奖了！');
      } else {
        alert(`恭喜 ${result.winner.name} 获得今日幸运咖啡！`);
      }
      loadCoffeeHistory();
    } catch (error) {
      console.error('抽奖失败:', error);
      alert('抽奖失败，请重试');
    } finally {
      setDrawing(false);
    }
  };

  const handleAiOptimize = async () => {
    if (!title.trim() && !content.trim()) {
      alert('请先输入标题或内容');
      return;
    }

    try {
      setAiOptimizing(true);
      const result = await aiService.optimizeBroadcastMessage(
        title.trim(),
        content.trim(),
        messageContext
      );
      setTitle(result.optimizedTitle);
      setContent(result.optimizedContent);
      
      if (result.suggestions && result.suggestions.length > 0) {
        alert(`✨ 优化完成！\n\n建议：\n${result.suggestions.map(s => `• ${s}`).join('\n')}`);
      }
    } catch (error) {
      console.error('AI 优化失败:', error);
      alert('AI 优化失败，请重试');
    } finally {
      setAiOptimizing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvatarText = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="broadcast-panel">
      <div className="panel-header">
        <h2>工作区消息</h2>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          <Send size={16} /> 发送消息
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} /> 历史记录
        </button>
        <button
          className={`tab-btn ${activeTab === 'coffee' ? 'active' : ''}`}
          onClick={() => setActiveTab('coffee')}
        >
          <Coffee size={16} /> 咖啡抽奖
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'send' && (
          <div className="send-form">
            <div className="form-group">
              <label>消息类型</label>
              <select
                value={messageContext}
                onChange={(e) => setMessageContext(e.target.value as any)}
                className="context-select"
              >
                <option value="general">日常沟通</option>
                <option value="announcement">正式公告</option>
                <option value="reminder">温馨提醒</option>
                <option value="notification">事务通知</option>
              </select>
            </div>

            <div className="form-group">
              <div className="label-with-action">
                <label>消息标题</label>
                <button
                  type="button"
                  className={`ai-optimize-btn ${aiOptimizing ? 'loading' : ''}`}
                  onClick={handleAiOptimize}
                  disabled={aiOptimizing || (!title.trim() && !content.trim())}
                  title="AI 优化消息"
                >
                  {aiOptimizing ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  AI 优化
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入消息标题..."
              />
            </div>

            <div className="form-group">
              <label>消息内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入消息内容..."
                rows={5}
              />
            </div>

            <MemberSelector
              members={members}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              title="选择接收者"
              subtitle="选择要接收消息的成员"
              maxHeight={280}
            />

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                <Mail size={16} />
                同时发送邮件通知
              </label>
            </div>

            <button
              className="btn btn-primary send-btn"
              onClick={handleSend}
              disabled={sending || !title.trim() || !content.trim() || selectedIds.length === 0}
            >
              <Send size={16} />
              {sending ? '发送中...' : `发送给 ${selectedIds.length} 人`}
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-state">
                <History size={48} />
                <p>暂无消息记录</p>
              </div>
            ) : (
              history.map((msg) => (
                <div key={msg.id} className="history-item">
                  <div className="history-header">
                    <span className="history-title">{msg.title}</span>
                    <span className="history-time">{formatDate(msg.createdAt)}</span>
                  </div>
                  <p className="history-content">{msg.content}</p>
                  <div className="history-footer">
                    <span className="history-sender">
                      发送者: {msg.sender.name}
                    </span>
                    <span className="history-recipients">
                      <Users size={14} /> {msg._count.recipients} 人
                    </span>
                    {msg.sendEmail && (
                      <span className="history-email">
                        <Mail size={14} /> 已发邮件
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'coffee' && (
          <div className="coffee-section">
            <div className="coffee-today">
              <div className="coffee-icon">☕</div>
              <h3>今日幸运咖啡</h3>
              {coffeeWinner ? (
                <div className="coffee-winner">
                  <div className="winner-avatar">
                    {coffeeWinner.avatar ? (
                      <img src={coffeeWinner.avatar} alt={coffeeWinner.name} />
                    ) : (
                      <span>{getAvatarText(coffeeWinner.name)}</span>
                    )}
                  </div>
                  <span className="winner-name">{coffeeWinner.name}</span>
                  <span className="winner-badge">今日获奖者</span>
                </div>
              ) : (
                <div className="no-winner">
                  <p>今天还没有抽奖</p>
                  <button
                    className="btn btn-primary draw-btn"
                    onClick={handleDrawCoffee}
                    disabled={drawing}
                  >
                    <Coffee size={16} />
                    {drawing ? '抽奖中...' : '立即抽奖'}
                  </button>
                </div>
              )}
            </div>

            <div className="coffee-history">
              <h4>历史获奖记录</h4>
              {coffeeHistory.length === 0 ? (
                <p className="no-history">暂无记录</p>
              ) : (
                <div className="coffee-history-list">
                  {coffeeHistory.map((lottery) => (
                    <div key={lottery.id} className="coffee-history-item">
                      <span className="lottery-date">
                        {new Date(lottery.date).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="lottery-winner">
                        <div className="winner-mini-avatar">
                          {lottery.winner.avatar ? (
                            <img src={lottery.winner.avatar} alt={lottery.winner.name} />
                          ) : (
                            <span>{getAvatarText(lottery.winner.name)}</span>
                          )}
                        </div>
                        <span>{lottery.winner.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastPanel;

