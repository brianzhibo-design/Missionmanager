import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface SheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  showClose?: boolean;
  children: React.ReactNode;
  height?: string;
}

export default function SheetModal({
  isOpen,
  onClose,
  title,
  showClose = true,
  children,
  height,
}: SheetModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`mm-sheet-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div
        className={`mm-sheet-modal ${isOpen ? 'show' : ''}`}
        style={height ? { height } : undefined}
      >
        {/* 标题栏 */}
        {(title || showClose) && (
          <div className="mm-sheet-header">
            <span>{title}</span>
            {showClose && (
              <button className="mm-sheet-close" onClick={onClose}>
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* 内容区 */}
        {children}
      </div>
    </>
  );
}
