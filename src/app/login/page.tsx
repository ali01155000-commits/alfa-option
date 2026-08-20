'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, LogIn, Eye, EyeOff, AlertTriangle, Mail, Lock, Shield, Zap, Info, Bot, CheckCircle2, Loader2, Coins, KeyRound, ClipboardPaste } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { bindAccountToDevice, getDeviceId, getDeviceInfo } from '@/lib/device-fingerprint'
import { Capacitor } from '@capacitor/core'

// Dynamic API URL - works both locally and online
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3004'
  return window.location.origin
}

export default function LoginPage() {
  const router = useRouter()

  // In the native Android app the WebView auto-login plugin is available.
  // Detect via Capacitor bridge OR the custom user agent (appends AlfaOptionApp).
  const isNativeApp =
    Capacitor.isNativePlatform() ||
    (typeof navigator !== 'undefined' && /AlfaOptionApp/i.test(navigator.userAgent))

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isDemo, setIsDemo] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'idle' | 'opening' | 'logging' | 'extracting' | 'connecting'>('idle')
  const [deviceError, setDeviceError] = useState('')
  const [mode, setMode] = useState<'auto' | 'token'>('token')
  const [ssidToken, setSsidToken] = useState('')

  // In the mobile app, auto (WebView) login is the best method
  useEffect(() => {
    if (Capacitor.isNativePlatform()) setMode('auto')
  }, [])

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('الرجاء إدخال الإيميل والباسورد')
      return
    }

    // ===== Device Binding Check =====
    const bindResult = bindAccountToDevice(email.trim())
    if (!bindResult.success) {
      setDeviceError(bindResult.message || 'هذا الحساب مربوط بجهاز آخر')
      return
    }

    setLoading(true)
    setError('')
    setDeviceError('')
    setStep('opening')

    const EO_API = getApiUrl()

    // ===== Native App: WebView auto-login (no geo-block, from user's device) =====
    if (isNativeApp) {
      try {
        setStep('logging')

        // Primary: URL-scheme channel (works without the Capacitor JS bridge)
        // Fallback: plugin bridge if available
        const plugin = (Capacitor as any).Plugins?.EOAutoLogin
        let token: string

        if (plugin?.login) {
          try {
            const res = await plugin.login({ email: email.trim(), password: password.trim() })
            token = res?.token as string
          } catch (pluginErr: any) {
            // Plugin bridge failed midway — fall through to scheme
            if (pluginErr?.message === 'CANCELED') throw pluginErr
            token = await startSchemeLogin(email.trim(), password.trim())
          }
        } else {
          token = await startSchemeLogin(email.trim(), password.trim())
        }

        if (!token) throw new Error('لم يتم استخراج التوكن — تأكد من بيانات حسابك')

        await connectWithToken(token)
      } catch (e: any) {
        const msg = e?.message === 'CANCELED'
          ? 'تم إلغاء تسجيل الدخول'
          : e?.message === 'TIMEOUT'
          ? 'انتهت المهلة بدون استخراج التوكن — سجل دخولك يدويًا في الصفحة اللي هتفتح، أو استخدم وضع SSID Token'
          : (e?.message || 'فشل الدخول التلقائي')
        setError(msg)
        setStep('idle')
      } finally {
        setLoading(false)
      }
      return
    }

    // ===== Web: server-side Playwright auto-login =====
    try {
      // Step 1: Opening browser
      await new Promise(r => setTimeout(r, 1500))
      setStep('logging')

      // Step 2: Logging in
      await new Promise(r => setTimeout(r, 1500))
      setStep('extracting')

      const res = await fetch(`${EO_API}/api/login-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim(), is_demo: isDemo }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'فشل تسجيل الدخول' }))
        throw new Error(err.detail || 'فشل تسجيل الدخول')
      }

      const data = await res.json()

      // Step 3: Connecting
      setStep('connecting')
      await new Promise(r => setTimeout(r, 1000))

      // Update store
      useTradingStore.getState().setEOConnection({
        isLoggedIn: true,
        isDemo,
        token: 'auto-login',
        realBalance: data.balance || 10000,
        autoTrading: false,
        dailyPnl: 0,
      })
      useTradingStore.getState().setBalance(data.balance || 10000)

      router.push('/trading')
    } catch (e: any) {
      setError(e.message || 'فشل الاتصال - تأكد من الإيميل والباسورد')
      setStep('idle')
    } finally {
      setLoading(false)
    }
  }

  // ===== Manual SSID Token Login (most reliable method) =====
  const handleTokenLogin = async () => {
    const token = ssidToken.trim()
    if (!token || token.length < 20) {
      setError('التوكن غير صالح — لازم تلصق قيمة كوكي ssid كاملة من متصفحك')
      return
    }

    setLoading(true)
    setError('')
    setDeviceError('')
    setStep('connecting')

    const EO_API = getApiUrl()

    try {
      const res = await fetch(`${EO_API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, is_demo: isDemo }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'فشل الاتصال بالتوكن' }))
        throw new Error(err.detail || 'التوكن غير صحيح أو منتهي الصلاحية — اطلع توكن جديد من متصفحك وجرب تاني')
      }

      const data = await res.json()

      useTradingStore.getState().setEOConnection({
        isLoggedIn: true,
        isDemo,
        token,
        realBalance: data.balance || 10000,
        autoTrading: false,
        dailyPnl: 0,
      })
      useTradingStore.getState().setBalance(data.balance || 10000)

      router.push('/trading')
    } catch (e: any) {
      setError(e.message || 'فشل الاتصال بالتوكن')
      setStep('idle')
    } finally {
      setLoading(false)
    }
  }

  // ===== WebView auto-login via URL scheme =====
  // Works inside the Android app WITHOUT the Capacitor JS bridge:
  // an invisible iframe navigates to eologin://login?... which the native
  // side intercepts, opens Expert Option in a dialog, auto-fills, captures
  // the ssid token and calls window.__eoToken(token) back on this page.
  const startSchemeLogin = (email: string, password: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const W = window as any
      const timeout = window.setTimeout(() => {
        W.__eoToken = undefined
        reject(new Error('TIMEOUT'))
      }, 200_000)

      W.__eoToken = (token: string | null, error?: string) => {
        window.clearTimeout(timeout)
        W.__eoToken = undefined
        if (token) resolve(token)
        else reject(new Error(error || 'NO_TOKEN'))
      }

      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = `eologin://login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      document.body.appendChild(iframe)
      window.setTimeout(() => iframe.remove(), 10_000)
    })

  const connectWithToken = async (token: string) => {
    setStep('connecting')
    const EO_API = getApiUrl()
    const loginRes = await fetch(`${EO_API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, is_demo: isDemo }),
    })
    if (!loginRes.ok) {
      const err = await loginRes.json().catch(() => ({ detail: 'فشل ربط الحساب' }))
      throw new Error(err.detail || 'فشل ربط الحساب بالتوكن')
    }
    const data = await loginRes.json()
    useTradingStore.getState().setEOConnection({
      isLoggedIn: true,
      isDemo,
      token,
      realBalance: data.balance || 10000,
      autoTrading: false,
      dailyPnl: 0,
    })
    useTradingStore.getState().setBalance(data.balance || 10000)
    router.push('/trading')
  }

  const stepLabels: Record<string, { text: string; icon: React.ReactNode }> = {
    opening: { text: 'فتح المتصفح...', icon: <Zap className="w-4 h-4 animate-pulse" /> },
    logging: { text: 'تسجيل الدخول...', icon: <LogIn className="w-4 h-4 animate-pulse" /> },
    extracting: { text: 'استخراج التوكن تلقائي...', icon: <Bot className="w-4 h-4 animate-pulse" /> },
    connecting: { text: 'ربط الحساب...', icon: <CheckCircle2 className="w-4 h-4 animate-pulse text-[#57BC9A]" /> },
  }

  return (
    <div className="min-h-screen bg-[#272E4A] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <BackButton href="/" label="الرئيسية" />
          <div className="flex items-center gap-1.5 text-[9px] text-[#A9B5CB]/60">
            <Shield className="w-3 h-3" />
            <span>جهاز: {typeof window !== 'undefined' ? getDeviceInfo().split('•')[0]?.trim() : ''}</span>
          </div>
        </div>
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#2F96F0]/30">
            <span className="text-4xl font-black text-white">α</span>
          </div>
          <h1 className="text-3xl font-bold text-[#F5F5F5]">Alfa Option</h1>
          <p className="text-sm text-[#A9B5CB] mt-2">تداول آلي ذكي على Expert Option</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Coins className="w-4 h-4 text-[#FFD700]" />
            <span className="text-xs text-[#FFD700] font-bold">نظام حماية Alfa Coins مفعل</span>
          </div>
        </div>

        {/* Account Mode Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsDemo(true)}
            className={`py-3 rounded-xl border text-sm font-bold transition-all ${
              isDemo
                ? 'bg-[#2F96F0] text-white border-[#2F96F0] shadow-md shadow-[#2F96F0]/25'
                : 'bg-[#2D3651] border-[#3A4568] text-[#A9B5CB] hover:bg-[#3A4568]'
            }`}
          >
            🎮 تجريبي
          </button>
          <button
            onClick={() => setIsDemo(false)}
            className={`py-3 rounded-xl border text-sm font-bold transition-all ${
              !isDemo
                ? 'bg-[#D0011B] text-white border-[#D0011B] shadow-md shadow-[#D0011B]/25'
                : 'bg-[#2D3651] border-[#3A4568] text-[#A9B5CB] hover:bg-[#3A4568]'
            }`}
          >
            💰 حقيقي
          </button>
        </div>

        {/* Login Card */}
        <Card className="border-[#3A4568] bg-[#2D3651] shadow-xl">
          <CardContent className="p-5 space-y-4">
            {/* Login Mode Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMode('auto'); setError('') }}
                className={`py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'auto'
                    ? 'bg-[#2F96F0]/15 text-[#2F96F0] border-[#2F96F0]'
                    : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB] hover:bg-[#3A4568]/50'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                تلقائي (إيميل)
              </button>
              <button
                onClick={() => { setMode('token'); setError('') }}
                className={`py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'token'
                    ? 'bg-[#57BC9A]/15 text-[#57BC9A] border-[#57BC9A]'
                    : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB] hover:bg-[#3A4568]/50'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                SSID Token (مضمون)
              </button>
            </div>

            {/* Auto login badge */}
            {mode === 'auto' && (
            <div className={`rounded-lg p-3 ${isNativeApp ? 'bg-[#57BC9A]/8 border border-[#57BC9A]/20' : 'bg-[#FF9F43]/10 border border-[#FF9F43]/25'}`}>
              <div className="flex items-center gap-2">
                <Bot className={`w-4 h-4 ${isNativeApp ? 'text-[#57BC9A]' : 'text-[#FF9F43]'}`} />
                <span className={`text-xs font-bold ${isNativeApp ? 'text-[#57BC9A]' : 'text-[#FF9F43]'}`}>
                  {isNativeApp ? 'تسجيل تلقائي عبر التطبيق — مضمون ✅' : 'تسجيل تلقائي (قد لا يعمل في بعض الدول)'}
                </span>
              </div>
              <p className="text-[10px] text-[#A9B5CB] mt-1.5 leading-relaxed">
                {isNativeApp
                  ? 'اكتب إيميل وباسورد حساب Expert Option — التطبيق يفتح صفحة الدخول الرسمية، يعبي بياناتك، ويربط حسابك تلقائيًا.'
                  : 'البوت يفتح Expert Option في الخلفية ويسجل دخولك — لكن الموقع يحجب الخدمة عن بعض الدول، وعندها استخدم وضع SSID Token.'}
              </p>
            </div>
            )}

            {/* SSID Token mode UI */}
            {mode === 'token' && (
              <>
                <div className="bg-[#57BC9A]/8 border border-[#57BC9A]/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#57BC9A]" />
                    <span className="text-xs font-bold text-[#57BC9A]">الدخول الأضمن — نجاح شبه مضمون</span>
                  </div>
                  <p className="text-[10px] text-[#A9B5CB] mt-1.5 leading-relaxed">
                    بتلصق التوكن من متصفحك مباشرة — مفيش متصفح خفي ولا حماية بتوقفك.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-[#A9B5CB] mb-1.5 block font-medium">SSID Token</label>
                  <div className="relative">
                    <ClipboardPaste className="absolute left-3 top-4 w-4 h-4 text-[#A9B5CB]" />
                    <textarea
                      placeholder='الصق قيمة كوكي "ssid" من متصفحك هنا...'
                      value={ssidToken}
                      onChange={(e) => { setSsidToken(e.target.value); setError('') }}
                      className="bg-[#20283D] border-[#3A4568] text-[#F5F5F5] rounded-lg pl-10 pr-3 py-3 text-xs placeholder:text-[#3A4568] w-full h-24 resize-none font-mono focus:outline-none focus:border-[#57BC9A]"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* How to get SSID */}
                <div className="bg-[#20283D] rounded-lg p-3 border border-[#3A4568]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="w-3.5 h-3.5 text-[#57BC9A]" />
                    <span className="text-[10px] font-bold text-[#F5F5F5]">إزاي تجيب التوكن؟ (دقيقة واحدة)</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-[#A9B5CB]">
                      <span className="w-5 h-5 rounded-full bg-[#57BC9A]/20 text-[#57BC9A] flex items-center justify-center text-[9px] font-bold flex-shrink-0">1</span>
                      <span>افتح <span className="text-[#57BC9A] font-bold">expertoption.com</span> في متصفحك وسجل دخولك عادي</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#A9B5CB]">
                      <span className="w-5 h-5 rounded-full bg-[#57BC9A]/20 text-[#57BC9A] flex items-center justify-center text-[9px] font-bold flex-shrink-0">2</span>
                      <span>اضغط <span className="text-[#F5F5F5] font-bold">F12</span> → تبويب <span className="text-[#F5F5F5] font-bold">Application</span> → <span className="text-[#F5F5F5] font-bold">Cookies</span> → expertoption.com</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#A9B5CB]">
                      <span className="w-5 h-5 rounded-full bg-[#57BC9A]/20 text-[#57BC9A] flex items-center justify-center text-[9px] font-bold flex-shrink-0">3</span>
                      <span>دوّر على كوكي اسمه <span className="text-[#F5F5F5] font-bold">ssid</span> واعمل Copy لقيمة الـ Value</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#A9B5CB]">
                      <span className="w-5 h-5 rounded-full bg-[#2F96F0]/20 text-[#2F96F0] flex items-center justify-center text-[9px] font-bold flex-shrink-0">4</span>
                      <span>الصقه في الخانة فوق واضغط "دخول بالتوكن"</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            {mode === 'auto' && (
            <>
            <div>
              <label className="text-xs text-[#A9B5CB] mb-1.5 block font-medium">الإيميل</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A9B5CB]" />
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  className="bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-12 pl-10 text-sm placeholder:text-[#3A4568]"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-[#A9B5CB] mb-1.5 block font-medium">الباسورد</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A9B5CB]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  className="bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-12 pl-10 pr-10 text-sm placeholder:text-[#3A4568]"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={loading}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A9B5CB] hover:text-[#F5F5F5]"
                  type="button"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            </>
            )}

            {/* Error */}
            {error && (
              <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-3 flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#D0011B] flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-[#D0011B]">{error}</span>
                </div>
                {mode === 'auto' && (
                  <button
                    onClick={() => { setMode('token'); setError('') }}
                    className="text-[10px] text-[#57BC9A] font-bold underline underline-offset-2 text-right"
                    type="button"
                  >
                    مش شغال؟ جرب وضع SSID Token الأضمن →
                  </button>
                )}
              </div>
            )}

            {/* Login Button */}
            <Button
              onClick={mode === 'auto' ? handleLogin : handleTokenLogin}
              disabled={loading || (mode === 'auto' ? (!email.trim() || !password.trim()) : ssidToken.trim().length < 20)}
              className={`w-full h-12 text-sm font-bold rounded-lg shadow-lg ${
                mode === 'token'
                  ? 'bg-[#57BC9A] hover:bg-[#4aa887] text-white shadow-[#57BC9A]/20'
                  : 'bg-[#2F96F0] hover:bg-[#1A7DE8] text-white shadow-[#2F96F0]/20'
              }`}
            >
              {loading && step && stepLabels[step] ? (
                <span className="flex items-center gap-2">
                  {stepLabels[step].icon}
                  {stepLabels[step].text}
                </span>
              ) : loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التسجيل...
                </span>
              ) : mode === 'token' ? (
                <span className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  دخول بالتوكن
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </span>
              )}
            </Button>

            {/* How it works */}
            {mode === 'auto' && (
            <div className="bg-[#20283D] rounded-lg p-3 border border-[#3A4568]">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-[#2F96F0]" />
                <span className="text-[10px] font-bold text-[#F5F5F5]">كيف يشتغل البوت؟</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] text-[#A9B5CB]">
                  <span className="w-5 h-5 rounded-full bg-[#2F96F0]/20 text-[#2F96F0] flex items-center justify-center text-[9px] font-bold flex-shrink-0">1</span>
                  <span>البوت يفتح Expert Option في متصفح خفي (Headless Chrome)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#A9B5CB]">
                  <span className="w-5 h-5 rounded-full bg-[#2F96F0]/20 text-[#2F96F0] flex items-center justify-center text-[9px] font-bold flex-shrink-0">2</span>
                  <span>يسجل دخولك بإيميلك وباسوردك على الموقع</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#A9B5CB]">
                  <span className="w-5 h-5 rounded-full bg-[#2F96F0]/20 text-[#2F96F0] flex items-center justify-center text-[9px] font-bold flex-shrink-0">3</span>
                  <span>يستخرج الـ SSID Token من الـ Cookies تلقائي</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#A9B5CB]">
                  <span className="w-5 h-5 rounded-full bg-[#57BC9A]/20 text-[#57BC9A] flex items-center justify-center text-[9px] font-bold flex-shrink-0">4</span>
                  <span>يربط حسابك ويجيب الرصيد — جاهز للتداول!</span>
                </div>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Warning for real account */}
        {!isDemo && (
          <div className="bg-[#D0011B]/8 border border-[#D0011B]/25 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-[#D0011B]" />
              <h3 className="text-xs font-bold text-[#D0011B]">تحذير: حساب حقيقي</h3>
            </div>
            <p className="text-[10px] text-[#D0011B]/80 leading-relaxed">
              أنت على وشك التداول بفلوس حقيقية. في Options، الخسارة ممكن تكون كاملة لمبلغ الصفقة. لا تتداول بأموال لا يمكنك تحمل خسارتها.
            </p>
          </div>
        )}

        <div className="text-center text-[9px] text-[#A9B5CB]/40 pt-1">
          Alfa Option v3.0 • تداول آلي ذكي • حماية Alfa Coins
        </div>
      </div>
    </div>
  )
}
