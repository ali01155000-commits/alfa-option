'use client'

import { useState } from 'react'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TradingPanelProps {
  emit: (event: string, data?: any) => void
}

export function TradingPanel({ emit }: TradingPanelProps) {
  const { selectedPair, prices, balance } = useTradingStore()
  const [amount, setAmount] = useState('100')
  const [takeProfit, setTakeProfit] = useState('50')
  const [stopLoss, setStopLoss] = useState('25')
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell' | null>(null)

  const currentPrice = prices[selectedPair]
  const buyPrice = currentPrice ? (currentPrice.price + currentPrice.spread / 2).toFixed(currentPrice.digits) : '-'
  const sellPrice = currentPrice ? (currentPrice.price - currentPrice.spread / 2).toFixed(currentPrice.digits) : '-'

  const handleTrade = (direction: 'buy' | 'sell') => {
    if (!currentPrice) return
    setTradeDirection(direction)

    emit('manual-trade', {
      pair: selectedPair,
      direction,
      amount: parseFloat(amount) || 100,
      takeProfit: parseFloat(takeProfit) || 50,
      stopLoss: parseFloat(stopLoss) || 25
    })

    setTimeout(() => setTradeDirection(null), 1000)
  }

  const quickAmounts = [50, 100, 250, 500, 1000]

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{selectedPair}</span>
          <Badge variant="outline" className="text-xs">
            رصيد: ${balance.toLocaleString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Price display */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
            <div className="text-[10px] text-emerald-600 font-medium mb-0.5">BUY</div>
            <div className="text-lg font-mono font-bold text-emerald-500">{buyPrice}</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
            <div className="text-[10px] text-red-600 font-medium mb-0.5">SELL</div>
            <div className="text-lg font-mono font-bold text-red-500">{sellPrice}</div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">المبلغ (USD)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono text-center"
          />
          <div className="flex gap-1 mt-1.5">
            {quickAmounts.map((qa) => (
              <button
                key={qa}
                onClick={() => setAmount(String(qa))}
                className={`flex-1 text-xs py-1 rounded border transition-colors ${
                  amount === String(qa)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:bg-accent'
                }`}
              >
                ${qa}
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">جني الأرباح (نقاط)</label>
            <Input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="font-mono text-center"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">وقف الخسارة (نقاط)</label>
            <Input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="font-mono text-center"
            />
          </div>
        </div>

        {/* Trade buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleTrade('buy')}
            disabled={tradeDirection !== null}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-base transition-all"
          >
            {tradeDirection === 'buy' ? '✓ تم الشراء' : '▲ شراء'}
          </Button>
          <Button
            onClick={() => handleTrade('sell')}
            disabled={tradeDirection !== null}
            className="bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-base transition-all"
          >
            {tradeDirection === 'sell' ? '✓ تم البيع' : '▼ بيع'}
          </Button>
        </div>

        {/* Spread info */}
        {currentPrice && (
          <div className="text-center text-[10px] text-muted-foreground">
            السبريد: {(currentPrice.spread * 10000).toFixed(1)} نقطة | أعلى 24س: {currentPrice.high24h.toFixed(currentPrice.digits)} | أدنى 24س: {currentPrice.low24h.toFixed(currentPrice.digits)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
