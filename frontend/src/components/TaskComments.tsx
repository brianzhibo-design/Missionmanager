/**
 * 任务评论组件
 */
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Trash2, Heart, AtSign, Image, X, Loader2 } from 'lucide-react';
import { commentService, Comment } from '../services/comment';
import { uploadCommentImage } from '../services/upload';
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
  const [uploadingImages, setUploadingImages] = useState<string[]>([]); // 上传中的图片预览URL
  const [attachedImages, setAttachedImages] = useState<{url: string; key: string}[]>([]); // 已上传的图片
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  // 提取@提及的用户ID（支持带空格的用户名）
  // 格式：@[用户名] 或直接匹配已知成员名
  const extractMentions = (content: string): string[] => {
    const mentions: string[] = [];
    
    // 首先匹配 @[用户名] 格式
    const bracketRegex = /@\[([^\]]+)\]/g;
    let match;
    while ((match = bracketRegex.exec(content)) !== null) {
      const mentionName = match[1];
      const member = projectMembers.find(m => m.name === mentionName);
      if (member && !mentions.includes(member.id)) {
        mentions.push(member.id);
      }
    }
    
    // 然后尝试匹配不带括号的 @用户名（兼容旧格式和不带空格的用户名）
    // 按用户名长度降序排列，优先匹配长名字
    const sortedMembers = [...projectMembers].sort((a, b) => b.name.length - a.name.length);
    for (const member of sortedMembers) {
      const escapedName = member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}(?![\\w])`, 'g');
      if (regex.test(content) && !mentions.includes(member.id)) {
        mentions.push(member.id);
      }
    }
    
    return mentions;
  };

  // 处理图片选择
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);

    for (const file of Array.from(files)) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('只能上传图片文件');
        continue;
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过 10MB');
        continue;
      }

      // 创建预览
      const previewUrl = URL.createObjectURL(file);
      setUploadingImages(prev => [...prev, previewUrl]);

      try {
        const result = await uploadCommentImage(taskId, file);
        setAttachedImages(prev => [...prev, { url: result.url, key: result.key }]);
      } catch (error) {
        console.error('上传图片失败:', error);
        alert('图片上传失败');
      } finally {
        // 移除预览
        setUploadingImages(prev => prev.filter(url => url !== previewUrl));
        URL.revokeObjectURL(previewUrl);
      }
    }

    setIsUploadingImage(false);
    e.target.value = '';
  };

  // 移除已上传的图片
  const removeAttachedImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newComment.trim() && attachedImages.length === 0) || submitting) return;

    try {
      setSubmitting(true);
      const mentionedUserIds = extractMentions(newComment);
      
      // 将图片 URL 添加到评论内容中
      let content = newComment.trim();
      if (attachedImages.length > 0) {
        const imageMarkdown = attachedImages.map(img => `\n![image](${img.url})`).join('');
        content = content + imageMarkdown;
      }
      
      const comment = await commentService.create(taskId, {
        content,
        mentionedUserIds,
      });
      setComments([...comments, comment]);
      setNewComment('');
      setAttachedImages([]);
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
    
    // 找到当前正在编辑的@符号位置
    // 向前搜索，找到最近的@符号（可能后面跟着部分输入的搜索词）
    let atPos = -1;
    for (let i = textBefore.length - 1; i >= 0; i--) {
      if (textBefore[i] === '@') {
        atPos = i;
        break;
      }
      // 遇到换行符停止搜索
      if (textBefore[i] === '\n') {
        break;
      }
    }
    
    if (atPos === -1) {
      // 如果没找到@，直接在光标位置插入
      atPos = cursorPos;
    }
    
    // 使用 @[用户名] 格式来支持带空格的用户名
    const mentionText = member.name.includes(' ') ? `@[${member.name}]` : `@${member.name}`;
    const newText = newComment.substring(0, atPos) + mentionText + ' ' + textAfter;
    
    setNewComment(newText);
    setShowMentions(false);
    setMentionSearch('');
    
    // 聚焦并设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = atPos + mentionText.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // 检测@符号 - 从光标位置向前查找最近的@符号
    const cursorPos = e.target.selectionStart;
    const textBefore = value.substring(0, cursorPos);
    
    // 从光标位置向前找最近的@符号
    let foundAt = -1;
    
    for (let i = textBefore.length - 1; i >= 0; i--) {
      const char = textBefore[i];
      
      if (char === '@') {
        // 找到@符号
        foundAt = i;
        break;
      }
      
      // 遇到换行符停止搜索（新的一行不应该继续之前的@搜索）
      if (char === '\n') {
        break;
      }
    }
    
    if (foundAt !== -1) {
      const textAfterAt = textBefore.substring(foundAt + 1);
      
      // 检查是否已经是完成的 @[用户名] 格式
      if (textAfterAt.startsWith('[') && textAfterAt.includes(']')) {
        // 已完成的提及，不再显示下拉菜单
        setShowMentions(false);
        setMentionSearch('');
        return;
      }
      
      // 如果搜索词太长（超过30个字符），可能不是在@人
      if (textAfterAt.length > 30) {
        setShowMentions(false);
        setMentionSearch('');
        return;
      }
      
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

  // 高亮显示@提及和渲染图片（支持 @[用户名] 和 @用户名 两种格式）
  const highlightMentions = (content: string) => {
    // 首先处理 markdown 图片语法 ![alt](url)
    let result = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
      '<img src="$2" alt="$1" class="comment-image" loading="lazy" />');
    
    // 处理 @[用户名] 格式
    result = result.replace(/@\[([^\]]+)\]/g, '<span class="mention">@$1</span>');
    
    // 然后处理不带括号的 @用户名（按成员名长度降序匹配，优先匹配长名字）
    const sortedMembers = [...projectMembers].sort((a, b) => b.name.length - a.name.length);
    for (const member of sortedMembers) {
      const escapedName = member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}(?![\\w\\[])`, 'g');
      result = result.replace(regex, `<span class="mention">@${member.name}</span>`);
    }
    
    // 将换行符转换为 <br>
    result = result.replace(/\n/g, '<br />');
    
    return result;
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

        {/* 图片预览区域 */}
        {(uploadingImages.length > 0 || attachedImages.length > 0) && (
          <div className="comment-images-preview">
            {uploadingImages.map((url, index) => (
              <div key={`uploading-${index}`} className="preview-image uploading">
                <img src={url} alt="上传中" />
                <div className="uploading-overlay">
                  <Loader2 size={20} className="spin" />
                </div>
              </div>
            ))}
            {attachedImages.map((img, index) => (
              <div key={`attached-${index}`} className="preview-image">
                <img src={img.url} alt="附件" />
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={() => removeAttachedImage(index)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="comment-form-footer">
          <div className="form-actions-left">
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
              type="button"
              className="image-btn"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              title="插入图片"
            >
              {isUploadingImage ? <Loader2 size={18} className="spin" /> : <Image size={18} />}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              hidden
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={(!newComment.trim() && attachedImages.length === 0) || submitting}
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

