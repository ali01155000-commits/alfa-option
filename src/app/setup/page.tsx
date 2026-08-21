'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/store/trading-store'
import { Card, CardContent } from '@/components/ui/card'
import { BackButton } from '@/components/ui/back-button'
import {
  Bot, Rocket, TrendingDown, TrendingUp, ListOrdered, Coins,
  AlarmClock, Shield, ShieldAlert, Loader2, CheckCircle2, RefreshCcw,
  Mail, Lock, AlertTriangle,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3004'
  return window.location.origin
}

type Phase = 'setup' | 'waiting-login' | 'verifying' | 'starting' | 'done'

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
  const [isDemo, setIsDemo] = useState(true)

  // Optional credentials (autofill inside the Expert Option login page)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phase, setPhase] = useState<Phase>('setup')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // ===== Diagnostics beacon: every step lands in the server log =====
  const W = () => (typeof window !== 'undefined' ? (window as any) : undefined)

  const beacon = (msg: string) => {
    try {
      fetch(`${getApiUrl()}/api/debug-log?tag=web&msg=${encodeURIComponent(msg)}`).catch(() => {})
    } catch {}
  }

  // Report page load once (proves the user is on the NEW app flow)
  useEffect(() => {
    beacon(`setup-page-loaded ua=${navigator.userAgent.slice(0, 80)}`)
  }, [])

  // ===== Backup channel: poll the native JavascriptInterface in case
  // the evaluateJavascript push never reaches the page =====
  useEffect(() => {
    const seen = new Set<string>()
    const iv = window.setInterval(() => {
      const nat = (window as any).__alfaNative
      if (!nat || typeof nat.poll !== 'function') return
      let raw: string
      try { raw = nat.poll() } catch { return }
      if (!raw) return
      try {
        const data = JSON.parse(raw)
        if (data.token && !seen.has(data.token)) {
          seen.add(data.token)
          beacon(`poll-got-token len=${(data.token as string).length}`)
          W()?.__eoToken?.(data.token)
        } else if (data.error && !seen.has('err:' + data.error)) {
          seen.add('err:' + data.error)
          beacon(`poll-got-error ${data.error}`)
          W()?.__eoToken?.(null, data.error)
        }
      } catch {}
    }, 1500)
    return () => window.clearInterval(iv)
  }, [])

  const notifyNative = (ok: boolean, token?: string) => {
    try {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = ok
        ? 'eologin://result?ok=1'
        : `eologin://result?ok=0&token=${encodeURIComponent(token || '')}`
      document.body.appendChild(iframe)
      window.setTimeout(() => iframe.remove(), 8_000)
    } catch {}
  }

  const fireSchemeLogin = () => {
    beacon('fire-scheme-login (iframe eologin://login)')
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = `eologin://login?email=${encodeURIComponent(email.trim())}&password=${encodeURIComponent(password.trim())}`
    document.body.appendChild(iframe)
    window.setTimeout(() => iframe.remove(), 10_000)
  }

  // ===== Verify a candidate token with the server; on success enable the bot =====
  const verifyTokenAndStart = async (token: string): Promise<boolean> => {
    const EO_API = getApiUrl()
    setPhase('verifying')
    setStatusMsg('⏳ جاري التحقق من التوكن مع السيرفر...')
    beacon(`verify-start len=${token.length}`)

    // 1) Login (server connects to Expert Option and validates the token)
    const loginRes = await fetch(`${EO_API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, is_demo: isDemo }),
    })
    if (!loginRes.ok) {
      const errDetail = await loginRes.json().catch(() => ({} as any))
      beacon(`verify-REJECTED http=${loginRes.status} ${String(errDetail.detail || '').slice(0, 120)}`)
      notifyNative(false, token)
      setPhase('waiting-login')
      setStatusMsg('❌ التوكن ده مرفوض — لسه بندور على التوكن الصحيح... سجل دخولك كامل في الصفحة')
      return false
    }
    const data = await loginRes.json()
    beacon(`verify-OK balance=${data.balance}`)

    // 2) Token is VALID → close the EO screen and start the bot
    notifyNative(true)
    setPhase('starting')
    setStatusMsg('✅ تم ربط حسابك! جاري تشغيل البوت...')

    useTradingStore.getState().setEOConnection({
      isLoggedIn: true,
      isDemo,
      token,
      realBalance: data.balance || 10000,
      autoTrading: true,
      dailyPnl: 0,
    })
    useTradingStore.getState().setBalance(data.balance || 10000)

    await fetch(`${EO_API}/api/auto-config`, {
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

    setPhase('done')
    router.push('/trading')
    return true
  }

  // ===== Main button: save settings → open Expert Option → wait for token =====
  const handleActivate = async () => {
    setError('')
    setBusy(true)

    // Validate settings
    if ((Number(amount) || 0) < 1) { setError('مبلغ الصفقة لازم يكون 1 على الأقل'); setBusy(false); return }
    if ((Number(maxDailyLoss) || 0) < 1) { setError('حد الخسارة لازم يكون 1 على الأقل'); setBusy(false); return }

    const EO_API = getApiUrl()

    // 1) Save bot config first (disabled until login succeeds)
    try {
      await fetch(`${EO_API}/api/auto-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: false,
          amount: Number(amount) || 5,
          expiryMinutes: Number(expiryMinutes) || 1,
          maxTrades: Number(maxTrades) || 0,
          maxDailyLoss: Number(maxDailyLoss) || 50,
          maxDailyProfit: Number(maxDailyProfit) || 100,
          recovery,
          recoveryMultiplier: Number(recoveryMultiplier) || 2,
          maxConcurrentTrades: 1,
        }),
      })
    } catch {}

    // 2) Listen for candidate tokens from the native WebView.
    //    The native side delivers EVERY new candidate it finds; we verify
    //    each one with the server and only accept when the server approves.
    W().__eoToken = async (token: string | null, err?: string) => {
      if (!token) {
        beacon(`native-error ${err || 'unknown'}`)
        setPhase('setup')
        setStatusMsg('')
        setError(err === 'CANCELED' ? 'تم إلغاء الدخول' : 'انتهت مهلة الدخول — جرّب تاني')
        return
      }
      beacon(`push-got-token len=${token.length} prefix=${token.slice(0, 6)}`)
      await verifyTokenAndStart(token)
    }
    beacon('listener-ready')

    // 3) Open Expert Option login inside the app
    beacon('activate-pressed')
    setPhase('waiting-login')
    setStatusMsg('🌐 فتح صفحة Expert Option — سجل دخولك وهنكمل الباقي تلقائي')
    fireSchemeLogin()

    // 4) Overall watchdog (native side keeps its own longer one)
    window.setTimeout(() => {
      if (phase === 'waiting-login' || phase === 'verifying') {
        // page still waiting — keep listener alive but warn
        setStatusMsg('⏳ لسه مستني الدخول... لو سجلت دخول بالفعل اضغط ✓ دخلت في الصفحة')
      }
    }, 300_000)

    setBusy(false)
  }

  const inputCls =
    'bg-[#20283D] border-[#3A4568] text-[#F5F5F5] rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:border-[#2F96F0]'
  const labelCls = 'text-xs text-[#A9B5CB] mb-1.5 block font-medium'

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
          <p className="text-xs text-[#A9B5CB] mt-1">اضبط إعداداتك ومّر تفعيل البوت — والبوت يتصل بحسابك ويبدأ الصفقات تلقائي</p>
        </div>

        {/* ===== Settings card ===== */}
        <Card className="border-[#3A4568] bg-[#2D3651] shadow-xl">
          <CardContent className="p-5 space-y-4">

            {/* Sequential badge */}
            <div className="rounded-lg p-3 bg-[#2F96F0]/10 border border-[#2F96F0]/25">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#2F96F0]" />
                <span className="text-xs font-bold text-[#2F96F0]">🔗 صفقات متتابعة — صفقة واحدة فقط في نفس الوقت</span>
              </div>
              <p className="text-[10px] text-[#A9B5CB] mt-1">البوت يستنى الصفقة تخلص، وبعدين يفتح اللي بعدها.</p>
            </div>

            {/* Account mode */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsDemo(true)}
                className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  isDemo ? 'bg-[#2F96F0] text-white border-[#2F96F0]' : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB]'
                }`}
              >
                🎮 تجريبي
              </button>
              <button
                onClick={() => setIsDemo(false)}
                className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  !isDemo ? 'bg-[#D0011B] text-white border-[#D0011B]' : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB]'
                }`}
              >
                💰 حقيقي
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>📈 عدد الصفقات</label>
                <input
                  type="number" min={1} inputMode="numeric" dir="ltr"
                  value={maxTrades}
                  onChange={(e) => setMaxTrades(e.target.value)}
                  className={inputCls}
                  disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
                />
              </div>
              <div>
                <label className={labelCls}>💰 مبلغ كل صفقة ($)</label>
                <input
                  type="number" min={1} inputMode="numeric" dir="ltr"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputCls}
                  disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><TrendingDown className="w-3 h-3 inline text-[#D0011B]" /> حد الخسارة ($)</label>
                <input
                  type="number" min={1} inputMode="numeric" dir="ltr"
                  value={maxDailyLoss}
                  onChange={(e) => setMaxDailyLoss(e.target.value)}
                  className={inputCls}
                  disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
                />
              </div>
              <div>
                <label className={labelCls}><TrendingUp className="w-3 h-3 inline text-[#57BC9A]" /> حد الربح ($)</label>
                <input
                  type="number" min={1} inputMode="numeric" dir="ltr"
                  value={maxDailyProfit}
                  onChange={(e) => setMaxDailyProfit(e.target.value)}
                  className={inputCls}
                  disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}><AlarmClock className="w-3 h-3 inline" /> مدة الصفقة (دقيقة)</label>
              <input
                type="number" min={1} max={30} inputMode="numeric" dir="ltr"
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(e.target.value)}
                className={inputCls}
                disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
              />
            </div>

            {/* Recovery */}
            <div className={`rounded-lg p-3 border ${recovery ? 'bg-[#FF9F43]/10 border-[#FF9F43]/30' : 'bg-[#20283D] border-[#3A4568]'}`}>
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setRecovery(!recovery)}
                disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
              >
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
                  <input
                    type="number" min={1.1} max={5} step={0.1} dir="ltr"
                    value={recoveryMultiplier}
                    onChange={(e) => setRecoveryMultiplier(e.target.value)}
                    className={inputCls}
                    disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
                  />
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
                  <input
                    type="email" dir="ltr" placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
                  />
                </div>
                <div>
                  <label className={labelCls}>الباسورد</label>
                  <input
                    type="password" dir="ltr" placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    disabled={busy || phase === 'waiting-login' || phase === 'verifying'}
                  />
                </div>
                <p className="text-[10px] text-[#A9B5CB]/70">
                  لو سيبتهم فاضيين، هتسجل دخولك بنفسك في صفحة Expert Option والبوت يكمّل من هناك.
                </p>
              </div>
            </details>

            {error && (
              <div className="rounded-lg bg-[#D0011B]/10 border border-[#D0011B]/30 p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D0011B] shrink-0" />
                <span className="text-xs text-[#FFB4B4]">{error}</span>
              </div>
            )}

            {/* Status while waiting for login */}
            {(phase === 'waiting-login' || phase === 'verifying' || phase === 'starting') && statusMsg && (
              <div className="rounded-lg bg-[#2F96F0]/10 border border-[#2F96F0]/25 p-3 flex items-center gap-2">
                {phase === 'verifying' || phase === 'starting'
                  ? <Loader2 className="w-4 h-4 text-[#2F96F0] animate-spin shrink-0" />
                  : <Loader2 className="w-4 h-4 text-[#2F96F0] animate-spin shrink-0" />}
                <span className="text-xs text-[#A9B5CB] leading-relaxed">{statusMsg}</span>
              </div>
            )}

            {/* ===== BIG ACTIVATE BUTTON ===== */}
            <button
              onClick={handleActivate}
              disabled={busy || phase === 'waiting-login' || phase === 'verifying' || phase === 'starting'}
              className="w-full py-4 rounded-xl bg-gradient-to-l from-[#57BC9A] to-[#2F96F0] text-white font-black text-base
                         shadow-lg shadow-[#2F96F0]/30 flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all"
            >
              <Rocket className="w-5 h-5" />
              {phase === 'waiting-login' ? 'مستني دخولك في Expert Option...' : '🚀 تفعيل البوت'}
            </button>

            <p className="text-[10px] text-[#A9B5CB]/70 text-center leading-relaxed">
              بالضغط على تفعيل: هتفتح منصة Expert Option، تسجّل دخولك، والبوت يتصل بحسابك ويبدأ ياخد الصفقات تلقائي — واحدة ورا التانية.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
