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
  { value: 'ma_cross', label: 'تقاطع المتوسطات', desc: 'MA Cross' },
  { value: 'rsi', label: 'مؤشر القوة النسبية', desc: 'RSI' },
  { value: 'macd', label: 'MACD', desc: 'MACD' },
  { value: 'scalping', label: 'سكالبينج', desc: 'Scalping' },
  { value: 'trend_follow', label: 'متابعة الاتجاه', desc: 'Trend' },
]

const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'USD/CHF', 'NZD/USD', 'BTC/USD', 'ETH/USD']

const expiryOptions = [
  { value: 1, label: '1 دقيقة' },
  { value: 2, label: '2 دقيقة' },
  { value: 5, label: '5 دقائق' },
  { value: 10, label: '10 دقائق' },
  { value: 15, label: '15 دقيقة' },
]

const amountOptions = [1, 5, 10, 25, 50, 100]

export function AutoBotPanel({ emit }: AutoBotPanelProps) {
  const { botConfig, strategies } = useTradingStore()
  const [newStrategy, setNewStrategy] = useState<StrategyConfig>({
    name: '',
    type: 'ma_cross',
    active: true,
    pair: 'EUR/USD',
    expiryMinutes: 1,
    maxTrades: 5,
    amountPerTrade: 10,
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
      expiryMinutes: 1,
      maxTrades: 5,
      amountPerTrade: 10,
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
              <span>روبوت التداول الآلي (أوبشن)</span>
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
                <span className="text-xs text-[#A9B5CB]">أقصى صفقات متزامنة</span>
                <span className="text-xs font-mono font-bold text-[#F5F5F5]">{botConfig.maxConcurrentTrades}</span>
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
                <label className="text-[10px] text-[#A9B5CB]">أقصى خسارة يومية ($)</label>
                <Input
                  type="number"
                  value={botConfig.maxDailyLoss}
                  onChange={(e) => handleUpdateBotConfig({ maxDailyLoss: parseFloat(e.target.value) || 50 })}
                  className="font-mono text-xs h-8 bg-[#20283D] border-[#3A4568] text-[#F5F5F5]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#A9B5CB]">أقصى ربح يومي ($)</label>
                <Input
                  type="number"
                  value={botConfig.maxDailyProfit}
                  onChange={(e) => handleUpdateBotConfig({ maxDailyProfit: parseFloat(e.target.value) || 100 })}
                  className="font-mono text-xs h-8 bg-[#20283D] border-[#3A4568] text-[#F5F5F5]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A9B5CB]">المبلغ لكل صفقة ($)</span>
                <span className="text-xs font-mono font-bold text-[#F5F5F5]">${botConfig.riskPerTrade}</span>
              </div>
              <Slider
                value={[botConfig.riskPerTrade]}
                onValueChange={([v]) => handleUpdateBotConfig({ riskPerTrade: v })}
                min={1}
                max={100}
                step={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategies */}
      <Card className="border-[#3A4568] bg-[#2D3651]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm text-[#F5F5F5]">
            <span>الاستراتيجيات النشطة</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddStrategy(!showAddStrategy)}
              className="h-7 text-xs border-[#3A4568] text-[#A9B5CB] hover:bg-[#2D3651]"
            >
              <Plus className="w-3 h-3 mr-1" />
              إضافة
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Strategy List */}
          {strategyList.length === 0 ? (
            <div className="text-center py-4 text-[#A9B5CB] text-sm">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد استراتيجيات</p>
              <p className="text-xs">أضف استراتيجية لبدء التداول الآلي</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {strategyList.map(([id, strat]) => (
                <div key={id} className="flex items-center justify-between bg-[#20283D] rounded-lg p-2 border border-[#3A4568]/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={strat.active}
                      onCheckedChange={(v) => handleToggleStrategy(id, v)}
                      className="scale-75"
                    />
                    <div>
                      <div className="text-xs font-medium text-[#F5F5F5]">{strat.name}</div>
                      <div className="text-[10px] text-[#A9B5CB]">
                        {strategyTypes.find(s => s.value === strat.type)?.label} • {strat.pair} • ${strat.amountPerTrade} • {strat.expiryMinutes}د
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveStrategy(id)}
                    className="h-6 w-6 p-0 text-[#D0011B] hover:text-[#D0011B] hover:bg-[#D0011B]/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Strategy Form */}
          {showAddStrategy && (
            <div className="border border-[#3A4568] rounded-lg p-3 space-y-2 bg-[#20283D]">
              <Input
                placeholder="اسم الاستراتيجية"
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                className="h-8 text-xs bg-[#2D3651] border-[#3A4568] text-[#F5F5F5]"
              />
              <Select
                value={newStrategy.type}
                onValueChange={(v) => setNewStrategy({ ...newStrategy, type: v })}
              >
                <SelectTrigger className="h-8 text-xs bg-[#2D3651] border-[#3A4568] text-[#F5F5F5]">
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
                <SelectTrigger className="h-8 text-xs bg-[#2D3651] border-[#3A4568] text-[#F5F5F5]">
                  <SelectValue placeholder="الزوج" />
                </SelectTrigger>
                <SelectContent>
                  {pairs.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Expiry Time */}
              <div>
                <label className="text-[10px] text-[#A9B5CB] mb-1 block">وقت الانتهاء</label>
                <div className="grid grid-cols-5 gap-1">
                  {expiryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setNewStrategy({ ...newStrategy, expiryMinutes: opt.value })}
                      className={`text-[10px] py-1.5 rounded border transition-all font-bold ${
                        newStrategy.expiryMinutes === opt.value
                          ? 'bg-[#2F96F0] text-white border-[#2F96F0]'
                          : 'bg-[#2D3651] border-[#3A4568] text-[#A9B5CB] hover:bg-[#3A4568]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount per trade - Options style */}
              <div>
                <label className="text-[10px] text-[#A9B5CB] mb-1 block">مبلغ الصفقة ($1 - $100)</label>
                <div className="grid grid-cols-6 gap-1">
                  {amountOptions.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setNewStrategy({ ...newStrategy, amountPerTrade: amt })}
                      className={`text-[10px] py-1.5 rounded border transition-all font-bold ${
                        newStrategy.amountPerTrade === amt
                          ? 'bg-[#2F96F0] text-white border-[#2F96F0]'
                          : 'bg-[#2D3651] border-[#3A4568] text-[#A9B5CB] hover:bg-[#3A4568]'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleAddStrategy}
                disabled={!newStrategy.name.trim()}
                size="sm"
                className="w-full h-8 text-xs bg-[#2F96F0] hover:bg-[#1A7DE8] text-white"
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
