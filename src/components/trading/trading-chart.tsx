'use client'

import { useMemo } from 'react'
import { useTradingStore, type Candle } from '@/store/trading-store'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export function TradingChart() {
  const { candles, selectedPair, prices, chartType } = useTradingStore()
  const pairCandles = candles[selectedPair] || []
  const currentPrice = prices[selectedPair]?.price || 0
  const digits = prices[selectedPair]?.digits || 5

  const chartData = useMemo(() => {
    if (chartType === 'line') {
      return pairCandles.map((c: Candle) => ({
        time: new Date(c.time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        price: c.close,
        volume: c.volume
      }))
    }

    return pairCandles.map((c: Candle) => {
      const isUp = c.close >= c.open
      return {
        time: new Date(c.time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        body: isUp ? [c.open, c.close] : [c.close, c.open],
        wick: [c.low, c.high],
        isUp,
        volume: c.volume,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }
    })
  }, [pairCandles, chartType])

  const priceDomain = useMemo(() => {
    if (pairCandles.length === 0) return ['auto', 'auto']
    const allPrices = pairCandles.flatMap((c: Candle) => [c.high, c.low])
    const min = Math.min(...allPrices)
    const max = Math.max(...allPrices)
    const padding = (max - min) * 0.1
    return [min - padding, max + padding]
  }, [pairCandles])

  if (pairCandles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#A9B5CB]">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>Loading chart data...</p>
        </div>
      </div>
    )
  }

  // Expert Option colors
  const EO_GREEN = '#57BC9A'
  const EO_RED = '#D0011B'
  const EO_BLUE = '#2F96F0'
  const EO_GRID = '#3A4568'
  const EO_TEXT = '#A9B5CB'

  if (chartType === 'line') {
    return (
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height="80%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: EO_TEXT }} tickLine={{ stroke: EO_GRID }} axisLine={{ stroke: EO_GRID }} interval="preserveStartEnd" />
            <YAxis domain={priceDomain} tick={{ fontSize: 9, fill: EO_TEXT }} tickLine={{ stroke: EO_GRID }} axisLine={{ stroke: EO_GRID }} tickFormatter={(v: number) => v.toFixed(digits)} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6, backgroundColor: '#2D3651', border: '1px solid #3A4568', color: '#F5F5F5' }}
              formatter={(value: number) => [value.toFixed(digits), 'Price']}
            />
            <Line type="monotone" dataKey="price" stroke={EO_GREEN} dot={false} strokeWidth={2} />
            <ReferenceLine y={currentPrice} stroke={EO_BLUE} strokeDasharray="3 3" strokeWidth={1} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="px-4">
          <ResponsiveContainer width="100%" height="18%">
            <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 7, fill: EO_TEXT }} />
              <Bar dataKey="volume" fill={EO_BLUE} opacity={0.4} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="80%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: EO_TEXT }} tickLine={{ stroke: EO_GRID }} axisLine={{ stroke: EO_GRID }} interval="preserveStartEnd" />
          <YAxis domain={priceDomain} tick={{ fontSize: 9, fill: EO_TEXT }} tickLine={{ stroke: EO_GRID }} axisLine={{ stroke: EO_GRID }} tickFormatter={(v: number) => v.toFixed(digits)} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6, backgroundColor: '#2D3651', border: '1px solid #3A4568', color: '#F5F5F5' }}
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null
              const d = payload[0]?.payload
              if (!d) return null
              return (
                <div className="bg-[#2D3651] border border-[#3A4568] rounded-md p-2 text-[11px] shadow-lg text-[#F5F5F5]">
                  <div className="font-bold mb-1">{d.time}</div>
                  <div className="grid grid-cols-2 gap-x-3">
                    <span className="text-[#A9B5CB]">O:</span><span className="font-mono">{d.open?.toFixed(digits)}</span>
                    <span className="text-[#A9B5CB]">H:</span><span className="font-mono text-[#57BC9A]">{d.high?.toFixed(digits)}</span>
                    <span className="text-[#A9B5CB]">L:</span><span className="font-mono text-[#D0011B]">{d.low?.toFixed(digits)}</span>
                    <span className="text-[#A9B5CB]">C:</span><span className="font-mono">{d.close?.toFixed(digits)}</span>
                    <span className="text-[#A9B5CB]">Vol:</span><span className="font-mono">{d.volume}</span>
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="body" shape={(props: any) => {
            const { x, y, width, height, payload } = props
            if (!payload) return null
            const color = payload.isUp ? EO_GREEN : EO_RED
            return (
              <g>
                <line
                  x1={x + width / 2}
                  y1={y - 2}
                  x2={x + width / 2}
                  y2={y + height + 2}
                  stroke={color}
                  strokeWidth={1}
                />
                <rect
                  x={x}
                  y={y}
                  width={Math.max(width, 2)}
                  height={Math.max(height, 1)}
                  fill={color}
                  rx={1}
                />
              </g>
            )
          }} />
          <ReferenceLine y={currentPrice} stroke={EO_BLUE} strokeDasharray="3 3" strokeWidth={1} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="px-4">
        <ResponsiveContainer width="100%" height="18%">
          <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 7, fill: EO_TEXT }} />
            <Bar dataKey="volume" fill={EO_BLUE} opacity={0.4} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
