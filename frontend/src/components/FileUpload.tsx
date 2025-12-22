/**
 * 通用文件上传组件
 */

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, File, Image, Video, Music, FileText, Archive, Loader2 } from './Icons';
import { validateFile, formatFileSize, FILE_CONFIG, FileType } from '../services/upload';
import './FileUpload.css';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number;
  fileType?: FileType;
  multiple?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  showPreview?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

export function FileUpload({
  onUpload,
  accept,
  maxSize,
  fileType = 'TASK_ATTACHMENT',
  multiple = false,
  disabled = false,
  children,
  className = '',
  showPreview = true,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const config = FILE_CONFIG[fileType];
  const acceptTypes = accept || config.accept;
  const maxFileSize = maxSize || config.maxSize;

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      // 验证文件
      const validation = validateFile(file, fileType);
      if (!validation.valid) {
        setUploadingFiles(prev => [...prev, { file, progress: 0, error: validation.error }]);
        continue;
      }

      // 添加到上传列表
      setUploadingFiles(prev => [...prev, { file, progress: 0 }]);

      try {
        await onUpload(file);
        // 上传成功后移除
        setUploadingFiles(prev => prev.filter(f => f.file !== file));
      } catch (error) {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.file === file
              ? { ...f, error: error instanceof Error ? error.message : '上传失败' }
              : f
          )
        );
      }
    }
  }, [fileType, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // 清空 input 以允许重复选择相同文件
    e.target.value = '';
  };

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image size={20} />;
    if (type.startsWith('video/')) return <Video size={20} />;
    if (type.startsWith('audio/')) return <Music size={20} />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return <FileText size={20} />;
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return <Archive size={20} />;
    return <File size={20} />;
  };

  return (
    <div className={`file-upload-container ${className}`}>
      <div
        className={`file-upload-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          hidden
        />
        
        {children || (
          <>
            <Upload size={32} className="upload-icon" />
            <p className="upload-text">
              <span className="upload-link">点击上传</span> 或拖拽文件到此处
            </p>
            <p className="upload-hint">
              最大 {formatFileSize(maxFileSize)}
            </p>
          </>
        )}
      </div>

      {showPreview && uploadingFiles.length > 0 && (
        <div className="uploading-files">
          {uploadingFiles.map((item, index) => (
            <div key={index} className={`uploading-file ${item.error ? 'error' : ''}`}>
              <div className="file-icon">{getFileIcon(item.file)}</div>
              <div className="file-info">
                <span className="file-name">{item.file.name}</span>
                <span className="file-size">{formatFileSize(item.file.size)}</span>
                {item.error && <span className="file-error">{item.error}</span>}
              </div>
              {!item.error && item.progress < 100 && (
                <Loader2 size={16} className="loading-spinner" />
              )}
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeUploadingFile(item.file);
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 简单的上传按钮变体
interface UploadButtonProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  fileType?: FileType;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function UploadButton({
  onUpload,
  accept,
  fileType = 'TASK_ATTACHMENT',
  disabled = false,
  children,
  className = '',
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const config = FILE_CONFIG[fileType];

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, fileType);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <button
      className={`upload-button ${className}`}
      onClick={() => inputRef.current?.click()}
      disabled={disabled || isUploading}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept || config.accept}
        onChange={handleChange}
        hidden
      />
      {isUploading ? (
        <Loader2 size={16} className="loading-spinner" />
      ) : (
        children || (
          <>
            <Upload size={16} />
            <span>上传文件</span>
          </>
        )
      )}
    </button>
  );
}

export default FileUpload;

