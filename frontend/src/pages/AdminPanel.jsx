import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeftRight,
  Save,
  RefreshCw,
  Link as LinkIcon,
  KeyRound,
  Shield,
  Trash2,
  Plus,
  LogOut,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';
import AdminChat from '../components/AdminChat';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/chatHelpers';
import { resolveApiSuccess } from '../utils/apiErrors';
import { setFaviconUnreadBadge, setAdminDocumentTitle } from '../utils/faviconBadge';
import { adminZh } from '../i18n/adminZh';
import { useLanguage } from '../contexts/LanguageContext';

const API = '/api';

const AdminPanel = () => {
  const { t } = useLanguage(); // for API error code mapping
  const at = adminZh;
  const att = adminZh.toast;
  const al = adminZh.login;
  const s = adminZh.settings;
  const tabs = adminZh.tabs;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('contacts');
  const [chatUnread, setChatUnread] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [config, setConfig] = useState({
    adminPath: '',
    adminPassword: '',
    passwordSet: false,
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [whitelist, setWhitelist] = useState([]);
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    // 管理后台固定 LTR + 中文阅读方向
    const prevDir = document.documentElement.getAttribute('dir');
    const prevLang = document.documentElement.getAttribute('lang');
    const prevTitle = document.title;
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'zh-CN');
    return () => {
      if (prevDir) document.documentElement.setAttribute('dir', prevDir);
      if (prevLang) document.documentElement.setAttribute('lang', prevLang);
      document.title = prevTitle;
      setFaviconUnreadBadge(false);
    };
  }, []);

  // Browser tab favicon red dot + title badge when there are unread chats
  useEffect(() => {
    if (!isAuthenticated) {
      setFaviconUnreadBadge(false);
      return undefined;
    }
    const hasUnread = chatUnread > 0;
    setFaviconUnreadBadge(hasUnread);
    setAdminDocumentTitle(chatUnread, at.panelTitle);
    return undefined;
  }, [isAuthenticated, chatUnread, at.panelTitle]);

  const clearSession = useCallback(() => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setChatUnread(0);
    setFaviconUnreadBadge(false);
  }, []);

  const onUnreadChange = useCallback((n) => {
    setChatUnread(Number(n) || 0);
  }, []);

  const onSelectSession = useCallback((session) => {
    setSelectedSessionId(session?.session_id || null);
  }, []);

  const onOpenChat = useCallback(() => {
    setActiveTab('chat');
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`${API}/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setConfig({
          ...response.data,
          adminPassword: '',
        });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        clearSession();
        toast.error(att.sessionExpired, { description: att.sessionExpiredDesc });
      }
    }
  }, [att.sessionExpired, att.sessionExpiredDesc, clearSession]);

  const fetchWhitelist = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.get(`${API}/admin/whitelist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWhitelist(res.data.whitelist);
    } catch (error) {
      if (error.response?.status === 401) clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        await axios.get(`${API}/admin/config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsAuthenticated(true);
      } catch {
        clearSession();
      } finally {
        setAuthChecking(false);
      }
    };
    validateToken();
  }, [clearSession]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfig();
      fetchWhitelist();
    }
  }, [isAuthenticated, fetchConfig, fetchWhitelist]);

  const handleSave = async () => {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    try {
      const payload = {
        adminPath: config.adminPath,
        adminPassword: (config.adminPassword || '').trim(),
      };
      const res = await axios.post(`${API}/admin/config`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(resolveApiSuccess(res.data?.message, t, att.settingsSaved), {
        description: att.settingsSavedDesc,
      });
      setConfig((prev) => ({ ...prev, adminPassword: '', passwordSet: true }));

      if (
        window.location.pathname.replace(/\/+$/, '').toLowerCase() !==
        String(config.adminPath || '')
          .replace(/\/+$/, '')
          .toLowerCase()
      ) {
        toast.info(att.urlChanged);
        setTimeout(() => {
          window.location.href = config.adminPath;
        }, 2000);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        clearSession();
        toast.error(att.sessionExpired, { description: att.sessionExpiredDesc });
      } else {
        toast.error(att.saveFailed, {
          description: getApiErrorMessage(error, att.connectionError, t),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddIp = async () => {
    if (!newIp.trim()) return;
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.post(
        `${API}/admin/whitelist`,
        { ip: newIp.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(resolveApiSuccess(res.data?.message, t, att.ipAdded));
      setNewIp('');
      fetchWhitelist();
    } catch (e) {
      if (e.response?.status === 401) {
        clearSession();
        return;
      }
      toast.error(getApiErrorMessage(e, att.ipAddFailed, t));
    }
  };

  const handleDeleteIp = async (ip) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.delete(`${API}/admin/whitelist/${ip}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(resolveApiSuccess(res.data?.message, t, att.ipRemoved));
      fetchWhitelist();
    } catch (e) {
      if (e.response?.status === 401) {
        clearSession();
        return;
      }
      toast.error(getApiErrorMessage(e, att.ipRemoveFailed, t));
    }
  };

  const handleInputChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  const handleLogin = async (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/login`, { password });
      localStorage.setItem('admin_token', response.data.token);
      setIsAuthenticated(true);
      toast.success(al.welcome, { description: al.welcomeDesc });
    } catch (error) {
      toast.error(al.failed, {
        description: getApiErrorMessage(error, t.errors.invalidAccessKey, t),
      });
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center text-gray-400">
        {at.loading}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#06080F] via-[#0a0e1a] to-[#0F1419] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm p-8 glass-card rounded-2xl border border-white/10 shadow-2xl relative">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <KeyRound className="w-7 h-7 text-white" />
            </div>
          </div>
          <input
            type="password"
            value={password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
            className="w-full bg-[#0a0e1a]/80 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-4 text-center text-white text-xl tracking-[0.2em] outline-none transition-all duration-300 placeholder:tracking-normal placeholder:text-gray-600 disabled:opacity-50"
            placeholder={loading ? al.verifying : al.placeholder}
            autoFocus
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-br from-[#06080F] via-[#0a0e1a] to-[#0F1419]" dir="ltr" lang="zh-CN">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0"
      >
        <header className="shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-md px-3 sm:px-4 py-2.5">
          <div className="max-w-6xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex items-center gap-2 min-w-0 justify-self-start">
              <span className="relative shrink-0 inline-flex" aria-hidden>
                <Shield className="w-5 h-5 text-yellow-400" />
                {chatUnread > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.85)]" />
                )}
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white truncate leading-tight">
                {at.panelTitle}
              </h1>
            </div>

            <TabsList className="bg-white/5 border border-white/10 h-9 p-0.5 justify-self-center">
              <TabsTrigger
                value="contacts"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 px-2.5 sm:px-3 gap-1.5 relative"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{tabs.contacts}</span>
                {chatUnread > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.85)]" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 px-2.5 sm:px-3 gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{tabs.chat}</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 px-2.5 sm:px-3 gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{tabs.settings}</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 justify-self-end">
              <Button
                onClick={() =>
                  setActiveTab((prev) => (prev === 'chat' ? 'contacts' : 'chat'))
                }
                variant="ghost"
                size="sm"
                title={
                  activeTab === 'chat'
                    ? `切换到${tabs.contacts}`
                    : `切换到${tabs.chat}`
                }
                className="text-gray-300 hover:text-white hover:bg-white/10 shrink-0 gap-1 hidden sm:inline-flex"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-white/15 text-gray-300 hover:text-white hover:bg-white/10 shrink-0 h-9"
              >
                <LogOut className="w-4 h-4 sm:me-1.5" />
                <span className="hidden sm:inline">{s.logout}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Single chat host — keeps session polling for unread red-dot on Settings too */}
        <div
          className={`flex-1 min-h-0 max-w-6xl mx-auto w-full px-0 sm:px-4 sm:py-3 ${
            activeTab === 'settings' ? 'hidden' : ''
          }`}
        >
          <AdminChat
            view={activeTab === 'chat' ? 'chat' : 'contacts'}
            selectedSessionId={selectedSessionId}
            onSelectSession={onSelectSession}
            onOpenChat={onOpenChat}
            onUnreadChange={onUnreadChange}
          />
        </div>

        <TabsContent
          value="settings"
          className="flex-1 min-h-0 mt-0 overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
        >
          <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 pb-10 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Card className="glass-card p-5 md:p-6 border-red-500/20 shadow-xl shadow-red-500/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center border-b border-white/10 pb-3">
                  <KeyRound className="w-5 h-5 me-2 text-red-400" /> {s.securityTitle}
                </h2>
                <div className="space-y-5">
                  <div>
                    <Label
                      htmlFor="adminPath"
                      className="text-gray-200 text-sm font-semibold mb-2 flex items-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4 text-gray-400" /> {s.adminPathLabel}
                    </Label>
                    <Input
                      id="adminPath"
                      type="text"
                      value={config.adminPath}
                      onChange={(e) => handleInputChange('adminPath', e.target.value)}
                      className="bg-[#0a0e1a]/80 border-red-500/30 focus:border-red-500 text-white h-11"
                      placeholder={s.adminPathPlaceholder}
                    />
                    <p className="text-xs text-red-400 mt-2">* {s.adminPathHint}</p>
                  </div>

                  <div>
                    <Label
                      htmlFor="adminPassword"
                      className="text-gray-200 text-sm font-semibold mb-2 flex items-center gap-2"
                    >
                      <KeyRound className="w-4 h-4 text-gray-400" /> {s.adminPasswordLabel}
                    </Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={config.adminPassword}
                      onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                      className="bg-[#0a0e1a]/80 border-red-500/30 focus:border-red-500 text-white h-11"
                      placeholder={config.passwordSet ? att.passwordKeepHint : s.adminPasswordPlaceholder}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {config.passwordSet ? s.passwordSet : s.passwordNotSet}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="glass-card p-5 md:p-6 border-yellow-500/20 shadow-xl shadow-yellow-500/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center border-b border-white/10 pb-3">
                  <Shield className="w-5 h-5 me-2 text-yellow-400" /> {s.whitelistTitle}
                </h2>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      placeholder={s.whitelistPlaceholder}
                      className="bg-[#0a0e1a]/80 border-yellow-500/30 focus:border-yellow-500 text-white flex-1 h-11"
                    />
                    <Button
                      onClick={handleAddIp}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white h-11 px-6 w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 me-1" /> {s.addIp}
                    </Button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 pe-1">
                    {whitelist.length === 0 ? (
                      <div className="text-center text-gray-500 py-4 text-sm">{s.whitelistEmpty}</div>
                    ) : (
                      whitelist.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5"
                        >
                          <div>
                            <span className="text-white font-mono text-sm tracking-wider">{item.ip}</span>
                            {item.auto_added && (
                              <Badge className="ms-2 bg-blue-500/20 text-blue-400 border-none hover:bg-blue-500/20">
                                {s.autoBadge}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            size="sm"
                            onClick={() => handleDeleteIp(item.ip)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 text-white h-12 text-base font-semibold shadow-xl rounded-xl"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 me-2 animate-spin" /> {s.saving}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 me-2" /> {s.saveAll}
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
