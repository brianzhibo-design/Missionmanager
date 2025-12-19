/**
 * 任务附件组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Paperclip, Plus } from 'lucide-react';
import { FileUpload, UploadButton } from './FileUpload';
import { AttachmentList } from './AttachmentList';
import { 
  uploadTaskAttachment, 
  getTaskAttachments, 
  deleteTaskAttachment,
  Attachment 
} from '../services/upload';
import './TaskAttachments.css';

interface TaskAttachmentsProps {
  taskId: string;
  canEdit?: boolean;
}

export function TaskAttachments({ taskId, canEdit = true }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // 加载附件
  const loadAttachments = useCallback(async () => {
    try {
      const data = await getTaskAttachments(taskId);
      setAttachments(data);
    } catch (error) {
      console.error('加载附件失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  // 上传附件
  const handleUpload = async (file: File) => {
    const newAttachment = await uploadTaskAttachment(taskId, file);
    setAttachments(prev => [newAttachment, ...prev]);
  };

  // 删除附件
  const handleDelete = async (attachmentId: string) => {
    try {
      await deleteTaskAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('删除附件失败:', error);
      alert('删除失败');
    }
  };

  return (
    <div className="task-attachments">
      <div className="attachments-header">
        <h4>
          <Paperclip size={16} />
          附件
          {attachments.length > 0 && (
            <span className="attachment-count">{attachments.length}</span>
          )}
        </h4>
        {canEdit && (
          <button 
            className="btn-ghost btn-sm"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Plus size={16} />
            添加附件
          </button>
        )}
      </div>

      {showUpload && canEdit && (
        <div className="attachment-upload-area">
          <FileUpload
            onUpload={handleUpload}
            fileType="TASK_ATTACHMENT"
            multiple
          />
        </div>
      )}

      {isLoading ? (
        <div className="attachments-loading">加载中...</div>
      ) : (
        <AttachmentList
          attachments={attachments}
          onDelete={canEdit ? handleDelete : undefined}
          canDelete={canEdit}
          emptyText="暂无附件，点击上方按钮添加"
        />
      )}
    </div>
  );
}

// 简化版 - 仅显示上传按钮
interface TaskAttachmentButtonProps {
  taskId: string;
  onUploadSuccess?: (attachment: Attachment) => void;
}

export function TaskAttachmentButton({ taskId, onUploadSuccess }: TaskAttachmentButtonProps) {
  const handleUpload = async (file: File) => {
    const attachment = await uploadTaskAttachment(taskId, file);
    onUploadSuccess?.(attachment);
  };

  return (
    <UploadButton
      onUpload={handleUpload}
      fileType="TASK_ATTACHMENT"
      className="task-attachment-btn"
    >
      <Paperclip size={16} />
      <span>添加附件</span>
    </UploadButton>
  );
}

export default TaskAttachments;

