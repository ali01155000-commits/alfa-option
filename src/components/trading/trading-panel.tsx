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
    <Card className="border-[#3A4568] bg-[#2D3651]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm text-[#F5F5F5]">
          <span>{selectedPair}</span>
          <Badge variant="outline" className="text-[10px] text-[#A9B5CB] border-[#3A4568]">
            ${balance.toLocaleString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Price display - Expert Option style */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#57BC9A]/15 border border-[#57BC9A]/40 rounded-lg p-2 text-center">
            <div className="text-[10px] text-[#57BC9A] font-medium mb-0.5">CALL ▲</div>
            <div className="text-lg font-mono font-bold text-[#57BC9A]">{buyPrice}</div>
          </div>
          <div className="bg-[#D0011B]/15 border border-[#D0011B]/40 rounded-lg p-2 text-center">
            <div className="text-[10px] text-[#D0011B] font-medium mb-0.5">PUT ▼</div>
            <div className="text-lg font-mono font-bold text-[#D0011B]">{sellPrice}</div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[10px] text-[#A9B5CB] mb-1 block">المبلغ (USD)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono text-center bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-8"
          />
          <div className="flex gap-1 mt-1.5">
            {quickAmounts.map((qa) => (
              <button
                key={qa}
                onClick={() => setAmount(String(qa))}
                className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
                  amount === String(qa)
                    ? 'bg-[#2F96F0] text-white border-[#2F96F0]'
                    : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB] hover:bg-[#2D3651]'
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
            <label className="text-[10px] text-[#A9B5CB] mb-1 block">جني الأرباح</label>
            <Input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="font-mono text-center bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-8"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#A9B5CB] mb-1 block">وقف الخسارة</label>
            <Input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="font-mono text-center bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-8"
            />
          </div>
        </div>

        {/* Trade buttons - Expert Option style */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleTrade('buy')}
            disabled={tradeDirection !== null}
            className="bg-[#57BC9A] hover:bg-[#4AA88B] text-white font-bold h-11 text-sm transition-all rounded-lg"
          >
            {tradeDirection === 'buy' ? '✓ تم الشراء' : '▲ CALL'}
          </Button>
          <Button
            onClick={() => handleTrade('sell')}
            disabled={tradeDirection !== null}
            className="bg-[#D0011B] hover:bg-[#B80118] text-white font-bold h-11 text-sm transition-all rounded-lg"
          >
            {tradeDirection === 'sell' ? '✓ تم البيع' : '▼ PUT'}
          </Button>
        </div>

        {/* Spread info */}
        {currentPrice && (
          <div className="text-center text-[9px] text-[#A9B5CB]">
            السبريد: {(currentPrice.spread / (currentPrice.pipSize || 0.0001)).toFixed(1)} نقطة | H: {currentPrice.high24h.toFixed(currentPrice.digits)} | L: {currentPrice.low24h.toFixed(currentPrice.digits)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
