import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { resolveApiError } from '../utils/apiErrors';
import { adminZh } from '../i18n/adminZh';
import AdminPanel from '../pages/AdminPanel';

export default function AdminOrNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState('checking');
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect to home when path is not admin — must be in effect, not during render
  useEffect(() => {
    if (status === 'not-found') {
      navigate('/', { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => {
    const checkPath = async () => {
      setStatus('checking');
      setErrorMsg('');
      try {
        const res = await axios.post('/api/admin/check-path', { path: location.pathname });
        if (res.data.is_admin) {
          setStatus('admin');
        } else {
          setStatus('not-found');
        }
      } catch (e) {
        const detail = e.response?.data?.detail;
        if (typeof detail === 'string') {
          setErrorMsg(resolveApiError(detail, t, adminZh.errors.verifyFailed));
        } else if (!e.response) {
          setErrorMsg(adminZh.errors.serverUnreachable);
        } else {
          setErrorMsg(adminZh.errors.verifyFailed);
        }
        setStatus('error');
      }
    };
    checkPath();
  }, [location.pathname, t]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center text-white" dir="ltr">
        {adminZh.loading}
      </div>
    );
  }

  if (status === 'admin') {
    return (
      <>
        <AdminPanel />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (status === 'error') {
    return (
      <div
        className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center text-white px-4 gap-4"
        dir="ltr"
      >
        <p className="text-red-400 text-center">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          {adminZh.retry}
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          {adminZh.backHome}
        </button>
      </div>
    );
  }

  return null;
}
