'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTradingStore } from '@/store/trading-store'
import {
  Shield, Gift, Lock, Trophy, TrendingUp, ChevronRight,
  Zap, Star, Crown, CheckCircle2, AlertTriangle, Wallet,
  Package, Sparkles, BarChart3
} from 'lucide-react'

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3004'
  return window.location.origin
}

const PLAN_STYLE: Record<string, { color: string; icon: any }> = {
  bronze: { color: '#CD7F32', icon: Shield },
  silver: { color: '#C0C0C0', icon: Star },
  gold:   { color: '#FFD700', icon: Crown },
}

type Tab = 'plans' | 'overview' | 'boxes' | 'history'

export default function ProtectionPage() {
  const [tab, setTab] = useState<Tab>('plans')
  const [plans, setPlans] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [status, setStatus] = useState<any>(null)
  const [boxes, setBoxes] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const email = 'user@alfa.expert'

  useEffect(() => {
    const API = getApiUrl()
    fetch(`${API}/api/protection/plans`).then(r => r.json()).then(d => { setPlans(d.plans || []); setMilestones(d.milestones || []) }).catch(() => {})
    refreshStatus()
  }, [])

  const refreshStatus = async () => {
    const API = getApiUrl()
    try {
      const [s, b, t] = await Promise.all([
        fetch(`${API}/api/protection/status?email=${email}`),
        fetch(`${API}/api/protection/boxes?email=${email}`),
        fetch(`${API}/api/protection/transactions?email=${email}&limit=10`),
      ])
      if (s.ok) setStatus(await s.json())
      if (b.ok) setBoxes((await b.json()).boxes || [])
      if (t.ok) setTransactions((await t.json()).transactions || [])
    } catch {}
  }

  const subscribe = async (planId: string) => {
    setLoading(true); setMsg(null)
    const API = getApiUrl()
    try {
      const res = await fetch(`${API}/api/protection/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: 'مستخدم', plan: planId }),
      })
      const data = await res.json()
      setMsg({ text: data.message || data.detail || 'خطأ', ok: res.ok })
      if (res.ok) { setTab('overview'); refreshStatus() }
    } catch { setMsg({ text: 'فشل الاتصال', ok: false }) }
    setLoading(false)
  }

  const openBox = async (boxId: string) => {
    const API = getApiUrl()
    try {
      const res = await fetch(`${API}/api/protection/open-box`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, boxId }),
      })
      const data = await res.json()
      setMsg({ text: data.message || data.detail || 'خطأ', ok: res.ok })
      if (res.ok) refreshStatus()
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#272E4A] p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2F96F0]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#2F96F0]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F5]">صناديق الحماية</h1>
            <p className="text-[10px] text-[#A9B5CB]">حماية رصيدك من الخسارة</p>
          </div>
        </div>

        {msg && (
          <div className={`rounded-lg p-3 flex items-center gap-2 ${msg.ok ? 'bg-[#57BC9A]/10 border border-[#57BC9A]/30' : 'bg-[#D0011B]/10 border border-[#D0011B]/30'}`}>
            {msg.ok ? <CheckCircle2 className="w-4 h-4 text-[#57BC9A]" /> : <AlertTriangle className="w-4 h-4 text-[#D0011B]" />}
            <span className={`text-xs ${msg.ok ? 'text-[#57BC9A]' : 'text-[#D0011B]'}`}>{msg.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#222940] rounded-lg p-1">
          {([{id:'plans',l:'الخطط',i:Shield},{id:'overview',l:'الصندوق',i:Wallet},{id:'boxes',l:'المكافآت',i:Gift},{id:'history',l:'السجل',i:BarChart3}] as const).map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as Tab)} className={`flex-1 py-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${tab===t.id?'bg-[#2F96F0] text-white shadow-md':'text-[#A9B5CB] hover:text-[#F5F5F5]'}`}>
              <t.i className="w-3.5 h-3.5" />{t.l}
            </button>
          ))}
        </div>

        {/* PLANS */}
        {tab==='plans' && <div className="space-y-3">
          <p className="text-xs text-[#A9B5CB] text-center">اختر خطة الحماية المناسبة لك</p>
          {plans.filter(p=>p.id!=='free').map(plan=>{
            const ps=PLAN_STYLE[plan.id]||{color:'#A9B5CB',icon:Shield}
            const PI=ps.icon
            return (
              <Card key={plan.id} className="border-[#3A4568] bg-[#2D3651]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor:`${ps.color}20`}}>
                        <PI className="w-5 h-5" style={{color:ps.color}}/>
                      </div>
                      <div>
                        <h3 className="font-bold text-[#F5F5F5]">{plan.name}</h3>
                        <p className="text-[10px] text-[#A9B5CB]">{plan.nameEn}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-[#F5F5F5]">${plan.price}</span>
                      <span className="text-[10px] text-[#A9B5CB]">/شهر</span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-[#A9B5CB]">
                      <Shield className="w-3.5 h-3.5 text-[#57BC9A]"/>
                      <span>حماية <strong className="text-[#F5F5F5]">{plan.protectionPct}%</strong> من الخسارة</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#A9B5CB]">
                      <Wallet className="w-3.5 h-3.5 text-[#2F96F0]"/>
                      <span>حد الحماية <strong className="text-[#F5F5F5]">${plan.limit}</strong>/شهر</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#A9B5CB]">
                      <Gift className="w-3.5 h-3.5 text-[#FFD700]"/>
                      <span>مكافأة ترحيبية <strong className="text-[#F5F5F5]">${plan.welcomeBonus}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#A9B5CB]">
                      <Package className="w-3.5 h-3.5 text-[#C0C0C0]"/>
                      <span>{plan.id==='bronze'?'3':plan.id==='silver'?'6':'9'} صناديق مكافأة</span>
                    </div>
                  </div>
                  <Button onClick={()=>subscribe(plan.id)} disabled={loading} className="w-full h-10 text-xs font-bold rounded-lg text-[#1A1F2E]" style={{backgroundColor:ps.color}}>
                    {loading?'جاري الاشتراك...':`اشترك في خطة ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
          <Card className="border-[#3A4568] bg-[#2D3651]">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-[#F5F5F5] mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FFD700]"/>نظام المستويات
              </h3>
              <div className="space-y-2">
                {milestones.map((m:any)=>(
                  <div key={m.level} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.level>=3?'bg-[#FFD700]/20 text-[#FFD700]':m.level>=2?'bg-[#C0C0C0]/20 text-[#C0C0C0]':'bg-[#CD7F32]/20 text-[#CD7F32]'}`}>
                      {m.level}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-[#F5F5F5]">{m.label}</span>
                      <span className="text-[10px] text-[#A9B5CB] ml-2">(${m.volume}+ حجم تداول)</span>
                    </div>
                    <span className="text-[10px] text-[#57BC9A] font-bold">+{m.extraProtection}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>}

        {/* OVERVIEW */}
        {tab==='overview' && <div className="space-y-3">
          {!status?.subscribed ? (
            <Card className="border-[#3A4568] bg-[#2D3651]">
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 text-[#3A4568] mx-auto mb-3"/>
                <h3 className="text-sm font-bold text-[#F5F5F5] mb-1">لا يوجد اشتراك</h3>
                <p className="text-xs text-[#A9B5CB] mb-4">اشترك في خطة حماية لحماية رصيدك</p>
                <Button onClick={()=>setTab('plans')} className="bg-[#2F96F0] hover:bg-[#1A7DE8] text-white">
                  عرض الخطط <ChevronRight className="w-4 h-4 mr-1"/>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-[#2F96F0]/30 bg-[#2D3651]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-[#2F96F0]"/>
                    <h3 className="text-sm font-bold text-[#F5F5F5]">صندوق الحماية</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F96F0]/20 text-[#2F96F0] font-bold mr-auto">{status.planName}</span>
                  </div>
                  <div className="bg-[#20283D] rounded-xl p-4 mb-3">
                    <p className="text-[10px] text-[#A9B5CB] mb-1">رصيد الصندوق</p>
                    <p className="text-3xl font-bold text-[#F5F5F5]">${(status.fundRemaining||0).toFixed(2)}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-[#A9B5CB] mb-1">
                        <span>المستخدم: ${(status.fundUsed||0).toFixed(2)}</span>
                        <span>الحد: ${status.protectionLimit||0}</span>
                      </div>
                      <div className="h-2 bg-[#272E4A] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#2F96F0] to-[#57BC9A] rounded-full" style={{width:`${Math.min(100,((status.fundUsed||0)/(status.protectionLimit||1))*100)}%`}}/>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#20283D] rounded-lg p-3 text-center">
                      <Shield className="w-4 h-4 text-[#57BC9A] mx-auto mb-1"/>
                      <p className="text-lg font-bold text-[#F5F5F5]">{status.protectionPct}%</p>
                      <p className="text-[9px] text-[#A9B5CB]">نسبة الحماية</p>
                    </div>
                    <div className="bg-[#20283D] rounded-lg p-3 text-center">
                      <Trophy className="w-4 h-4 text-[#FFD700] mx-auto mb-1"/>
                      <p className="text-lg font-bold text-[#F5F5F5]">مستوى {status.milestone}</p>
                      <p className="text-[9px] text-[#A9B5CB]">المستوى الحالي</p>
                    </div>
                    <div className="bg-[#20283D] rounded-lg p-3 text-center">
                      <BarChart3 className="w-4 h-4 text-[#2F96F0] mx-auto mb-1"/>
                      <p className="text-lg font-bold text-[#F5F5F5]">{status.totalTrades}</p>
                      <p className="text-[9px] text-[#A9B5CB]">إجمالي الصفقات</p>
                    </div>
                    <div className="bg-[#20283D] rounded-lg p-3 text-center">
                      <TrendingUp className="w-4 h-4 text-[#57BC9A] mx-auto mb-1"/>
                      <p className="text-lg font-bold text-[#F5F5F5]">{status.winRate}%</p>
                      <p className="text-[9px] text-[#A9B5CB]">نسبة الفوز</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[#3A4568] bg-[#2D3651]">
                <CardContent className="p-4">
                  <h3 className="text-xs font-bold text-[#F5F5F5] mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#57BC9A]"/>كيف يشتغل التعويض؟
                  </h3>
                  <div className="space-y-1.5 text-[10px] text-[#A9B5CB]">
                    <p>• لو خسرت $100 → الصندوق يرجعلك ${((100*(status.protectionPct||0))/100).toFixed(0)}</p>
                    <p>• التعويض تلقائي وبيدخل رصيدك مباشرة</p>
                    <p>• الصندوق بيتجدد كل شهر مع الاشتراك</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>}

        {/* BOXES */}
        {tab==='boxes' && <div className="space-y-3">
          {boxes.length===0 ? (
            <Card className="border-[#3A4568] bg-[#2D3651]">
              <CardContent className="p-6 text-center">
                <Gift className="w-12 h-12 text-[#3A4568] mx-auto mb-3"/>
                <h3 className="text-sm font-bold text-[#F5F5F5] mb-1">مفيش صناديق</h3>
                <p className="text-xs text-[#A9B5CB] mb-4">اشترك في خطة للحصول على صناديق مكافأة</p>
                <Button onClick={()=>setTab('plans')} className="bg-[#2F96F0] hover:bg-[#1A7DE8] text-white">عرض الخطط</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-xs text-[#A9B5CB] text-center">{boxes.filter(b=>b.status==='available').length} صندوق جاهز للفتح من أصل {boxes.length}</p>
              <div className="grid grid-cols-3 gap-2">
                {boxes.map(box=>{
                  const locked=box.status==='locked'
                  const avail=box.status==='available'
                  const opened=box.status==='opened'
                  return (
                    <button key={box.id} onClick={()=>avail&&openBox(box.id)} disabled={!avail} className={`relative rounded-xl p-3 border-2 transition-all ${opened?'bg-[#20283D] border-[#3A4568] opacity-50':avail?'bg-[#2F96F0]/10 border-[#2F96F0]/50 hover:border-[#2F96F0] cursor-pointer':'bg-[#20283D] border-[#3A4568]'}`}>
                      <div className="flex flex-col items-center gap-1.5">
                        {opened?<CheckCircle2 className="w-8 h-8 text-[#57BC9A]"/>:avail?<div className="relative"><Gift className="w-8 h-8 text-[#2F96F0] animate-pulse"/><Sparkles className="w-3 h-3 text-[#FFD700] absolute -top-1 -right-1"/></div>:<div className="relative"><Gift className="w-8 h-8 text-[#3A4568]"/><Lock className="w-3 h-3 text-[#A9B5CB] absolute -bottom-1 -right-1"/></div>}
                        <span className={`text-[9px] font-bold ${box.boxType==='vip'?'text-[#FFD700]':box.boxType==='premium'?'text-[#C0C0C0]':'text-[#A9B5CB]'}`}>
                          {box.boxType==='vip'?'VIP':box.boxType==='premium'?'بريميوم':'عادي'}
                        </span>
                        <span className="text-[8px] text-[#57BC9A] font-bold">+${box.bonusAmount?.toFixed(0)}</span>
                        {locked&&<span className="text-[8px] text-[#A9B5CB]/60">{box.requiredTrades} صفقات</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>}

        {/* HISTORY */}
        {tab==='history' && <div className="space-y-2">
          {transactions.length===0 ? (
            <Card className="border-[#3A4568] bg-[#2D3651]">
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-10 h-10 text-[#3A4568] mx-auto mb-2"/>
                <p className="text-xs text-[#A9B5CB]">مفيش معاملات بعد</p>
              </CardContent>
            </Card>
          ) : transactions.map((tx:any)=>(
            <div key={tx.id} className="bg-[#2D3651] rounded-lg p-3 border border-[#3A4568]">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.type==='protection_claim'?'bg-[#57BC9A]/10 text-[#57BC9A]':tx.type==='reward_bonus'?'bg-[#FFD700]/10 text-[#FFD700]':tx.type==='subscription'?'bg-[#2F96F0]/10 text-[#2F96F0]':'bg-[#A9B5CB]/10 text-[#A9B5CB]'}`}>
                  {tx.type==='protection_claim'?'تعويض':tx.type==='reward_bonus'?'مكافأة':tx.type==='subscription'?'اشتراك':tx.type}
                </span>
                <span className={`text-sm font-bold ${tx.amount>=0?'text-[#57BC9A]':'text-[#D0011B]'}`}>${tx.amount?.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-[#A9B5CB]">{tx.description}</p>
            </div>
          ))}
        </div>}
      </div>
    </div>
  )
}
