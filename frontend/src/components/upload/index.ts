/**
 * 上传相关组件导出
 */

export { FileUpload, UploadButton } from '../FileUpload';
export { AttachmentList, CompactAttachmentList } from '../AttachmentList';
export { AvatarUpload } from '../AvatarUpload';
export { TaskAttachments, TaskAttachmentButton } from '../TaskAttachments';
export { ProjectFiles } from '../ProjectFiles';

// 导出服务和工具函数
export {
  uploadAvatar,
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
  FILE_CONFIG,
  type Attachment,
  type FileType,
} from '../../services/upload';

