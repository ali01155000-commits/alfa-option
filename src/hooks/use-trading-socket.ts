'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useTradingStore } from '@/store/trading-store'

/**
 * Dual-mode socket hook:
 * - When NOT logged in: connects to Bun WS server (port 3003) for simulated data
 * - When logged in: connects to Python Bridge WebSocket (port 3004/ws) for real data
 * Also polls the bridge HTTP API for balance/price updates
 */
export function useTradingSocket() {
  const simSocketRef = useRef<Socket | null>(null)
  const bridgeWsRef = useRef<WebSocket | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const {
    setConnected,
    setPrices,
    setCandles,
    addOpenTrade,
    removeOpenTrade,
    addClosedTrade,
    setStrategies,
    setBotConfig,
    setEOConnection,
    setBalance,
  } = useTradingStore()

  const eoConnection = useTradingStore((s) => s.eoConnection)

  // ====== Simulated Data Connection (Port 3003) ======
  useEffect(() => {
    if (eoConnection.isLoggedIn) return

    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    })

    simSocketRef.current = socketInstance

    socketInstance.on('connect', () => {
      console.log('📡 Simulated WS connected (port 3003)')
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('📡 Simulated WS disconnected')
      setConnected(false)
    })

    socketInstance.on('initial-data', (data: any) => {
      if (data.prices) setPrices(data.prices)
      if (data.candles) setCandles(data.candles)
      if (data.strategies) setStrategies(data.strategies)
      if (data.botConfig) setBotConfig(data.botConfig)
      if (data.openTrades) {
        Object.values(data.openTrades).forEach((trade: any) => {
          addOpenTrade(trade)
        })
      }
    })

    socketInstance.on('price-update', (prices: any) => {
      setPrices(prices)
    })

    socketInstance.on('trade-opened', (trade: any) => {
      addOpenTrade(trade)
    })

    socketInstance.on('trade-closed', (trade: any) => {
      removeOpenTrade(trade.id)
      addClosedTrade(trade)
    })

    socketInstance.on('auto-trade-opened', (trade: any) => {
      addOpenTrade(trade)
    })

    socketInstance.on('auto-trade-closed', (trade: any) => {
      removeOpenTrade(trade.id)
      addClosedTrade(trade)
    })

    socketInstance.on('candle-history', (data: any) => {
      if (data.pair && data.candles) {
        const { updateCandles } = useTradingStore.getState()
        updateCandles(data.pair, data.candles)
      }
    })

    socketInstance.on('strategies-list', (strategies: any) => {
      setStrategies(strategies)
    })

    socketInstance.on('bot-config-update', (config: any) => {
      setBotConfig(config)
    })

    return () => {
      socketInstance.disconnect()
      simSocketRef.current = null
    }
  }, [eoConnection.isLoggedIn, setConnected, setPrices, setCandles, addOpenTrade, removeOpenTrade, addClosedTrade, setStrategies, setBotConfig])

  // ====== Real Expert Option Bridge - HTTP Polling + WebSocket (Port 3004) ======
  useEffect(() => {
    if (!eoConnection.isLoggedIn) return

    setConnected(true)
    const BRIDGE = 'http://localhost:3004'

    // Connect to bridge WebSocket for real-time events
    try {
      const ws = new WebSocket(`ws://localhost:3004/ws`)
      bridgeWsRef.current = ws

      ws.onopen = () => {
        console.log('🔌 Bridge WebSocket connected')
        ws.send(JSON.stringify({ type: 'subscribe' }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const { updatePrice } = useTradingStore.getState()

          if (data.type === 'price-update' && data.symbol && data.price) {
            const currentPrices = useTradingStore.getState().prices
            const existing = currentPrices[data.symbol]
            updatePrice(data.symbol, {
              symbol: data.symbol,
              price: data.price,
              prevPrice: existing?.price || data.price,
              high24h: Math.max(existing?.high24h || data.price, data.price),
              low24h: Math.min(existing?.low24h || data.price, data.price),
              change24h: data.change24h || (existing?.change24h || 0),
              spread: 0,
              digits: data.price > 100 ? 2 : data.price > 10 ? 3 : 5,
              payoutPercent: 80,
            })
          } else if (data.type === 'balance-update') {
            setBalance(data.balance)
            setEOConnection({ realBalance: data.balance })
          } else if (data.type === 'trade-opened' || data.type === 'auto-trade-opened') {
            addOpenTrade(data)
          } else if (data.type === 'trade-closed' || data.type === 'auto-trade-closed') {
            removeOpenTrade(data.id)
            addClosedTrade(data)
          } else if (data.type === 'auto-config-update') {
            if (data.config) setBotConfig(data.config)
            if (data.autoTrading !== undefined) {
              setEOConnection({ autoTrading: data.autoTrading })
            }
          } else if (data.type === 'pong') {
            // Keepalive
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      ws.onclose = () => {
        console.log('🔌 Bridge WebSocket disconnected')
      }

      ws.onerror = () => {
        console.log('🔌 Bridge WebSocket error (will use HTTP polling)')
      }
    } catch (e) {
      console.log('WebSocket not available, using HTTP polling only')
    }

    // HTTP polling for prices and balance (every 2 seconds)
    const poll = async () => {
      try {
        // Fetch prices
        const pricesRes = await fetch(`${BRIDGE}/api/prices`)
        if (pricesRes.ok) {
          const pricesData = await pricesRes.json()
          if (pricesData.prices) {
            const { updatePrice, prices: currentPrices } = useTradingStore.getState()
            for (const [symbol, price] of Object.entries(pricesData.prices)) {
              if (typeof price === 'number') {
                const existing = currentPrices[symbol]
                updatePrice(symbol, {
                  symbol,
                  price,
                  prevPrice: existing?.price || price,
                  high24h: Math.max(existing?.high24h || price, price),
                  low24h: Math.min(existing?.low24h || price, price),
                  change24h: existing?.change24h || 0,
                  spread: 0,
                  digits: price > 100 ? 2 : price > 10 ? 3 : 5,
                  payoutPercent: 80,
                })
              }
            }
          }
        }

        // Fetch balance & status
        const statusRes = await fetch(`${BRIDGE}/api/status`)
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.balance !== undefined) {
            const { balance: currentBalance } = useTradingStore.getState()
            if (statusData.balance !== currentBalance) {
              setBalance(statusData.balance)
              setEOConnection({ realBalance: statusData.balance, dailyPnl: statusData.dailyPnl, autoTrading: statusData.autoTrading })
            }
          }
        }

        // Fetch trades
        const tradesRes = await fetch(`${BRIDGE}/api/trades`)
        if (tradesRes.ok) {
          const tradesData = await tradesRes.json()
          // Update open trades and history
          const { openTrades, tradeHistory } = useTradingStore.getState()

          // Add new open trades
          if (tradesData.openTrades) {
            for (const trade of tradesData.openTrades) {
              if (!openTrades.find(t => t.id === trade.id)) {
                addOpenTrade(trade)
              }
            }
          }

          // Add new closed trades
          if (tradesData.history) {
            for (const trade of tradesData.history) {
              if (!tradeHistory.find(t => t.id === trade.id)) {
                addClosedTrade(trade)
              }
            }
          }
        }
      } catch (e) {
        // Silently fail - will retry next poll
      }
    }

    // Start polling
    poll() // Initial fetch
    pollIntervalRef.current = setInterval(poll, 2000) // Every 2 seconds

    // WebSocket keepalive
    const keepalive = setInterval(() => {
      if (bridgeWsRef.current?.readyState === WebSocket.OPEN) {
        bridgeWsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      clearInterval(keepalive)
      if (bridgeWsRef.current) {
        bridgeWsRef.current.close()
        bridgeWsRef.current = null
      }
    }
  }, [eoConnection.isLoggedIn, setConnected, setPrices, addOpenTrade, removeOpenTrade, addClosedTrade, setBotConfig, setEOConnection, setBalance])

  // Emit to the appropriate socket
  const emit = useCallback((event: string, data?: any) => {
    const targetSocket = eoConnection.isLoggedIn
      ? null // Bridge uses HTTP API, not socket events
      : simSocketRef.current

    if (targetSocket) {
      targetSocket.emit(event, data)
    }
  }, [eoConnection.isLoggedIn])

  return { emit }
}
