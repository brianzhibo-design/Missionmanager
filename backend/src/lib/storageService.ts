/**
 * 对象存储服务
 * 支持 S3 兼容的存储服务（AWS S3, MinIO, 阿里云 OSS, 腾讯云 COS 等）
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { logger } from './logger';

// 存储配置
const storageConfig = {
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'sgp1',
  accessKeyId: process.env.S3_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
  bucket: process.env.S3_BUCKET || 'taskflow-files',
  publicUrl: process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Vultr 使用 virtual-hosted style
};

// 创建 S3 客户端
const s3Client = new S3Client({
  endpoint: storageConfig.endpoint,
  region: storageConfig.region,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
  forcePathStyle: storageConfig.forcePathStyle,
});

// 文件类型配置
export const FILE_TYPES = {
  AVATAR: {
    folder: 'avatars',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  TASK_ATTACHMENT: {
    folder: 'task-attachments',
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedMimes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/markdown',
      'application/zip', 'application/x-rar-compressed',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
    ],
    allowedExts: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.pdf',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.csv', '.md',
      '.zip', '.rar',
      '.mp4', '.mov', '.avi', '.webm',
      '.mp3', '.wav', '.ogg',
    ],
  },
  COMMENT_IMAGE: {
    folder: 'comment-images',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  PROJECT_FILE: {
    folder: 'project-files',
    maxSize: 200 * 1024 * 1024, // 200MB
    allowedMimes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/markdown',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
    ],
    allowedExts: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.pdf',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.csv', '.md',
      '.zip', '.rar', '.7z',
      '.mp4', '.mov', '.avi', '.webm',
      '.mp3', '.wav', '.ogg',
    ],
  },
  REPORT_ATTACHMENT: {
    folder: 'report-attachments',
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  },
} as const;

export type FileType = keyof typeof FILE_TYPES;

export interface UploadResult {
  key: string;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

/**
 * 验证文件类型和大小
 */
export function validateFile(
  filename: string,
  mimeType: string,
  size: number,
  fileType: FileType
): { valid: boolean; error?: string } {
  const config = FILE_TYPES[fileType];
  
  // 检查文件大小
  if (size > config.maxSize) {
    return {
      valid: false,
      error: `文件大小超过限制 (最大 ${Math.round(config.maxSize / 1024 / 1024)}MB)`,
    };
  }
  
  // 检查 MIME 类型
  if (!config.allowedMimes.includes(mimeType as any)) {
    return {
      valid: false,
      error: `不支持的文件类型: ${mimeType}`,
    };
  }
  
  // 检查文件扩展名
  const ext = path.extname(filename).toLowerCase();
  if (!config.allowedExts.includes(ext as any)) {
    return {
      valid: false,
      error: `不支持的文件扩展名: ${ext}`,
    };
  }
  
  return { valid: true };
}

/**
 * 生成唯一的文件 key
 */
export function generateFileKey(
  fileType: FileType,
  originalName: string,
  entityId?: string
): string {
  const config = FILE_TYPES[fileType];
  const ext = path.extname(originalName).toLowerCase();
  const uniqueId = uuidv4();
  const timestamp = Date.now();
  
  // 格式: folder/[entityId/]timestamp-uuid.ext
  const parts: string[] = [config.folder];
  if (entityId) {
    parts.push(entityId);
  }
  parts.push(`${timestamp}-${uniqueId}${ext}`);
  
  return parts.join('/');
}

/**
 * 上传文件到对象存储
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  try {
    const command = new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: metadata,
    });
    
    await s3Client.send(command);
    
    const url = getPublicUrl(key);
    const filename = path.basename(key);
    
    logger.info('文件上传成功', { key, size: buffer.length });
    
    return {
      key,
      url,
      filename,
      originalName: metadata?.originalName || filename,
      mimeType,
      size: buffer.length,
    };
  } catch (error) {
    logger.error('文件上传失败', { key, error });
    throw new Error('文件上传失败');
  }
}

/**
 * 删除文件
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
    });
    
    await s3Client.send(command);
    logger.info('文件删除成功', { key });
  } catch (error) {
    logger.error('文件删除失败', { key, error });
    throw new Error('文件删除失败');
  }
}

/**
 * 批量删除文件
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map(key => deleteFile(key)));
}

/**
 * 获取文件信息
 */
export async function getFileInfo(key: string): Promise<FileInfo | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    return {
      key,
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType || 'application/octet-stream',
    };
  } catch (error) {
    return null;
  }
}

/**
 * 获取文件下载 URL（预签名 URL，用于私有文件）
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * 获取文件上传预签名 URL（用于直传）
 */
export async function getSignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn = 3600
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
    ContentType: mimeType,
  });
  
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const publicUrl = getPublicUrl(key);
  
  return { uploadUrl, publicUrl };
}

/**
 * 获取公开访问 URL
 */
export function getPublicUrl(key: string): string {
  if (storageConfig.forcePathStyle) {
    return `${storageConfig.publicUrl}/${storageConfig.bucket}/${key}`;
  }
  return `${storageConfig.publicUrl}/${key}`;
}

/**
 * 从 URL 提取 key
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    
    // 移除 bucket 前缀（如果有）
    if (pathname.startsWith(`/${storageConfig.bucket}/`)) {
      pathname = pathname.substring(storageConfig.bucket.length + 2);
    } else if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }
    
    return pathname || null;
  } catch {
    return null;
  }
}

/**
 * 检查存储服务是否可用
 */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const testKey = `health-check/${Date.now()}.txt`;
    const testBuffer = Buffer.from('health check');
    
    await uploadFile(testBuffer, testKey, 'text/plain');
    await deleteFile(testKey);
    
    return true;
  } catch (error) {
    logger.error('存储服务健康检查失败', { error });
    return false;
  }
}

export { storageConfig };

