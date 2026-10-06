import React, { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatChatTime, resolveChatImageUrl, linkifyTextParts } from '../utils/chatHelpers';
import { Loader2, AlertCircle, ImageIcon, Trash2 } from 'lucide-react';
import ChatImageViewer from './ChatImageViewer';
import { adminZh } from '../i18n/adminZh';

const LinkifiedText = ({ text, className, dir }) => {
  const parts = useMemo(() => linkifyTextParts(text), [text]);
  if (!text) return null;
  return (
    <p className={className} dir={dir || 'auto'}>
      {parts.map((part, i) =>
        part.type === 'link' ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 break-all hover:opacity-90"
            onClick={(e) => e.stopPropagation()}
          >
            {part.value}
          </a>
        ) : (
          <React.Fragment key={i}>{part.value}</React.Fragment>
        )
      )}
    </p>
  );
};

/**
 * Admin: pass showAdminLayout + foreignText (top) + chineseText (bottom).
 * Visitor widget: only msg/isOwn/onRetry — shows content as before.
 */
const ChatMessageBubble = ({
  msg,
  isOwn,
  onRetry,
  onDelete,
  onRetryTranslate,
  foreignText,
  chineseText,
  translateFailed = false,
  showAdminLayout = false,
  showHistoryTranslate = true,
}) => {
  const { t, locale } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isPending = msg.status === 'pending';
  const isFailed = msg.status === 'failed';

  const imageSrc = useMemo(() => {
    if (!msg.image_url) return '';
    const base = resolveChatImageUrl(msg.image_url);
    return retryCount > 0 ? `${base}${base.includes('?') ? '&' : '?'}r=${retryCount}` : base;
  }, [msg.image_url, retryCount]);

  const handleImageError = () => {
    if (retryCount < 2) {
      setRetryCount((n) => n + 1);
      setImgLoaded(false);
      return;
    }
    setImgError(true);
  };

  const handleDelete = async () => {
    if (!onDelete || deleting || !msg.message_id) return;
    setDeleting(true);
    try {
      await onDelete(msg);
    } finally {
      setDeleting(false);
    }
  };

  const roundOwn = 'rounded-ee-sm rtl:rounded-es-sm';
  const roundOther = 'rounded-es-sm rtl:rounded-ee-sm';
  const round = isOwn ? roundOwn : roundOther;
  const styleGray = `bg-white/10 text-gray-100 ${round}`;
  const styleGreen = `bg-gradient-to-r from-green-600 to-emerald-600 text-white ${round}`;
  const styleBluePurple = `bg-gradient-to-r from-blue-500 to-purple-600 text-white ${round}`;

  let cls;
  let timeMuted;
  if (showAdminLayout) {
    cls = isOwn ? styleGray : styleGreen;
    timeMuted = isOwn ? 'text-gray-500' : 'text-white/60';
  } else {
    cls = isOwn ? styleGray : styleBluePurple;
    timeMuted = isOwn ? 'text-gray-500' : 'text-white/60';
  }

  const topText = showAdminLayout ? foreignText ?? msg.content : msg.content;
  // Off = original only; never show chineseText / content_original / cache
  const bottomText =
    showAdminLayout && showHistoryTranslate && chineseText ? chineseText : null;
  const timeLocale = showAdminLayout ? 'zh-CN' : locale;

  return (
    <>
      <div className="flex w-full group/bubble">
        <div
          className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm relative ${cls} ${isOwn ? 'ms-auto' : 'me-auto'} ${isPending ? 'opacity-70' : ''} ${isFailed ? 'border border-red-500/50' : ''}`}
        >
          {showAdminLayout && onDelete && msg.message_id ? (
            <button
              type="button"
              title={adminZh.chat.deleteMessage}
              disabled={deleting}
              onClick={handleDelete}
              className="absolute -top-2 -end-2 opacity-0 group-hover/bubble:opacity-100 focus:opacity-100 transition-opacity w-6 h-6 rounded-full bg-black/70 border border-white/20 text-gray-300 hover:text-red-400 hover:border-red-400/50 flex items-center justify-center disabled:opacity-40"
            >
              {deleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </button>
          ) : null}

          {msg.type === 'image' && imageSrc && (
            <div className="mb-1">
              {!imgLoaded && !imgError && (
                <div className="w-48 h-32 bg-black/20 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                </div>
              )}
              {!imgError ? (
                <button
                  type="button"
                  className="block border-0 p-0 bg-transparent cursor-pointer"
                  onClick={() => setViewerOpen(true)}
                >
                  <img
                    src={imageSrc}
                    alt={msg.filename || 'image'}
                    className={`max-w-full rounded-lg hover:opacity-90 transition-opacity ${imgLoaded ? '' : 'hidden'}`}
                    style={{ maxHeight: '300px' }}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setImgLoaded(true)}
                    onError={handleImageError}
                    draggable={false}
                  />
                </button>
              ) : (
                <div className="text-xs opacity-70 space-y-1">
                  <p>{t.chat.imageLoadFailed}</p>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setViewerOpen(true)}
                  >
                    {t.chat.imageRetry}
                  </button>
                </div>
              )}
            </div>
          )}

          {topText ? (
            <LinkifiedText
              text={topText}
              className="break-words whitespace-pre-wrap"
              dir="auto"
            />
          ) : null}

          {bottomText ? (
            <div className="mt-1.5 border-t border-white/20 pt-1.5">
              <LinkifiedText
                text={bottomText}
                className="break-words whitespace-pre-wrap text-[12px] opacity-90"
                dir="auto"
              />
              {translateFailed && onRetryTranslate ? (
                <button
                  type="button"
                  onClick={() => onRetryTranslate(msg)}
                  className="mt-1 text-[11px] underline opacity-90 hover:opacity-100"
                >
                  点击重试翻译
                </button>
              ) : null}
            </div>
          ) : null}

          <div className={`flex items-center gap-1 mt-1 ${timeMuted}`}>
            <p className="text-[10px]" dir="ltr">
              {formatChatTime(msg.created_at, false, timeLocale)}
            </p>
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {isFailed && <AlertCircle className="w-3 h-3 text-red-400" />}
          </div>
          {isFailed && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 text-[11px] underline opacity-90 hover:opacity-100"
            >
              {showAdminLayout
                ? '发送失败，点击重试'
                : t.chat.sendFailedRetry || t.chat.imageRetry}
            </button>
          )}
        </div>
      </div>

      <ChatImageViewer
        open={viewerOpen}
        imageSrc={imageSrc}
        filename={msg.filename}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
};

export default ChatMessageBubble;
