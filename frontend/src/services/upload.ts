/**
 * 文件上传服务
 */

import api from './api';

export interface UploadResult {
  url: string;
  key: string;
  filename?: string;
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

export interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

// 文件类型配置
export const FILE_CONFIG = {
  AVATAR: {
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  TASK_ATTACHMENT: {
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip,.rar,video/*,audio/*',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.md', '.zip', '.rar', '.mp4', '.mov', '.avi', '.webm', '.mp3', '.wav', '.ogg'],
  },
  COMMENT_IMAGE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  PROJECT_FILE: {
    maxSize: 200 * 1024 * 1024, // 200MB
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
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || filename.endsWith('.xls') || filename.endsWith('.xlsx')) return '📊';
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
export async function uploadAvatar(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.upload<{ success: boolean; data: UploadResult }>('/upload/avatar', formData);
  return response.data;
}

/**
 * 上传任务附件
 */
export async function uploadTaskAttachment(taskId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.upload<{ success: boolean; data: Attachment }>(`/upload/tasks/${taskId}/attachments`, formData);
  return response.data;
}

/**
 * 获取任务附件列表
 */
export async function getTaskAttachments(taskId: string): Promise<Attachment[]> {
  const response = await api.get<{ data: Attachment[] }>(`/upload/tasks/${taskId}/attachments`);
  return response.data;
}

/**
 * 删除任务附件
 */
export async function deleteTaskAttachment(attachmentId: string): Promise<void> {
  await api.delete(`/upload/attachments/${attachmentId}`);
}

/**
 * 上传评论图片
 */
export async function uploadCommentImage(taskId: string, file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.upload<{ success: boolean; data: UploadResult }>(`/upload/tasks/${taskId}/comment-images`, formData);
  return response.data;
}

/**
 * 上传项目文件
 */
export async function uploadProjectFile(projectId: string, file: File, folder?: string): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  if (folder) {
    formData.append('folder', folder);
  }
  
  const response = await api.upload<{ success: boolean; data: Attachment }>(`/upload/projects/${projectId}/files`, formData);
  return response.data;
}

/**
 * 获取项目文件列表
 */
export async function getProjectFiles(projectId: string, folder?: string): Promise<Attachment[]> {
  const params = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  const response = await api.get<{ data: Attachment[] }>(`/upload/projects/${projectId}/files${params}`);
  return response.data;
}

/**
 * 删除项目文件
 */
export async function deleteProjectFile(fileId: string): Promise<void> {
  await api.delete(`/upload/files/${fileId}`);
}

/**
 * 获取预签名上传 URL（用于大文件直传）
 */
export async function getPresignedUploadUrl(
  filename: string,
  mimeType: string,
  fileType: FileType,
  entityId?: string
): Promise<PresignedUrlResult> {
  const response = await api.post<{ success: boolean; data: PresignedUrlResult }>('/upload/presigned-url', {
    filename,
    mimeType,
    fileType,
    entityId,
  });
  return response.data;
}

/**
 * 直接上传到对象存储（用于大文件）
 */
export async function directUpload(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`上传失败: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('上传失败'));
    });
    
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

export default {
  uploadAvatar,
  uploadTaskAttachment,
  getTaskAttachments,
  deleteTaskAttachment,
  uploadCommentImage,
  uploadProjectFile,
  getProjectFiles,
  deleteProjectFile,
  getPresignedUploadUrl,
  directUpload,
  validateFile,
  formatFileSize,
  getFileIcon,
  isImageFile,
  isVideoFile,
  isPreviewable,
};

