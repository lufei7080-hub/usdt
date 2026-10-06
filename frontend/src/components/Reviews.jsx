import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Banknote, CreditCard, Smartphone, Wallet, Clock, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';

const Reviews = () => {
  const { t } = useLanguage();
  const trust = t.trust || {};

  const methods = [
    { icon: CreditCard, label: trust.methodCardless },
    { icon: Smartphone, label: trust.methodBit },
    { icon: Wallet, label: trust.methodPaybox },
    { icon: Banknote, label: trust.methodCash },
  ];

  const openChat = () => {
    window.dispatchEvent(new CustomEvent('open-chat'));
  };

  return (
    <section id="trust" className="relative py-24 bg-[#0B0F19]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {trust.title}
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            {trust.subtitle}
          </p>
        </div>

        <div className="mb-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 rounded-2xl border border-[#26A17B]/25 bg-[#26A17B]/10 px-6 py-5">
          <div className="flex items-center gap-2 text-[#26A17B]">
            <Clock className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{trust.hoursLabel}</span>
          </div>
          <p className="text-white text-center sm:text-start text-sm sm:text-base">
            {trust.hoursValue}
          </p>
        </div>

        <p className="text-center text-gray-400 text-sm mb-6">{trust.methodsLabel}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {methods.map((m, index) => {
            const Icon = m.icon;
            return (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a2332] to-[#0f1621] p-5 text-center hover:border-[#26A17B]/40 transition-colors"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#26A17B]/15 border border-[#26A17B]/30">
                  <Icon className="w-6 h-6 text-[#26A17B]" />
                </div>
                <p className="text-white font-medium text-sm sm:text-base leading-snug">
                  {m.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto text-center space-y-4">
          <p className="text-gray-300 leading-relaxed">{trust.note}</p>
          <Button
            type="button"
            onClick={openChat}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12 px-8 font-semibold"
          >
            <MessageCircle className="w-4 h-4 me-2" />
            {trust.cta}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
