import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Shield, MessageSquare, Lock, BadgeCheck } from 'lucide-react';
import { Badge } from './ui/badge';

const Security = () => {
  const { t } = useLanguage();

  const securityFeatures = [
    {
      icon: MessageSquare,
      title: t.security.item1Title,
      desc: t.security.item1Desc,
      color: '#10B981',
    },
    {
      icon: Lock,
      title: t.security.item2Title,
      desc: t.security.item2Desc,
      color: '#3B82F6',
    },
    {
      icon: BadgeCheck,
      title: t.security.item3Title,
      desc: t.security.item3Desc,
      color: '#8B5CF6',
    },
    {
      icon: Shield,
      title: t.security.item4Title,
      desc: t.security.item4Desc,
      color: '#F59E0B',
    },
  ];

  return (
    <section id="security" className="relative py-24 bg-gradient-to-b from-[#0f1621] to-[#0B0F19]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-[#26A17B]/20 text-[#26A17B] border border-[#26A17B]/30 hover:bg-[#26A17B]/30 text-sm px-4 py-2">
            <Shield className="w-4 h-4 me-2" />
            {t.security.badge}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t.security.title}
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            {t.security.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-[#1a2332] to-[#0f1621] border border-white/10 rounded-2xl p-6 text-center hover:border-[#26A17B]/50 transition-all duration-300"
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    backgroundColor: `${feature.color}20`,
                    border: `1px solid ${feature.color}40`,
                  }}
                >
                  <Icon className="w-8 h-8" style={{ color: feature.color }} />
                </div>
                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 max-w-3xl mx-auto space-y-4">
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.03]">
            <p className="text-gray-300 text-center text-sm sm:text-base leading-relaxed">
              {t.notice.risk}
            </p>
          </div>
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-5">
            <p className="text-orange-300 text-center text-sm sm:text-base leading-relaxed">
              {t.notice.kyc}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Security;
