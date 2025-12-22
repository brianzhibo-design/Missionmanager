/**
 * 文件上传服务
 */

import api from './api';

export interface UploadResult {
  url: string;
  key: string;
  name: string;
  size: number;
  type: string;
}

export interface Attachment {
  id: string;
  taskId?: string;
  projectId?: string;
  uploaderId: string;
  filename: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  folder?: string;
  createdAt: string;
  uploader?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// 文件类型配置
export const FILE_CONFIG = {
  AVATAR: {
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  TASK_ATTACHMENT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,video/*',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip', '.rar', '.mp4', '.webm'],
  },
  COMMENT_IMAGE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  PROJECT_FILE: {
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: '*/*',
    extensions: [],
  },
  REPORT_ATTACHMENT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  },
};

export type FileType = keyof typeof FILE_CONFIG;
export type FileCategory = 'avatars' | 'attachments' | 'comments' | 'reports';

/**
 * 验证文件
 */
export function validateFile(file: File, fileType: FileType): { valid: boolean; error?: string } {
  const config = FILE_CONFIG[fileType];
  
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `文件大小超过限制（最大 ${Math.round(config.maxSize / 1024 / 1024)}MB）`,
    };
  }
  
  return { valid: true };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
}

/**
 * 获取文件图标
 */
export function getFileIcon(mimeType: string, filename: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || filename.endsWith('.doc') || filename.endsWith('.docx')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || filename.endsWith('.xls') || filename.endsWith('.xlsx')) return '';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || filename.endsWith('.ppt') || filename.endsWith('.pptx')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
  if (mimeType.startsWith('text/') || filename.endsWith('.txt') || filename.endsWith('.md')) return '📃';
  return '📎';
}

/**
 * 是否为图片文件
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * 是否为视频文件
 */
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * 是否可预览
 */
export function isPreviewable(mimeType: string): boolean {
  return isImageFile(mimeType) || mimeType === 'application/pdf';
}

// ============ API 请求 ============

/**
 * 上传用户头像
 */
export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.upload<{ success: boolean; data: { url: string } }>('/upload/avatar', formData);
  return response.data;
}

/**
 * 上传附件（通用）
 */
export async function uploadAttachment(file: File, category: FileCategory = 'attachments'): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  
  const response = await api.upload<{ success: boolean; data: UploadResult }>('/upload/attachment', formData);
  return response.data;
}

/**
 * 上传任务附件
 */
export async function uploadTaskAttachment(_taskId: string, file: File): Promise<Attachment> {
  const result = await uploadAttachment(file, 'attachments');
  
  // 转换为 Attachment 格式
  return {
    id: result.key,
    fileKey: result.key,
    fileUrl: result.url,
    filename: result.name,
    mimeType: result.type,
    fileSize: result.size,
    uploaderId: '',
    createdAt: new Date().toISOString(),
  };
}

/**
 * 获取任务附件列表
 * 注意：新版 API 不支持获取附件列表，返回空数组
 */
export async function getTaskAttachments(_taskId: string): Promise<Attachment[]> {
  // 新版简化 API 不支持获取附件列表
  return [];
}

/**
 * 删除附件
 */
export async function deleteTaskAttachment(key: string): Promise<void> {
  await api.delete(`/upload/${encodeURIComponent(key)}`);
}

/**
 * 上传评论图片
 */
export async function uploadCommentImage(_taskId: string, file: File): Promise<{ url: string; key: string }> {
  const result = await uploadAttachment(file, 'comments');
  return { url: result.url, key: result.key };
}

/**
 * 上传项目文件
 */
export async function uploadProjectFile(_projectId: string, file: File, _folder?: string): Promise<Attachment> {
  const result = await uploadAttachment(file, 'attachments');
  
  return {
    id: result.key,
    fileKey: result.key,
    fileUrl: result.url,
    filename: result.name,
    mimeType: result.type,
    fileSize: result.size,
    uploaderId: '',
    createdAt: new Date().toISOString(),
  };
}

/**
 * 获取项目文件列表
 * 注意：新版 API 不支持获取文件列表，返回空数组
 */
export async function getProjectFiles(_projectId: string, _folder?: string): Promise<Attachment[]> {
  return [];
}

/**
 * 删除项目文件
 */
export async function deleteProjectFile(key: string): Promise<void> {
  await api.delete(`/upload/${encodeURIComponent(key)}`);
}

export default {
  uploadAvatar,
  uploadAttachment,
  uploadTaskAttachment,
  getTaskAttachments,
  deleteTaskAttachment,
  uploadCommentImage,
  uploadProjectFile,
  getProjectFiles,
  deleteProjectFile,
  validateFile,
  formatFileSize,
  getFileIcon,
  isImageFile,
  isVideoFile,
  isPreviewable,
};
