/**
 * 任务评论组件
 */
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Trash2, Heart, AtSign } from 'lucide-react';
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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

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

  const handleLike = async (commentId: string) => {
    try {
      const result = await commentService.toggleLike(commentId);
      setComments(comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            likes: result.liked 
              ? [...c.likes, { userId: user?.id || '' }]
              : c.likes.filter(l => l.userId !== user?.id),
            _count: { likes: result.likeCount },
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('点赞失败:', error);
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
    
    // 找到当前正在编辑的@符号位置（从光标位置向前找最近的未完成的@）
    let atPos = -1;
    for (let i = textBefore.length - 1; i >= 0; i--) {
      if (textBefore[i] === '@') {
        const textAfterThisAt = textBefore.substring(i + 1);
        if (!textAfterThisAt.includes(' ')) {
          atPos = i;
          break;
        }
      }
      if (textBefore[i] === ' ' || textBefore[i] === '\n') {
        break;
      }
    }
    
    if (atPos === -1) {
      // 如果没找到@，直接在光标位置插入
      atPos = cursorPos;
    }
    
    const newText = newComment.substring(0, atPos) + `@${member.name} ` + textAfter;
    
    setNewComment(newText);
    setShowMentions(false);
    setMentionSearch('');
    
    // 聚焦并设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = atPos + member.name.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // 检测@符号 - 从光标位置向前查找最近的未完成的@符号
    const cursorPos = e.target.selectionStart;
    const textBefore = value.substring(0, cursorPos);
    
    // 从光标位置向前找最近的@，并检查它是否是一个未完成的提及
    let foundAt = -1;
    
    for (let i = textBefore.length - 1; i >= 0; i--) {
      const char = textBefore[i];
      
      if (char === '@') {
        // 找到一个@符号，检查它后面到光标位置之间是否有空格
        const textAfterThisAt = textBefore.substring(i + 1);
        if (!textAfterThisAt.includes(' ')) {
          // 这是一个未完成的提及
          foundAt = i;
        }
        // 找到@后就停止搜索，无论是否完成
        break;
      }
      
      // 遇到空格或换行时，检查空格后面是否紧跟着@
      if (char === ' ' || char === '\n') {
        // 继续向前搜索，看看紧跟着空格后面是否有@
        continue;
      }
    }
    
    if (foundAt !== -1) {
      const textAfterAt = textBefore.substring(foundAt + 1);
      setMentionSearch(textAfterAt);
      setShowMentions(true);
      return;
    }
    
    setShowMentions(false);
    setMentionSearch('');
  };

  // 允许提及所有成员，包括自己（便于测试和某些特殊场景）
  const filteredMembers = projectMembers.filter(m => 
    m.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // 当筛选结果变化时，重置选中索引
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionSearch]);

  // 滚动选中项到可视区域
  useEffect(() => {
    if (showMentions && mentionListRef.current) {
      const selectedItem = mentionListRef.current.children[selectedMentionIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedMentionIndex, showMentions]);

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredMembers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        break;
      case 'Enter':
        if (showMentions && filteredMembers[selectedMentionIndex]) {
          e.preventDefault();
          insertMention(filteredMembers[selectedMentionIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowMentions(false);
        setMentionSearch('');
        break;
      case 'Tab':
        if (showMentions && filteredMembers[selectedMentionIndex]) {
          e.preventDefault();
          insertMention(filteredMembers[selectedMentionIndex]);
        }
        break;
    }
  };

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
            comments.map((comment) => {
              const isLiked = comment.likes.some(l => l.userId === user?.id);
              const likeCount = comment._count.likes;
              
              return (
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
                    </div>
                    <div
                      className="comment-content"
                      dangerouslySetInnerHTML={{ __html: highlightMentions(comment.content) }}
                    />
                    <div className="comment-footer">
                      <button
                        className={`like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={() => handleLike(comment.id)}
                        title={isLiked ? '取消点赞' : '点赞'}
                      >
                        <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                        {likeCount > 0 && <span className="like-count">{likeCount}</span>}
                      </button>
                      {comment.user.id === user?.id && (
                        <button
                          className="action-btn danger"
                          onClick={() => handleDelete(comment.id)}
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="comment-input-wrapper">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="写下你的评论... 使用 @ 提及成员"
            rows={2}
            disabled={submitting}
          />
          {showMentions && filteredMembers.length > 0 && (
            <div className="mention-dropdown" ref={mentionListRef}>
              {filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  className={`mention-item ${index === selectedMentionIndex ? 'selected' : ''}`}
                  onClick={() => insertMention(member)}
                  onMouseEnter={() => setSelectedMentionIndex(index)}
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

