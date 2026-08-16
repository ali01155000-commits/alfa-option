'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, LogIn, Eye, EyeOff, AlertTriangle, Mail, Lock, Shield, Zap, Key, Info } from 'lucide-react'

const EO_API = 'http://localhost:3004'

export default function LoginPage() {
  const router = useRouter()
  const { eoLogin } = useTradingStore()

  // Email login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isDemo, setIsDemo] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Token login state
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)

  // Login method
  const [loginMethod, setLoginMethod] = useState<'email' | 'token'>('email')

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('الرجاء إدخال الإيميل والباسورد')
      return
    }
    setLoading(true)
    setError('')

    try {
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

      router.push('/')
    } catch (e: any) {
      setError(e.message || 'فشل الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const handleTokenLogin = async () => {
    if (!token.trim()) {
      setError('الرجاء إدخال الـ SSID Token')
      return
    }
    setLoading(true)
    setError('')

    const success = await eoLogin(token.trim(), isDemo)
    setLoading(false)

    if (success) {
      router.push('/')
    } else {
      setError('فشل الاتصال - تأكد من صحة الـ Token')
    }
  }

  return (
    <div className="min-h-screen bg-[#272E4A] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#2F96F0]/30">
            <TrendingUp className="w-11 h-11 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#F5F5F5]">Alfa Expert</h1>
          <p className="text-sm text-[#A9B5CB] mt-2">تداول آلي ذكي على Expert Option</p>
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

        {/* Login Method Tabs */}
        <Card className="border-[#3A4568] bg-[#2D3651] shadow-xl">
          <CardContent className="p-0">
            <Tabs defaultValue="email" onValueChange={(v) => { setLoginMethod(v as any); setError('') }}>
              <TabsList className="w-full grid grid-cols-2 rounded-none rounded-t-lg bg-[#222940] h-10">
                <TabsTrigger value="email" className="text-xs gap-1 data-[state=active]:bg-[#2F96F0] data-[state=active]:text-white rounded-none">
                  <Mail className="w-3.5 h-3.5" />
                  إيميل + باسورد
                </TabsTrigger>
                <TabsTrigger value="token" className="text-xs gap-1 data-[state=active]:bg-[#2F96F0] data-[state=active]:text-white rounded-none">
                  <Key className="w-3.5 h-3.5" />
                  SSID Token
                </TabsTrigger>
              </TabsList>

              {/* Email Login */}
              <TabsContent value="email" className="p-4 space-y-3 mt-0">
                <div className="bg-[#57BC9A]/8 border border-[#57BC9A]/20 rounded-lg p-2.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#57BC9A]" />
                    <span className="text-[10px] font-bold text-[#57BC9A]">تسجيل دخول تلقائي!</span>
                  </div>
                  <p className="text-[9px] text-[#A9B5CB] mt-1">
                    أدخل إيميلك وباسوردك والنظام يسجل دخولك تلقائي ويجيب الرصيد
                  </p>
                </div>

                <div>
                  <label className="text-xs text-[#A9B5CB] mb-1.5 block font-medium">الإيميل</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A9B5CB]" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      className="bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-11 pl-10 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#A9B5CB] mb-1.5 block font-medium">الباسورد</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A9B5CB]" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      className="bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-11 pl-10 pr-10 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A9B5CB] hover:text-[#F5F5F5]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-2.5 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#D0011B] flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-[#D0011B]">{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleEmailLogin}
                  disabled={loading || !email.trim() || !password.trim()}
                  className="w-full h-12 text-sm font-bold bg-[#2F96F0] hover:bg-[#1A7DE8] text-white rounded-lg shadow-lg shadow-[#2F96F0]/20"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري تسجيل الدخول تلقائي...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      تسجيل الدخول
                    </span>
                  )}
                </Button>

                <div className="bg-[#20283D] rounded-lg p-2.5 border border-[#3A4568]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Info className="w-3 h-3 text-[#2F96F0]" />
                    <span className="text-[9px] font-bold text-[#F5F5F5]">كيف يشتغل؟</span>
                  </div>
                  <p className="text-[9px] text-[#A9B5CB] leading-relaxed">
                    النظام يفتح Expert Option في متصفح خفي (headless)، يسجل دخولك بإيميلك وباسوردك، يجيب الـ SSID Token من الـ Cookies تلقائي، ويربط حسابك. كل شي تلقائي! 🚀
                  </p>
                </div>
              </TabsContent>

              {/* Token Login (Advanced) */}
              <TabsContent value="token" className="p-4 space-y-3 mt-0">
                <div className="bg-[#2F96F0]/8 border border-[#2F96F0]/15 rounded-lg p-2.5 mb-1">
                  <p className="text-[9px] text-[#A9B5CB]">
                    <strong className="text-[#F5F5F5]">للمتقدمين:</strong> لو عندك الـ SSID Token، ادخله مباشرة. الطريقة العادية بالإيميل أسهل! 👆
                  </p>
                </div>

                <div>
                  <label className="text-xs text-[#A9B5CB] mb-1.5 block font-medium">SSID Token</label>
                  <div className="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder="أدخل الـ SSID Token"
                      value={token}
                      onChange={(e) => { setToken(e.target.value); setError('') }}
                      className="font-mono text-sm bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-11 pr-10"
                      onKeyDown={(e) => e.key === 'Enter' && handleTokenLogin()}
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A9B5CB] hover:text-[#F5F5F5]"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#D0011B] flex-shrink-0" />
                    <span className="text-xs text-[#D0011B]">{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleTokenLogin}
                  disabled={loading || !token.trim()}
                  className="w-full h-11 text-sm font-bold bg-[#2F96F0] hover:bg-[#1A7DE8] text-white rounded-lg shadow-lg shadow-[#2F96F0]/20"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري الاتصال...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      تسجيل دخول بالـ Token
                    </span>
                  )}
                </Button>

                {/* How to get token - collapsed */}
                <details className="text-[#A9B5CB]">
                  <summary className="text-[10px] cursor-pointer hover:text-[#F5F5F5] transition-colors">
                    كيف تجيب الـ Token؟ (اضغط هنا)
                  </summary>
                  <div className="mt-2 space-y-1.5 text-[10px] text-[#A9B5CB]/80">
                    <p>1. افتح expertoption.com وسجل دخول</p>
                    <p>2. اضغط F12 → Application → Cookies</p>
                    <p>3. دور على كوكي <strong className="text-[#F5F5F5]">ssid</strong> وانسخ قيمتها</p>
                    <p>4. أو في Console: <code className="bg-[#20283D] px-1 rounded font-mono text-[9px]">document.cookie.match(/ssid=([^;]+)/)[1]</code></p>
                  </div>
                </details>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Warning for real account */}
        {!isDemo && (
          <div className="bg-[#D0011B]/8 border border-[#D0011B]/25 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-[#D0011B]" />
              <h3 className="text-xs font-bold text-[#D0011B]">⚠️ تحذير: حساب حقيقي</h3>
            </div>
            <p className="text-[10px] text-[#D0011B]/80 leading-relaxed">
              أنت على وشك التداول بفلوس حقيقية. في Options، الخسارة ممكن تكون كاملة لمبلغ الصفقة. لا تتداول بأموال لا يمكنك تحمل خسارتها.
            </p>
          </div>
        )}

        <div className="text-center text-[9px] text-[#A9B5CB]/40 pt-1">
          Alfa Expert v2.0 • تداول آلي ذكي • غير تابع لـ Expert Option
        </div>
      </div>
    </div>
  )
}
