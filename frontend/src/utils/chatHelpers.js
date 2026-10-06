import { resolveApiError } from './apiErrors';

const PENDING_KEY = 'chat_pending_messages';

export const mergeMessages = (prev, incoming) => {
  const map = new Map();

  const upsert = (msg) => {
    if (!msg) return;

    const clientId = msg.client_message_id;
    const serverId = msg.message_id;

    if (serverId && clientId) {
      map.delete(clientId);
      map.set(serverId, { ...msg, status: undefined });
      return;
    }

    if (serverId) {
      const existing = map.get(serverId);
      if (!existing || existing.status === 'pending') {
        map.set(serverId, { ...msg, status: undefined });
      }
      return;
    }

    if (clientId) {
      const confirmed = [...map.values()].some(
        (m) => m.client_message_id === clientId && m.message_id
      );
      if (!confirmed) {
        map.set(clientId, msg);
      }
    }
  };

  [...prev, ...incoming].forEach(upsert);

  return Array.from(map.values()).sort((a, b) =>
    (a.created_at || '').localeCompare(b.created_at || '')
  );
};

export const getPendingMessages = (sessionId) => {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
    return all[sessionId] || [];
  } catch {
    return [];
  }
};

export const savePendingMessage = (sessionId, message) => {
  const { _file, ...serializable } = message;
  const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
  const list = all[sessionId] || [];
  const idx = list.findIndex((m) => m.client_message_id === serializable.client_message_id);
  if (idx >= 0) list[idx] = serializable;
  else list.push(serializable);
  all[sessionId] = list;
  localStorage.setItem(PENDING_KEY, JSON.stringify(all));
};

export const removePendingMessage = (sessionId, clientMessageId) => {
  const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
  if (!all[sessionId]) return;
  all[sessionId] = all[sessionId].filter((m) => m.client_message_id !== clientMessageId);
  if (all[sessionId].length === 0) delete all[sessionId];
  localStorage.setItem(PENDING_KEY, JSON.stringify(all));
};

/** Move pending queue when server merges session_id (same phone → canonical). */
export const migratePendingMessages = (fromSessionId, toSessionId) => {
  if (!fromSessionId || !toSessionId || fromSessionId === toSessionId) return;
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
    const fromList = all[fromSessionId] || [];
    if (!fromList.length) return;
    const toList = all[toSessionId] || [];
    const seen = new Set(toList.map((m) => m.client_message_id));
    for (const msg of fromList) {
      if (!msg?.client_message_id || seen.has(msg.client_message_id)) continue;
      toList.push({ ...msg, session_id: toSessionId });
      seen.add(msg.client_message_id);
    }
    all[toSessionId] = toList;
    delete all[fromSessionId];
    localStorage.setItem(PENDING_KEY, JSON.stringify(all));
  } catch {
    // ignore corrupt storage
  }
};

/**
 * Split text into plain / URL parts for clickable links.
 * Supports http(s):// and www. prefixes.
 */
export const linkifyTextParts = (text) => {
  const raw = text == null ? '' : String(text);
  if (!raw) return [];
  const re = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
  const parts = [];
  let last = 0;
  let match;
  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: raw.slice(last, match.index) });
    }
    let url = match[0];
    // Trim common trailing punctuation from URL
    let trailing = '';
    while (/[),.;:!?，。！？、》」』】)]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    parts.push({ type: 'link', value: url, href });
    if (trailing) parts.push({ type: 'text', value: trailing });
    last = match.index + match[0].length;
  }
  if (last < raw.length) {
    parts.push({ type: 'text', value: raw.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', value: raw }];
};

export const validateIsraeliPhone = (phone) => {
  let cleaned = phone.replace(/[\s\-().]/g, '').trim();
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  if (cleaned.startsWith('5') && cleaned.length <= 9) cleaned = '0' + cleaned;
  return /^05\d{8}$/.test(cleaned) ? cleaned : null;
};

/** Format Israeli mobile as user types: 050-123-4567 */
export const formatIsraeliPhoneInput = (raw) => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('972')) d = '0' + d.slice(3);
  if (d.startsWith('5') && !d.startsWith('05')) d = '0' + d;
  if (!d.length) return '';
  if (!d.startsWith('0') && !d.startsWith('5')) return raw.replace(/[^\d+\-\s]/g, '');
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

export const LOCALE_MAP = { he: 'he-IL', en: 'en-IL', ar: 'ar-IL' };

/** Visitor pings every 5s (10s when tab hidden); allow several missed heartbeats. */
export const ONLINE_THRESHOLD_SEC = 45;

export const parseUtcIso = (iso) => {
  if (!iso) return null;
  const raw = String(iso).trim();
  if (!raw) return null;
  const normalized = /[zZ]|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

export const isVisitorOnline = (lastSeenAt, thresholdSec = ONLINE_THRESHOLD_SEC) => {
  const dt = parseUtcIso(lastSeenAt);
  if (!dt) return false;
  const age = (Date.now() - dt.getTime()) / 1000;
  return age >= 0 && age <= thresholdSec;
};

/** Online when last_seen_at is fresh, or visitor just messaged (unread + recent activity). */
export const isSessionVisitorOnline = (session, thresholdSec = ONLINE_THRESHOLD_SEC) => {
  if (!session) return false;
  if (isVisitorOnline(session.last_seen_at, thresholdSec)) return true;
  const unread = Number(session.unread_admin || 0);
  if (unread > 0 && isVisitorOnline(session.last_message_at, thresholdSec)) return true;
  return false;
};

export const formatChatTime = (iso, withDate = false, locale = 'he-IL') => {
  try {
    const d = parseUtcIso(iso);
    if (!d) return '';
    const opts = { hour: '2-digit', minute: '2-digit', hour12: false };
    if (withDate) return d.toLocaleString(locale, { ...opts, day: 'numeric', month: 'short' });
    return d.toLocaleTimeString(locale, opts);
  } catch {
    return '';
  }
};

export const resolveChatImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  if (/^(https?:|blob:|data:)/i.test(imageUrl)) return imageUrl;
  if (typeof window === 'undefined') return imageUrl;
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${window.location.origin}${path}`;
};

export const createClientMessageId = () => crypto.randomUUID();

export const getApiErrorMessage = (err, fallback = 'Request failed', t = null) => {
  if (!err?.response) {
    return t?.errors?.networkError || fallback;
  }
  const detail = err.response.data?.detail;
  if (typeof detail === 'string') {
    return resolveApiError(detail, t, fallback);
  }
  if (Array.isArray(detail)) {
    const joined = detail.map((d) => d.msg || d).join(', ');
    return t ? resolveApiError(joined, t, fallback) : joined;
  }
  return t?.errors?.requestFailed || fallback;
};

export const visitorChatHeaders = (phone) => {
  const headers = {};
  if (phone) headers['X-Visitor-Phone'] = phone;
  return headers;
};

export const visitorChatParams = (sessionId, phone, extra = {}) => {
  const params = { session_id: sessionId, ...extra };
  if (phone) params.visitor_phone = phone;
  return params;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const retryRequest = async (fn, retries = 3, baseDelay = 400) => {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw error;
      }
      if (attempt < retries - 1) {
        await sleep(baseDelay * (attempt + 1));
      }
    }
  }
  throw lastError;
};
