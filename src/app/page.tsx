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
} from 'lucide-react'

export default function TradingPlatform() {
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
  } = useTradingStore()

  // Redirect to login if not logged in to Expert Option
  if (!eoConnection.isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#272E4A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#2F96F0] flex items-center justify-center mx-auto shadow-lg shadow-[#2F96F0]/30">
            <TrendingUp className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F5F5F5]">Alfa Expert</h1>
            <p className="text-sm text-[#A9B5CB] mt-1">يجب تسجيل الدخول أولاً</p>
          </div>
          <Button
            onClick={() => window.location.href = '/login'}
            className="bg-[#2F96F0] hover:bg-[#1A7DE8] text-white font-bold px-8 h-11"
          >
            تسجيل الدخول إلى Expert Option
          </Button>
        </div>
      </div>
    )
  }

  const currentPrice = prices[selectedPair]
  const isUp = currentPrice ? currentPrice.price >= currentPrice.prevPrice : true

  return (
    <div className="min-h-screen bg-[#272E4A] text-[#F5F5F5] flex flex-col">
      {/* Top Header - Expert Option style */}
      <header className="bg-[#222940] border-b border-[#3A4568] px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2F96F0] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-[#F5F5F5]">Alfa Expert</h1>
              <p className="text-[9px] text-[#A9B5CB]">
                {eoConnection.isDemo ? '🎮 تجريبي' : '💰 حقيقي'} • رصيد: ${eoConnection.realBalance.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      {/* Price Ticker */}
      <div className="px-2 pb-1.5">
        <PriceTicker />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-2 pb-2 flex flex-col">
        <Tabs defaultValue="chart" className="flex-1 flex flex-col" onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="w-full grid grid-cols-4 mb-1.5 bg-[#222940] h-8">
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

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 mt-0 overflow-y-auto">
            <div className="space-y-3">
              {/* Account Info */}
              <div className="bg-[#2D3651] border border-[#3A4568] rounded-lg p-3">
                <h3 className="text-xs font-bold mb-2 text-[#F5F5F5]">معلومات الحساب</h3>
                <div className="space-y-1.5">
                  {[
                    ['الرصيد', '$10,000.00'],
                    ['العملة', 'USD'],
                    ['النوع', 'تجريبي (Demo)'],
                    ['نوع التداول', 'أوبشن (خيارات)'],
                    ['الحد الأدنى', '$1'],
                    ['الحد الأقصى', '$100'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px]">
                      <span className="text-[#A9B5CB]">{k}</span>
                      <span className="font-mono font-bold text-[#F5F5F5]">{v}</span>
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

      {/* Bottom Footer - Expert Option style */}
      <footer className="border-t border-[#3A4568] bg-[#222940] px-3 py-1">
        <div className="flex items-center justify-between text-[9px] text-[#A9B5CB]">
          <span>Alfa Expert v2.0 • تداول آلي ذكي</span>
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
