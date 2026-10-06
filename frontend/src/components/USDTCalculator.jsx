import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePublicConfig } from '../contexts/PublicConfigContext';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calculator, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';

const USDTCalculator = () => {
  const { t } = useLanguage();
  const { config } = usePublicConfig();
  const [activeTab, setActiveTab] = useState('buy');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [ilsAmount, setIlsAmount] = useState('');
  const [activeInput, setActiveInput] = useState('usdt');

  const rate = activeTab === 'buy' ? config.buyRate : config.sellRate;

  useEffect(() => {
    if (activeInput === 'usdt') {
      if (!usdtAmount || isNaN(parseFloat(usdtAmount))) {
        setIlsAmount('');
        return;
      }
      setIlsAmount((parseFloat(usdtAmount) * rate).toFixed(2));
    } else if (activeInput === 'ils') {
      if (!ilsAmount || isNaN(parseFloat(ilsAmount))) {
        setUsdtAmount('');
        return;
      }
      setUsdtAmount((parseFloat(ilsAmount) / rate).toFixed(2));
    }
  }, [usdtAmount, ilsAmount, activeInput, rate]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    setUsdtAmount('');
    setIlsAmount('');
    setActiveInput('usdt');
  };

  const handleUsdtChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setActiveInput('usdt');
      setUsdtAmount(value);
    }
  };

  const handleIlsChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setActiveInput('ils');
      setIlsAmount(value);
    }
  };

  const AmountRow = () => (
    <div className="flex items-end gap-2 sm:gap-3">
      <div className="flex-1 min-w-0 space-y-2">
        <label className="text-sm text-gray-300 block">USDT</label>
        <div className="relative">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={usdtAmount}
            onChange={handleUsdtChange}
            onFocus={(e) => e.target.select()}
            className="bg-[#0B0F19] border-white/10 text-white text-lg h-14 pe-14"
          />
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold pointer-events-none">
            USDT
          </span>
        </div>
      </div>

      <div className="flex h-14 items-center shrink-0">
        <div className="p-2 rounded-full bg-[#26A17B]/20 border border-[#26A17B]/40">
          <ArrowLeftRight className="w-5 h-5 text-[#26A17B]" />
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <label className="text-sm text-gray-300 block">ILS</label>
        <div className="relative">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={ilsAmount}
            onChange={handleIlsChange}
            onFocus={(e) => e.target.select()}
            className="bg-[#0B0F19] border-white/10 text-white text-lg h-14 pe-10"
          />
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold pointer-events-none">
            ₪
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <section className="relative py-24 bg-[#0B0F19]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#26A17B]/20 border border-[#26A17B]/30 mb-4">
            <Calculator className="w-8 h-8 text-[#26A17B]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t.calculator.title}
          </h2>
          <p className="text-gray-400 text-lg">
            {t.calculator.subtitle}
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1621] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <Tabs defaultValue="buy" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 bg-[#0B0F19] p-1 mb-6">
              <TabsTrigger
                value="buy"
                className="data-[state=active]:bg-[#26A17B] data-[state=active]:text-white flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                {t.calculator.buy}
              </TabsTrigger>
              <TabsTrigger
                value="sell"
                className="data-[state=active]:bg-[#26A17B] data-[state=active]:text-white flex items-center gap-2"
              >
                <TrendingDown className="w-4 h-4" />
                {t.calculator.sell}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="mt-0">
              <AmountRow />
            </TabsContent>

            <TabsContent value="sell" className="mt-0">
              <AmountRow />
            </TabsContent>
          </Tabs>

          {(usdtAmount || ilsAmount) && (
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center gap-3">
              <span className="text-gray-300 text-base sm:text-lg font-semibold">
                {activeTab === 'buy' ? t.calculator.youPay : t.calculator.youReceive}:
              </span>
              <span className="text-[#26A17B] text-xl sm:text-2xl font-bold shrink-0">
                {ilsAmount || '0.00'} ILS
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default USDTCalculator;
