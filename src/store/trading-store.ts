import { create } from 'zustand'

// ============ TYPES ============
export interface PriceData {
  symbol: string
  price: number
  prevPrice: number
  high24h: number
  low24h: number
  change24h: number
  spread: number
  digits: number
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TradeData {
  id: string
  pair: string
  direction: 'buy' | 'sell'
  entryPrice: number
  amount: number
  takeProfit: number
  stopLoss: number
  strategy: string
  timestamp: number
}

export interface ClosedTrade extends TradeData {
  exitPrice: number
  pnl: number
}

export interface StrategyConfig {
  name: string
  type: string
  active: boolean
  pair: string
  takeProfit: number
  stopLoss: number
  maxTrades: number
  amountPerTrade: number
  params: Record<string, any>
}

export interface BotConfig {
  enabled: boolean
  maxConcurrentTrades: number
  maxDailyLoss: number
  maxDailyProfit: number
  riskPerTrade: number
  trailingStop: boolean
  trailingStopPct: number
}

// ============ STORE ============
interface TradingStore {
  // Connection
  isConnected: boolean
  setConnected: (val: boolean) => void

  // Prices
  prices: Record<string, PriceData>
  setPrices: (prices: Record<string, PriceData>) => void
  updatePrice: (symbol: string, data: PriceData) => void

  // Candles
  candles: Record<string, Candle[]>
  setCandles: (data: Record<string, Candle[]>) => void
  updateCandles: (pair: string, candles: Candle[]) => void

  // Selected pair
  selectedPair: string
  setSelectedPair: (pair: string) => void

  // Trades
  openTrades: TradeData[]
  addOpenTrade: (trade: TradeData) => void
  removeOpenTrade: (id: string) => void

  // Closed trades history
  tradeHistory: ClosedTrade[]
  addClosedTrade: (trade: ClosedTrade) => void

  // Strategies
  strategies: Record<string, StrategyConfig>
  setStrategies: (strategies: Record<string, StrategyConfig>) => void

  // Bot config
  botConfig: BotConfig
  setBotConfig: (config: BotConfig) => void

  // Account
  balance: number
  setBalance: (val: number) => void
  totalPnL: number
  setTotalPnL: (val: number) => void

  // Active view
  activeView: 'chart' | 'trades' | 'bot' | 'settings'
  setActiveView: (view: 'chart' | 'trades' | 'bot' | 'settings') => void

  // Chart type
  chartType: 'candle' | 'line'
  setChartType: (type: 'candle' | 'line') => void
}

export const useTradingStore = create<TradingStore>((set) => ({
  // Connection
  isConnected: false,
  setConnected: (val) => set({ isConnected: val }),

  // Prices
  prices: {},
  setPrices: (prices) => set({ prices }),
  updatePrice: (symbol, data) => set((state) => ({
    prices: { ...state.prices, [symbol]: data }
  })),

  // Candles
  candles: {},
  setCandles: (data) => set({ candles: data }),
  updateCandles: (pair, candles) => set((state) => ({
    candles: { ...state.candles, [pair]: candles }
  })),

  // Selected pair
  selectedPair: 'EUR/USD',
  setSelectedPair: (pair) => set({ selectedPair: pair }),

  // Trades
  openTrades: [],
  addOpenTrade: (trade) => set((state) => ({
    openTrades: [...state.openTrades, trade]
  })),
  removeOpenTrade: (id) => set((state) => ({
    openTrades: state.openTrades.filter(t => t.id !== id)
  })),

  // Closed trades
  tradeHistory: [],
  addClosedTrade: (trade) => set((state) => ({
    tradeHistory: [trade, ...state.tradeHistory].slice(0, 100)
  })),

  // Strategies
  strategies: {},
  setStrategies: (strategies) => set({ strategies }),

  // Bot config
  botConfig: {
    enabled: false,
    maxConcurrentTrades: 3,
    maxDailyLoss: 500,
    maxDailyProfit: 1000,
    riskPerTrade: 2,
    trailingStop: false,
    trailingStopPct: 1.5
  },
  setBotConfig: (config) => set({ botConfig: config }),

  // Account
  balance: 10000,
  setBalance: (val) => set({ balance: val }),
  totalPnL: 0,
  setTotalPnL: (val) => set({ totalPnL: val }),

  // Active view
  activeView: 'chart',
  setActiveView: (view) => set({ activeView: view }),

  // Chart type
  chartType: 'candle',
  setChartType: (type) => set({ chartType: type }),
}))
