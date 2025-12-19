import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'sgp1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'taskflow-files';

export type FileCategory = 'avatars' | 'attachments' | 'comments' | 'reports';

export const storageService = {
  async uploadFile(
    file: Buffer,
    originalName: string,
    mimeType: string,
    category: FileCategory,
    userId: string
  ): Promise<{ key: string; url: string; size: number }> {
    const ext = originalName.split('.').pop() || '';
    const hash = crypto.randomBytes(8).toString('hex');
    const key = `${category}/${userId}/${Date.now()}-${hash}.${ext}`;

    // 头像和评论图片设为公开，其他文件私有
    const isPublic = category === 'avatars' || category === 'comments';
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file,
        ContentType: mimeType,
        ACL: isPublic ? 'public-read' : 'private',
      })
    );

    const url = isPublic
      ? `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`
      : await this.getSignedUrl(key);

    return { key, url, size: file.length };
  },

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
  },

  async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  },

  getPublicUrl(key: string): string {
    return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
  },
};

