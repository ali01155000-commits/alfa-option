import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============ CURRENCY PAIRS CONFIG ============
interface CurrencyPair {
  symbol: string
  name: string
  price: number
  prevPrice: number
  high24h: number
  low24h: number
  change24h: number
  spread: number
  pipSize: number
  digits: number
}

const initialPairs: CurrencyPair[] = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: 1.0856, prevPrice: 1.0856, high24h: 1.0892, low24h: 1.0821, change24h: 0.12, spread: 0.00012, pipSize: 0.0001, digits: 5 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', price: 1.2734, prevPrice: 1.2734, high24h: 1.2781, low24h: 1.2695, change24h: -0.08, spread: 0.00015, pipSize: 0.0001, digits: 5 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', price: 149.82, prevPrice: 149.82, high24h: 150.15, low24h: 149.20, change24h: 0.25, spread: 0.015, pipSize: 0.01, digits: 3 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', price: 0.6542, prevPrice: 0.6542, high24h: 0.6578, low24h: 0.6515, change24h: -0.15, spread: 0.00014, pipSize: 0.0001, digits: 5 },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', price: 1.3645, prevPrice: 1.3645, high24h: 1.3682, low24h: 1.3608, change24h: 0.09, spread: 0.00016, pipSize: 0.0001, digits: 5 },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', price: 0.8525, prevPrice: 0.8525, high24h: 0.8558, low24h: 0.8492, change24h: 0.05, spread: 0.00013, pipSize: 0.0001, digits: 5 },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', price: 0.8823, prevPrice: 0.8823, high24h: 0.8856, low24h: 0.8789, change24h: -0.03, spread: 0.00015, pipSize: 0.0001, digits: 5 },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', price: 0.5987, prevPrice: 0.5987, high24h: 0.6025, low24h: 0.5958, change24h: 0.18, spread: 0.00018, pipSize: 0.0001, digits: 5 },
]

const pairs = new Map<string, CurrencyPair>()
initialPairs.forEach(p => pairs.set(p.symbol, { ...p }))

// ============ CANDLESTICK DATA ============
interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const candleHistory = new Map<string, Candle[]>()

// Initialize candle history for each pair
for (const [symbol, pair] of pairs) {
  const history: Candle[] = []
  const now = Date.now()
  let price = pair.price
  
  for (let i = 100; i >= 0; i--) {
    const time = now - i * 60000 // 1-minute candles
    const volatility = pair.pipSize * (3 + Math.random() * 8)
    const open = price
    const change1 = (Math.random() - 0.5) * volatility * 2
    const change2 = (Math.random() - 0.5) * volatility * 2
    const close = open + change1
    const high = Math.max(open, close) + Math.abs(change2)
    const low = Math.min(open, close) - Math.abs(change2)
    const volume = Math.floor(100 + Math.random() * 900)
    
    history.push({ time, open, high, low, close, volume })
    price = close
  }
  
  candleHistory.set(symbol, history)
}

// ============ PRICE SIMULATION ============
function updatePrices() {
  for (const [symbol, pair] of pairs) {
    pair.prevPrice = pair.price
    
    // Random walk with mean reversion
    const volatility = pair.pipSize * (0.5 + Math.random() * 2)
    const meanReversion = (initialPairs.find(p => p.symbol === symbol)!.price - pair.price) * 0.001
    const change = (Math.random() - 0.5) * volatility + meanReversion
    
    pair.price += change
    pair.high24h = Math.max(pair.high24h, pair.price)
    pair.low24h = Math.min(pair.low24h, pair.price)
    pair.change24h = ((pair.price - initialPairs.find(p => p.symbol === symbol)!.price) / initialPairs.find(p => p.symbol === symbol)!.price) * 100
  }
}

function updateCandles() {
  const now = Date.now()
  
  for (const [symbol, pair] of pairs) {
    const history = candleHistory.get(symbol)!
    const lastCandle = history[history.length - 1]
    
    if (now - lastCandle.time >= 60000) {
      // Create new candle
      history.push({
        time: now,
        open: pair.price,
        high: pair.price,
        low: pair.price,
        close: pair.price,
        volume: Math.floor(50 + Math.random() * 200)
      })
      if (history.length > 200) history.shift()
    } else {
      // Update current candle
      const current = history[history.length - 1]
      current.close = pair.price
      current.high = Math.max(current.high, pair.price)
      current.low = Math.min(current.low, pair.price)
      current.volume += Math.floor(Math.random() * 5)
    }
  }
}

// ============ AUTO TRADING ENGINE ============
interface AutoTrade {
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

interface StrategyConfig {
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

interface BotConfig {
  enabled: boolean
  maxConcurrentTrades: number
  maxDailyLoss: number
  maxDailyProfit: number
  riskPerTrade: number
  trailingStop: boolean
  trailingStopPct: number
}

const activeStrategies = new Map<string, StrategyConfig>()
const autoTrades = new Map<string, AutoTrade>()
let botConfig: BotConfig = {
  enabled: false,
  maxConcurrentTrades: 3,
  maxDailyLoss: 500,
  maxDailyProfit: 1000,
  riskPerTrade: 2,
  trailingStop: false,
  trailingStopPct: 1.5
}
let dailyPnL = 0

// Strategy execution
function executeStrategies() {
  if (!botConfig.enabled) return
  if (autoTrades.size >= botConfig.maxConcurrentTrades) return
  if (dailyPnL <= -botConfig.maxDailyLoss) return
  if (dailyPnL >= botConfig.maxDailyProfit) return

  for (const [id, strategy] of activeStrategies) {
    if (!strategy.active) continue
    if (autoTrades.size >= botConfig.maxConcurrentTrades) break
    
    const pair = pairs.get(strategy.pair)
    if (!pair) continue

    const history = candleHistory.get(strategy.pair)
    if (!history || history.length < 20) continue

    const recentCandles = history.slice(-20)
    let signal: 'buy' | 'sell' | null = null

    switch (strategy.type) {
      case 'ma_cross': {
        const shortMA = recentCandles.slice(-5).reduce((s, c) => s + c.close, 0) / 5
        const longMA = recentCandles.reduce((s, c) => s + c.close, 0) / 20
        if (shortMA > longMA && recentCandles[recentCandles.length - 2]) {
          const prevShortMA = recentCandles.slice(-6, -1).reduce((s, c) => s + c.close, 0) / 5
          const prevLongMA = recentCandles.slice(0, -1).reduce((s, c) => s + c.close, 0) / 19
          if (prevShortMA <= prevLongMA) signal = 'buy'
        } else if (shortMA < longMA) {
          const prevShortMA = recentCandles.slice(-6, -1).reduce((s, c) => s + c.close, 0) / 5
          const prevLongMA = recentCandles.slice(0, -1).reduce((s, c) => s + c.close, 0) / 19
          if (prevShortMA >= prevLongMA) signal = 'sell'
        }
        break
      }
      case 'rsi': {
        const gains: number[] = []
        const losses: number[] = []
        for (let i = 1; i < recentCandles.length; i++) {
          const diff = recentCandles[i].close - recentCandles[i - 1].close
          gains.push(diff > 0 ? diff : 0)
          losses.push(diff < 0 ? -diff : 0)
        }
        const avgGain = gains.reduce((s, g) => s + g, 0) / gains.length
        const avgLoss = losses.reduce((s, l) => s + l, 0) / losses.length
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        const rsi = 100 - (100 / (1 + rs))
        
        if (rsi < 30) signal = 'buy'
        else if (rsi > 70) signal = 'sell'
        break
      }
      case 'scalping': {
        const last3 = recentCandles.slice(-3)
        if (last3.every(c => c.close > c.open)) signal = 'buy'
        else if (last3.every(c => c.close < c.open)) signal = 'sell'
        break
      }
      case 'trend_follow': {
        const ma10 = recentCandles.slice(-10).reduce((s, c) => s + c.close, 0) / 10
        const currentPrice = pair.price
        const threshold = pair.pipSize * 3
        if (currentPrice > ma10 + threshold) signal = 'buy'
        else if (currentPrice < ma10 - threshold) signal = 'sell'
        break
      }
      case 'macd': {
        const ema12 = calcEMA(recentCandles.map(c => c.close), 12)
        const ema26 = calcEMA(recentCandles.map(c => c.close), Math.min(26, recentCandles.length))
        const macd = ema12 - ema26
        if (macd > 0) signal = 'buy'
        else if (macd < 0) signal = 'sell'
        break
      }
    }

    if (signal) {
      const tradeId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      const pipValue = pair.pipSize
      
      autoTrades.set(tradeId, {
        id: tradeId,
        pair: strategy.pair,
        direction: signal,
        entryPrice: pair.price,
        amount: strategy.amountPerTrade,
        takeProfit: signal === 'buy' ? pair.price + strategy.takeProfit * pipValue : pair.price - strategy.takeProfit * pipValue,
        stopLoss: signal === 'buy' ? pair.price - strategy.stopLoss * pipValue : pair.price + strategy.stopLoss * pipValue,
        strategy: strategy.type,
        timestamp: Date.now()
      })
      
      io.emit('auto-trade-opened', autoTrades.get(tradeId))
    }
  }
}

function calcEMA(data: number[], period: number): number {
  if (data.length === 0) return 0
  const k = 2 / (period + 1)
  let ema = data[0]
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
  }
  return ema
}

// Check auto trades for TP/SL hits
function checkAutoTrades() {
  for (const [id, trade] of autoTrades) {
    const pair = pairs.get(trade.pair)
    if (!pair) continue

    let closed = false
    let pnl = 0

    if (trade.direction === 'buy') {
      if (pair.price >= trade.takeProfit) {
        pnl = (pair.price - trade.entryPrice) / pair.pipSize * trade.amount * 0.01
        closed = true
      } else if (pair.price <= trade.stopLoss) {
        pnl = -(trade.entryPrice - pair.price) / pair.pipSize * trade.amount * 0.01
        closed = true
      }
    } else {
      if (pair.price <= trade.takeProfit) {
        pnl = (trade.entryPrice - pair.price) / pair.pipSize * trade.amount * 0.01
        closed = true
      } else if (pair.price >= trade.stopLoss) {
        pnl = -(pair.price - trade.entryPrice) / pair.pipSize * trade.amount * 0.01
        closed = true
      }
    }

    if (closed) {
      dailyPnL += pnl
      autoTrades.delete(id)
      io.emit('auto-trade-closed', { ...trade, exitPrice: pair.price, pnl })
    }
  }
}

// ============ MAIN INTERVALS ============
setInterval(() => {
  updatePrices()
  updateCandles()
  
  const pricesData: Record<string, any> = {}
  for (const [symbol, pair] of pairs) {
    pricesData[symbol] = {
      symbol: pair.symbol,
      price: pair.price,
      prevPrice: pair.prevPrice,
      high24h: pair.high24h,
      low24h: pair.low24h,
      change24h: pair.change24h,
      spread: pair.spread,
      digits: pair.digits
    }
  }
  io.emit('price-update', pricesData)
}, 1000)

setInterval(() => {
  executeStrategies()
  checkAutoTrades()
}, 5000)

// ============ SOCKET HANDLERS ============
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Send initial data
  const pricesData: Record<string, any> = {}
  for (const [symbol, pair] of pairs) {
    pricesData[symbol] = {
      symbol: pair.symbol,
      price: pair.price,
      prevPrice: pair.prevPrice,
      high24h: pair.high24h,
      low24h: pair.low24h,
      change24h: pair.change24h,
      spread: pair.spread,
      digits: pair.digits
    }
  }
  socket.emit('initial-data', {
    prices: pricesData,
    candles: Object.fromEntries(candleHistory),
    strategies: Object.fromEntries(activeStrategies),
    autoTrades: Object.fromEntries(autoTrades),
    botConfig
  })

  // Get candle history for a specific pair
  socket.on('get-candles', (data: { pair: string }) => {
    const history = candleHistory.get(data.pair)
    if (history) {
      socket.emit('candle-history', { pair: data.pair, candles: history })
    }
  })

  // Strategy management
  socket.on('add-strategy', (strategy: StrategyConfig) => {
    const id = `strat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    activeStrategies.set(id, strategy)
    io.emit('strategy-added', { id, ...strategy })
    io.emit('strategies-list', Object.fromEntries(activeStrategies))
  })

  socket.on('remove-strategy', (data: { id: string }) => {
    activeStrategies.delete(data.id)
    io.emit('strategies-list', Object.fromEntries(activeStrategies))
  })

  socket.on('toggle-strategy', (data: { id: string, active: boolean }) => {
    const strategy = activeStrategies.get(data.id)
    if (strategy) {
      strategy.active = data.active
      io.emit('strategies-list', Object.fromEntries(activeStrategies))
    }
  })

  // Bot config
  socket.on('update-bot-config', (config: Partial<BotConfig>) => {
    botConfig = { ...botConfig, ...config }
    io.emit('bot-config-update', botConfig)
  })

  socket.on('toggle-bot', (data: { enabled: boolean }) => {
    botConfig.enabled = data.enabled
    if (!data.enabled) {
      // Close all auto trades when bot is disabled
      for (const [id, trade] of autoTrades) {
        const pair = pairs.get(trade.pair)
        const exitPrice = pair ? pair.price : trade.entryPrice
        const pnl = trade.direction === 'buy'
          ? (exitPrice - trade.entryPrice) / pairs.get(trade.pair)!.pipSize * trade.amount * 0.01
          : (trade.entryPrice - exitPrice) / pairs.get(trade.pair)!.pipSize * trade.amount * 0.01
        dailyPnL += pnl
        io.emit('auto-trade-closed', { ...trade, exitPrice, pnl })
      }
      autoTrades.clear()
    }
    io.emit('bot-config-update', botConfig)
  })

  // Manual trade execution
  socket.on('manual-trade', (data: { pair: string, direction: 'buy' | 'sell', amount: number, takeProfit: number, stopLoss: number }) => {
    const pair = pairs.get(data.pair)
    if (!pair) return

    const tradeId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const trade: AutoTrade = {
      id: tradeId,
      pair: data.pair,
      direction: data.direction,
      entryPrice: pair.price,
      amount: data.amount,
      takeProfit: data.direction === 'buy' ? pair.price + data.takeProfit * pair.pipSize : pair.price - data.takeProfit * pair.pipSize,
      stopLoss: data.direction === 'buy' ? pair.price - data.stopLoss * pair.pipSize : pair.price + data.stopLoss * pair.pipSize,
      strategy: 'manual',
      timestamp: Date.now()
    }
    autoTrades.set(tradeId, trade)
    io.emit('trade-opened', trade)
  })

  // Close trade manually
  socket.on('close-trade', (data: { id: string }) => {
    const trade = autoTrades.get(data.id)
    if (!trade) return

    const pair = pairs.get(trade.pair)
    const exitPrice = pair ? pair.price : trade.entryPrice
    const pnl = trade.direction === 'buy'
      ? (exitPrice - trade.entryPrice) / (pairs.get(trade.pair)?.pipSize || 0.0001) * trade.amount * 0.01
      : (trade.entryPrice - exitPrice) / (pairs.get(trade.pair)?.pipSize || 0.0001) * trade.amount * 0.01

    dailyPnL += pnl
    autoTrades.delete(data.id)
    io.emit('trade-closed', { ...trade, exitPrice, pnl })
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Trading WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
