import { create } from 'zustand'

// ============ TYPES (Options Trading Model) ============
export interface PriceData {
  symbol: string
  name?: string
  price: number
  prevPrice: number
  high24h: number
  low24h: number
  change24h: number
  spread: number
  digits: number
  pipSize?: number
  category?: string
  payoutPercent?: number
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
  payoutPercent: number
  expiryTime: number
  expiryMinutes: number
  strategy: string
  timestamp: number
}

export interface ClosedTrade extends TradeData {
  exitPrice: number
  pnl: number
  won: boolean
}

export interface StrategyConfig {
  name: string
  type: string
  active: boolean
  pair: string
  expiryMinutes: number
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

// Expert Option connection state
export interface EOConnection {
  isLoggedIn: boolean
  isDemo: boolean
  token: string
  realBalance: number
  autoTrading: boolean
  dailyPnl: number
}

// ============ STORE ============
interface TradingStore {
  // Connection
  isConnected: boolean
  setConnected: (val: boolean) => void

  // Expert Option connection
  eoConnection: EOConnection
  setEOConnection: (conn: Partial<EOConnection>) => void
  eoLogin: (email: string, password: string, isDemo: boolean) => Promise<boolean>
  eoLogout: () => Promise<void>
  eoRefreshProfile: () => Promise<void>
  eoPlaceTrade: (pair: string, direction: 'buy' | 'sell', amount: number, expiryMinutes: number) => Promise<boolean>
  eoToggleAutoTrading: (enabled: boolean) => Promise<void>

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

// Dynamic API URL - works both locally and online (Caddy proxies /api/* → port 3004)
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3004'
  // In production, Caddy routes /api/* and /ws to the correct services
  return window.location.origin
}
const EO_API = getApiUrl()

export const useTradingStore = create<TradingStore>((set, get) => ({
  // Connection
  isConnected: false,
  setConnected: (val) => set({ isConnected: val }),

  // Expert Option connection
  eoConnection: {
    isLoggedIn: false,
    isDemo: true,
    token: '',
    realBalance: 0,
    autoTrading: false,
    dailyPnl: 0,
  },
  setEOConnection: (conn) => set((state) => ({
    eoConnection: { ...state.eoConnection, ...conn }
  })),
  
  // Auto-login: email + password → Playwright gets token automatically
  eoLogin: async (email, password, isDemo) => {
    try {
      const res = await fetch(`${EO_API}/api/login-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, is_demo: isDemo }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Auto-login failed' }))
        throw new Error(err.detail || 'Login failed')
      }
      const data = await res.json()
      set({
        eoConnection: {
          isLoggedIn: true,
          isDemo,
          token: 'auto-login',
          realBalance: data.balance || 10000,
          autoTrading: false,
          dailyPnl: 0,
        },
        balance: data.balance || 10000,
      })
      return true
    } catch (e) {
      console.error('EO Auto-Login error:', e)
      set({
        eoConnection: {
          isLoggedIn: false,
          isDemo: true,
          token: '',
          realBalance: 0,
          autoTrading: false,
          dailyPnl: 0,
        }
      })
      return false
    }
  },

  eoLogout: async () => {
    try {
      await fetch(`${EO_API}/api/logout`, { method: 'POST' })
    } catch {}
    set({
      eoConnection: {
        isLoggedIn: false,
        isDemo: true,
        token: '',
        realBalance: 0,
        autoTrading: false,
        dailyPnl: 0,
      }
    })
  },

  eoRefreshProfile: async () => {
    try {
      const res = await fetch(`${EO_API}/api/profile`)
      if (res.ok) {
        const data = await res.json()
        set((state) => ({
          eoConnection: { ...state.eoConnection, realBalance: data.balance },
          balance: data.balance,
        }))
      }
    } catch {}
  },

  eoPlaceTrade: async (pair, direction, amount, expiryMinutes) => {
    try {
      const res = await fetch(`${EO_API}/api/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair, direction, amount, expiryMinutes }),
      })
      if (!res.ok) return false
      return true
    } catch {
      return false
    }
  },

  eoToggleAutoTrading: async (enabled) => {
    try {
      await fetch(`${EO_API}/api/auto-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      set((state) => ({
        eoConnection: { ...state.eoConnection, autoTrading: enabled },
        botConfig: { ...state.botConfig, enabled },
      }))
    } catch {}
  },

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
    maxDailyLoss: 50,
    maxDailyProfit: 100,
    riskPerTrade: 2,
    trailingStop: false,
    trailingStopPct: 1.5
  },
  setBotConfig: (config) => set({ botConfig: config }),

  // Account
  balance: 1000,
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
