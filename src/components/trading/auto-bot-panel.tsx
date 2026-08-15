'use client'

import { useState } from 'react'
import { useTradingStore, type StrategyConfig } from '@/store/trading-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Bot, Play, Plus, Trash2, Settings } from 'lucide-react'

interface AutoBotPanelProps {
  emit: (event: string, data?: any) => void
}

const strategyTypes = [
  { value: 'ma_cross', label: 'تقاطع المتوسطات', desc: 'MA Crossover' },
  { value: 'rsi', label: 'مؤشر القوة النسبية', desc: 'RSI Strategy' },
  { value: 'macd', label: 'MACD', desc: 'MACD Strategy' },
  { value: 'scalping', label: 'سكالبينج', desc: 'Quick Scalping' },
  { value: 'trend_follow', label: 'متابعة الاتجاه', desc: 'Trend Following' },
]

const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'USD/CHF', 'NZD/USD', 'BTC/USD', 'ETH/USD']

export function AutoBotPanel({ emit }: AutoBotPanelProps) {
  const { botConfig, strategies } = useTradingStore()
  const [newStrategy, setNewStrategy] = useState<StrategyConfig>({
    name: '',
    type: 'ma_cross',
    active: true,
    pair: 'EUR/USD',
    takeProfit: 50,
    stopLoss: 25,
    maxTrades: 5,
    amountPerTrade: 100,
    params: {}
  })
  const [showAddStrategy, setShowAddStrategy] = useState(false)

  const handleToggleBot = (enabled: boolean) => {
    emit('toggle-bot', { enabled })
  }

  const handleAddStrategy = () => {
    if (!newStrategy.name.trim()) return
    emit('add-strategy', newStrategy)
    setNewStrategy({
      name: '',
      type: 'ma_cross',
      active: true,
      pair: 'EUR/USD',
      takeProfit: 50,
      stopLoss: 25,
      maxTrades: 5,
      amountPerTrade: 100,
      params: {}
    })
    setShowAddStrategy(false)
  }

  const handleRemoveStrategy = (id: string) => {
    emit('remove-strategy', { id })
  }

  const handleToggleStrategy = (id: string, active: boolean) => {
    emit('toggle-strategy', { id, active })
  }

  const handleUpdateBotConfig = (updates: Partial<typeof botConfig>) => {
    emit('update-bot-config', updates)
  }

  const strategyList = Object.entries(strategies)

  return (
    <div className="space-y-4">
      {/* Bot Status */}
      <Card className="border-[#3A4568] bg-[#2D3651]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-xs text-[#F5F5F5]">
            <div className="flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#2F96F0]" />
              <span>روبوت التداول الآلي</span>
            </div>
            <Badge className={`text-[9px] ${botConfig.enabled ? 'bg-[#57BC9A]/20 text-[#57BC9A] border-[#57BC9A]/30' : 'bg-[#20283D] text-[#A9B5CB] border-[#3A4568]'}`} variant="outline">
              {botConfig.enabled ? '🟢 نشط' : '⏸ متوقف'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#A9B5CB]">تفعيل الروبوت</span>
            <Switch
              checked={botConfig.enabled}
              onCheckedChange={handleToggleBot}
            />
          </div>

          {/* Risk Management */}
          <div className="space-y-2.5 pt-2 border-t border-[#3A4568]">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#F5F5F5]">
              <Settings className="w-3 h-3 text-[#2F96F0]" />
              <span>إدارة المخاطر</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">أقصى صفقات متزامنة</span>
                <span className="text-xs font-mono font-bold">{botConfig.maxConcurrentTrades}</span>
              </div>
              <Slider
                value={[botConfig.maxConcurrentTrades]}
                onValueChange={([v]) => handleUpdateBotConfig({ maxConcurrentTrades: v })}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">أقصى خسارة يومية ($)</label>
                <Input
                  type="number"
                  value={botConfig.maxDailyLoss}
                  onChange={(e) => handleUpdateBotConfig({ maxDailyLoss: parseFloat(e.target.value) || 500 })}
                  className="font-mono text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">أقصى ربح يومي ($)</label>
                <Input
                  type="number"
                  value={botConfig.maxDailyProfit}
                  onChange={(e) => handleUpdateBotConfig({ maxDailyProfit: parseFloat(e.target.value) || 1000 })}
                  className="font-mono text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">نسبة المخاطرة لكل صفقة (%)</span>
                <span className="text-xs font-mono font-bold">{botConfig.riskPerTrade}%</span>
              </div>
              <Slider
                value={[botConfig.riskPerTrade]}
                onValueChange={([v]) => handleUpdateBotConfig({ riskPerTrade: v })}
                min={0.5}
                max={10}
                step={0.5}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">وقف متحرك</span>
              <Switch
                checked={botConfig.trailingStop}
                onCheckedChange={(v) => handleUpdateBotConfig({ trailingStop: v })}
              />
            </div>

            {botConfig.trailingStop && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">نسبة الوقف المتحرك (%)</span>
                  <span className="text-xs font-mono font-bold">{botConfig.trailingStopPct}%</span>
                </div>
                <Slider
                  value={[botConfig.trailingStopPct]}
                  onValueChange={([v]) => handleUpdateBotConfig({ trailingStopPct: v })}
                  min={0.5}
                  max={5}
                  step={0.1}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Strategies */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>الاستراتيجيات النشطة</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddStrategy(!showAddStrategy)}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              إضافة
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Strategy List */}
          {strategyList.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد استراتيجيات</p>
              <p className="text-xs">أضف استراتيجية لبدء التداول الآلي</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {strategyList.map(([id, strat]) => (
                <div key={id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={strat.active}
                      onCheckedChange={(v) => handleToggleStrategy(id, v)}
                      className="scale-75"
                    />
                    <div>
                      <div className="text-xs font-medium">{strat.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {strategyTypes.find(s => s.value === strat.type)?.label} • {strat.pair}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveStrategy(id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Strategy Form */}
          {showAddStrategy && (
            <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
              <Input
                placeholder="اسم الاستراتيجية"
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                className="h-8 text-xs"
              />
              <Select
                value={newStrategy.type}
                onValueChange={(v) => setNewStrategy({ ...newStrategy, type: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="نوع الاستراتيجية" />
                </SelectTrigger>
                <SelectContent>
                  {strategyTypes.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label} ({st.desc})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={newStrategy.pair}
                onValueChange={(v) => setNewStrategy({ ...newStrategy, pair: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="الزوج" />
                </SelectTrigger>
                <SelectContent>
                  {pairs.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">جني الأرباح</label>
                  <Input
                    type="number"
                    value={newStrategy.takeProfit}
                    onChange={(e) => setNewStrategy({ ...newStrategy, takeProfit: parseFloat(e.target.value) || 50 })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">وقف الخسارة</label>
                  <Input
                    type="number"
                    value={newStrategy.stopLoss}
                    onChange={(e) => setNewStrategy({ ...newStrategy, stopLoss: parseFloat(e.target.value) || 25 })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">المبلغ لكل صفقة ($)</label>
                <Input
                  type="number"
                  value={newStrategy.amountPerTrade}
                  onChange={(e) => setNewStrategy({ ...newStrategy, amountPerTrade: parseFloat(e.target.value) || 100 })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <Button
                onClick={handleAddStrategy}
                disabled={!newStrategy.name.trim()}
                size="sm"
                className="w-full h-8 text-xs"
              >
                <Play className="w-3 h-3 mr-1" />
                إضافة الاستراتيجية
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
