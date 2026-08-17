'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, LogIn, Eye, EyeOff, AlertTriangle, Mail, Lock, Shield, Zap, Info, Bot, CheckCircle2, Loader2, Coins } from 'lucide-react'

// Dynamic API URL - works both locally and online
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3004'
  return window.location.origin
}

export default function LoginPage() {
  const router = useRouter()

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isDemo, setIsDemo] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'idle' | 'opening' | 'logging' | 'extracting' | 'connecting'>('idle')

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('الرجاء إدخال الإيميل والباسورد')
      return
    }
    setLoading(true)
    setError('')
    setStep('opening')

    const EO_API = getApiUrl()

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

  const stepLabels: Record<string, { text: string; icon: React.ReactNode }> = {
    opening: { text: 'فتح المتصفح...', icon: <Zap className="w-4 h-4 animate-pulse" /> },
    logging: { text: 'تسجيل الدخول...', icon: <LogIn className="w-4 h-4 animate-pulse" /> },
    extracting: { text: 'استخراج التوكن تلقائي...', icon: <Bot className="w-4 h-4 animate-pulse" /> },
    connecting: { text: 'ربط الحساب...', icon: <CheckCircle2 className="w-4 h-4 animate-pulse text-[#57BC9A]" /> },
  }

  return (
    <div className="min-h-screen bg-[#272E4A] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
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
            {/* Auto login badge */}
            <div className="bg-[#57BC9A]/8 border border-[#57BC9A]/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#57BC9A]" />
                <span className="text-xs font-bold text-[#57BC9A]">تسجيل دخول تلقائي 100%</span>
              </div>
              <p className="text-[10px] text-[#A9B5CB] mt-1.5 leading-relaxed">
                اكتب إيميلك وباسوردك بس — البوت يفتح Expert Option في الخلفية، يسجل دخولك، يجيب التوكن، ويربط حسابك. كل شي تلقائي!
              </p>
            </div>

            {/* Email */}
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

            {/* Error */}
            {error && (
              <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D0011B] flex-shrink-0 mt-0.5" />
                <span className="text-xs text-[#D0011B]">{error}</span>
              </div>
            )}

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full h-12 text-sm font-bold bg-[#2F96F0] hover:bg-[#1A7DE8] text-white rounded-lg shadow-lg shadow-[#2F96F0]/20"
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
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </span>
              )}
            </Button>

            {/* How it works */}
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
