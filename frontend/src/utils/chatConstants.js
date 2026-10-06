// Vercel serverless body limit ~4.5MB — keep client limit aligned
export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

export const SUPPORTED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

const IMAGE_EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
};

export function resolveImageMime(file) {
  const type = (file?.type || '').split(';')[0].trim().toLowerCase();
  if (type && SUPPORTED_IMAGE_MIME.has(type)) return type;
  const ext = (file?.name?.split('.').pop() || '').toLowerCase();
  return IMAGE_EXT_TO_MIME[ext] || '';
}

export function isSupportedImageFile(file) {
  if (!file) return false;
  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  if (ext === 'heic' || ext === 'heif') return false;
  const mime = resolveImageMime(file);
  return Boolean(mime) && SUPPORTED_IMAGE_MIME.has(mime);
}

/** Normalize clipboard/blob into a named File suitable for upload. */
export function asNamedImageFile(blob, fallbackName = '') {
  if (!blob) return null;
  const mime = (blob.type || '').split(';')[0].trim().toLowerCase() || 'image/png';
  if (!SUPPORTED_IMAGE_MIME.has(mime)) return null;
  const ext = MIME_TO_EXT[mime] || 'png';
  const rawName = (blob.name || fallbackName || '').trim();
  const name =
    rawName && /\.(jpe?g|png|gif|webp|bmp)$/i.test(rawName)
      ? rawName
      : `paste-${Date.now()}.${ext}`;
  if (blob instanceof File && blob.name === name) return blob;
  return new File([blob], name, { type: mime });
}

/**
 * Extract first image File from a paste/drop clipboard or DataTransfer.
 * Returns null when no supported image is present.
 */
export function extractClipboardImageFile(dataTransfer) {
  if (!dataTransfer) return null;

  const items = dataTransfer.items;
  if (items && items.length) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || item.kind !== 'file') continue;
      const type = (item.type || '').toLowerCase();
      if (!type.startsWith('image/')) continue;
      const file = asNamedImageFile(item.getAsFile());
      if (file && isSupportedImageFile(file)) return file;
    }
  }

  const files = dataTransfer.files;
  if (files && files.length) {
    for (let i = 0; i < files.length; i += 1) {
      const file = asNamedImageFile(files[i]);
      if (file && isSupportedImageFile(file)) return file;
    }
  }
  return null;
}
