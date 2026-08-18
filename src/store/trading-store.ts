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

// ============ ALFA COINS SYSTEM ============
export interface AlfaCoinProtectionFund {
  id: string
  coins: number           // How many Alfa Coins in this fund
  remaining: number       // Remaining coins (used for protection)
  earnedAtTrade: number   // At which trade count this was earned
  timestamp: number       // When earned
  isActive: boolean       // Whether this fund is currently being used
}

export interface AlfaCoinTransaction {
  id: string
  type: 'earned' | 'protection_used' | 'protection_refund' | 'bonus'
  amount: number
  description: string
  timestamp: number
  tradeId?: string
}

export interface AlfaCoinState {
  totalCoins: number                              // Total Alfa Coins balance
  totalTradesCount: number                        // Total trades ever made
  tradesSinceLastReward: number                   // Trades since last 100-trade milestone
  nextRewardAt: number                            // Next reward at this many trades (100, 200, 300...)
  coinsPerReward: number                          // Alfa Coins per 100 trades (default: 100)
  protectionFunds: AlfaCoinProtectionFund[]       // All protection funds earned
  transactions: AlfaCoinTransaction[]             // History of coin movements
  protectionEnabled: boolean                      // Auto-protection on/off
  protectionThreshold: number                     // Use coins when loss exceeds this % (default: 50%)
}

// ============ ACTIVATION CODE ============
export interface ActivationState {
  isActivated: boolean
  activationCode: string
  activationDate: number | null
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
  activeView: 'chart' | 'trades' | 'bot' | 'protection' | 'settings'
  setActiveView: (view: 'chart' | 'trades' | 'bot' | 'protection' | 'settings') => void

  // Chart type
  chartType: 'candle' | 'line'
  setChartType: (type: 'candle' | 'line') => void

  // Activation
  activation: ActivationState
  setActivation: (code: string) => void
  verifyActivation: (code: string) => Promise<boolean>

  // Alfa Coins
  alfaCoins: AlfaCoinState
  processTradeForAlfaCoins: (trade: ClosedTrade) => void
  useAlfaCoinProtection: (lossAmount: number) => number
  toggleProtection: (enabled: boolean) => void
  setProtectionThreshold: (threshold: number) => void
}

// Dynamic API URL - works both locally and online (Caddy proxies /api/* → port 3004)
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3004'
  return window.location.origin
}
const EO_API = getApiUrl()

// Helper: generate unique ID
const uid = () => Math.random().toString(36).substring(2, 10)

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
  addClosedTrade: (trade) => set((state) => {
    // Process Alfa Coins when a trade closes
    const currentState = get()
    const newAlfaCoins = processAlfaCoinsForTrade(currentState.alfaCoins, trade)
    return {
      tradeHistory: [trade, ...state.tradeHistory].slice(0, 100),
      alfaCoins: newAlfaCoins,
    }
  }),

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

  // Activation
  activation: {
    isActivated: false,
    activationCode: '',
    activationDate: null,
  },
  setActivation: (code) => set({
    activation: {
      isActivated: true,
      activationCode: code,
      activationDate: Date.now(),
    }
  }),
  verifyActivation: async (code) => {
    // Check activation code — uses /auth/ path so Caddy routes to Next.js (port 3000)
    // NOT /api/ which Caddy routes to EO Bridge (port 3004)
    try {
      // Use relative URL so it works through Caddy gateway and directly
      const res = await fetch('/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.valid) {
          set({
            activation: {
              isActivated: true,
              activationCode: code,
              activationDate: Date.now(),
            }
          })
          return true
        }
      }
      return false
    } catch {
      // If API not available (offline etc), accept any code starting with "ALFA-" for demo
      if (code.startsWith('ALFA-') && code.length >= 8) {
        set({
          activation: {
            isActivated: true,
            activationCode: code,
            activationDate: Date.now(),
          }
        })
        return true
      }
      return false
    }
  },

  // Alfa Coins initial state
  alfaCoins: {
    totalCoins: 0,
    totalTradesCount: 0,
    tradesSinceLastReward: 0,
    nextRewardAt: 100,
    coinsPerReward: 100,
    protectionFunds: [],
    transactions: [],
    protectionEnabled: true,
    protectionThreshold: 50,
  },

  // Process a trade for Alfa Coins rewards
  processTradeForAlfaCoins: (trade) => {
    const state = get()
    const newAlfaCoins = processAlfaCoinsForTrade(state.alfaCoins, trade)
    set({ alfaCoins: newAlfaCoins })
  },

  // Use Alfa Coins for protection against a loss
  useAlfaCoinProtection: (lossAmount) => {
    const state = get()
    const { alfaCoins } = state
    
    if (!alfaCoins.protectionEnabled || alfaCoins.totalCoins <= 0) return 0

    // Calculate how many coins to use (1 coin = $0.10 protection)
    const maxProtection = alfaCoins.totalCoins * 0.10
    const protectionAmount = Math.min(lossAmount * (alfaCoins.protectionThreshold / 100), maxProtection)
    const coinsUsed = Math.ceil(protectionAmount / 0.10)

    if (coinsUsed <= 0) return 0

    set({
      alfaCoins: {
        ...alfaCoins,
        totalCoins: Math.max(0, alfaCoins.totalCoins - coinsUsed),
        protectionFunds: alfaCoins.protectionFunds.map(f => {
          if (f.isActive && f.remaining > 0) {
            const used = Math.min(f.remaining, coinsUsed)
            return { ...f, remaining: f.remaining - used }
          }
          return f
        }),
        transactions: [
          {
            id: uid(),
            type: 'protection_used',
            amount: -coinsUsed,
            description: `استخدام ${coinsUsed} كوين الفا لحماية خسارة $${lossAmount.toFixed(2)}`,
            timestamp: Date.now(),
          },
          ...alfaCoins.transactions,
        ].slice(0, 200),
      }
    })

    return protectionAmount
  },

  toggleProtection: (enabled) => set((state) => ({
    alfaCoins: { ...state.alfaCoins, protectionEnabled: enabled }
  })),

  setProtectionThreshold: (threshold) => set((state) => ({
    alfaCoins: { ...state.alfaCoins, protectionThreshold: threshold }
  })),
}))

// ============ HELPER: Process Alfa Coins for a closed trade ============
function processAlfaCoinsForTrade(currentState: AlfaCoinState, trade: ClosedTrade): AlfaCoinState {
  const newTradesCount = currentState.totalTradesCount + 1
  const newTradesSinceReward = currentState.tradesSinceLastReward + 1

  // Check if we hit a 100-trade milestone
  let newCoins = currentState.totalCoins
  let newFunds = [...currentState.protectionFunds]
  let newTransactions = [...currentState.transactions]
  let newNextReward = currentState.nextRewardAt

  if (newTradesCount >= currentState.nextRewardAt) {
    // Earned a new protection fund!
    const earnedCoins = currentState.coinsPerReward
    newCoins += earnedCoins
    newNextReward = currentState.nextRewardAt + 100

    const fund: AlfaCoinProtectionFund = {
      id: uid(),
      coins: earnedCoins,
      remaining: earnedCoins,
      earnedAtTrade: newTradesCount,
      timestamp: Date.now(),
      isActive: true,
    }
    newFunds.push(fund)

    newTransactions.unshift({
      id: uid(),
      type: 'earned',
      amount: earnedCoins,
      description: `كسب ${earnedCoins} كوين الفا — مكافأة ${currentState.nextRewardAt} صفقة!`,
      timestamp: Date.now(),
    })
  }

  // Auto-protect against losses
  if (!trade.won && currentState.protectionEnabled && newCoins > 0) {
    const lossAmount = trade.amount // The investment amount lost
    const maxProtection = newCoins * 0.10 // 1 Alfa Coin = $0.10 protection
    const protectionAmount = Math.min(lossAmount * 0.5, maxProtection) // Protect up to 50% of loss
    const coinsUsed = Math.ceil(protectionAmount / 0.10)

    if (coinsUsed > 0 && coinsUsed <= newCoins) {
      newCoins -= coinsUsed
      newTransactions.unshift({
        id: uid(),
        type: 'protection_used',
        amount: -coinsUsed,
        description: `حماية تلقائية: استخدام ${coinsUsed} كوين الفا — تعويض $${protectionAmount.toFixed(2)} من خسارة $${lossAmount.toFixed(2)}`,
        timestamp: Date.now(),
        tradeId: trade.id,
      })
    }
  }

  return {
    ...currentState,
    totalCoins: newCoins,
    totalTradesCount: newTradesCount,
    tradesSinceLastReward: newTradesCount >= currentState.nextRewardAt ? 0 : newTradesSinceReward,
    nextRewardAt: newNextReward,
    protectionFunds: newFunds,
    transactions: newTransactions.slice(0, 200),
  }
}
