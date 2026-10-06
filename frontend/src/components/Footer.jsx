import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const openChat = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-chat'));
  };

  return (
    <footer className="relative bg-gradient-to-b from-[#0B0F19] to-[#050810] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
                <span className="text-white font-bold text-xl">₪</span>
              </div>
              <span className="gradient-text font-bold text-xl">{t.footer.brand}</span>
            </div>
            <p className="text-gray-400 mb-4">{t.footer.description}</p>
            <p className="text-sm text-gray-500">{t.footer.hours}</p>
            <p className="text-sm text-gray-500 mt-1">{t.footer.settlement}</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.quickLinksTitle}</h3>
            <div className="flex flex-col gap-2">
              <a href="#home" className="text-gray-400 hover:text-[#26A17B] transition-colors">
                {t.navbar.home}
              </a>
              <a href="#features" className="text-gray-400 hover:text-[#26A17B] transition-colors">
                {t.navbar.features}
              </a>
              <a href="#how-it-works" className="text-gray-400 hover:text-[#26A17B] transition-colors">
                {t.navbar.howItWorks}
              </a>
              <a href="#trust" className="text-gray-400 hover:text-[#26A17B] transition-colors">
                {t.navbar.trust}
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.legalTitle}</h3>
            <div className="flex flex-col gap-2">
              <Link to="/terms" className="text-gray-400 hover:text-[#26A17B] transition-colors">
                {t.footer.terms}
              </Link>
              <Link to="/privacy" className="text-gray-400 hover:text-[#26A17B] transition-colors">
                {t.footer.privacy}
              </Link>
              <a href="#chat" onClick={openChat} className="text-gray-400 hover:text-[#26A17B] transition-colors">
                {t.footer.contact}
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center text-gray-500">
          <p>
            © {currentYear} {t.footer.brand}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
