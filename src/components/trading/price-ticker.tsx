'use client'

import { useTradingStore, type PriceData } from '@/store/trading-store'

const pairIcons: Record<string, string> = {
  'EUR/USD': '🇪🇺🇺🇸',
  'GBP/USD': '🇬🇧🇺🇸',
  'USD/JPY': '🇺🇸🇯🇵',
  'AUD/USD': '🇦🇺🇺🇸',
  'USD/CAD': '🇺🇸🇨🇦',
  'EUR/GBP': '🇪🇺🇬🇧',
  'USD/CHF': '🇺🇸🇨🇭',
  'NZD/USD': '🇳🇿🇺🇸',
}

export function PriceTicker() {
  const { prices, selectedPair, setSelectedPair } = useTradingStore()
  const priceList = Object.values(prices)

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
      {priceList.map((p: PriceData) => {
        const isUp = p.price >= p.prevPrice
        const isSelected = p.symbol === selectedPair
        return (
          <button
            key={p.symbol}
            onClick={() => setSelectedPair(p.symbol)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg transition-all duration-200 border ${
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card hover:bg-accent border-border'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{pairIcons[p.symbol] || '💱'}</span>
              <span className="font-bold text-xs">{p.symbol}</span>
            </div>
            <div className={`text-sm font-mono font-bold mt-0.5 ${isSelected ? '' : isUp ? 'text-emerald-500' : 'text-red-500'}`}>
              {p.price.toFixed(p.digits)}
            </div>
            <div className={`text-[10px] font-medium ${p.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {p.change24h >= 0 ? '▲' : '▼'} {Math.abs(p.change24h).toFixed(2)}%
            </div>
          </button>
        )
      })}
    </div>
  )
}
