'use client'

import { useTradingStore } from '@/store/trading-store'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, BarChart3, Bot } from 'lucide-react'

export function StatsHeader() {
  const { balance, totalPnL, openTrades, botConfig, tradeHistory, prices } = useTradingStore()

  // Calculate total unrealized PnL
  const unrealizedPnL = openTrades.reduce((sum, trade) => {
    const currentPrice = prices[trade.pair]?.price
    if (!currentPrice) return sum
    const pipSize = prices[trade.pair]?.pipSize || 0.0001
    const pnl = trade.direction === 'buy'
      ? ((currentPrice - trade.entryPrice) / pipSize) * trade.amount * 0.01
      : ((trade.entryPrice - currentPrice) / pipSize) * trade.amount * 0.01
    return sum + pnl
  }, 0)

  const realizedPnL = tradeHistory.reduce((sum, t) => sum + t.pnl, 0)
  const winningTrades = tradeHistory.filter(t => t.pnl > 0).length
  const winRate = tradeHistory.length > 0 ? (winningTrades / tradeHistory.length) * 100 : 0

  const stats = [
    {
      icon: Wallet,
      label: 'الرصيد',
      value: `$${(balance + realizedPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: 'text-foreground',
      bgColor: 'bg-primary/10'
    },
    {
      icon: unrealizedPnL >= 0 ? TrendingUp : TrendingDown,
      label: 'أرباح غير محققة',
      value: `${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)}`,
      color: unrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500',
      bgColor: unrealizedPnL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
    },
    {
      icon: BarChart3,
      label: 'نسبة الفوز',
      value: `${winRate.toFixed(1)}%`,
      color: winRate >= 50 ? 'text-emerald-500' : 'text-amber-500',
      bgColor: winRate >= 50 ? 'bg-emerald-500/10' : 'bg-amber-500/10'
    },
    {
      icon: Bot,
      label: 'الروبوت',
      value: botConfig.enabled ? 'نشط' : 'متوقف',
      color: botConfig.enabled ? 'text-emerald-500' : 'text-muted-foreground',
      bgColor: botConfig.enabled ? 'bg-emerald-500/10' : 'bg-muted/50'
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border py-0">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-md ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                <div className={`text-xs font-bold font-mono ${stat.color}`}>{stat.value}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
