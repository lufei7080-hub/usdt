import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle2, ArrowDownUp, TrendingUp, Clock } from 'lucide-react';
import TradeModal from './TradeModal';

const Hero = () => {
  const { t } = useLanguage();
  const [floatingIcons, setFloatingIcons] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState('buy');

  useEffect(() => {
    setFloatingIcons([
      { symbol: '₮', color: '#26A17B', size: 50, x: 12, y: 72 },
      { symbol: '₪', color: '#3B82F6', size: 45, x: 82, y: 68 },
      { symbol: '₮', color: '#26A17B', size: 36, x: 88, y: 18 },
      { symbol: '₪', color: '#60A5FA', size: 32, x: 8, y: 22 },
    ]);
  }, []);

  const handleTrade = (type) => {
    setTradeType(type);
    setIsModalOpen(true);
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#06080F] via-[#0F1419] to-[#0a0e1a] pt-16"
    >
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0 animate-[grid-shift_20s_linear_infinite]"
          style={{
            backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(38, 161, 123, 0.12) 1px, transparent 1px)
          `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {floatingIcons.map((icon, index) => (
        <div
          key={index}
          className="absolute animate-pulse opacity-20"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            color: icon.color,
            fontSize: `${icon.size}px`,
            animationDelay: `${index * 0.5}s`,
            animationDuration: `${3 + index}s`,
          }}
        >
          {icon.symbol}
        </div>
      ))}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center flex flex-col">
          <div className="order-1 flex justify-center mb-6">
            <Badge className="glass-card border border-blue-500/30 hover:border-blue-500/60 text-sm px-4 py-2 shadow-lg shadow-blue-500/20">
              <CheckCircle2 className="w-4 h-4 me-2 text-blue-400" />
              <span className="gradient-text font-semibold">{t.hero.badge}</span>
            </Badge>
          </div>

          <div className="order-2 md:order-5 flex flex-col md:flex-row gap-4 md:gap-6 justify-center mb-6 md:mb-10 max-w-4xl mx-auto w-full">
            <div className="flex-1 glass-card border border-green-500/30 rounded-2xl p-6 md:p-8 hover:border-green-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 metal-shine">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <ArrowDownUp className="w-5 h-5 text-green-400" />
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-xl">₪</span>
                </div>
              </div>
              <Button
                onClick={() => handleTrade('buy')}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-green-500/50 transition-all duration-300 h-12"
              >
                {t.hero.buyUSDT}
              </Button>
            </div>

            <div className="flex-1 glass-card border border-blue-500/30 rounded-2xl p-6 md:p-8 hover:border-blue-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 metal-shine">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-xl">₪</span>
                </div>
                <ArrowDownUp className="w-5 h-5 text-blue-400" />
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#26A17B] to-[#1a7a5e] flex items-center justify-center shadow-lg">
                  <span className="text-xl">₮</span>
                </div>
              </div>
              <Button
                onClick={() => handleTrade('sell')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-blue-500/50 transition-all duration-300 h-12"
              >
                {t.hero.sellUSDT}
              </Button>
            </div>
          </div>

          <h1 className="order-3 md:order-2 text-5xl md:text-7xl font-bold text-white mb-6 leading-tight mt-6 md:mt-0">
            <span className="gradient-text">{t.hero.title}</span>
          </h1>

          <h2 className="order-4 md:order-3 text-2xl md:text-3xl font-semibold text-blue-300 mb-4">
            {t.hero.subtitle}
          </h2>

          <p className="order-5 md:order-4 text-gray-400 text-lg md:text-xl mb-6 max-w-3xl mx-auto leading-relaxed">
            {t.hero.description}
          </p>

          <div className="order-6 md:order-6 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-300 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-[#26A17B]" />
              {t.hero.hoursChip}
            </span>
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {t.hero.settleChip}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0e1a] to-transparent" />

      <TradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tradeType={tradeType}
      />
    </section>
  );
};

export default Hero;
