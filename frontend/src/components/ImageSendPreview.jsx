import React, { useEffect } from 'react';

/**
 * Pre-send image confirmation overlay.
 * Confirm / Cancel sit under the preview image.
 */
const ImageSendPreview = ({
  open,
  previewUrl,
  filename,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onConfirm, onCancel]);

  if (!open || !previewUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Image preview'}
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0F1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-medium text-white">{title}</p>
          {filename ? (
            <p className="mt-0.5 truncate text-xs text-gray-400" dir="ltr">
              {filename}
            </p>
          ) : null}
        </div>
        <div className="flex max-h-[min(60vh,420px)] items-center justify-center bg-black/40 p-3">
          <img
            src={previewUrl}
            alt={filename || 'preview'}
            className="max-h-[min(56vh,380px)] max-w-full rounded-lg object-contain"
            draggable={false}
          />
        </div>
        <div className="flex gap-2 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 flex-1 rounded-lg border border-white/15 bg-white/5 text-sm text-gray-200 transition-colors hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageSendPreview;
