import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Banknote, MessageCircle, Clock, ShieldCheck } from 'lucide-react';

const Features = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Banknote,
      title: t.features.feature1Title,
      description: t.features.feature1Desc,
      color: '#26A17B',
    },
    {
      icon: MessageCircle,
      title: t.features.feature2Title,
      description: t.features.feature2Desc,
      color: '#3B82F6',
    },
    {
      icon: Clock,
      title: t.features.feature3Title,
      description: t.features.feature3Desc,
      color: '#F59E0B',
    },
    {
      icon: ShieldCheck,
      title: t.features.feature4Title,
      description: t.features.feature4Desc,
      color: '#10B981',
    },
  ];

  return (
    <section id="features" className="relative py-24 bg-[#0B0F19]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t.features.title}
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            {t.features.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group bg-gradient-to-br from-[#1a2332] to-[#0f1621] border border-white/10 rounded-2xl p-8 hover:border-[#26A17B]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#26A17B]/10 hover:-translate-y-1"
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300"
                  style={{
                    backgroundColor: `${feature.color}20`,
                    border: `1px solid ${feature.color}40`,
                  }}
                >
                  <Icon className="w-8 h-8" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
