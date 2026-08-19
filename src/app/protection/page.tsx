'use client'

import { useState } from 'react'
import { useTradingStore } from '@/store/trading-store'
import { Card, CardContent } from '@/components/ui/card'
import {
  Shield, Bot, Coins, Zap, TrendingUp, History,
  Wallet, Gift, CheckCircle2, AlertTriangle, BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'

type Tab = 'overview' | 'funds' | 'history' | 'how'

export default function ProtectionPage() {
  const { alfaCoins, toggleProtection, setProtectionThreshold } = useTradingStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [showAllHistory, setShowAllHistory] = useState(false)

  return (
    <div className="min-h-screen bg-[#272E4A] p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BackButton href="/trading" label="التداول" />
          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F5]">Alfa Coins</h1>
            <p className="text-[10px] text-[#A9B5CB]">صناديق حماية من الخسارة</p>
          </div>
          <div className="mr-auto text-left">
            <p className="text-2xl font-black text-[#FFD700]">{alfaCoins.totalCoins}</p>
            <p className="text-[8px] text-[#A9B5CB]">α كوين</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#222940] rounded-lg p-1">
          {([
            { id: 'overview' as Tab, l: 'الرئيسية', i: Wallet },
            { id: 'funds' as Tab, l: 'الصناديق', i: Shield },
            { id: 'history' as Tab, l: 'السجل', i: BarChart3 },
            { id: 'how' as Tab, l: 'كيف؟', i: Bot },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${tab === t.id ? 'bg-[#FFD700] text-[#1A1F2E] shadow-md' : 'text-[#A9B5CB] hover:text-[#F5F5F5]'}`}>
              <t.i className="w-3.5 h-3.5" />{t.l}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && <div className="space-y-3">
          {/* Main Balance */}
          <Card className="border-[#FFD700]/30 bg-gradient-to-br from-[#2D3651] to-[#222940]">
            <CardContent className="p-5">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center mx-auto mb-2">
                  <Coins className="w-8 h-8 text-[#FFD700]" />
                </div>
                <p className="text-4xl font-black text-[#FFD700]">{alfaCoins.totalCoins}</p>
                <p className="text-sm text-[#A9B5CB]">Alfa Coin</p>
                <p className="text-xs text-[#57BC9A] font-bold mt-1">= ${(alfaCoins.totalCoins * 0.10).toFixed(2)} حماية</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#20283D] rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-[#F5F5F5]">{alfaCoins.totalTradesCount}</p>
                  <p className="text-[8px] text-[#A9B5CB]">صفقات</p>
                </div>
                <div className="bg-[#20283D] rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-[#FFD700]">{alfaCoins.protectionFunds.length}</p>
                  <p className="text-[8px] text-[#A9B5CB]">صناديق</p>
                </div>
                <div className="bg-[#20283D] rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-[#57BC9A]">{alfaCoins.protectionEnabled ? '🟢' : '🔴'}</p>
                  <p className="text-[8px] text-[#A9B5CB]">الحماية</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress to next reward */}
          <Card className="border-[#3A4568] bg-[#2D3651]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#F5F5F5]">التقدم نحو صندوق جديد</span>
                <span className="text-xs font-bold text-[#FFD700]">{alfaCoins.tradesSinceLastReward}/100</span>
              </div>
              <div className="h-3 bg-[#20283D] rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full transition-all" style={{ width: `${Math.min(100, (alfaCoins.tradesSinceLastReward / 100) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-[#A9B5CB] text-center">
                أكمل {100 - alfaCoins.tradesSinceLastReward} صفقة إضافية لكسب 100 α
              </p>
            </CardContent>
          </Card>

          {/* Protection toggle */}
          <Card className="border-[#3A4568] bg-[#2D3651]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#57BC9A]" />
                  <span className="text-xs font-bold text-[#F5F5F5]">الحماية التلقائية</span>
                </div>
                <button
                  onClick={() => toggleProtection(!alfaCoins.protectionEnabled)}
                  className={`w-10 h-5 rounded-full transition-all ${alfaCoins.protectionEnabled ? 'bg-[#57BC9A]' : 'bg-[#3A4568]'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${alfaCoins.protectionEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="space-y-1 text-[10px] text-[#A9B5CB]">
                <p>• عند خسارة صفقة → Alfa Coins تعوضك تلقائياً</p>
                <p>• كل 1 α = $0.10 تعويض من الخسارة</p>
                <p>• الحماية تحمي حتى {alfaCoins.protectionThreshold}% من الخسارة</p>
              </div>
            </CardContent>
          </Card>
        </div>}

        {/* FUNDS */}
        {tab === 'funds' && <div className="space-y-3">
          {alfaCoins.protectionFunds.length === 0 ? (
            <Card className="border-[#3A4568] bg-[#2D3651]">
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 text-[#3A4568] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#F5F5F5] mb-1">مفيش صناديق حماية بعد</h3>
                <p className="text-xs text-[#A9B5CB] mb-3">كل 100 صفقة على البوت تكسب صندوق حماية 100 α</p>
                <p className="text-[10px] text-[#FFD700] font-bold">الصفقات الحالية: {alfaCoins.totalTradesCount}/100</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-xs text-[#A9B5CB] text-center">{alfaCoins.protectionFunds.length} صندوق حماية — إجمالي {alfaCoins.protectionFunds.reduce((sum, f) => sum + f.remaining, 0)} α متبقي</p>
              {alfaCoins.protectionFunds.map(fund => (
                <Card key={fund.id} className="border-[#3A4568] bg-[#2D3651]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-[#FFD700]" />
                        <div>
                          <p className="text-sm font-bold text-[#F5F5F5]">صندوق حماية {fund.coins} α</p>
                          <p className="text-[9px] text-[#A9B5CB]">كسب عند صفقة #{fund.earnedAtTrade} • {new Date(fund.timestamp).toLocaleDateString('ar')}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${fund.remaining > 0 ? 'bg-[#57BC9A]/10 text-[#57BC9A]' : 'bg-[#3A4568]/50 text-[#3A4568]'}`}>
                        {fund.remaining > 0 ? `${fund.remaining} α متبقي` : 'مستخدم'}
                      </span>
                    </div>
                    <div className="h-2 bg-[#20283D] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full" style={{ width: `${(fund.remaining / fund.coins) * 100}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] text-[#A9B5CB]">
                      <span>متبقي: ${((fund.remaining) * 0.10).toFixed(2)}</span>
                      <span>مستخدم: ${((fund.coins - fund.remaining) * 0.10).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>}

        {/* HISTORY */}
        {tab === 'history' && <div className="space-y-2">
          {alfaCoins.transactions.length === 0 ? (
            <Card className="border-[#3A4568] bg-[#2D3651]">
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-10 h-10 text-[#3A4568] mx-auto mb-2" />
                <p className="text-xs text-[#A9B5CB]">مفيش معاملات بعد</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(showAllHistory ? alfaCoins.transactions : alfaCoins.transactions.slice(0, 10)).map((tx) => (
                <div key={tx.id} className="bg-[#2D3651] rounded-lg p-3 border border-[#3A4568]">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tx.type === 'earned' ? 'bg-[#57BC9A]/10 text-[#57BC9A]' :
                      tx.type === 'protection_used' ? 'bg-[#D0011B]/10 text-[#D0011B]' :
                      tx.type === 'bonus' ? 'bg-[#FFD700]/10 text-[#FFD700]' :
                      'bg-[#A9B5CB]/10 text-[#A9B5CB]'
                    }`}>
                      {tx.type === 'earned' ? 'كسب' : tx.type === 'protection_used' ? 'حماية' : tx.type === 'bonus' ? 'مكافأة' : tx.type}
                    </span>
                    <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount} α
                    </span>
                  </div>
                  <p className="text-[10px] text-[#A9B5CB]">{tx.description}</p>
                  <p className="text-[8px] text-[#3A4568] mt-1">{new Date(tx.timestamp).toLocaleString('ar')}</p>
                </div>
              ))}
              {alfaCoins.transactions.length > 10 && (
                <Button onClick={() => setShowAllHistory(!showAllHistory)} variant="ghost" className="w-full text-[#A9B5CB] text-xs">
                  {showAllHistory ? 'عرض أقل' : `عرض الكل (${alfaCoins.transactions.length})`}
                </Button>
              )}
            </>
          )}
        </div>}

        {/* HOW IT WORKS */}
        {tab === 'how' && <div className="space-y-3">
          <Card className="border-[#FFD700]/30 bg-[#2D3651]">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-[#F5F5F5] mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#FFD700]" />
                نظام Alfa Coins للحماية
              </h3>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'تداول على البوت', text: 'كل صفقة تعملها على البوت — يدوية أو آلية — تحسب في عداد المكافآت. سواء ربحت أو خسرت، الصفقة تحسب!', color: '#2F96F0', icon: '📊' },
                  { step: '2', title: 'كل 100 صفقة = صندوق حماية', text: 'لما توصل لـ 100 صفقة، تكسب صندوق حماية فيه 100 Alfa Coin. وكل 100 صفقة بعد كده تكسب صندوق جديد!', color: '#57BC9A', icon: '🎁' },
                  { step: '3', title: 'Alfa Coins تحميك تلقائياً', text: 'لو خسرت صفقة، نظام الحماية يستخدم Alfa Coins عشان يعوضك جزء من الخسارة تلقائياً. كل 1 α = $0.10 تعويض.', color: '#FFD700', icon: '🛡️' },
                  { step: '4', title: 'كل ما تتداول أكتر → حماية أكتر', text: 'النظام مكافئك على التداول! كل ما تشتغل أكتر على البوت، تكسب أكتر صناديق حماية، يعني حماية أكبر لرصيدك.', color: '#2F96F0', icon: '🚀' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#20283D] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                          خطوة {item.step}
                        </span>
                        <p className="text-xs font-bold text-[#F5F5F5] mt-0.5">{item.title}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#A9B5CB] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Example */}
          <Card className="border-[#3A4568] bg-[#2D3651]">
            <CardContent className="p-4">
              <h3 className="text-xs font-bold text-[#F5F5F5] mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#57BC9A]" />
                مثال عملي
              </h3>
              <div className="space-y-1.5 text-[10px] text-[#A9B5CB]">
                <p>• عملت 100 صفقة على البوت → كسبت صندوق 100 α</p>
                <p>• خسرت صفقة $20 → الحماية تعوضك $10 (50%)</p>
                <p>• استخدمت 100 α من الصندوق → تبقى حماية $0</p>
                <p>• عملت 100 صفقة تانية → كسبت صندوق جديد!</p>
                <p>• كل ما تتداول → كل ما تكسب حماية أكتر!</p>
              </div>
            </CardContent>
          </Card>
        </div>}
      </div>
    </div>
  )
}
