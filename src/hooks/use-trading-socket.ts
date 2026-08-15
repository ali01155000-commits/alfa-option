'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useTradingStore } from '@/store/trading-store'

export function useTradingSocket() {
  const socketRef = useRef<Socket | null>(null)
  const {
    setConnected,
    setPrices,
    setCandles,
    addOpenTrade,
    removeOpenTrade,
    addClosedTrade,
    setStrategies,
    setBotConfig,
  } = useTradingStore()

  useEffect(() => {
    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    })

    socketRef.current = socketInstance

    socketInstance.on('connect', () => {
      console.log('Trading WS connected')
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Trading WS disconnected')
      setConnected(false)
    })

    socketInstance.on('initial-data', (data: any) => {
      if (data.prices) setPrices(data.prices)
      if (data.candles) setCandles(data.candles)
      if (data.strategies) setStrategies(data.strategies)
      if (data.botConfig) setBotConfig(data.botConfig)
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

    socketInstance.on('strategies-list', (strategies: any) => {
      setStrategies(strategies)
    })

    socketInstance.on('bot-config-update', (config: any) => {
      setBotConfig(config)
    })

    return () => {
      socketInstance.disconnect()
      socketRef.current = null
    }
  }, [setConnected, setPrices, setCandles, addOpenTrade, removeOpenTrade, addClosedTrade, setStrategies, setBotConfig])

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { emit }
}
