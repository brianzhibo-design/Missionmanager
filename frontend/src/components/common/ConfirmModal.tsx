/**
 * 确认弹窗组件
 * 用于删除、提交等需要二次确认的操作
 */
import React from 'react';
import { AlertTriangle, Loader2 } from '../Icons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  const variantColors = {
    danger: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)',
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content confirm-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px' }}
      >
        <div className="confirm-modal-header">
          <div 
            className="confirm-icon"
            style={{ 
              color: variantColors[variant],
              backgroundColor: `${variantColors[variant]}15`,
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <h3 className="confirm-title">{title}</h3>
        </div>
        
        <div className="confirm-modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        
        <div className="confirm-modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            className={`btn btn-${variant}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                处理中...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

