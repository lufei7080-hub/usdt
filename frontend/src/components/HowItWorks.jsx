import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRight, Wallet, CheckCircle, Coins } from 'lucide-react';

const HowItWorks = () => {
  const { t, isRTL } = useLanguage();

  const steps = [
    {
      icon: Wallet,
      title: t.howItWorks.step1Title,
      description: t.howItWorks.step1Desc,
      color: '#3B82F6'
    },
    {
      icon: CheckCircle,
      title: t.howItWorks.step2Title,
      description: t.howItWorks.step2Desc,
      color: '#8B5CF6'
    },
    {
      icon: Coins,
      title: t.howItWorks.step3Title,
      description: t.howItWorks.step3Desc,
      color: '#26A17B'
    }
  ];

  return (
    <section id="how-it-works" className="relative py-24 bg-gradient-to-b from-[#0B0F19] to-[#0f1621]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t.howItWorks.title}
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            {t.howItWorks.subtitle}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Step Card */}
                  <div className="relative bg-gradient-to-br from-[#1a2332] to-[#0f1621] border border-white/10 rounded-2xl p-8 hover:border-[#26A17B]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#26A17B]/10">
                    {/* Step Number */}
                    <div className="absolute -top-4 start-8">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                        style={{ backgroundColor: step.color }}
                      >
                        {index + 1}
                      </div>
                    </div>

                    {/* Icon */}
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 mt-4"
                      style={{ 
                        backgroundColor: `${step.color}20`,
                        border: `1px solid ${step.color}40`
                      }}
                    >
                      <Icon className="w-8 h-8" style={{ color: step.color }} />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow Between Steps (Desktop Only) */}
                  {index < steps.length - 1 && (
                    <div className={`hidden md:block absolute top-1/2 ${isRTL ? 'start-full -ms-4' : 'end-full -me-4'} transform -translate-y-1/2 ${isRTL ? 'rotate-180' : ''}`}>
                      <ArrowRight className="w-8 h-8 text-[#26A17B]/50" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;