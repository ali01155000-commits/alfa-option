'use client'

import { useState, useEffect } from 'react'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TradingPanelProps {
  emit: (event: string, data?: any) => void
}

const expiryOptions = [
  { value: 1, label: '1 د' },
  { value: 2, label: '2 د' },
  { value: 5, label: '5 د' },
  { value: 10, label: '10 د' },
  { value: 15, label: '15 د' },
  { value: 30, label: '30 د' },
]

const quickAmounts = [1, 5, 10, 25, 50, 100]

const EO_API = 'http://localhost:3004'

export function TradingPanel({ emit }: TradingPanelProps) {
  const { selectedPair, prices, balance, eoConnection, eoPlaceTrade } = useTradingStore()
  const isLoggedIn = eoConnection.isLoggedIn
  const [amount, setAmount] = useState('10')
  const [expiryMinutes, setExpiryMinutes] = useState(1)
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell' | null>(null)

  const currentPrice = prices[selectedPair]
  const payoutPercent = currentPrice?.payoutPercent || 82

  // Options-style calculation: investment × payout% = profit
  const tradeAmount = parseFloat(amount) || 0
  const potentialProfit = tradeAmount * (payoutPercent / 100)
  const totalReturn = tradeAmount + potentialProfit // Investment + Profit
  const potentialLoss = tradeAmount // Lose the full investment

  // Clamp amount to $1-$100
  const handleAmountChange = (val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) {
      setAmount('')
    } else if (num > 100) {
      setAmount('100')
    } else if (num < 0) {
      setAmount('1')
    } else {
      setAmount(val)
    }
  }

  const handleTrade = async (direction: 'buy' | 'sell') => {
    if (!currentPrice) return
    const amt = Math.min(Math.max(parseFloat(amount) || 1, 1), 100)
    setTradeDirection(direction)

    if (isLoggedIn) {
      // Real trade via Python bridge
      const success = await eoPlaceTrade(selectedPair, direction, amt, expiryMinutes)
      if (!success) {
        setTradeDirection(null)
        return
      }
    } else {
      // Simulated trade via WS
      emit('manual-trade', {
        pair: selectedPair,
        direction,
        amount: amt,
        payoutPercent,
        expiryMinutes
      })
    }

    setTimeout(() => setTradeDirection(null), 1500)
  }

  return (
    <Card className="border-[#3A4568] bg-[#2D3651]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm text-[#F5F5F5]">
          <span className="font-bold">{selectedPair}</span>
          <Badge variant="outline" className="text-[10px] text-[#57BC9A] border-[#57BC9A]/40 bg-[#57BC9A]/10">
            رصيد: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {/* CALL / PUT Price Display */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#57BC9A]/10 border border-[#57BC9A]/30 rounded-lg p-2 text-center">
            <div className="text-[10px] text-[#57BC9A] font-bold mb-0.5">CALL ▲</div>
            <div className="text-base font-mono font-bold text-[#57BC9A]">
              {currentPrice ? currentPrice.price.toFixed(currentPrice.digits) : '-'}
            </div>
          </div>
          <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-2 text-center">
            <div className="text-[10px] text-[#D0011B] font-bold mb-0.5">PUT ▼</div>
            <div className="text-base font-mono font-bold text-[#D0011B]">
              {currentPrice ? currentPrice.price.toFixed(currentPrice.digits) : '-'}
            </div>
          </div>
        </div>

        {/* Investment Amount - Options Style */}
        <div>
          <label className="text-[10px] text-[#A9B5CB] mb-1 block font-medium">مبلغ الصفقة ($)</label>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-[#3A4568] bg-[#20283D] text-[#D0011B] hover:bg-[#D0011B]/10 hover:text-[#D0011B] font-bold text-sm"
              onClick={() => {
                const v = Math.max(1, (parseFloat(amount) || 1) - 1)
                setAmount(String(v))
              }}
            >
              −
            </Button>
            <div className="flex-1 relative">
              <Input
                type="number"
                min={1}
                max={100}
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="font-mono text-center font-bold bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-8 text-sm"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#A9B5CB]">$</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-[#3A4568] bg-[#20283D] text-[#57BC9A] hover:bg-[#57BC9A]/10 hover:text-[#57BC9A] font-bold text-sm"
              onClick={() => {
                const v = Math.min(100, (parseFloat(amount) || 1) + 1)
                setAmount(String(v))
              }}
            >
              +
            </Button>
          </div>
          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-6 gap-1 mt-1.5">
            {quickAmounts.map((qa) => (
              <button
                key={qa}
                onClick={() => setAmount(String(qa))}
                className={`text-[10px] py-1 rounded border transition-all font-bold ${
                  amount === String(qa)
                    ? 'bg-[#2F96F0] text-white border-[#2F96F0] shadow-sm shadow-[#2F96F0]/30'
                    : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB] hover:bg-[#2D3651] hover:border-[#2F96F0]/40'
                }`}
              >
                ${qa}
              </button>
            ))}
          </div>
          {/* Step buttons for quick adjustments */}
          <div className="flex gap-1 mt-1">
            {[
              { step: 1, label: '+1' },
              { step: 5, label: '+5' },
              { step: 10, label: '+10' },
              { step: 25, label: '+25' },
              { step: 50, label: '+50' },
            ].map(({ step, label }) => (
              <button
                key={step}
                onClick={() => {
                  const v = Math.min(100, (parseFloat(amount) || 1) + step)
                  setAmount(String(v))
                }}
                className="flex-1 text-[9px] py-0.5 rounded bg-[#20283D] border border-[#3A4568] text-[#A9B5CB] hover:bg-[#2D3651] hover:text-[#57BC9A] transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry Time */}
        <div>
          <label className="text-[10px] text-[#A9B5CB] mb-1 block font-medium">وقت الانتهاء</label>
          <div className="grid grid-cols-6 gap-1">
            {expiryOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setExpiryMinutes(opt.value)}
                className={`text-[10px] py-1.5 rounded border transition-all font-bold ${
                  expiryMinutes === opt.value
                    ? 'bg-[#2F96F0] text-white border-[#2F96F0] shadow-sm shadow-[#2F96F0]/30'
                    : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB] hover:bg-[#2D3651]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Info - Options Style */}
        <div className="bg-[#20283D] rounded-lg p-2 border border-[#3A4568]">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-[#A9B5CB]">نسبة العائد</span>
            <span className="text-[#2F96F0] font-bold">{payoutPercent}%</span>
          </div>
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-[#57BC9A]">صافي الربح</span>
            <span className="text-[#57BC9A] font-bold font-mono">+${potentialProfit.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-[#A9B5CB]">إجمالي العائد</span>
            <span className="text-[#F5F5F5] font-bold font-mono">${totalReturn.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#D0011B]">الخسارة المحتملة</span>
            <span className="text-[#D0011B] font-bold font-mono">-${potentialLoss.toFixed(2)}</span>
          </div>
        </div>

        {/* CALL / PUT Buttons - Expert Option Style */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleTrade('buy')}
            disabled={tradeDirection !== null || tradeAmount < 1 || tradeAmount > 100}
            className="bg-[#57BC9A] hover:bg-[#4AA88B] text-white font-bold h-14 text-sm transition-all rounded-lg flex flex-col items-center justify-center gap-0.5 border-0 shadow-lg shadow-[#57BC9A]/20"
          >
            <span className="text-xs">▲ CALL</span>
            <span className="text-[10px] font-normal opacity-90">ربح +${potentialProfit.toFixed(2)}</span>
          </Button>
          <Button
            onClick={() => handleTrade('sell')}
            disabled={tradeDirection !== null || tradeAmount < 1 || tradeAmount > 100}
            className="bg-[#D0011B] hover:bg-[#B80118] text-white font-bold h-14 text-sm transition-all rounded-lg flex flex-col items-center justify-center gap-0.5 border-0 shadow-lg shadow-[#D0011B]/20"
          >
            <span className="text-xs">▼ PUT</span>
            <span className="text-[10px] font-normal opacity-90">ربح +${potentialProfit.toFixed(2)}</span>
          </Button>
        </div>

        {tradeDirection && (
          <div className={`text-center text-xs font-bold py-1 rounded-lg ${tradeDirection === 'buy' ? 'text-[#57BC9A] bg-[#57BC9A]/10' : 'text-[#D0011B] bg-[#D0011B]/10'}`}>
            {tradeDirection === 'buy' ? '✓ تم فتح صفقة CALL' : '✓ تم فتح صفقة PUT'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
