/**
 * 项目文件管理组件
 */

import { useState, useEffect, useCallback } from 'react';
import { Folder, Upload, Grid, List, Search } from './Icons';
import { FileUpload } from './FileUpload';
import { AttachmentList } from './AttachmentList';
import { 
  uploadProjectFile, 
  getProjectFiles, 
  deleteProjectFile,
  Attachment,
  formatFileSize,
  isImageFile 
} from '../services/upload';
import './ProjectFiles.css';

interface ProjectFilesProps {
  projectId: string;
  canEdit?: boolean;
}

export function ProjectFiles({ projectId, canEdit = true }: ProjectFilesProps) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // 加载文件
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getProjectFiles(projectId, currentFolder || undefined);
      setFiles(data);
    } catch (error) {
      console.error('加载文件失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentFolder]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // 上传文件
  const handleUpload = async (file: File) => {
    const newFile = await uploadProjectFile(projectId, file, currentFolder || undefined);
    setFiles(prev => [newFile, ...prev]);
  };

  // 删除文件
  const handleDelete = async (fileId: string) => {
    try {
      await deleteProjectFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('删除文件失败:', error);
      alert('删除失败');
    }
  };

  // 获取所有文件夹
  const folders = [...new Set(files.filter(f => f.folder).map(f => f.folder!))];

  // 过滤文件
  const filteredFiles = files.filter(file => {
    // 搜索过滤
    if (searchQuery && !file.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // 类型过滤
    if (filterType !== 'all') {
      if (filterType === 'image' && !file.mimeType.startsWith('image/')) return false;
      if (filterType === 'video' && !file.mimeType.startsWith('video/')) return false;
      if (filterType === 'document' && !file.mimeType.includes('pdf') && !file.mimeType.includes('document') && !file.mimeType.includes('text')) return false;
    }
    return true;
  });

  // 统计信息
  const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
  const imageCount = files.filter(f => isImageFile(f.mimeType)).length;
  const docCount = files.filter(f => f.mimeType.includes('pdf') || f.mimeType.includes('document')).length;

  return (
    <div className="project-files">
      {/* 工具栏 */}
      <div className="files-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="document">文档</option>
          </select>
        </div>
        
        <div className="toolbar-right">
          <div className="view-switcher">
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} />
            </button>
          </div>
          
          {canEdit && (
            <button 
              className="btn-primary btn-sm"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload size={16} />
              上传文件
            </button>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="files-stats">
        <span>{files.length} 个文件</span>
        <span>•</span>
        <span>总大小 {formatFileSize(totalSize)}</span>
        {imageCount > 0 && <span>• {imageCount} 张图片</span>}
        {docCount > 0 && <span>• {docCount} 个文档</span>}
      </div>

      {/* 上传区域 */}
      {showUpload && canEdit && (
        <div className="upload-section">
          <FileUpload
            onUpload={handleUpload}
            fileType="PROJECT_FILE"
            multiple
          />
        </div>
      )}

      {/* 文件夹导航 */}
      {folders.length > 0 && (
        <div className="folder-nav">
          <button
            className={`folder-item ${!currentFolder ? 'active' : ''}`}
            onClick={() => setCurrentFolder(null)}
          >
            <Folder size={16} />
            全部文件
          </button>
          {folders.map(folder => (
            <button
              key={folder}
              className={`folder-item ${currentFolder === folder ? 'active' : ''}`}
              onClick={() => setCurrentFolder(folder)}
            >
              <Folder size={16} />
              {folder}
            </button>
          ))}
        </div>
      )}

      {/* 文件列表 */}
      <div className="files-content">
        {isLoading ? (
          <div className="files-loading">加载中...</div>
        ) : viewMode === 'list' ? (
          <AttachmentList
            attachments={filteredFiles}
            onDelete={canEdit ? handleDelete : undefined}
            canDelete={canEdit}
            emptyText="暂无文件"
          />
        ) : (
          <div className="files-grid">
            {filteredFiles.map(file => (
              <div key={file.id} className="file-card">
                {isImageFile(file.mimeType) ? (
                  <div className="file-card-preview">
                    <img src={file.fileUrl} alt={file.filename} />
                  </div>
                ) : (
                  <div className="file-card-icon">
                    <Folder size={32} />
                  </div>
                )}
                <div className="file-card-info">
                  <span className="file-card-name" title={file.filename}>
                    {file.filename}
                  </span>
                  <span className="file-card-size">{formatFileSize(file.fileSize)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectFiles;

