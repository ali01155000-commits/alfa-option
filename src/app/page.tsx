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
  } = useTradingStore()

  const currentPrice = prices[selectedPair]
  const isUp = currentPrice ? currentPrice.price >= currentPrice.prevPrice : true

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">AutoTrade Pro</h1>
              <p className="text-[10px] text-muted-foreground">تداول آلي ذكي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? 'default' : 'destructive'}
              className={`text-[10px] h-5 ${isConnected ? 'bg-emerald-500' : ''}`}
            >
              {isConnected ? (
                <><Wifi className="w-3 h-3 mr-1" />متصل</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" />غير متصل</>
              )}
            </Badge>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-3 py-2">
        <StatsHeader />
      </div>

      {/* Price Ticker */}
      <div className="px-3 pb-2">
        <PriceTicker />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-3 pb-3 flex flex-col">
        <Tabs defaultValue="chart" className="flex-1 flex flex-col" onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="w-full grid grid-cols-4 mb-2">
            <TabsTrigger value="chart" className="text-xs gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              الشارت
            </TabsTrigger>
            <TabsTrigger value="trades" className="text-xs gap-1">
              <History className="w-3.5 h-3.5" />
              الصفقات
            </TabsTrigger>
            <TabsTrigger value="bot" className="text-xs gap-1">
              <Bot className="w-3.5 h-3.5" />
              الروبوت
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1">
              <Settings className="w-3.5 h-3.5" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
          <TabsContent value="chart" className="flex-1 flex flex-col gap-2 mt-0">
            {/* Chart controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold">{selectedPair}</h2>
                {currentPrice && (
                  <span className={`text-sm font-mono font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                    {currentPrice.price.toFixed(currentPrice.digits)}
                  </span>
                )}
                {currentPrice && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${currentPrice.change24h >= 0 ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'}`}
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
                  className="h-7 text-xs px-2"
                >
                  <CandlestickChart className="w-3 h-3 mr-1" />
                  شموع
                </Button>
                <Button
                  size="sm"
                  variant={chartType === 'line' ? 'default' : 'outline'}
                  onClick={() => setChartType('line')}
                  className="h-7 text-xs px-2"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  خطي
                </Button>
              </div>
            </div>

            {/* Chart + Trading Panel */}
            <div className="flex-1 flex gap-2 min-h-0">
              {/* Chart */}
              <div className="flex-1 bg-card border border-border rounded-lg p-2 overflow-hidden">
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
            <div className="space-y-4">
              {/* Account Info */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-bold mb-3">معلومات الحساب</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">الرصيد الابتدائي</span>
                    <span className="font-mono font-bold">$10,000.00</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">العملة</span>
                    <span className="font-mono font-bold">USD</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">نوع الحساب</span>
                    <span className="font-mono font-bold">تجريبي (Demo)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">الرافعة المالية</span>
                    <span className="font-mono font-bold">1:100</span>
                  </div>
                </div>
              </div>

              {/* Trading Settings */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-bold mb-3">إعدادات التداول</h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>• جميع الصفقات تتم في وضع تجريبي (Demo)</p>
                  <p>• البيانات محاكاة ولا تمثل أسعار حقيقية</p>
                  <p>• استخدم الروبوت الآلي لاختبار الاستراتيجيات</p>
                  <p>• يمكنك إضافة عدة استراتيجيات تعمل في نفس الوقت</p>
                  <p>• تأكد من ضبط إدارة المخاطر قبل تفعيل الروبوت</p>
                </div>
              </div>

              {/* Risk Disclosure */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h3 className="text-sm font-bold mb-2 text-amber-600">⚠️ تنبيه المخاطر</h3>
                <p className="text-xs text-amber-700/80 leading-relaxed">
                  تداول العملات الأجنبية ينطوي على مخاطر عالية وقد لا يكون مناسباً لجميع المستثمرين.
                  قد تخسر كل رأس المال المستثمر. لا تتداول بأموال لا يمكنك تحمل خسارتها.
                  هذا التطبيق للأغراض التعليمية فقط.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Footer */}
      <footer className="border-t border-border bg-card px-3 py-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>AutoTrade Pro v1.0 • تداول آلي ذكي</span>
          <div className="flex items-center gap-2">
            <span>الخادم: {isConnected ? '🟢 متصل' : '🔴 غير متصل'}</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString('ar')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
