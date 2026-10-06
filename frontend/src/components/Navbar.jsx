import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supportedLanguages } from '../i18n/translations';
import { Menu, X, Globe, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Navbar = () => {
  const { t, currentLanguage, changeLanguage, isRTL } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  const openChat = () => {
    setIsMobileMenuOpen(false);
    window.dispatchEvent(new CustomEvent('open-chat'));
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass-card border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/50 animate-glow">
              <span className="text-white font-bold text-xl">₪</span>
            </div>
            <span className="gradient-text font-bold text-xl">{t.navbar.brand}</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('home')} className="text-gray-300 hover:text-blue-400 transition-all duration-300 font-medium">
              {t.navbar.home}
            </button>
            <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-blue-400 transition-all duration-300 font-medium">
              {t.navbar.features}
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-blue-400 transition-all duration-300 font-medium">
              {t.navbar.howItWorks}
            </button>
            <button onClick={() => scrollToSection('security')} className="text-gray-300 hover:text-blue-400 transition-all duration-300 font-medium">
              {t.navbar.security}
            </button>
            <button onClick={() => scrollToSection('trust')} className="text-gray-300 hover:text-blue-400 transition-all duration-300 font-medium">
              {t.navbar.trust}
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              size="sm"
              onClick={openChat}
              className="hidden sm:inline-flex bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              <MessageCircle className="w-4 h-4 me-1.5" />
              {t.navbar.contact}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-white/10">
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {supportedLanguages.find((l) => l.code === currentLanguage)?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="glass-card border-white/10 z-50">
                {supportedLanguages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`cursor-pointer text-gray-300 hover:text-white hover:bg-white/10 ${currentLanguage === lang.code ? 'bg-white/10 gradient-text' : ''}`}
                  >
                    <span className="me-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              className="md:hidden text-gray-300 hover:text-white z-50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="md:hidden absolute top-16 left-0 w-full glass-card border-b border-white/10 py-4 shadow-2xl z-50">
            <div className="flex flex-col gap-2 max-w-7xl mx-auto px-6">
              <button onClick={() => scrollToSection('home')} className="text-gray-300 hover:text-blue-400 transition-colors text-start font-medium py-2">
                {t.navbar.home}
              </button>
              <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-blue-400 transition-colors text-start font-medium py-2">
                {t.navbar.features}
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-blue-400 transition-colors text-start font-medium py-2">
                {t.navbar.howItWorks}
              </button>
              <button onClick={() => scrollToSection('security')} className="text-gray-300 hover:text-blue-400 transition-colors text-start font-medium py-2">
                {t.navbar.security}
              </button>
              <button onClick={() => scrollToSection('trust')} className="text-gray-300 hover:text-blue-400 transition-colors text-start font-medium py-2">
                {t.navbar.trust}
              </button>
              <button onClick={openChat} className="text-blue-300 hover:text-blue-200 transition-colors text-start font-medium py-2">
                {t.navbar.contact}
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
