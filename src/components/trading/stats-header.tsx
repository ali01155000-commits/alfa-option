'use client'

import { useTradingStore } from '@/store/trading-store'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, BarChart3, Bot } from 'lucide-react'

export function StatsHeader() {
  const { balance, totalPnL, openTrades, botConfig, tradeHistory, prices } = useTradingStore()

  // Options-style unrealized PnL: based on trade direction vs price movement
  const unrealizedPnL = openTrades.reduce((sum, trade) => {
    const currentPrice = prices[trade.pair]?.price
    if (!currentPrice) return sum

    if (trade.direction === 'buy') {
      const won = currentPrice > trade.entryPrice
      const pnl = won ? trade.amount * (trade.payoutPercent / 100) : -trade.amount
      return sum + (currentPrice === trade.entryPrice ? 0 : pnl)
    } else {
      const won = currentPrice < trade.entryPrice
      const pnl = won ? trade.amount * (trade.payoutPercent / 100) : -trade.amount
      return sum + (currentPrice === trade.entryPrice ? 0 : pnl)
    }
  }, 0)

  const realizedPnL = tradeHistory.reduce((sum, t) => sum + t.pnl, 0)
  const winningTrades = tradeHistory.filter(t => t.won).length
  const winRate = tradeHistory.length > 0 ? (winningTrades / tradeHistory.length) * 100 : 0

  const stats = [
    {
      icon: Wallet,
      label: 'الرصيد',
      value: `$${(balance + realizedPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: 'text-[#F5F5F5]',
      bgColor: 'bg-[#2F96F0]/20'
    },
    {
      icon: unrealizedPnL >= 0 ? TrendingUp : TrendingDown,
      label: 'الربح',
      value: `${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)}`,
      color: unrealizedPnL >= 0 ? 'text-[#57BC9A]' : 'text-[#D0011B]',
      bgColor: unrealizedPnL >= 0 ? 'bg-[#57BC9A]/15' : 'bg-[#D0011B]/15'
    },
    {
      icon: BarChart3,
      label: 'نسبة الفوز',
      value: `${winRate.toFixed(1)}%`,
      color: winRate >= 50 ? 'text-[#57BC9A]' : 'text-[#D0011B]',
      bgColor: 'bg-[#2D3651]'
    },
    {
      icon: Bot,
      label: 'البوت',
      value: botConfig.enabled ? 'نشط' : 'متوقف',
      color: botConfig.enabled ? 'text-[#57BC9A]' : 'text-[#A9B5CB]',
      bgColor: botConfig.enabled ? 'bg-[#57BC9A]/15' : 'bg-[#2D3651]'
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-[#3A4568] bg-[#2D3651] py-0">
          <CardContent className="p-1.5">
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-3 h-3 ${stat.color}`} />
              </div>
              <div>
                <div className="text-[9px] text-[#A9B5CB]">{stat.label}</div>
                <div className={`text-[11px] font-bold font-mono ${stat.color}`}>{stat.value}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
