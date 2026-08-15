'use client'

import { useTradingStore, type TradeData } from '@/store/trading-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, TrendingUp, TrendingDown, X, Timer, DollarSign } from 'lucide-react'

interface TradeHistoryProps {
  emit: (event: string, data?: any) => void
}

export function TradeHistory({ emit }: TradeHistoryProps) {
  const { openTrades, tradeHistory, prices } = useTradingStore()

  const handleCloseTrade = (id: string) => {
    emit('close-trade', { id })
  }

  // Options-style: win if price moved in our direction, profit = amount × payout%
  const getTradeStatus = (trade: TradeData) => {
    const currentPrice = prices[trade.pair]?.price
    if (!currentPrice) return { pnl: 0, won: false, remaining: 0 }

    const remaining = Math.max(0, trade.expiryTime - Date.now())

    if (trade.direction === 'buy') {
      const won = currentPrice > trade.entryPrice
      const pnl = won ? trade.amount * (trade.payoutPercent / 100) : -trade.amount
      return { pnl: currentPrice === trade.entryPrice ? 0 : pnl, won, remaining }
    } else {
      const won = currentPrice < trade.entryPrice
      const pnl = won ? trade.amount * (trade.payoutPercent / 100) : -trade.amount
      return { pnl: currentPrice === trade.entryPrice ? 0 : pnl, won, remaining }
    }
  }

  const formatRemaining = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Summary stats
  const totalInvestment = openTrades.reduce((sum, t) => sum + t.amount, 0)
  const totalWon = tradeHistory.filter(t => t.won).length
  const totalLost = tradeHistory.filter(t => !t.won).length
  const totalProfit = tradeHistory.filter(t => t.won).reduce((sum, t) => sum + t.pnl, 0)
  const totalLoss = tradeHistory.filter(t => !t.won).reduce((sum, t) => sum + Math.abs(t.pnl), 0)

  return (
    <div className="space-y-3">
      {/* Summary Stats */}
      {tradeHistory.length > 0 && (
        <Card className="border-[#3A4568] bg-[#2D3651]">
          <CardContent className="p-2.5">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-[9px] text-[#A9B5CB]">صفقات رابحة</div>
                <div className="text-sm font-bold text-[#57BC9A] font-mono">{totalWon}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#A9B5CB]">صفقات خاسرة</div>
                <div className="text-sm font-bold text-[#D0011B] font-mono">{totalLost}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#A9B5CB]">إجمالي الربح</div>
                <div className="text-sm font-bold text-[#57BC9A] font-mono">+${totalProfit.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#A9B5CB]">إجمالي الخسارة</div>
                <div className="text-sm font-bold text-[#D0011B] font-mono">-${totalLoss.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Trades */}
      <Card className="border-[#3A4568] bg-[#2D3651]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm text-[#F5F5F5]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>الصفقات المفتوحة</span>
            </div>
            <div className="flex items-center gap-2">
              {totalInvestment > 0 && (
                <Badge variant="outline" className="text-[9px] border-[#2F96F0]/40 text-[#2F96F0] bg-[#2F96F0]/10">
                  <DollarSign className="w-3 h-3 mr-0.5" />{totalInvestment.toFixed(0)}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs border-[#3A4568] text-[#A9B5CB]">{openTrades.length}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openTrades.length === 0 ? (
            <div className="text-center py-6 text-[#A9B5CB] text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد صفقات مفتوحة</p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {openTrades.map((trade) => {
                  const { pnl, won, remaining } = getTradeStatus(trade)
                  const currentPrice = prices[trade.pair]?.price
                  const digits = prices[trade.pair]?.digits || 5
                  const potentialWin = trade.amount * (trade.payoutPercent / 100)
                  return (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between bg-[#20283D] rounded-lg p-2 border border-[#3A4568]/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          trade.direction === 'buy' ? 'bg-[#57BC9A]/20' : 'bg-[#D0011B]/20'
                        }`}>
                          {trade.direction === 'buy'
                            ? <TrendingUp className="w-4 h-4 text-[#57BC9A]" />
                            : <TrendingDown className="w-4 h-4 text-[#D0011B]" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-[#F5F5F5]">{trade.pair}</span>
                            <Badge
                              className={`text-[9px] h-4 ${trade.direction === 'buy' ? 'bg-[#57BC9A] text-white' : 'bg-[#D0011B] text-white'}`}
                            >
                              {trade.direction === 'buy' ? 'CALL' : 'PUT'}
                            </Badge>
                            {trade.strategy !== 'manual' && (
                              <Badge variant="outline" className="text-[9px] h-4 border-[#3A4568] text-[#A9B5CB]">🤖</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-[#A9B5CB] font-mono">
                            استثمار ${trade.amount} • عائد {trade.payoutPercent}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`text-xs font-bold font-mono ${pnl >= 0 ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-0.5 text-[10px] text-[#A9B5CB]">
                            <Timer className="w-3 h-3" />
                            {formatRemaining(remaining)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCloseTrade(trade.id)}
                          className="h-6 w-6 p-0 text-[#D0011B] hover:text-[#D0011B] hover:bg-[#D0011B]/10"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card className="border-[#3A4568] bg-[#2D3651]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-[#F5F5F5]">
            <span>سجل الصفقات</span>
            <Badge variant="outline" className="text-xs border-[#3A4568] text-[#A9B5CB]">{tradeHistory.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tradeHistory.length === 0 ? (
            <div className="text-center py-4 text-[#A9B5CB] text-sm">
              لا توجد صفقات منتهية
            </div>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-1.5">
                {tradeHistory.map((trade, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-[#20283D]/50 rounded px-2 py-1.5 text-xs border border-[#3A4568]/30"
                  >
                    <div className="flex items-center gap-1.5">
                      {trade.direction === 'buy'
                        ? <TrendingUp className="w-3 h-3 text-[#57BC9A]" />
                        : <TrendingDown className="w-3 h-3 text-[#D0011B]" />
                      }
                      <span className="font-medium text-[#F5F5F5]">{trade.pair}</span>
                      <Badge className={`text-[9px] h-4 ${trade.direction === 'buy' ? 'bg-[#57BC9A] text-white' : 'bg-[#D0011B] text-white'}`}>
                        {trade.direction === 'buy' ? 'CALL' : 'PUT'}
                      </Badge>
                      <span className="text-[9px] text-[#A9B5CB]">${trade.amount}</span>
                      {trade.strategy !== 'manual' && <span className="text-[9px] text-[#A9B5CB]">🤖</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${trade.won ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>
                        {trade.won ? '✓' : '✗'} {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-[#A9B5CB]">
                        {new Date(trade.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
