/**
 * Browser tab favicon badge (red dot) for unread admin messages.
 * Restores the original SVG favicon when cleared.
 */

const ORIGINAL_HREF = '/favicon.svg';
const ORIGINAL_TYPE = 'image/svg+xml';

let _badgeBusy = false;
let _pendingShow = null;

function getIconLink() {
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

function restoreFavicon() {
  const link = getIconLink();
  link.type = ORIGINAL_TYPE;
  link.href = `${ORIGINAL_HREF}?v=${Date.now()}`;
}

function drawBadgeOnFavicon() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    restoreFavicon();
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);

    // Red unread dot (top-right), with white rim for contrast on dark tabs
    const r = 11;
    const cx = size - r - 2;
    const cy = r + 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    const link = getIconLink();
    link.type = 'image/png';
    link.href = canvas.toDataURL('image/png');
    _badgeBusy = false;
    if (_pendingShow === false) {
      _pendingShow = null;
      restoreFavicon();
    } else if (_pendingShow === true) {
      _pendingShow = null;
    }
  };
  img.onerror = () => {
    // Fallback: solid shield-ish circle + red dot
    ctx.clearRect(0, 0, size, size);
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#3B82F6');
    g.addColorStop(0.5, '#8B5CF6');
    g.addColorStop(1, '#3B82F6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 4);
    ctx.lineTo(56, 14);
    ctx.lineTo(56, 32);
    ctx.quadraticCurveTo(56, 50, 32, 60);
    ctx.quadraticCurveTo(8, 50, 8, 32);
    ctx.lineTo(8, 14);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(50, 14, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    const link = getIconLink();
    link.type = 'image/png';
    link.href = canvas.toDataURL('image/png');
    _badgeBusy = false;
    if (_pendingShow === false) {
      _pendingShow = null;
      restoreFavicon();
    } else {
      _pendingShow = null;
    }
  };
  // Cache-bust so updates re-trigger cleanly
  img.src = `${ORIGINAL_HREF}?badge=1`;
}

/**
 * @param {boolean} show - true = red dot on favicon
 */
export function setFaviconUnreadBadge(show) {
  if (typeof document === 'undefined') return;

  if (!show) {
    if (_badgeBusy) {
      _pendingShow = false;
      return;
    }
    restoreFavicon();
    return;
  }

  if (_badgeBusy) {
    _pendingShow = true;
    return;
  }
  _badgeBusy = true;
  _pendingShow = null;
  drawBadgeOnFavicon();
}

/**
 * Update document.title with unread count prefix for tab visibility.
 * @param {number} unread
 * @param {string} baseTitle
 */
export function setAdminDocumentTitle(unread, baseTitle) {
  if (typeof document === 'undefined') return;
  const n = Number(unread) || 0;
  const base = baseTitle || '管理后台';
  document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${base}` : base;
}
