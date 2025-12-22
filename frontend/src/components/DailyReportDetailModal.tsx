/**
 * 日报详情弹窗
 * 优化版：现代化 UI，支持评论和点赞互动
 */
import { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, CheckCircle2, Circle, AlertCircle, Clock, Loader2,
  Sparkles, Zap, Activity, MessageSquare, Heart, Send, Trash2
} from './Icons';
import { dailyReportService, DailyReport, DailyReportComment, LikesResult } from '../services/dailyReport';
import './DailyReportDetailModal.css';

interface DailyReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId?: string;
  report?: DailyReport;
  currentUserId?: string;
}

export default function DailyReportDetailModal({
  isOpen,
  onClose,
  reportId,
  report: initialReport,
  currentUserId,
}: DailyReportDetailModalProps) {
  const [report, setReport] = useState<DailyReport | null>(initialReport || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 评论状态
  const [comments, setComments] = useState<DailyReportComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // 点赞状态
  const [likesData, setLikesData] = useState<LikesResult | null>(null);
  const [liking, setLiking] = useState(false);
  
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && reportId && !initialReport) {
      loadReport();
    } else if (initialReport) {
      setReport(initialReport);
    }
  }, [isOpen, reportId, initialReport]);

  // 加载评论和点赞数据
  useEffect(() => {
    if (isOpen && report?.id) {
      loadInteractions();
    }
  }, [isOpen, report?.id]);

  // 重置状态当弹窗关闭时
  useEffect(() => {
    if (!isOpen) {
      setShowComments(false);
      setNewComment('');
    }
  }, [isOpen]);

  const loadReport = async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dailyReportService.getById(reportId);
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载日报失败');
    } finally {
      setLoading(false);
    }
  };

  const loadInteractions = async () => {
    if (!report?.id) return;
    try {
      const [commentsData, likes] = await Promise.all([
        dailyReportService.getComments(report.id),
        dailyReportService.getLikes(report.id),
      ]);
      setComments(commentsData);
      setLikesData(likes);
    } catch (err) {
      console.error('加载互动数据失败:', err);
    }
  };

  const handleToggleLike = async () => {
    if (!report?.id || liking) return;
    setLiking(true);
    try {
      const result = await dailyReportService.toggleLike(report.id);
      setLikesData(prev => prev ? { ...prev, liked: result.liked, count: result.count } : null);
    } catch (err) {
      console.error('点赞失败:', err);
    } finally {
      setLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!report?.id || !newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const comment = await dailyReportService.addComment(report.id, newComment.trim());
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error('添加评论失败:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      await dailyReportService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('删除评论失败:', err);
    }
  };

  const handleCommentClick = () => {
    setShowComments(true);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} (${weekdays[date.getDay()]})`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatCommentTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const parseContent = (content: string) => {
    return content.split('\n').filter(line => line.trim());
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="daily-report-modal" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="report-loading">
            <Loader2 size={32} className="spin" />
            <p>加载中...</p>
          </div>
        ) : error ? (
          <div className="report-error">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={loadReport}>重试</button>
          </div>
        ) : report ? (
          <>
            {/* Header */}
            <div className="report-header">
              <div className="report-header-left">
                <div className="report-user-avatar">
                  {report.user.avatar ? (
                    <img src={report.user.avatar} alt={report.user.name} />
                  ) : (
                    getInitials(report.user.name)
                  )}
                  <div className="avatar-status-dot" />
                </div>
                <div className="report-user-info">
                  <div className="report-user-name-row">
                    <h2>{report.user.name} 的日报</h2>
                  </div>
                  <div className="report-meta">
                    <span><Calendar size={12} /> {formatDate(report.date)}</span>
                    {report.workHours && (
                      <>
                        <span className="meta-dot" />
                        <span><Clock size={12} /> {report.workHours}h</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="report-header-right">
                <span className="submit-badge">
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                  已提交 {formatTime(report.createdAt)}
                </span>
                <button className="report-close-btn" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="report-body">
              {/* 今日完成 */}
              <div className="report-section">
                <h3 className="section-title">
                  <Activity size={14} className="icon-completed" />
                  今日完成
                </h3>
                <ul className="report-list">
                  {parseContent(report.completed).map((line, i) => (
                    <li key={i} className="report-list-item">
                      <div className="item-icon completed">
                        <CheckCircle2 size={18} />
                      </div>
                      <span>{line.replace(/^[-•]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 任务统计 */}
              {report.taskStats && (
                <div className="report-task-stats">
                  <div className="task-stat-item stat-completed">
                    <span className="stat-value">{report.taskStats.completedCount}</span>
                    <span className="stat-label">已完成</span>
                  </div>
                  <div className="task-stat-item stat-progress">
                    <span className="stat-value">{report.taskStats.inProgressCount}</span>
                    <span className="stat-label">进行中</span>
                  </div>
                </div>
              )}

              {/* 明日计划 */}
              <div className="report-section">
                <h3 className="section-title">
                  <Zap size={14} className="icon-planned" />
                  明日计划
                </h3>
                <ul className="report-list">
                  {parseContent(report.planned).map((line, i) => (
                    <li key={i} className="report-list-item">
                      <div className="item-icon planned">
                        <Circle size={18} />
                      </div>
                      <span>{line.replace(/^[-•]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 问题与风险 */}
              {report.issues && (
                <div className="report-section">
                  <h3 className="section-title">
                    <AlertCircle size={14} className="icon-issues" />
                    问题与需要的支持
                  </h3>
                  <ul className="report-list issues">
                    {parseContent(report.issues).map((line, i) => (
                      <li key={i} className="report-list-item">
                        <div className="item-icon issues">
                          <AlertCircle size={18} />
                        </div>
                        <span>{line.replace(/^[-•]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI 摘要卡片 */}
              <div className="report-ai-card">
                <div className="ai-card-header">
                  <div className="ai-icon">
                    <Zap size={12} />
                  </div>
                  <span className="ai-title">AI 智能摘要</span>
                  <Sparkles size={16} className="ai-sparkle" />
                </div>
                <p className="ai-content">
                  该成员今日产出稳定，工作聚焦于
                  {report.completed.includes('修复') || report.completed.includes('Bug') 
                    ? ' Bug 修复与代码优化' 
                    : report.completed.includes('设计') || report.completed.includes('UI')
                    ? ' UI/UX 设计与优化'
                    : ' 功能开发与任务推进'}
                  。明日计划清晰，建议关注
                  {report.issues ? '已提出的问题点' : '任务进度与质量'}
                  。
                </p>
              </div>

              {/* 评论区域 */}
              {showComments && (
                <div className="report-comments-section">
                  <h3 className="section-title">
                    <MessageSquare size={14} />
                    评论 ({comments.length})
                  </h3>
                  
                  {/* 评论列表 */}
                  <div className="comments-list">
                    {comments.length === 0 ? (
                      <p className="no-comments">暂无评论，来说点什么吧~</p>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="comment-item">
                          <div className="comment-avatar">
                            {comment.user.avatar ? (
                              <img src={comment.user.avatar} alt={comment.user.name} />
                            ) : (
                              comment.user.name.charAt(0)
                            )}
                          </div>
                          <div className="comment-content">
                            <div className="comment-header">
                              <span className="comment-author">{comment.user.name}</span>
                              <span className="comment-time">{formatCommentTime(comment.createdAt)}</span>
                              {currentUserId === comment.user.id && (
                                <button 
                                  className="comment-delete-btn"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <p className="comment-text">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 评论输入 */}
                  <div className="comment-input-box">
                    <input
                      ref={commentInputRef}
                      type="text"
                      placeholder="写下你的评论..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      disabled={submittingComment}
                    />
                    <button 
                      className="comment-send-btn"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="report-footer">
              <div className="footer-left">
                {likesData && likesData.count > 0 ? (
                  <>
                    <div className="readers-avatars">
                      {likesData.users.slice(0, 3).map((user) => (
                        <div key={user.id} className="reader-avatar" title={user.name}>
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                          ) : (
                            user.name.charAt(0)
                          )}
                        </div>
                      ))}
                      {likesData.count > 3 && (
                        <div className="reader-avatar more">+{likesData.count - 3}</div>
                      )}
                    </div>
                    <span className="readers-label">赞了</span>
                  </>
                ) : (
                  <span className="readers-label empty">还没有人点赞</span>
                )}
              </div>
              <div className="footer-actions">
                <button 
                  className={`report-action-btn ${showComments ? 'active' : ''}`}
                  onClick={handleCommentClick}
                >
                  <MessageSquare size={16} />
                  <span>评论{comments.length > 0 ? ` (${comments.length})` : ''}</span>
                </button>
                <button 
                  className={`report-action-btn like-btn ${likesData?.liked ? 'liked' : ''}`}
                  onClick={handleToggleLike}
                  disabled={liking}
                >
                  <Heart size={16} className={likesData?.liked ? 'filled' : ''} />
                  <span>{likesData?.count || 0}</span>
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
