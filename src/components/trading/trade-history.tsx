'use client'

import { useTradingStore, type TradeData } from '@/store/trading-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, TrendingUp, TrendingDown, X } from 'lucide-react'

interface TradeHistoryProps {
  emit: (event: string, data?: any) => void
}

export function TradeHistory({ emit }: TradeHistoryProps) {
  const { openTrades, tradeHistory, prices } = useTradingStore()

  const handleCloseTrade = (id: string) => {
    emit('close-trade', { id })
  }

  const getUnrealizedPnL = (trade: TradeData) => {
    const currentPrice = prices[trade.pair]?.price
    if (!currentPrice) return 0
    const pipSize = prices[trade.pair]?.pipSize || 0.0001

    if (trade.direction === 'buy') {
      return ((currentPrice - trade.entryPrice) / pipSize) * trade.amount * 0.01
    } else {
      return ((trade.entryPrice - currentPrice) / pipSize) * trade.amount * 0.01
    }
  }

  return (
    <div className="space-y-3">
      {/* Open Trades */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>الصفقات المفتوحة</span>
            </div>
            <Badge variant="outline" className="text-xs">{openTrades.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openTrades.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد صفقات مفتوحة</p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {openTrades.map((trade) => {
                  const pnl = getUnrealizedPnL(trade)
                  const currentPrice = prices[trade.pair]?.price
                  const digits = prices[trade.pair]?.digits || 5
                  return (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-2 border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          trade.direction === 'buy' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        }`}>
                          {trade.direction === 'buy'
                            ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                            : <TrendingDown className="w-4 h-4 text-red-500" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold">{trade.pair}</span>
                            <Badge
                              variant={trade.direction === 'buy' ? 'default' : 'destructive'}
                              className={`text-[9px] h-4 ${trade.direction === 'buy' ? 'bg-emerald-500' : 'bg-red-500'}`}
                            >
                              {trade.direction === 'buy' ? 'شراء' : 'بيع'}
                            </Badge>
                            {trade.strategy !== 'manual' && (
                              <Badge variant="outline" className="text-[9px] h-4">🤖 {trade.strategy}</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {trade.entryPrice.toFixed(digits)} → {currentPrice?.toFixed(digits) || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`text-xs font-bold font-mono ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">${trade.amount}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCloseTrade(trade.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
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
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span>سجل الصفقات</span>
            <Badge variant="outline" className="text-xs">{tradeHistory.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tradeHistory.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              لا توجد صفقات منتهية
            </div>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-1.5">
                {tradeHistory.map((trade, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      {trade.direction === 'buy'
                        ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                        : <TrendingDown className="w-3 h-3 text-red-500" />
                      }
                      <span className="font-medium">{trade.pair}</span>
                      {trade.strategy !== 'manual' && <span className="text-[9px] text-muted-foreground">🤖</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
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
