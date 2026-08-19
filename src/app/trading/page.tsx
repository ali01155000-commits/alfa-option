'use client'

import { useTradingSocket } from '@/hooks/use-trading-socket'
import { useTradingStore } from '@/store/trading-store'
import { PriceTicker } from '@/components/trading/price-ticker'
import { TradingChart } from '@/components/trading/trading-chart'
import { TradingPanel } from '@/components/trading/trading-panel'
import { AutoBotPanel } from '@/components/trading/auto-bot-panel'
import { TradeHistory } from '@/components/trading/trade-history'
import { StatsHeader } from '@/components/trading/stats-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  Bot,
  History,
  Settings,
  Wifi,
  WifiOff,
  CandlestickChart,
  TrendingUp,
  LogOut,
  Shield,
  Coins,
  Fingerprint,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { checkDeviceAuthorization, getDeviceId, getBoundAccount } from '@/lib/device-fingerprint'

export default function TradingPlatform() {
  const router = useRouter()
  const { emit } = useTradingSocket()
  const {
    isConnected,
    selectedPair,
    prices,
    activeView,
    setActiveView,
    chartType,
    setChartType,
    eoConnection,
    eoLogout,
    alfaCoins,
  } = useTradingStore()

  // Redirect to landing if not logged in
  useEffect(() => {
    if (!eoConnection.isLoggedIn) {
      router.push('/')
    }
  }, [eoConnection.isLoggedIn, router])

  // Device authorization check - kick out if device changed
  const [deviceAuthError, setDeviceAuthError] = useState('')
  useEffect(() => {
    const boundEmail = getBoundAccount()
    if (boundEmail && eoConnection.isLoggedIn) {
      const auth = checkDeviceAuthorization(boundEmail)
      if (!auth.authorized) {
        setDeviceAuthError(auth.message || 'الجهاز غير مصرح')
      }
    }
  }, [eoConnection.isLoggedIn])

  if (deviceAuthError) {
    return (
      <div className="min-h-screen bg-[#272E4A] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#D0011B]/20 flex items-center justify-center mx-auto">
            <Fingerprint className="w-8 h-8 text-[#D0011B]" />
          </div>
          <h2 className="text-lg font-bold text-[#D0011B]">جهاز غير مصرح</h2>
          <p className="text-sm text-[#A9B5CB]">{deviceAuthError}</p>
          <p className="text-xs text-[#A9B5CB]/70">سياسة الأمان: كل حساب يشتغل على جهاز واحد فقط</p>
          <Button
            onClick={() => { eoLogout(); router.push('/'); }}
            className="bg-[#D0011B] hover:bg-[#A80115] text-white"
          >
            تسجيل خروج
          </Button>
        </div>
      </div>
    )
  }

  if (!eoConnection.isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#272E4A] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#2F96F0] flex items-center justify-center mx-auto shadow-lg shadow-[#2F96F0]/30">
            <span className="text-2xl font-black text-white">α</span>
          </div>
          <p className="text-sm text-[#A9B5CB]">جاري التحويل...</p>
        </div>
      </div>
    )
  }

  const currentPrice = prices[selectedPair]
  const isUp = currentPrice ? currentPrice.price >= currentPrice.prevPrice : true

  return (
    <div className="min-h-screen bg-[#272E4A] text-[#F5F5F5] flex flex-col">
      {/* Top Header - Alfa Option style */}
      <header className="bg-[#222940] border-b border-[#3A4568] px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] flex items-center justify-center">
              <span className="text-sm font-black text-white">α</span>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-[#F5F5F5]">Alfa Option</h1>
              <p className="text-[9px] text-[#A9B5CB]">
                {eoConnection.isDemo ? '🎮 تجريبي' : '💰 حقيقي'} • رصيد: ${eoConnection.realBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Back Button */}
            <BackButton href="/" label="الرئيسية" className="mr-1" />
            {/* Alfa Coins Badge */}
            {alfaCoins.totalCoins > 0 && (
              <Badge className="text-[9px] h-5 px-2 bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30" variant="outline">
                <Coins className="w-3 h-3 mr-0.5" />
                {alfaCoins.totalCoins} α
              </Badge>
            )}
            <Badge
              className={`text-[9px] h-5 px-2 ${isConnected ? 'bg-[#57BC9A]/20 text-[#57BC9A] border-[#57BC9A]/30' : 'bg-[#D0011B]/20 text-[#D0011B] border-[#D0011B]/30'}`}
              variant="outline"
            >
              {isConnected ? (
                <><Wifi className="w-3 h-3 mr-1" />متصل</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" />غير متصل</>
              )}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={eoLogout}
              className="h-7 w-7 p-0 text-[#D0011B] hover:text-[#D0011B] hover:bg-[#D0011B]/10"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-2 py-1.5">
        <StatsHeader />
      </div>

      {/* Alfa Coins Progress Bar (if trades < 100) */}
      {alfaCoins.totalTradesCount > 0 && alfaCoins.tradesSinceLastReward > 0 && (
        <div className="px-2 pb-1">
          <div className="bg-[#2D3651] rounded-lg p-2 border border-[#3A4568]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-[#FFD700]" />
                <span className="text-[9px] text-[#A9B5CB]">التقدم نحو صندوق حماية جديد</span>
              </div>
              <span className="text-[9px] font-bold text-[#FFD700]">{alfaCoins.tradesSinceLastReward}/100</span>
            </div>
            <div className="h-1.5 bg-[#20283D] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full transition-all" style={{ width: `${Math.min(100, (alfaCoins.tradesSinceLastReward / 100) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Price Ticker */}
      <div className="px-2 pb-1.5">
        <PriceTicker />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-2 pb-2 flex flex-col">
        <Tabs defaultValue="chart" className="flex-1 flex flex-col" onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="w-full grid grid-cols-5 mb-1.5 bg-[#222940] h-8">
            <TabsTrigger value="chart" className="text-[10px] gap-0.5 data-[state=active]:bg-[#2F96F0] data-[state=active]:text-white">
              <BarChart3 className="w-3 h-3" />
              الشارت
            </TabsTrigger>
            <TabsTrigger value="trades" className="text-[10px] gap-0.5 data-[state=active]:bg-[#2F96F0] data-[state=active]:text-white">
              <History className="w-3 h-3" />
              الصفقات
            </TabsTrigger>
            <TabsTrigger value="bot" className="text-[10px] gap-0.5 data-[state=active]:bg-[#2F96F0] data-[state=active]:text-white">
              <Bot className="w-3 h-3" />
              البوت
            </TabsTrigger>
            <TabsTrigger value="protection" className="text-[10px] gap-0.5 data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1A1F2E]">
              <Coins className="w-3 h-3" />
              α كوينز
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-[10px] gap-0.5 data-[state=active]:bg-[#2F96F0] data-[state=active]:text-white">
              <Settings className="w-3 h-3" />
              إعدادات
            </TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
          <TabsContent value="chart" className="flex-1 flex flex-col gap-1.5 mt-0">
            {/* Chart controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-[#F5F5F5]">{selectedPair}</h2>
                {currentPrice && (
                  <span className={`text-xs font-mono font-bold ${isUp ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>
                    {currentPrice.price.toFixed(currentPrice.digits)}
                  </span>
                )}
                {currentPrice && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${currentPrice.change24h >= 0 ? 'text-[#57BC9A] border-[#57BC9A]/30' : 'text-[#D0011B] border-[#D0011B]/30'}`}
                  >
                    {currentPrice.change24h >= 0 ? '▲' : '▼'} {Math.abs(currentPrice.change24h).toFixed(2)}%
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={chartType === 'candle' ? 'default' : 'outline'}
                  onClick={() => setChartType('candle')}
                  className={`h-6 text-[10px] px-2 ${chartType === 'candle' ? 'bg-[#2F96F0] text-white' : 'bg-[#20283D] text-[#A9B5CB] border-[#3A4568]'}`}
                >
                  <CandlestickChart className="w-3 h-3 mr-0.5" />
                  شموع
                </Button>
                <Button
                  size="sm"
                  variant={chartType === 'line' ? 'default' : 'outline'}
                  onClick={() => setChartType('line')}
                  className={`h-6 text-[10px] px-2 ${chartType === 'line' ? 'bg-[#2F96F0] text-white' : 'bg-[#20283D] text-[#A9B5CB] border-[#3A4568]'}`}
                >
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  خطي
                </Button>
              </div>
            </div>

            {/* Chart + Trading Panel */}
            <div className="flex-1 flex gap-1.5 min-h-0">
              {/* Chart */}
              <div className="flex-1 bg-[#2D3651] border border-[#3A4568] rounded-lg p-1.5 overflow-hidden">
                <TradingChart />
              </div>
              {/* Trading Panel (Desktop) */}
              <div className="hidden md:block w-72 flex-shrink-0">
                <TradingPanel emit={emit} />
              </div>
            </div>

            {/* Trading Panel (Mobile) */}
            <div className="md:hidden">
              <TradingPanel emit={emit} />
            </div>
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades" className="flex-1 mt-0 overflow-y-auto">
            <TradeHistory emit={emit} />
          </TabsContent>

          {/* Bot Tab */}
          <TabsContent value="bot" className="flex-1 mt-0 overflow-y-auto">
            <AutoBotPanel emit={emit} />
          </TabsContent>

          {/* Alfa Coins Protection Tab */}
          <TabsContent value="protection" className="flex-1 mt-0 overflow-y-auto">
            <AlfaCoinsPanel />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 mt-0 overflow-y-auto">
            <div className="space-y-3">
              {/* Account Info */}
              <div className="bg-[#2D3651] border border-[#3A4568] rounded-lg p-3">
                <h3 className="text-xs font-bold mb-2 text-[#F5F5F5]">معلومات الحساب</h3>
                <div className="space-y-1.5">
                  {[
                    ['الرصيد', `$${eoConnection.realBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                    ['العملة', 'USD'],
                    ['النوع', eoConnection.isDemo ? '🎮 تجريبي (Demo)' : '💰 حقيقي (Real)'],
                    ['نوع التداول', 'أوبشن (خيارات)'],
                    ['الحد الأدنى', '$1'],
                    ['الحد الأقصى', '$100'],
                    ['حالة البوت', eoConnection.autoTrading ? '🟢 يعمل' : '🔴 متوقف'],
                    ['ربح/خسارة اليوم', `$${eoConnection.dailyPnl.toFixed(2)}`],
                    ['Alfa Coins', `${alfaCoins.totalCoins} α`],
                    ['إجمالي الصفقات', `${alfaCoins.totalTradesCount}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px]">
                      <span className="text-[#A9B5CB]">{k}</span>
                      <span className={`font-mono font-bold ${k === 'ربح/خسارة اليوم' ? (eoConnection.dailyPnl >= 0 ? 'text-[#57BC9A]' : 'text-[#D0011B]') : 'text-[#F5F5F5]'}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trading Settings */}
              <div className="bg-[#2D3651] border border-[#3A4568] rounded-lg p-3">
                <h3 className="text-xs font-bold mb-2 text-[#F5F5F5]">إعدادات التداول</h3>
                <div className="space-y-1.5 text-[11px] text-[#A9B5CB]">
                  <p>• تداول أوبشن (خيارات) - صفقات ثابتة</p>
                  <p>• مبلغ الصفقة: $1 إلى $100</p>
                  <p>• الربح = مبلغ الصفقة × نسبة العائد</p>
                  <p>• الخسارة = مبلغ الصفقة كاملاً</p>
                  <p>• استخدم البوت الآلي لاختبار الاستراتيجيات</p>
                  <p>• يمكنك إضافة عدة استراتيجيات معاً</p>
                  <p>• تأكد من ضبط إدارة المخاطر أولاً</p>
                </div>
              </div>

              {/* Risk Disclosure */}
              <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-3">
                <h3 className="text-xs font-bold mb-1.5 text-[#D0011B]">⚠️ تنبيه المخاطر</h3>
                <p className="text-[10px] text-[#D0011B]/80 leading-relaxed">
                  تداول العملات ينطوي على مخاطر عالية. قد تخسر كل رأس المال. لا تتداول بأموال لا يمكنك تحمل خسارتها. هذا التطبيق للأغراض التعليمية فقط.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Footer */}
      <footer className="border-t border-[#3A4568] bg-[#222940] px-3 py-1">
        <div className="flex items-center justify-between text-[9px] text-[#A9B5CB]">
          <span>Alfa Option v3.0 • تداول آلي ذكي</span>
          <div className="flex items-center gap-1.5">
            <span className={`flex items-center gap-0.5 ${isConnected ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#57BC9A]' : 'bg-[#D0011B]'}`}></span>
              {isConnected ? 'متصل' : 'غير متصل'}
            </span>
            <span>•</span>
            <span>{new Date().toLocaleDateString('ar')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============ ALFA COINS PANEL (embedded in Protection tab) ============
function AlfaCoinsPanel() {
  const { alfaCoins, toggleProtection, setProtectionThreshold } = useTradingStore()
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="space-y-3">
      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-[#2D3651] to-[#222940] border border-[#FFD700]/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">Alfa Coins</h3>
              <p className="text-[10px] text-[#A9B5CB]">عملات الحماية من الخسارة</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-3xl font-black text-[#FFD700]">{alfaCoins.totalCoins}</p>
            <p className="text-[9px] text-[#A9B5CB]">α كوين</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#20283D] rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-[#F5F5F5]">{alfaCoins.totalTradesCount}</p>
            <p className="text-[8px] text-[#A9B5CB]">إجمالي الصفقات</p>
          </div>
          <div className="bg-[#20283D] rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-[#FFD700]">{alfaCoins.protectionFunds.length}</p>
            <p className="text-[8px] text-[#A9B5CB]">صناديق الحماية</p>
          </div>
          <div className="bg-[#20283D] rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-[#57BC9A]">${(alfaCoins.totalCoins * 0.10).toFixed(0)}</p>
            <p className="text-[8px] text-[#A9B5CB]">قيمة الحماية</p>
          </div>
        </div>
      </div>

      {/* Progress to Next Reward */}
      <div className="bg-[#2D3651] border border-[#3A4568] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#FFD700]" />
            <span className="text-xs font-bold text-[#F5F5F5]">التقدم نحو صندوق جديد</span>
          </div>
          <span className="text-xs font-bold text-[#FFD700]">
            {alfaCoins.tradesSinceLastReward}/100
          </span>
        </div>
        <div className="h-3 bg-[#20283D] rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] rounded-full transition-all"
            style={{ width: `${Math.min(100, (alfaCoins.tradesSinceLastReward / 100) * 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-[#A9B5CB] text-center">
          أكمل {100 - alfaCoins.tradesSinceLastReward} صفقة إضافية لكسب صندوق حماية 100 α
        </p>
      </div>

      {/* Protection Settings */}
      <div className="bg-[#2D3651] border border-[#3A4568] rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
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
        <div className="space-y-1.5 text-[10px] text-[#A9B5CB]">
          <p>• الحماية التلقائية: {alfaCoins.protectionEnabled ? '🟢 مفعلة' : '🔴 متوقفة'}</p>
          <p>• عند خسارة صفقة → يتم استخدام Alfa Coins لتعويض جزء من الخسارة</p>
          <p>• كل 1 α كوين = $0.10 تعويض من الخسارة</p>
          <p>• الحماية تحمي حتى {alfaCoins.protectionThreshold}% من قيمة الخسارة</p>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-[#2D3651] border border-[#3A4568] rounded-lg p-3">
        <h3 className="text-xs font-bold text-[#F5F5F5] mb-2 flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-[#2F96F0]" />
          كيف يشتغل نظام Alfa Coins؟
        </h3>
        <div className="space-y-2">
          {[
            { step: '1', text: 'كل صفقة تعملها على البوت تحسب في عداد المكافآت', color: '#2F96F0' },
            { step: '2', text: 'كل 100 صفقة → تكسب صندوق حماية 100 Alfa Coin', color: '#57BC9A' },
            { step: '3', text: 'لو خسرت صفقة → Alfa Coins تعوضك تلقائياً جزء من الخسارة', color: '#FFD700' },
            { step: '4', text: 'كل 1 Alfa Coin = $0.10 تعويض — يعني 100 α = $10 حماية', color: '#57BC9A' },
            { step: '5', text: 'كل ما تتداول أكتر → تكسب أكتر صناديق حماية!', color: '#2F96F0' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                {item.step}
              </span>
              <span className="text-[10px] text-[#A9B5CB] leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Protection Funds List */}
      {alfaCoins.protectionFunds.length > 0 && (
        <div className="bg-[#2D3651] border border-[#3A4568] rounded-lg p-3">
          <h3 className="text-xs font-bold text-[#F5F5F5] mb-2 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#FFD700]" />
            صناديق الحماية ({alfaCoins.protectionFunds.length})
          </h3>
          <div className="space-y-1.5">
            {alfaCoins.protectionFunds.slice(-5).reverse().map((fund) => (
              <div key={fund.id} className="bg-[#20283D] rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#FFD700]" />
                  <div>
                    <p className="text-[10px] font-bold text-[#F5F5F5]">{fund.coins} α كوين</p>
                    <p className="text-[8px] text-[#A9B5CB]">عند صفقة #{fund.earnedAtTrade}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold ${fund.remaining > 0 ? 'text-[#57BC9A]' : 'text-[#3A4568]'}`}>
                    {fund.remaining} α متبقي
                  </p>
                  <p className="text-[8px] text-[#A9B5CB]">${(fund.remaining * 0.10).toFixed(1)} حماية</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      {alfaCoins.transactions.length > 0 && (
        <div className="bg-[#2D3651] border border-[#3A4568] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#F5F5F5] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#2F96F0]" />
              سجل المعاملات
            </h3>
            <button onClick={() => setShowHistory(!showHistory)} className="text-[9px] text-[#2F96F0] font-bold">
              {showHistory ? 'إخفاء' : `عرض الكل (${alfaCoins.transactions.length})`}
            </button>
          </div>
          <div className="space-y-1.5">
            {(showHistory ? alfaCoins.transactions : alfaCoins.transactions.slice(0, 5)).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-[#3A4568]/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    tx.type === 'earned' ? 'bg-[#57BC9A]/10 text-[#57BC9A]' :
                    tx.type === 'protection_used' ? 'bg-[#D0011B]/10 text-[#D0011B]' :
                    tx.type === 'bonus' ? 'bg-[#FFD700]/10 text-[#FFD700]' :
                    'bg-[#A9B5CB]/10 text-[#A9B5CB]'
                  }`}>
                    {tx.type === 'earned' ? 'كسب' : tx.type === 'protection_used' ? 'حماية' : tx.type === 'bonus' ? 'مكافأة' : tx.type}
                  </span>
                  <span className="text-[10px] text-[#A9B5CB]">{tx.description}</span>
                </div>
                <span className={`text-xs font-bold ${tx.amount > 0 ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} α
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
