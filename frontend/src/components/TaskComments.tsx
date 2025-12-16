/**
 * 任务评论组件
 */
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Trash2, Edit2, X, Check, AtSign } from 'lucide-react';
import { commentService, Comment } from '../services/comment';
import { useAuth } from '../hooks/useAuth';
import './TaskComments.css';

interface TaskCommentsProps {
  taskId: string;
  projectMembers?: { id: string; name: string; avatar?: string }[];
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, projectMembers = [] }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await commentService.getByTaskId(taskId);
      setComments(data);
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\S+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionName = match[1];
      const member = projectMembers.find(m => m.name === mentionName);
      if (member) {
        mentions.push(member.id);
      }
    }
    return mentions;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      const mentionedUserIds = extractMentions(newComment);
      const comment = await commentService.create(taskId, {
        content: newComment.trim(),
        mentionedUserIds,
      });
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('发表评论失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const updated = await commentService.update(commentId, editContent.trim());
      setComments(comments.map(c => c.id === commentId ? updated : c));
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('更新评论失败:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      await commentService.delete(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('删除评论失败:', error);
    }
  };

  const insertMention = (member: { id: string; name: string }) => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = newComment.substring(0, cursorPos);
    const textAfter = newComment.substring(cursorPos);
    
    // 找到@符号的位置
    const lastAtPos = textBefore.lastIndexOf('@');
    const newText = textBefore.substring(0, lastAtPos) + `@${member.name} ` + textAfter;
    
    setNewComment(newText);
    setShowMentions(false);
    setMentionSearch('');
    
    // 聚焦并设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = lastAtPos + member.name.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // 检测@符号
    const cursorPos = e.target.selectionStart;
    const textBefore = value.substring(0, cursorPos);
    const lastAtPos = textBefore.lastIndexOf('@');
    
    if (lastAtPos !== -1) {
      const textAfterAt = textBefore.substring(lastAtPos + 1);
      // 如果@后面没有空格，显示提及列表
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
    setMentionSearch('');
  };

  // 允许提及所有成员，包括自己（便于测试和某些特殊场景）
  const filteredMembers = projectMembers.filter(m => 
    m.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getAvatarText = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const highlightMentions = (content: string) => {
    return content.replace(/@(\S+)/g, '<span class="mention">@$1</span>');
  };

  return (
    <div className="task-comments">
      <div className="comments-header">
        <MessageCircle size={18} />
        <h3>评论 ({comments.length})</h3>
      </div>

      {loading ? (
        <div className="comments-loading">加载中...</div>
      ) : (
        <div className="comments-list">
          {comments.length === 0 ? (
            <div className="comments-empty">
              <MessageCircle size={32} />
              <p>暂无评论，来发表第一条吧</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-avatar">
                  {comment.user.avatar ? (
                    <img src={comment.user.avatar} alt={comment.user.name} />
                  ) : (
                    <span>{getAvatarText(comment.user.name)}</span>
                  )}
                </div>
                <div className="comment-body">
                  <div className="comment-header">
                    <span className="comment-author">{comment.user.name}</span>
                    <span className="comment-time">{formatTime(comment.createdAt)}</span>
                    {comment.user.id === user?.id && (
                      <div className="comment-actions">
                        {editingId !== comment.id && (
                          <>
                            <button
                              className="action-btn"
                              onClick={() => {
                                setEditingId(comment.id);
                                setEditContent(comment.content);
                              }}
                              title="编辑"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="action-btn danger"
                              onClick={() => handleDelete(comment.id)}
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {editingId === comment.id ? (
                    <div className="comment-edit">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoFocus
                      />
                      <div className="edit-actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setEditingId(null);
                            setEditContent('');
                          }}
                        >
                          <X size={14} /> 取消
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(comment.id)}
                        >
                          <Check size={14} /> 保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="comment-content"
                      dangerouslySetInnerHTML={{ __html: highlightMentions(comment.content) }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="comment-input-wrapper">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={handleInputChange}
            placeholder="写下你的评论... 使用 @ 提及成员"
            rows={2}
            disabled={submitting}
          />
          {showMentions && filteredMembers.length > 0 && (
            <div className="mention-dropdown">
              {filteredMembers.slice(0, 5).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="mention-item"
                  onClick={() => insertMention(member)}
                >
                  <div className="mention-avatar">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} />
                    ) : (
                      <span>{getAvatarText(member.name)}</span>
                    )}
                  </div>
                  <span className="mention-name">{member.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="comment-form-footer">
          <button
            type="button"
            className="mention-btn"
            onClick={() => {
              setNewComment(newComment + '@');
              setShowMentions(true);
              setMentionSearch('');
              inputRef.current?.focus();
            }}
            title="提及成员"
          >
            <AtSign size={18} />
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!newComment.trim() || submitting}
          >
            <Send size={14} />
            {submitting ? '发送中...' : '发送'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskComments;

