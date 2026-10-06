import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { PublicConfigProvider, usePublicConfig } from './contexts/PublicConfigContext';
import { Toaster, toast } from 'sonner';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Security from './components/Security';
import Reviews from './components/Reviews';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import AdminOrNotFound from './components/AdminOrNotFound';
import LegalPage from './pages/LegalPage';
import axios from 'axios';

const HomePage = () => (
  <>
    <Hero />
    <Features />
    <HowItWorks />
    <Security />
    <Reviews />
  </>
);

const MainLayout = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-b from-[#06080F] via-[#0F1419] to-[#0a0e1a] text-white">
    <Navbar />
    {children}
    <Footer />
    <ChatWidget />
    <Toaster position="top-center" richColors />
  </div>
);

const isHomePath = (path) => path === '/' || path === '';

const AccessLoading = () => (
  <div className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center px-6 text-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
  </div>
);

const RegionBlocked = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-white text-lg mb-2">{t.errors.accessDeniedRegion}</p>
      <a href="/" className="text-blue-400 hover:underline text-sm">{t.admin.retry}</a>
    </div>
  );
};

const AppRoutes = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { loading: configLoading, regionBlocked } = usePublicConfig();
  const [accessState, setAccessState] = useState(() =>
    isHomePath(location.pathname) ? 'checking' : 'allowed'
  );

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          const reqUrl = error.config?.url || '';
          const detail = error.response?.data?.detail;
          const onAdminPage = !isHomePath(window.location.pathname);
          if (reqUrl.includes('/api/admin/') || onAdminPage) {
            return Promise.reject(error);
          }
          if (reqUrl.includes('/api/chat/')) {
            return Promise.reject(error);
          }
          if (detail === 'ACCESS_DENIED_REGION') {
            setAccessState('blocked');
            toast.error(t.errors.accessDeniedRegion);
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [t]);

  useEffect(() => {
    if (!isHomePath(location.pathname)) {
      setAccessState('allowed');
      return;
    }
    if (configLoading) {
      setAccessState('checking');
      return;
    }
    setAccessState(regionBlocked ? 'blocked' : 'allowed');
  }, [location.pathname, configLoading, regionBlocked]);

  if (accessState === 'blocked') {
    return <RegionBlocked />;
  }

  if (accessState === 'checking') {
    return <AccessLoading />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MainLayout>
            <HomePage />
          </MainLayout>
        }
      />
      <Route
        path="/terms"
        element={
          <MainLayout>
            <LegalPage type="terms" />
          </MainLayout>
        }
      />
      <Route
        path="/privacy"
        element={
          <MainLayout>
            <LegalPage type="privacy" />
          </MainLayout>
        }
      />
      <Route path="*" element={<AdminOrNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <LanguageProvider>
      <PublicConfigProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PublicConfigProvider>
    </LanguageProvider>
  );
}

export default App;
