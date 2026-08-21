'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { BackButton } from '@/components/ui/back-button'
import {
  Bot, Rocket, TrendingDown, TrendingUp, ListOrdered,
  AlarmClock, Shield, ShieldAlert, AlertTriangle, RefreshCcw,
  Mail, Lock, StopCircle, Activity, Coins,
} from 'lucide-react'

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3004'
  return window.location.origin
}

type Phase = 'setup' | 'running'

type BotReport = {
  st?: string
  tr?: number
  bal?: number | null
  pnl?: number | null
  amt?: number | null
  d?: string | null
  ts?: number
}

const ST_ARABIC: Record<string, string> = {
  'idle': 'في انتظار التفعيل',
  'opening': '⏳ جاري فتح Expert Option...',
  'wait-login': '⏳ سجّل دخولك في Expert Option — البوت يبدأ تلقائي بعد فتح حسابك',
  'no-bal': '⏳ انتظار فتح الحساب...',
  'no-amt': '🔍 البوت بيدور على خانة المبلغ في المنصة...',
  'no-btn': '🔍 البوت بيدور على أزرار التداول (شراء/بيع)...',
  'click': '✅ فتح صفقة جديدة',
  'wait': '⏳ في انتظار نتيجة الصفقة...',
  'win': '🎉 صفقة رابحة!',
  'loss': '📉 صفقة خاسرة — تعويض في الطريق',
  'skip': '➖ نتيجة غير واضحة — نكمّل',
  'js-error': '⚠ خطأ داخلي في الصفحة',
  'js-silent': '⚠ الصفحة مش بترد — المنصة ممكن تكون لسه بتحمّل',
  'done-max': '🏁 انتهى: اكتمل عدد الصفقات',
  'done-loss': '🏁 انتهى: وصلت لحد الخسارة',
  'done-profit': '🏁 انتهى: حققت حد الربح 🎉',
  'stop': '⏹ البوت متوقف',
}

export default function SetupPage() {
  const router = useRouter()

  // ===== Bot settings =====
  const [maxTrades, setMaxTrades] = useState('10')
  const [amount, setAmount] = useState('5')
  const [maxDailyLoss, setMaxDailyLoss] = useState('50')
  const [maxDailyProfit, setMaxDailyProfit] = useState('100')
  const [expiryMinutes, setExpiryMinutes] = useState('1')
  const [recovery, setRecovery] = useState(true)
  const [recoveryMultiplier, setRecoveryMultiplier] = useState('2')

  // Optional credentials (autofill inside the EO login page)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phase, setPhase] = useState<Phase>('setup')
  const [error, setError] = useState('')
  const [report, setReport] = useState<BotReport>({})
  const [errorCount, setErrorCount] = useState(0)
  const errorCountRef = useRef(0)

  // ===== Diagnostics beacon =====
  const beacon = (msg: string) => {
    try {
      fetch(`${getApiUrl()}/api/debug-log?tag=web&msg=${encodeURIComponent(msg)}`).catch(() => {})
    } catch {}
  }

  useEffect(() => {
    beacon(`setup-page-loaded ua=${navigator.userAgent.slice(0, 80)}`)
  }, [])

  // ===== Live bot status polling (while running) =====
  useEffect(() => {
    if (phase !== 'running') return
    const iv = window.setInterval(async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/bot-report`, { cache: 'no-store' })
        if (res.ok) {
          setReport(await res.json())
          errorCountRef.current = 0
          setErrorCount(0)
        }
      } catch {
        errorCountRef.current += 1
        setErrorCount(errorCountRef.current)
      }
    }, 2000)
    return () => window.clearInterval(iv)
  }, [phase])

  // ===== Direct push channel from the native bot (works even if the
  // server report fails): the app calls window.__botStatus(state) =====
  useEffect(() => {
    const W = window as any
    W.__botStatus = (s: any) => {
      if (!s || typeof s !== 'object') return
      setReport((prev) => ({ ...prev, ...s }))
      if (phaseRef.current !== 'running' && s.st && s.st !== 'opening') {
        setPhase('running')
      }
      // forward to server so it lands in the log too
      try {
        const q = new URLSearchParams({
          st: s.st || '', tr: String(s.tr ?? 0),
          ...(s.bal != null ? { bal: String(s.bal) } : {}),
          ...(s.pnl != null ? { pnl: String(s.pnl) } : {}),
          ...(s.amt != null ? { amt: String(s.amt) } : {}),
          ...(s.d ? { d: String(s.d) } : {}),
        }).toString()
        fetch(`${getApiUrl()}/api/bot-report-set?${q}`).catch(() => {})
      } catch {}
    }
    return () => { W.__botStatus = undefined }
  }, [])

  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  const fireScheme = (path: string, params: Record<string, string> = {}) => {
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = `eologin://${path}${qs ? '?' + qs : ''}`
    document.body.appendChild(iframe)
    window.setTimeout(() => iframe.remove(), 8_000)
  }

  // ===== Main button: save settings → open EO in the in-app browser → bot trades there =====
  const handleActivate = async () => {
    setError('')
    if ((Number(amount) || 0) < 1) { setError('مبلغ الصفقة لازم يكون 1 على الأقل'); return }
    if ((Number(maxDailyLoss) || 0) < 1) { setError('حد الخسارة لازم يكون 1 على الأقل'); return }

    // Keep a server-side record too
    fetch(`${getApiUrl()}/api/auto-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        amount: Number(amount) || 5,
        expiryMinutes: Number(expiryMinutes) || 1,
        maxTrades: Number(maxTrades) || 0,
        maxDailyLoss: Number(maxDailyLoss) || 50,
        maxDailyProfit: Number(maxDailyProfit) || 100,
        recovery,
        recoveryMultiplier: Number(recoveryMultiplier) || 2,
        maxConcurrentTrades: 1,
      }),
    }).catch(() => {})

    beacon(`activate browser-bot amount=${amount} trades=${maxTrades} recovery=${recovery ? 1 : 0}`)

    // Open Expert Option in the in-app browser with the bot config.
    // NO token: the user logs in and the bot trades inside that same browser.
    fireScheme('login', {
      email: email.trim(),
      password: password.trim(),
      amount: String(Number(amount) || 5),
      maxTrades: String(Number(maxTrades) || 0),
      maxDailyLoss: String(Number(maxDailyLoss) || 50),
      maxDailyProfit: String(Number(maxDailyProfit) || 100),
      expiryMinutes: String(Math.max(1, Number(expiryMinutes) || 1)),
      recovery: recovery ? '1' : '0',
      multiplier: String(Number(recoveryMultiplier) || 2),
    })

    setPhase('running')
  }

  const handleStop = () => {
    beacon('stop-from-page')
    fireScheme('stop')
  }

  const inputCls =
    'bg-[#20283D] border-[#3A4568] text-[#F5F5F5] rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:border-[#2F96F0]'
  const labelCls = 'text-xs text-[#A9B5CB] mb-1.5 block font-medium'
  const locked = phase === 'running'

  const stKey = report.st || 'idle'
  const pnl = typeof report.pnl === 'number' ? report.pnl : null

  return (
    <div className="min-h-screen bg-[#272E4A] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <BackButton href="/" label="الرئيسية" />
          <div className="flex items-center gap-1.5 text-[9px] text-[#A9B5CB]/60">
            <Shield className="w-3 h-3" />
            <span>Alfa Option Bot</span>
          </div>
        </div>

        <div className="text-center mb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#57BC9A] to-[#2F96F0] flex items-center justify-center mx-auto mb-3 shadow-xl">
            <Bot className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">إعداد البوت</h1>
          <p className="text-xs text-[#A9B5CB] mt-1">
            اضبط إعداداتك → فعّل البوت → سجّل دخولك → البوت يتداول على نفس المتصفح المفتوح
          </p>
        </div>

        {/* ===== Live status card (while running) ===== */}
        {phase === 'running' && (
          <Card className="border-[#57BC9A]/40 bg-[#2D3651] shadow-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#57BC9A] animate-pulse" />
                <span className="text-sm font-bold text-[#57BC9A]">البوت شغال على المتصفح</span>
              </div>

              <div className="rounded-lg bg-[#20283D] border border-[#3A4568] p-3 text-xs text-[#A9B5CB] leading-relaxed">
                {ST_ARABIC[stKey] || stKey}
                {errorCount > 3 && (
                  <div className="text-[#FF9F43] mt-1">تعذر تحديث الحالة مؤقتًا — البوت شغال عادي في المتصفح</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#20283D] border border-[#3A4568] p-2.5">
                  <div className="text-[10px] text-[#A9B5CB]">الصفقات</div>
                  <div className="text-base font-black text-[#F5F5F5]">{report.tr ?? 0}</div>
                </div>
                <div className="rounded-lg bg-[#20283D] border border-[#3A4568] p-2.5">
                  <div className="text-[10px] text-[#A9B5CB]">الرصيد</div>
                  <div className="text-base font-black text-[#F5F5F5]" dir="ltr">
                    {report.bal != null ? `$${Number(report.bal).toFixed(2)}` : '—'}
                  </div>
                </div>
                <div className={`rounded-lg bg-[#20283D] border p-2.5 ${pnl != null && pnl < 0 ? 'border-[#D0011B]/50' : 'border-[#3A4568]'}`}>
                  <div className="text-[10px] text-[#A9B5CB]">النتيجة</div>
                  <div className={`text-base font-black ${pnl == null ? 'text-[#F5F5F5]' : pnl >= 0 ? 'text-[#57BC9A]' : 'text-[#FF6B6B]'}`} dir="ltr">
                    {pnl == null ? '—' : `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStop}
                className="w-full py-3 rounded-xl bg-[#D0011B]/15 border border-[#D0011B]/40 text-[#FF6B6B] font-bold text-sm
                           flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <StopCircle className="w-4 h-4" />
                ⏹ إيقاف البوت
              </button>

              <p className="text-[10px] text-[#A9B5CB]/70 text-center leading-relaxed">
                المتصفح مفتوح فوق — ارجع له في أي وقت تشوف صفقاتك. لو قفلته بالغلط، ارجع هنا واضبط الإعدادات وفعّل تاني.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ===== Settings card ===== */}
        <Card className="border-[#3A4568] bg-[#2D3651] shadow-xl">
          <CardContent className="p-5 space-y-4">

            {/* Sequential badge */}
            <div className="rounded-lg p-3 bg-[#2F96F0]/10 border border-[#2F96F0]/25">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#2F96F0]" />
                <span className="text-xs font-bold text-[#2F96F0]">🔗 صفقات متتابعة — واحدة تنتهي ثم التالية</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>📈 عدد الصفقات</label>
                <input type="number" min={1} inputMode="numeric" dir="ltr" value={maxTrades}
                  onChange={(e) => setMaxTrades(e.target.value)} className={inputCls} disabled={locked} />
              </div>
              <div>
                <label className={labelCls}><Coins className="w-3 h-3 inline" /> مبلغ كل صفقة ($)</label>
                <input type="number" min={1} inputMode="numeric" dir="ltr" value={amount}
                  onChange={(e) => setAmount(e.target.value)} className={inputCls} disabled={locked} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><TrendingDown className="w-3 h-3 inline text-[#D0011B]" /> حد الخسارة ($)</label>
                <input type="number" min={1} inputMode="numeric" dir="ltr" value={maxDailyLoss}
                  onChange={(e) => setMaxDailyLoss(e.target.value)} className={inputCls} disabled={locked} />
              </div>
              <div>
                <label className={labelCls}><TrendingUp className="w-3 h-3 inline text-[#57BC9A]" /> حد الربح ($)</label>
                <input type="number" min={1} inputMode="numeric" dir="ltr" value={maxDailyProfit}
                  onChange={(e) => setMaxDailyProfit(e.target.value)} className={inputCls} disabled={locked} />
              </div>
            </div>

            <div>
              <label className={labelCls}><AlarmClock className="w-3 h-3 inline" /> مدة الصفقة (دقيقة)</label>
              <input type="number" min={1} max={30} inputMode="numeric" dir="ltr" value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(e.target.value)} className={inputCls} disabled={locked} />
              <p className="text-[10px] text-[#A9B5CB]/70 mt-1">
                لازم تكون نفس مدة الصفقة المختارة في منصة Expert Option نفسها.
              </p>
            </div>

            {/* Recovery */}
            <div className={`rounded-lg p-3 border ${recovery ? 'bg-[#FF9F43]/10 border-[#FF9F43]/30' : 'bg-[#20283D] border-[#3A4568]'}`}>
              <button className="w-full flex items-center justify-between" onClick={() => setRecovery(!recovery)} disabled={locked}>
                <div className="flex items-center gap-2">
                  <RefreshCcw className={`w-4 h-4 ${recovery ? 'text-[#FF9F43]' : 'text-[#A9B5CB]'}`} />
                  <span className={`text-xs font-bold ${recovery ? 'text-[#FF9F43]' : 'text-[#A9B5CB]'}`}>
                    🛡️ دخول تعويض بعد الخسارة (Martingale)
                  </span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-all ${recovery ? 'bg-[#FF9F43]' : 'bg-[#3A4568]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${recovery ? 'right-0.5' : 'right-5'}`} />
                </div>
              </button>
              {recovery && (
                <div className="mt-3">
                  <label className={labelCls}>معامل التعويض (×)</label>
                  <input type="number" min={1.1} max={5} step={0.1} dir="ltr" value={recoveryMultiplier}
                    onChange={(e) => setRecoveryMultiplier(e.target.value)} className={inputCls} disabled={locked} />
                  <p className="text-[10px] text-[#A9B5CB] mt-1.5">
                    خسارة → الصفقة الجاية = المبلغ × المعامل، لحد ما تربح ونرجع للمبلغ الأساسي.
                  </p>
                </div>
              )}
            </div>

            {/* Optional credentials */}
            <details className="rounded-lg bg-[#20283D] border border-[#3A4568] p-3">
              <summary className="text-xs font-bold text-[#A9B5CB] cursor-pointer flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> بيانات حسابك (اختياري — لتعبئة تلقائية)
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className={labelCls}>الإيميل</label>
                  <input type="email" dir="ltr" placeholder="you@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} className={inputCls} disabled={locked} />
                </div>
                <div>
                  <label className={labelCls}><Lock className="w-3 h-3 inline" /> الباسورد</label>
                  <input type="password" dir="ltr" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} className={inputCls} disabled={locked} />
                </div>
              </div>
            </details>

            {error && (
              <div className="rounded-lg bg-[#D0011B]/10 border border-[#D0011B]/30 p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D0011B] shrink-0" />
                <span className="text-xs text-[#FFB4B4]">{error}</span>
              </div>
            )}

            {/* ===== BIG ACTIVATE BUTTON ===== */}
            <button
              onClick={handleActivate}
              disabled={locked}
              className="w-full py-4 rounded-xl bg-gradient-to-l from-[#57BC9A] to-[#2F96F0] text-white font-black text-base
                         shadow-lg shadow-[#2F96F0]/30 flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all"
            >
              <Rocket className="w-5 h-5" />
              {locked ? 'البوت شغال — المتصفح فوق' : '🚀 تفعيل البوت'}
            </button>

            <p className="text-[10px] text-[#A9B5CB]/70 text-center leading-relaxed">
              بالضغط على تفعيل: هتفتح منصة Expert Option، تسجّل دخولك عادي، وأول ما حسابك يفتح
              البوت يبدأ ياخد الصفقات تلقائي على نفس المتصفح — واحدة ورا التانية.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
