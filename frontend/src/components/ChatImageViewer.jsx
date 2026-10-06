import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Download, Copy, ZoomIn, ZoomOut } from 'lucide-react';

const ChatImageViewer = ({ open, imageSrc, filename, onClose }) => {
  const { t, isRTL } = useLanguage();
  const labels = t.chat.imageViewer;
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!open) {
      setZoomed(false);
      return undefined;
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const handleSave = useCallback(async () => {
    if (!imageSrc) return;
    try {
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'chat-image.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageSrc, '_blank', 'noopener,noreferrer');
    }
  }, [imageSrc, filename]);

  const handleCopy = useCallback(async () => {
    if (!imageSrc) return;
    try {
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const type = blob.type || 'image/png';
      await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    } catch {
      window.open(imageSrc, '_blank', 'noopener,noreferrer');
    }
  }, [imageSrc]);

  if (!open || !imageSrc) return null;

  const toolBtn =
    'h-10 px-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors whitespace-nowrap';
  const iconBtn =
    'w-10 h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors';

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top toolbar: zoom · copy/save · close */}
      <div
        className="relative z-10 flex items-center justify-between gap-2 sm:gap-4 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          className={iconBtn}
          aria-label={zoomed ? labels.zoomOut : labels.zoomIn}
        >
          {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3 sm:gap-4">
          <button type="button" onClick={handleCopy} className={toolBtn} aria-label={labels.copy}>
            <Copy className="w-4 h-4 shrink-0" />
            <span>{labels.copy}</span>
          </button>
          <button type="button" onClick={handleSave} className={toolBtn} aria-label={labels.save}>
            <Download className="w-4 h-4 shrink-0" />
            <span>{labels.save}</span>
          </button>
        </div>

        <button type="button" onClick={onClose} className={iconBtn} aria-label={labels.close}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="flex-1 w-full min-h-0 flex items-center justify-center overflow-auto px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageSrc}
          alt={filename || 'image'}
          className={`transition-transform duration-200 select-none ${
            zoomed
              ? 'max-w-none max-h-none w-auto h-auto cursor-zoom-out'
              : 'max-w-[min(100%,98vw)] max-h-[min(100%,94vh)] object-contain cursor-zoom-in'
          }`}
          onClick={() => setZoomed((z) => !z)}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default ChatImageViewer;
