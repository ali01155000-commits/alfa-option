'use client'

import { useState } from 'react'
import { useTradingStore, type PriceData } from '@/store/trading-store'

const pairIcons: Record<string, string> = {
  'EUR/USD': '🇪🇺🇺🇸',
  'GBP/USD': '🇬🇧🇺🇸',
  'USD/JPY': '🇺🇸🇯🇵',
  'AUD/USD': '🇦🇺🇺🇸',
  'USD/CAD': '🇺🇸🇨🇩',
  'EUR/GBP': '🇪🇺🇬🇧',
  'USD/CHF': '🇺🇸🇨🇭',
  'NZD/USD': '🇳🇿🇺🇸',
  'EUR/JPY': '🇪🇺🇯🇵',
  'GBP/JPY': '🇬🇧🇯🇵',
  'EUR/AUD': '🇪🇺🇦🇺',
  'EUR/CHF': '🇪🇺🇨🇭',
  'GBP/AUD': '🇬🇧🇦🇺',
  'AUD/JPY': '🇦🇺🇯🇵',
  'CHF/JPY': '🇨🇭🇯🇵',
  'USD/TRY': '🇺🇸🇹🇷',
  'USD/ZAR': '🇺🇸🇿🇦',
  'USD/SGD': '🇺🇸🇸🇬',
  'USD/HKD': '🇺🇸🇭🇰',
  'EUR/TRY': '🇪🇺🇹🇷',
  'BTC/USD': '₿$',
  'ETH/USD': 'Ξ$',
}

const categories = [
  { key: 'major', label: 'رئيسية' },
  { key: 'minor', label: 'فرعية' },
  { key: 'exotic', label: 'نادرة' },
  { key: 'crypto', label: 'كريبتو' },
]

export function PriceTicker() {
  const { prices, selectedPair, setSelectedPair } = useTradingStore()
  const [activeCategory, setActiveCategory] = useState('major')
  const priceList = Object.values(prices)

  const filteredPrices = activeCategory === 'all'
    ? priceList
    : priceList.filter((p: PriceData) => p.category === activeCategory)

  return (
    <div className="space-y-1.5">
      {/* Category Tabs */}
      <div className="flex gap-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-[#2F96F0] text-white'
                : 'bg-[#20283D] text-[#A9B5CB] hover:bg-[#2D3651]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Price Pairs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {filteredPrices.map((p: PriceData) => {
          const isUp = p.price >= p.prevPrice
          const isSelected = p.symbol === selectedPair
          return (
            <button
              key={p.symbol}
              onClick={() => setSelectedPair(p.symbol)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded transition-all duration-150 border ${
                isSelected
                  ? 'bg-[#2F96F0] text-white border-[#2F96F0]'
                  : 'bg-[#20283D] hover:bg-[#2D3651] border-[#3A4568]'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px]">{pairIcons[p.symbol] || '💱'}</span>
                <span className="font-bold text-[10px]">{p.symbol}</span>
              </div>
              <div className={`text-xs font-mono font-bold mt-0.5 ${isSelected ? 'text-white' : isUp ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>
                {p.price.toFixed(p.digits)}
              </div>
              <div className={`text-[9px] font-medium ${isSelected ? 'text-white/80' : p.change24h >= 0 ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>
                {p.change24h >= 0 ? '▲' : '▼'} {Math.abs(p.change24h).toFixed(2)}%
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
