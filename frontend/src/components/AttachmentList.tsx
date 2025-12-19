/**
 * 附件列表组件
 */

import React, { useState } from 'react';
import { 
  Download, Trash2, Eye, X, File, Image, Video, Music, 
  FileText, Archive, ExternalLink, ZoomIn, ZoomOut 
} from 'lucide-react';
import { Attachment, formatFileSize, isImageFile, isVideoFile, isPreviewable } from '../services/upload';
import './AttachmentList.css';

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  showUploader?: boolean;
  emptyText?: string;
}

export function AttachmentList({
  attachments,
  onDelete,
  canDelete = true,
  showUploader = true,
  emptyText = '暂无附件',
}: AttachmentListProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video' | 'pdf' | null>(null);
  const [zoom, setZoom] = useState(1);

  const getFileIcon = (mimeType: string, filename: string) => {
    if (mimeType.startsWith('image/')) return <Image size={20} />;
    if (mimeType.startsWith('video/')) return <Video size={20} />;
    if (mimeType.startsWith('audio/')) return <Music size={20} />;
    if (mimeType === 'application/pdf') return <FileText size={20} />;
    if (mimeType.includes('word') || filename.endsWith('.doc') || filename.endsWith('.docx')) return <FileText size={20} />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText size={20} />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive size={20} />;
    return <File size={20} />;
  };

  const handlePreview = (attachment: Attachment) => {
    if (isImageFile(attachment.mimeType)) {
      setPreviewUrl(attachment.fileUrl);
      setPreviewType('image');
      setZoom(1);
    } else if (isVideoFile(attachment.mimeType)) {
      setPreviewUrl(attachment.fileUrl);
      setPreviewType('video');
    } else if (attachment.mimeType === 'application/pdf') {
      setPreviewUrl(attachment.fileUrl);
      setPreviewType('pdf');
    } else {
      // 直接下载
      window.open(attachment.fileUrl, '_blank');
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewType(null);
    setZoom(1);
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    if (confirm('确定要删除这个附件吗？')) {
      onDelete(id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (attachments.length === 0) {
    return <div className="attachment-list-empty">{emptyText}</div>;
  }

  return (
    <>
      <div className="attachment-list">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="attachment-item">
            <div 
              className={`attachment-preview ${isPreviewable(attachment.mimeType) ? 'previewable' : ''}`}
              onClick={() => handlePreview(attachment)}
            >
              {isImageFile(attachment.mimeType) ? (
                <img 
                  src={attachment.fileUrl} 
                  alt={attachment.filename}
                  className="attachment-thumbnail"
                />
              ) : (
                <div className="attachment-icon">
                  {getFileIcon(attachment.mimeType, attachment.filename)}
                </div>
              )}
              {isPreviewable(attachment.mimeType) && (
                <div className="preview-overlay">
                  <Eye size={20} />
                </div>
              )}
            </div>
            
            <div className="attachment-info">
              <span className="attachment-name" title={attachment.filename}>
                {attachment.filename}
              </span>
              <div className="attachment-meta">
                <span className="attachment-size">{formatFileSize(attachment.fileSize)}</span>
                {showUploader && attachment.uploader && (
                  <span className="attachment-uploader">
                    {attachment.uploader.name}
                  </span>
                )}
                <span className="attachment-date">{formatDate(attachment.createdAt)}</span>
              </div>
            </div>
            
            <div className="attachment-actions">
              <a 
                href={attachment.fileUrl} 
                download={attachment.filename}
                className="action-btn"
                title="下载"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={16} />
              </a>
              <a 
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn"
                title="新窗口打开"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={16} />
              </a>
              {canDelete && onDelete && (
                <button 
                  className="action-btn delete"
                  title="删除"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(attachment.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 预览模态框 */}
      {previewUrl && (
        <div className="attachment-preview-modal" onClick={closePreview}>
          <div className="preview-header">
            <div className="preview-controls">
              {previewType === 'image' && (
                <>
                  <button 
                    className="preview-control-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoom(z => Math.max(0.5, z - 0.25));
                    }}
                  >
                    <ZoomOut size={20} />
                  </button>
                  <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                  <button 
                    className="preview-control-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoom(z => Math.min(3, z + 0.25));
                    }}
                  >
                    <ZoomIn size={20} />
                  </button>
                </>
              )}
            </div>
            <button className="preview-close" onClick={closePreview}>
              <X size={24} />
            </button>
          </div>
          
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            {previewType === 'image' && (
              <img 
                src={previewUrl} 
                alt="Preview"
                style={{ transform: `scale(${zoom})` }}
                className="preview-image"
              />
            )}
            {previewType === 'video' && (
              <video 
                src={previewUrl} 
                controls 
                autoPlay
                className="preview-video"
              />
            )}
            {previewType === 'pdf' && (
              <iframe 
                src={previewUrl} 
                className="preview-pdf"
                title="PDF Preview"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// 紧凑版附件列表（用于评论等场景）
interface CompactAttachmentListProps {
  attachments: Attachment[];
  onDelete?: (id: string) => void;
}

export function CompactAttachmentList({ attachments, onDelete }: CompactAttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="compact-attachment-list">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="compact-attachment">
          {isImageFile(attachment.mimeType) ? (
            <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
              <img 
                src={attachment.fileUrl} 
                alt={attachment.filename}
                className="compact-image"
              />
            </a>
          ) : (
            <a 
              href={attachment.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="compact-file"
            >
              <File size={14} />
              <span>{attachment.filename}</span>
            </a>
          )}
          {onDelete && (
            <button 
              className="compact-delete"
              onClick={() => {
                if (confirm('删除此附件？')) {
                  onDelete(attachment.id);
                }
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default AttachmentList;

