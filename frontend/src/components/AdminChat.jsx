import {
  MessageSquare,
  Send,
  Trash2,
  ImagePlus,
  Ban,
  Languages,
  Users,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  mergeMessages,
  createClientMessageId,
  formatChatTime,
  retryRequest,
  getApiErrorMessage,
  isSessionVisitorOnline,
} from '../utils/chatHelpers';
import {
  MAX_IMAGE_SIZE_BYTES,
  isSupportedImageFile,
  extractClipboardImageFile,
} from '../utils/chatConstants';
import { requestNotificationPermission, showBrowserNotification } from '../utils/notifications';
import { adminZh } from '../i18n/adminZh';
import { useLanguage } from '../contexts/LanguageContext';
import ImageSendPreview from './ImageSendPreview';
import { resolveApiSuccess } from '../utils/apiErrors';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import ChatMessageBubble from './ChatMessageBubble';
import React, { useState, useEffect, useRef, useCallback } from 'react';

const API = '/api';
const SESSION_POLL_INTERVAL = 3000;
const MESSAGE_POLL_INTERVAL = 2000;
const PROVIDER_KEY = 'admin_translate_provider';
const TARGET_LANG_KEY = 'admin_translate_target';
const HISTORY_TRANSLATE_KEY = 'admin_history_translate';
const OUTBOUND_TARGETS = ['he', 'ar', 'en'];

const PresenceDot = ({ online, label }) => (
  <span className="inline-flex items-center gap-1 text-[10px]">
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}
      aria-hidden
    />
    <span className={online ? 'text-green-400/90' : 'text-gray-500'}>{label}</span>
  </span>
);

const UnreadDot = ({ show }) =>
  show ? (
    <span
      className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
      aria-hidden
    />
  ) : null;

/** Match backend translate.is_cjk_text — treat as Chinese if enough CJK chars. */
const isCjkText = (text) => {
  const s = (text || '').trim();
  if (!s) return false;
  const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  return cjk >= Math.max(1, Math.floor(s.length / 4));
};

const composerTextareaClass =
  'flex-1 min-h-[40px] max-h-32 resize-y rounded-md bg-[#0a0e1a]/80 border border-white/10 text-white text-sm px-3 py-2 leading-5 outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:opacity-50';

const AdminChat = ({
  view = 'contacts',
  selectedSessionId = null,
  onSelectSession,
  onOpenChat,
  onUnreadChange,
} = {}) => {
  const { t } = useLanguage(); // for getApiErrorMessage mapping
  const ac = adminZh.chat;
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draftZh, setDraftZh] = useState('');
  const [sendHe, setSendHe] = useState('');
  const [pendingOriginal, setPendingOriginal] = useState('');
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateStatus, setTranslateStatus] = useState('');
  const [provider, setProvider] = useState(
    () => localStorage.getItem(PROVIDER_KEY) || 'google'
  );
  const [targetLang, setTargetLang] = useState(() => {
    const saved = (localStorage.getItem(TARGET_LANG_KEY) || 'he').toLowerCase();
    return OUTBOUND_TARGETS.includes(saved) ? saved : 'he';
  });
  const [historyTranslate, setHistoryTranslate] = useState(() => {
    const saved = localStorage.getItem(HISTORY_TRANSLATE_KEY);
    // Default ON; only explicit "0" / "false" turns it off
    return saved !== '0' && saved !== 'false';
  });
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // { file, previewUrl } | null
  const [zhCache, setZhCache] = useState({});
  const zhCacheRef = useRef(zhCache);
  zhCacheRef.current = zhCache;
  const messagesContainerRef = useRef(null);
  const forceScrollToBottomRef = useRef(false);
  const lastSinceRef = useRef(null);
  const fileInputRef = useRef(null);
  const draftRef = useRef(null);
  const sendRef = useRef(null);
  const sessionPollRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const notificationsReadyRef = useRef(false);
  const translatingIdsRef = useRef(new Set());
  /** Bumps on gender/provider change so in-flight auto-translates are ignored. */
  const translateGenRef = useRef(0);
  const selectedSessionIdRef = useRef(selectedSessionId);
  selectedSessionIdRef.current = selectedSessionId;
  const pasteLockRef = useRef(false);
  const pendingFilesRef = useRef(new Map());
  const [presenceTick, setPresenceTick] = useState(0);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteEditingId, setNoteEditingId] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [genderSaving, setGenderSaving] = useState(false);

  const getToken = () => localStorage.getItem('admin_token');

  const selectedSession =
    sessions.find((s) => s.session_id === selectedSessionId) || null;

  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/chat/sessions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const incoming = res.data.sessions || [];
      // Only treat the open chat-room session as "read" for badge purposes.
      const readingId = view === 'chat' ? selectedSessionId : null;
      const totalUnread = incoming.reduce(
        (sum, s) =>
          sum +
          (s.session_id === readingId ? 0 : Number(s.unread_admin || 0)),
        0
      );
      const rawTotal = incoming.reduce((sum, s) => sum + Number(s.unread_admin || 0), 0);
      if (prevUnreadRef.current !== null && rawTotal > prevUnreadRef.current) {
        showBrowserNotification({
          title: ac.newVisitorTitle,
          body: ac.newVisitorBody,
          tag: 'admin-chat',
        });
      }
      prevUnreadRef.current = rawTotal;
      setSessions(
        incoming.map((s) =>
          s.session_id === readingId ? { ...s, unread_admin: 0 } : s
        )
      );
      if (typeof onUnreadChange === 'function') {
        onUnreadChange(totalUnread);
      }
    } catch (e) {
      if (e.response?.status === 401) return;
      console.error('Failed to fetch chat sessions', e);
    }
  }, [
    view,
    selectedSessionId,
    ac.newVisitorTitle,
    ac.newVisitorBody,
    onUnreadChange,
  ]);

  useEffect(() => {
    if (notificationsReadyRef.current) return undefined;
    notificationsReadyRef.current = true;
    requestNotificationPermission();
    return undefined;
  }, []);

  const fetchMessages = useCallback(
    async (sessionId, since = null, fullLoad = false) => {
      try {
        const params = {};
        if (since && !fullLoad) params.since = since;

        const res = await axios.get(`${API}/admin/chat/sessions/${sessionId}/messages`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          params,
        });
        const incoming = res.data.messages || [];
        setMessages((prev) => {
          const merged = mergeMessages(fullLoad ? [] : prev, incoming);
          if (merged.length > 0) {
            const last = merged[merged.length - 1];
            if (last.created_at && !last.status) lastSinceRef.current = last.created_at;
          }
          return merged;
        });
        if (fullLoad) {
          forceScrollToBottomRef.current = true;
        }
        const latestVisitor = [...incoming]
          .reverse()
          .find((m) => m?.sender === 'visitor' && m?.created_at);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.session_id !== sessionId) return s;
            const next = { ...s, unread_admin: 0 };
            if (latestVisitor?.created_at) {
              // Do not overwrite last_seen_at — presence comes from visitor ping,
              // and message timestamps can be older than the heartbeat.
              next.last_message_at = latestVisitor.created_at;
            }
            return next;
          })
        );
      } catch (e) {
        if (e.response?.status === 401) return;
      }
    },
    []
  );

  useEffect(() => {
    fetchSessions();
    sessionPollRef.current = setInterval(fetchSessions, SESSION_POLL_INTERVAL);
    return () => clearInterval(sessionPollRef.current);
  }, [fetchSessions]);

  useEffect(() => {
    const id = setInterval(() => setPresenceTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (view === 'chat' && selectedSessionId) {
      lastSinceRef.current = null;
      forceScrollToBottomRef.current = true;
      pendingFilesRef.current.clear();
      setMessages([]);
      setDraftZh('');
      setSendHe('');
      setPendingOriginal('');
      translateGenRef.current += 1;
      setZhCache({});
      translatingIdsRef.current.clear();
      fetchMessages(selectedSessionId, null, true);
      const msgPoll = setInterval(
        () => fetchMessages(selectedSessionId, lastSinceRef.current),
        MESSAGE_POLL_INTERVAL
      );
      return () => clearInterval(msgPoll);
    }
    return undefined;
  }, [view, selectedSessionId, fetchMessages]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (!(forceScrollToBottomRef.current || nearBottom)) return;

    const behavior = forceScrollToBottomRef.current ? 'auto' : 'smooth';
    const stick = forceScrollToBottomRef.current;
    forceScrollToBottomRef.current = false;

    const run = () => {
      if (!messagesContainerRef.current) return;
      const node = messagesContainerRef.current;
      if (behavior === 'smooth' && typeof node.scrollTo === 'function') {
        node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
      } else {
        node.scrollTop = node.scrollHeight;
      }
    };

    run();
    // Images / bilingual layout can grow after paint — re-stick when opening a chat.
    requestAnimationFrame(() => {
      run();
      if (stick) {
        requestAnimationFrame(run);
        setTimeout(run, 80);
        setTimeout(run, 250);
      }
    });
  }, [messages, zhCache]);

  // Auto-translate foreign messages → Chinese (visitor + admin without original)
  useEffect(() => {
    if (view !== 'chat') return;
    if (!historyTranslate) return;
    const token = getToken();
    const gender = selectedSession?.visitor_gender === 'female' ? 'female' : 'male';
    const gen = translateGenRef.current;
    const sessionAtStart = selectedSessionId;
    const originalsBatch = {};

    messages.forEach((msg) => {
      if (msg.type === 'image') return;
      // Wait for server id to avoid client_message_id → message_id cache orphaning
      const mid = msg.message_id;
      if (!mid) return;
      if (zhCacheRef.current[mid] !== undefined) return;

      const original = (msg.content_original || '').trim();
      if (original) {
        originalsBatch[mid] = original;
        return;
      }

      const text = (msg.content || '').trim();
      if (!text) return;
      if (translatingIdsRef.current.has(mid)) return;
      translatingIdsRef.current.add(mid);
      axios
        .post(
          `${API}/admin/translate`,
          { text, target: 'zh', provider, gender },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 90000 }
        )
        .then((res) => {
          if (gen !== translateGenRef.current) return;
          if (sessionAtStart !== selectedSessionIdRef.current) return;
          setZhCache((prev) => ({ ...prev, [mid]: res.data?.text || text }));
        })
        .catch((err) => {
          if (gen !== translateGenRef.current) return;
          if (sessionAtStart !== selectedSessionIdRef.current) return;
          console.warn('translate zh failed', err?.response?.status, err?.message);
          setZhCache((prev) => ({ ...prev, [mid]: '' }));
        })
        .finally(() => {
          translatingIdsRef.current.delete(mid);
        });
    });

    const batchKeys = Object.keys(originalsBatch);
    if (batchKeys.length) {
      setZhCache((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const mid of batchKeys) {
          if (next[mid] === undefined) {
            next[mid] = originalsBatch[mid];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [
    messages,
    view,
    provider,
    selectedSession?.visitor_gender,
    selectedSessionId,
    historyTranslate,
  ]);

  const handleSelectSession = (session) => {
    // Single click: select only (stay on contacts)
    onSelectSession?.(session);
  };

  const handleOpenSessionChat = (session) => {
    const sid = session.session_id;
    setSessions((prev) =>
      prev.map((s) => (s.session_id === sid ? { ...s, unread_admin: 0 } : s))
    );
    onSelectSession?.(session);
    onOpenChat?.();
  };

  const openNoteEditor = (session, e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setNoteEditingId(session.session_id);
    setNoteDraft(session.admin_note || '');
  };

  const closeNoteEditor = () => {
    setNoteEditingId(null);
    setNoteDraft('');
  };

  const saveNote = async () => {
    if (!noteEditingId || noteSaving) return;
    setNoteSaving(true);
    try {
      const res = await axios.put(
        `${API}/admin/chat/sessions/${noteEditingId}/note`,
        { note: noteDraft },
        { headers: { Authorization: `Bearer ${getToken()}` }, timeout: 15000 }
      );
      const saved = res.data?.admin_note ?? noteDraft.trim();
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === noteEditingId ? { ...s, admin_note: saved } : s
        )
      );
      toast.success(
        resolveApiSuccess(res.data?.message, t, adminZh.toast.noteSaved)
      );
      closeNoteEditor();
    } catch (err) {
      toast.error(getApiErrorMessage(err, adminZh.toast.noteSaveFailed, t));
    } finally {
      setNoteSaving(false);
    }
  };

  const toggleBlacklistByIp = async (ip, blacklisted) => {
    if (!ip) {
      toast.error(ac.missingIp);
      return;
    }
    try {
      if (blacklisted) {
        await retryRequest(() =>
          axios.delete(`${API}/admin/blacklist/${encodeURIComponent(ip)}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
            timeout: 15000,
          })
        );
      } else {
        await retryRequest(() =>
          axios.post(
            `${API}/admin/blacklist`,
            { ip },
            { headers: { Authorization: `Bearer ${getToken()}` }, timeout: 15000 }
          )
        );
      }
      fetchSessions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, ac.operationFailed, t));
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e?.stopPropagation?.();
    if (!window.confirm(ac.deleteConfirm)) return;
    try {
      await axios.delete(`${API}/admin/chat/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (selectedSessionId === sessionId) {
        onSelectSession?.(null);
        setMessages([]);
      }
      toast.success(ac.deleted);
      fetchSessions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, ac.deleteFailed, t));
    }
  };

  const handleDeleteMessage = async (msg) => {
    const mid = msg?.message_id;
    if (!selectedSessionId || !mid) return;
    if (!window.confirm(ac.deleteMessageConfirm)) return;
    try {
      await axios.delete(
        `${API}/admin/chat/sessions/${selectedSessionId}/messages/${encodeURIComponent(mid)}`,
        { headers: { Authorization: `Bearer ${getToken()}` }, timeout: 15000 }
      );
      setMessages((prev) => prev.filter((m) => m.message_id !== mid));
      setZhCache((prev) => {
        if (prev[mid] === undefined) return prev;
        const next = { ...prev };
        delete next[mid];
        return next;
      });
      toast.success(ac.deleteMessageDone);
      fetchSessions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, ac.deleteMessageFailed, t));
    }
  };

  const handleRetryTranslate = (msg) => {
    const mid = msg?.message_id;
    if (!mid) return;
    translatingIdsRef.current.delete(mid);
    setZhCache((prev) => {
      const next = { ...prev };
      delete next[mid];
      return next;
    });
  };

  const sessionGender = (session) =>
    session?.visitor_gender === 'female' ? 'female' : 'male';

  const toggleSessionGender = async () => {
    if (!selectedSessionId || !selectedSession || genderSaving) return;
    const next = sessionGender(selectedSession) === 'female' ? 'male' : 'female';
    setGenderSaving(true);
    try {
      const res = await axios.put(
        `${API}/admin/chat/sessions/${selectedSessionId}/gender`,
        { gender: next },
        { headers: { Authorization: `Bearer ${getToken()}` }, timeout: 15000 }
      );
      const g = res.data?.visitor_gender || next;
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === selectedSessionId ? { ...s, visitor_gender: g } : s
        )
      );
      // New gender → new prompts; drop stale auto-translations + composer Hebrew
      translateGenRef.current += 1;
      setZhCache({});
      translatingIdsRef.current.clear();
      setSendHe('');
      setPendingOriginal('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, ac.operationFailed, t));
    } finally {
      setGenderSaving(false);
    }
  };

  const switchProvider = (p) => {
    setProvider(p);
    localStorage.setItem(PROVIDER_KEY, p);
    // Provider change must re-run auto-translate (esp. Google → DeepSeek + gender)
    translateGenRef.current += 1;
    setZhCache({});
    translatingIdsRef.current.clear();
    setTranslateStatus(
      `${p === 'deepseek' ? ac.providerDeepseek : ac.providerGoogle}`
    );
    setTimeout(() => setTranslateStatus(''), 1600);
  };

  const switchTargetLang = (lang) => {
    const next = OUTBOUND_TARGETS.includes(lang) ? lang : 'he';
    setTargetLang(next);
    localStorage.setItem(TARGET_LANG_KEY, next);
    setSendHe('');
    setPendingOriginal('');
    const label =
      next === 'ar' ? ac.targetAr : next === 'en' ? ac.targetEn : ac.targetHe;
    setTranslateStatus(`${ac.targetLangLabel}：${label}`);
    setTimeout(() => setTranslateStatus(''), 1600);
  };

  const toggleHistoryTranslate = () => {
    const next = !historyTranslate;
    setHistoryTranslate(next);
    localStorage.setItem(HISTORY_TRANSLATE_KEY, next ? '1' : '0');
    setTranslateStatus(next ? ac.historyTranslateOn : ac.historyTranslateOff);
    setTimeout(() => setTranslateStatus(''), 1600);
  };

  const outboundPlaceholder =
    targetLang === 'ar'
      ? ac.sendPlaceholderAr
      : targetLang === 'en'
        ? ac.sendPlaceholderEn
        : ac.sendPlaceholderHe;

  const handleComposerEnter = () => {
    const hasSend = !!sendHe.trim();
    const hasDraft = !!draftZh.trim();
    if (hasSend && hasDraft) {
      // 两框都有字：清空发送框，翻译下方中文
      setSendHe('');
      setPendingOriginal('');
      handleTranslateDraft();
      return;
    }
    if (hasSend) {
      handleSendReply();
      return;
    }
    if (hasDraft) {
      handleTranslateDraft();
    }
  };

  const handleTranslateDraft = async () => {
    const text = draftZh.trim();
    if (!text || translating) return;
    setTranslating(true);
    setTranslateStatus(ac.translating);
    try {
      const gender = sessionGender(selectedSession);
      const target = OUTBOUND_TARGETS.includes(targetLang) ? targetLang : 'he';
      const res = await axios.post(
        `${API}/admin/translate`,
        { text, target, provider, gender },
        { headers: { Authorization: `Bearer ${getToken()}` }, timeout: 90000 }
      );
      const outbound = (res.data?.text || text).trim();
      setPendingOriginal(text);
      setSendHe(outbound);
      setDraftZh('');
      const used = (res.data?.provider || provider || '').toLowerCase();
      if (used === 'google' && provider === 'deepseek') {
        setTranslateStatus(`${ac.translateDone}（已回退谷歌）`);
      } else {
        setTranslateStatus(ac.translateDone);
      }
      setTimeout(() => setTranslateStatus(''), 1800);
      sendRef.current?.focus();
    } catch (err) {
      setTranslateStatus('');
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === 'string'
          ? `${ac.translateFailed}: ${detail}`
          : getApiErrorMessage(err, ac.translateFailed, t)
      );
    } finally {
      setTranslating(false);
    }
  };

  const sendTextReply = async (content, clientMessageId, contentOriginal = '') => {
    const optimistic = {
      client_message_id: clientMessageId,
      session_id: selectedSessionId,
      sender: 'admin',
      type: 'text',
      content,
      content_original: contentOriginal || undefined,
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    setMessages((prev) => mergeMessages(prev, [optimistic]));

    try {
      const res = await retryRequest(() =>
        axios.post(
          `${API}/admin/chat/sessions/${selectedSessionId}/messages`,
          {
            content,
            client_message_id: clientMessageId,
            content_original: contentOriginal || '',
          },
          { headers: { Authorization: `Bearer ${getToken()}` }, timeout: 15000 }
        )
      );
      const serverMsg = {
        ...res.data.message,
        client_message_id: res.data.message.client_message_id || clientMessageId,
      };
      setMessages((prev) => mergeMessages(prev, [serverMsg]));
      if (serverMsg.created_at) lastSinceRef.current = serverMsg.created_at;
      fetchSessions();
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.client_message_id === clientMessageId ? { ...m, status: 'failed' } : m
        )
      );
      throw err;
    }
  };

  const handleSendReply = async () => {
    const hebrew = sendHe.trim();
    const original = (pendingOriginal || draftZh || '').trim();
    if (!hebrew || !selectedSessionId || sending) return;
    // Allow send whenever the top box is not Chinese (manual Hebrew / other langs OK).
    if (isCjkText(hebrew)) {
      toast.error(ac.needTranslateFirst);
      return;
    }

    setSending(true);
    const clientId = createClientMessageId();
    try {
      await sendTextReply(hebrew, clientId, original);
      setDraftZh('');
      setSendHe('');
      setPendingOriginal('');
      setTranslateStatus('');
      forceScrollToBottomRef.current = true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, ac.sendFailed, t));
    } finally {
      setSending(false);
      draftRef.current?.focus();
    }
  };

  const handleRetryMessage = async (msg) => {
    if (!selectedSessionId || sending || uploading) return;
    if (msg.type === 'image') {
      const file = pendingFilesRef.current.get(msg.client_message_id);
      if (!file) {
        toast.error(ac.imageRetryHint);
        return;
      }
      setUploading(true);
      setMessages((prev) =>
        prev.map((m) =>
          m.client_message_id === msg.client_message_id ? { ...m, status: 'pending' } : m
        )
      );
      try {
        const form = new FormData();
        form.append('file', file, file.name);
        form.append('client_message_id', msg.client_message_id);
        const res = await retryRequest(() =>
          axios.post(`${API}/admin/chat/sessions/${selectedSessionId}/upload`, form, {
            headers: { Authorization: `Bearer ${getToken()}` },
            timeout: 60000,
          })
        );
        const serverMsg = {
          ...res.data.message,
          client_message_id: res.data.message.client_message_id || msg.client_message_id,
        };
        if (msg.image_url?.startsWith('blob:')) URL.revokeObjectURL(msg.image_url);
        pendingFilesRef.current.delete(msg.client_message_id);
        setMessages((prev) => mergeMessages(prev, [serverMsg]));
        if (serverMsg.created_at) lastSinceRef.current = serverMsg.created_at;
        fetchSessions();
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.client_message_id === msg.client_message_id ? { ...m, status: 'failed' } : m
          )
        );
        toast.error(getApiErrorMessage(err, ac.sendFailed, t));
      } finally {
        setUploading(false);
      }
      return;
    }
    if (msg.type !== 'text' || !msg.content?.trim()) {
      toast.error(ac.sendFailed);
      return;
    }
    setSending(true);
    try {
      await sendTextReply(
        msg.content.trim(),
        msg.client_message_id || createClientMessageId(),
        msg.content_original || ''
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, ac.sendFailed, t));
    } finally {
      setSending(false);
    }
  };

  const uploadImageFile = async (file) => {
    if (!file || !selectedSessionId || uploading) return;

    if (!isSupportedImageFile(file)) {
      toast.error(t.chat.imageUnsupported);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(t.chat.imageTooLarge);
      return;
    }

    setUploading(true);
    const clientId = createClientMessageId();
    const localUrl = URL.createObjectURL(file);
    pendingFilesRef.current.set(clientId, file);
    const optimistic = {
      client_message_id: clientId,
      session_id: selectedSessionId,
      sender: 'admin',
      type: 'image',
      content: '',
      image_url: localUrl,
      filename: file.name,
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    setMessages((prev) => mergeMessages(prev, [optimistic]));
    forceScrollToBottomRef.current = true;

    try {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('client_message_id', clientId);
      const res = await retryRequest(() =>
        axios.post(`${API}/admin/chat/sessions/${selectedSessionId}/upload`, form, {
          headers: { Authorization: `Bearer ${getToken()}` },
          timeout: 60000,
        })
      );
      const serverMsg = {
        ...res.data.message,
        client_message_id: res.data.message.client_message_id || clientId,
      };
      pendingFilesRef.current.delete(clientId);
      setMessages((prev) => mergeMessages(prev, [serverMsg]));
      if (serverMsg.created_at) lastSinceRef.current = serverMsg.created_at;
      fetchSessions();
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.client_message_id === clientId ? { ...m, status: 'failed' } : m
        )
      );
      toast.error(getApiErrorMessage(err, ac.sendFailed, t));
      // Keep blob URL + file so failed preview remains retryable
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedSessionId || uploading) return;
    if (!isSupportedImageFile(file)) { toast.error(t.chat.imageUnsupported); return; }
    if (file.size > MAX_IMAGE_SIZE_BYTES) { toast.error(t.chat.imageTooLarge); return; }
    setPreviewImage({ file, previewUrl: URL.createObjectURL(file) });
  };

  const handlePasteImage = (e) => {
    if (pasteLockRef.current || !selectedSessionId || uploading) return;
    const file = extractClipboardImageFile(e.clipboardData);
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    pasteLockRef.current = true;
    if (!isSupportedImageFile(file)) { toast.error(t.chat.imageUnsupported); pasteLockRef.current = false; return; }
    if (file.size > MAX_IMAGE_SIZE_BYTES) { toast.error(t.chat.imageTooLarge); pasteLockRef.current = false; return; }
    setPreviewImage({ file, previewUrl: URL.createObjectURL(file) });
  };

  const handleConfirmImage = () => {
    if (!previewImage) return;
    const file = previewImage.file;
    URL.revokeObjectURL(previewImage.previewUrl);
    setPreviewImage(null);
    pasteLockRef.current = false;
    uploadImageFile(file);
  };

  const handleCancelImage = () => {
    if (!previewImage) return;
    URL.revokeObjectURL(previewImage.previewUrl);
    setPreviewImage(null);
    pasteLockRef.current = false;
  };

  const sessionPresence = (session) => {
    void presenceTick;
    if (session?.blacklisted) return { online: false, label: ac.blocked };
    const online = isSessionVisitorOnline(session);
    return { online, label: online ? ac.online : ac.offline };
  };

  // ── Contacts view ──
  if (view === 'contacts') {
    return (
      <Card className="relative h-full min-h-0 flex flex-col overflow-hidden glass-card border-green-500/20 shadow-xl rounded-none sm:rounded-xl border-0 sm:border">
        <div className="px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            {ac.title}
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">{ac.doubleClickHint}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">{ac.noConversations}</p>
          ) : (
            sessions.map((session) => {
              const presence = sessionPresence(session);
              const unread = Number(session.unread_admin || 0) > 0;
              const active = session.session_id === selectedSessionId;
              const note = (session.admin_note || '').trim();
              return (
                <button
                  key={session.session_id}
                  type="button"
                  onClick={() => handleSelectSession(session)}
                  onDoubleClick={() => handleOpenSessionChat(session)}
                  className={`w-full text-start p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    active ? 'bg-white/10 ring-1 ring-inset ring-green-500/30' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <UnreadDot show={unread} />
                        <span className="text-white font-medium text-sm truncate">
                          {session.visitor_name || ac.guest}
                        </span>
                        {unread && (
                          <Badge className="bg-red-500/80 text-white border-none text-[10px] px-1.5 py-0">
                            {session.unread_admin}
                          </Badge>
                        )}
                        <PresenceDot online={presence.online} label={presence.label} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5 min-w-0">
                        {session.visitor_phone ? (
                          <span className="text-blue-400/80 text-xs font-mono" dir="ltr">
                            {session.visitor_phone}
                          </span>
                        ) : null}
                        {note ? (
                          <span className="text-amber-300/90 text-xs truncate max-w-[12rem]" title={note}>
                            {note}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-gray-500 text-xs truncate mt-1">
                        {session.last_message || ac.noMessages}
                      </p>
                      <p className="text-gray-600 text-[10px] mt-1">
                        {session.visitor_ip} ·{' '}
                        {formatChatTime(session.last_message_at, true, 'zh-CN')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title={ac.noteBtn}
                        onClick={(e) => openNoteEditor(session, e)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/25"
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title={ac.deleteConfirm}
                        onClick={(e) => handleDeleteSession(session.session_id, e)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/25"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title={session.blacklisted ? ac.unblockTitle : ac.blockTitle}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBlacklistByIp(session.visitor_ip, session.blacklisted);
                        }}
                        className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border ${
                          session.blacklisted
                            ? 'bg-orange-500/20 text-orange-200 border-orange-400/30 hover:bg-orange-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/25 hover:bg-rose-500/25'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {noteEditingId ? (
          <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#0a0e1a] p-4 shadow-2xl">
              <p className="text-white text-sm font-medium mb-2">{ac.noteTitle}</p>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder={ac.notePlaceholder}
                className="w-full rounded-md bg-black/40 border border-white/10 text-white text-sm px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500/50 resize-y"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button type="button" variant="ghost" size="sm" onClick={closeNoteEditor} className="text-gray-300">
                  {ac.noteCancel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={noteSaving}
                  onClick={saveNote}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {ac.noteSave}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    );
  }

  // ── Chat room view ──
  if (!selectedSessionId || !selectedSession) {
    return (
      <Card className="h-full min-h-0 flex flex-col items-center justify-center glass-card border-green-500/20 rounded-none sm:rounded-xl border-0 sm:border text-gray-500 text-sm px-6 text-center">
        <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
        {ac.pickContactFirst}
      </Card>
    );
  }

  return (
    <Card className="relative h-full min-h-0 flex flex-col overflow-hidden glass-card border-green-500/20 shadow-xl rounded-none sm:rounded-xl border-0 sm:border">
      <div className="px-4 py-3 border-b border-white/10 bg-black/20 shrink-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-white font-medium text-sm truncate max-w-[10rem] sm:max-w-[14rem]">
            {selectedSession.visitor_name || ac.guest}
          </p>
          <PresenceDot {...sessionPresence(selectedSession)} />
          {selectedSession.visitor_phone ? (
            <span className="text-blue-400/90 text-xs font-mono" dir="ltr">
              {selectedSession.visitor_phone}
            </span>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className={`h-7 text-[11px] px-3 shrink-0 border ${
                provider === 'google'
                  ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400/40'
                  : 'bg-sky-950/40 text-sky-300/80 border-sky-700/40 hover:bg-sky-900/50'
              }`}
              onClick={() => switchProvider('google')}
            >
              {ac.providerGoogle}
            </Button>
            <Button
              type="button"
              size="sm"
              className={`h-7 text-[11px] px-3 shrink-0 border ${
                provider === 'deepseek'
                  ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-400/40'
                  : 'bg-violet-950/40 text-violet-300/80 border-violet-700/40 hover:bg-violet-900/50'
              }`}
              onClick={() => switchProvider('deepseek')}
            >
              {ac.providerDeepseek}
            </Button>
          </div>
          <div className="flex items-center gap-1.5" title={ac.targetLangLabel}>
            {[
              { code: 'he', label: ac.targetHe },
              { code: 'ar', label: ac.targetAr },
              { code: 'en', label: ac.targetEn },
            ].map(({ code, label }) => (
              <Button
                key={code}
                type="button"
                size="sm"
                className={`h-7 text-[11px] px-2.5 shrink-0 border ${
                  targetLang === code
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400/40'
                    : 'bg-amber-950/30 text-amber-200/80 border-amber-800/40 hover:bg-amber-900/40'
                }`}
                onClick={() => switchTargetLang(code)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            className={`h-7 text-[11px] px-2.5 shrink-0 border ${
              historyTranslate
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-600/50 hover:bg-zinc-700/60'
            }`}
            onClick={toggleHistoryTranslate}
            title={ac.historyTranslateHint}
          >
            {historyTranslate ? `${ac.historyTranslate}·开` : `${ac.historyTranslate}·关`}
          </Button>
          {(selectedSession.admin_note || '').trim() ? (
            <button
              type="button"
              onClick={(e) => openNoteEditor(selectedSession, e)}
              className="text-[12px] text-amber-300/95 hover:text-amber-200 truncate max-w-[10rem]"
              title={ac.noteBtn}
            >
              {(selectedSession.admin_note || '').trim()}
            </button>
          ) : null}
          <button
            type="button"
            disabled={genderSaving}
            onClick={toggleSessionGender}
            className={`h-7 px-2.5 rounded-md text-[11px] border shrink-0 ${
              sessionGender(selectedSession) === 'female'
                ? 'bg-pink-600/80 border-pink-400/40 text-white'
                : 'bg-sky-700/80 border-sky-400/40 text-white'
            }`}
            title={ac.genderHint}
          >
            {sessionGender(selectedSession) === 'female' ? ac.genderFemale : ac.genderMale}
          </button>
        </div>
        {translateStatus ? (
          <p className="text-[11px] text-amber-300/90 mt-2">{translateStatus}</p>
        ) : null}
      </div>

      {noteEditingId === selectedSessionId ? (
        <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#0a0e1a] p-4 shadow-2xl">
            <p className="text-white text-sm font-medium mb-2">{ac.noteTitle}</p>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder={ac.notePlaceholder}
              className="w-full rounded-md bg-black/40 border border-white/10 text-white text-sm px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500/50 resize-y"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button type="button" variant="ghost" size="sm" onClick={closeNoteEditor} className="text-gray-300">
                {ac.noteCancel}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={noteSaving}
                onClick={saveNote}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {ac.noteSave}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
        ref={messagesContainerRef}
        data-history-translate={historyTranslate ? 'on' : 'off'}
      >
        {messages.map((msg) => {
          const mid = msg.message_id || msg.client_message_id;
          const isOwn = msg.sender === 'admin';
          // 外文在上、中文在下（关闭历史翻译时只保留原文，含已译缓存也不显示）
          const foreign = msg.content || '';
          let chinese = null;
          let translateFailed = false;
          if (historyTranslate && msg.type !== 'image' && mid) {
            if (msg.content_original) chinese = msg.content_original;
            else if (!msg.message_id) chinese = ac.translatingHint;
            else if (zhCache[msg.message_id] === '') {
              chinese = ac.translationFailedHint;
              translateFailed = true;
            } else if (zhCache[msg.message_id]) chinese = zhCache[msg.message_id];
            else chinese = ac.translatingHint;
            if (chinese && foreign && chinese.trim() === foreign.trim()) {
              chinese = null;
              translateFailed = false;
            }
          }
          return (
            <ChatMessageBubble
              key={mid}
              msg={msg}
              isOwn={isOwn}
              showAdminLayout
              showHistoryTranslate={historyTranslate}
              foreignText={foreign}
              chineseText={historyTranslate ? chinese : null}
              translateFailed={historyTranslate ? translateFailed : false}
              onRetry={msg.status === 'failed' ? () => handleRetryMessage(msg) : undefined}
              onDelete={handleDeleteMessage}
              onRetryTranslate={historyTranslate ? handleRetryTranslate : undefined}
            />
          );
        })}
      </div>

      <div className="p-3 border-t border-white/10 space-y-2 shrink-0" onPaste={handlePasteImage}>
        {/* 发送框在上 */}
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10 text-gray-400 hover:text-white shrink-0"
          >
            <ImagePlus className="w-5 h-5" />
          </Button>
          <textarea
            ref={sendRef}
            value={sendHe}
            onChange={(e) => setSendHe(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleComposerEnter();
              }
            }}
            placeholder={outboundPlaceholder}
            disabled={sending}
            dir="auto"
            rows={2}
            className={composerTextareaClass}
          />
          <Button
            onClick={handleSendReply}
            disabled={!sendHe.trim() || isCjkText(sendHe) || sending}
            size="icon"
            className="h-10 w-10 bg-green-600 hover:bg-green-700 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {/* 中文翻译输入在下 */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={draftRef}
            value={draftZh}
            onChange={(e) => setDraftZh(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleComposerEnter();
              }
            }}
            placeholder={ac.draftPlaceholder}
            disabled={sending || translating}
            rows={2}
            className={composerTextareaClass}
          />
          <Button
            type="button"
            disabled={!draftZh.trim() || translating || sending}
            onClick={handleTranslateDraft}
            className="h-10 shrink-0 bg-amber-600 hover:bg-amber-700 gap-1"
          >
            <Languages className="w-4 h-4" />
            {translating ? ac.translating : ac.translateBtn}
          </Button>
        </div>
      </div>

      <ImageSendPreview
        open={!!previewImage}
        previewUrl={previewImage?.previewUrl || ''}
        filename={previewImage?.file?.name || ''}
        title={ac.imagePreviewTitle}
        confirmLabel={ac.imagePreviewConfirm}
        cancelLabel={ac.imagePreviewCancel}
        onConfirm={handleConfirmImage}
        onCancel={handleCancelImage}
      />
    </Card>
  );
};

export default AdminChat;
