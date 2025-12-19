/**
 * 头像上传组件
 */

import React, { useRef, useState } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { uploadAvatar, validateFile } from '../services/upload';
import './AvatarUpload.css';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName?: string;
  onUploadSuccess: (url: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
}

export function AvatarUpload({
  currentAvatar,
  userName = '',
  onUploadSuccess,
  size = 'lg',
  editable = true,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (editable && !isUploading) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件
    const validation = validateFile(file, 'AVATAR');
    if (!validation.valid) {
      setError(validation.error || '文件验证失败');
      return;
    }

    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 上传文件
    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadAvatar(file);
      onUploadSuccess(result.url);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const displayUrl = previewUrl || currentAvatar;
  const initial = userName.charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'avatar-sm',
    md: 'avatar-md',
    lg: 'avatar-lg',
    xl: 'avatar-xl',
  };

  return (
    <div className={`avatar-upload ${sizeClasses[size]} ${editable ? 'editable' : ''}`}>
      <div className="avatar-container" onClick={handleClick}>
        {displayUrl ? (
          <img src={displayUrl} alt={userName} className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">
            {initial || <User size={size === 'xl' ? 48 : size === 'lg' ? 32 : 24} />}
          </div>
        )}
        
        {editable && (
          <div className="avatar-overlay">
            {isUploading ? (
              <Loader2 size={24} className="loading-spinner" />
            ) : (
              <Camera size={24} />
            )}
          </div>
        )}
      </div>
      
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        hidden
        disabled={!editable || isUploading}
      />
      
      {error && (
        <div className="avatar-error">{error}</div>
      )}
      
      {editable && (
        <div className="avatar-hint">点击更换头像</div>
      )}
    </div>
  );
}

export default AvatarUpload;

