'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, LogIn, Eye, EyeOff, AlertTriangle, Info, Shield, Cookie, Globe, Keyboard, Copy, Check, ChevronDown, ChevronUp, MonitorSmartphone } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { eoLogin } = useTradingStore()
  const [token, setToken] = useState('')
  const [isDemo, setIsDemo] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(true)
  const [copiedStep, setCopiedStep] = useState(-1)

  const handleLogin = async () => {
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
      setError('فشل الاتصال - تأكد من صحة الـ Token أو جرب تجديد الـ SSID من المتصفح')
    }
  }

  const steps = [
    {
      icon: <Globe className="w-4 h-4" />,
      title: 'افتح موقع Expert Option',
      detail: 'روح على expertoption.com وسجل دخول بحسابك العادي',
      shortcut: null,
    },
    {
      icon: <Keyboard className="w-4 h-4" />,
      title: 'افتح أدوات المطور',
      detail: 'اضغط F12 أو Ctrl+Shift+I (على Mac: Cmd+Option+I)',
      shortcut: 'F12',
    },
    {
      icon: <MonitorSmartphone className="w-4 h-4" />,
      title: 'روح تبويب Application',
      detail: 'من القائمة الجانبية اضغط على Application ← Cookies ← expertoption.com',
      shortcut: null,
    },
    {
      icon: <Cookie className="w-4 h-4" />,
      title: 'دور على كوكي ssid',
      detail: 'ابحث في قائمة الـ Cookies عن الاسم "ssid" - هذا هو الـ Token',
      shortcut: null,
    },
    {
      icon: <Copy className="w-4 h-4" />,
      title: 'انسخ القيمة',
      detail: 'انسخ قيمة الـ Cookie (القيمة الطويلة اللي جنب ssid) والصقها فوق',
      shortcut: null,
    },
  ]

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
          <p className="text-[10px] text-[#A9B5CB]/60 mt-1">v2.0 — ربط مباشر مع حسابك الحقيقي</p>
        </div>

        {/* Login Card */}
        <Card className="border-[#3A4568] bg-[#2D3651] shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-[#F5F5F5]">
              <LogIn className="w-5 h-5 text-[#2F96F0]" />
              تسجيل الدخول إلى Expert Option
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account Mode Toggle */}
            <div>
              <label className="text-xs text-[#A9B5CB] mb-2 block font-medium">نوع الحساب</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsDemo(true)}
                  className={`py-3 rounded-lg border text-sm font-bold transition-all ${
                    isDemo
                      ? 'bg-[#2F96F0] text-white border-[#2F96F0] shadow-md shadow-[#2F96F0]/25'
                      : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB] hover:bg-[#2D3651]'
                  }`}
                >
                  🎮 تجريبي (Demo)
                </button>
                <button
                  onClick={() => setIsDemo(false)}
                  className={`py-3 rounded-lg border text-sm font-bold transition-all ${
                    !isDemo
                      ? 'bg-[#D0011B] text-white border-[#D0011B] shadow-md shadow-[#D0011B]/25'
                      : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB] hover:bg-[#2D3651]'
                  }`}
                >
                  💰 حقيقي (Real)
                </button>
              </div>
            </div>

            {/* SSID Token Input */}
            <div>
              <label className="text-xs text-[#A9B5CB] mb-2 block font-medium">SSID Token</label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="أدخل الـ SSID Token من Expert Option"
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setError('') }}
                  className="font-mono text-sm bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-12 pr-10 placeholder:text-[#A9B5CB]/40"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A9B5CB] hover:text-[#F5F5F5] transition-colors"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-[#A9B5CB]/60 mt-1.5">
                الـ Token يتجدد كل فترة — لو ما اشتغل، جرب تجيده من المتصفح
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D0011B] flex-shrink-0" />
                <span className="text-xs text-[#D0011B]">{error}</span>
              </div>
            )}

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={loading || !token.trim()}
              className="w-full h-12 text-sm font-bold bg-[#2F96F0] hover:bg-[#1A7DE8] text-white rounded-lg shadow-lg shadow-[#2F96F0]/20 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الاتصال بـ Expert Option...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* How to get Token Guide */}
        <Card className="border-[#3A4568] bg-[#2D3651]">
          <CardContent className="p-4">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#2F96F0]/15 flex items-center justify-center">
                  <Info className="w-4 h-4 text-[#2F96F0]" />
                </div>
                <h3 className="text-sm font-bold text-[#F5F5F5]">كيف تجيب الـ SSID Token؟</h3>
              </div>
              {showGuide ? (
                <ChevronUp className="w-4 h-4 text-[#A9B5CB]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A9B5CB]" />
              )}
            </button>

            {showGuide && (
              <div className="mt-4 space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <span className="bg-gradient-to-b from-[#2F96F0] to-[#1A6DD0] text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm">
                        {i + 1}
                      </span>
                      {i < steps.length - 1 && (
                        <div className="w-0.5 h-4 bg-[#3A4568] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#F5F5F5]">{step.title}</span>
                        {step.shortcut && (
                          <kbd className="bg-[#20283D] border border-[#3A4568] rounded px-1.5 py-0.5 text-[9px] text-[#A9B5CB] font-mono">
                            {step.shortcut}
                          </kbd>
                        )}
                      </div>
                      <p className="text-[11px] text-[#A9B5CB] mt-0.5 leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                ))}

                {/* Visual hint */}
                <div className="mt-4 bg-[#20283D] rounded-lg p-3 border border-[#3A4568]">
                  <p className="text-[10px] text-[#A9B5CB] mb-2 font-medium">📍 مكان الـ Token في المتصفح:</p>
                  <div className="font-mono text-[10px] text-[#A9B5CB]/80 space-y-1">
                    <div className="text-[#F5F5F5]">Developer Tools</div>
                    <div className="pl-2">└── Application</div>
                    <div className="pl-4">└── Cookies</div>
                    <div className="pl-6">└── https://expertoption.com</div>
                    <div className="pl-8 text-[#2F96F0]">└── ssid = <span className="text-[#57BC9A]">"abc123def456:789..."</span></div>
                  </div>
                </div>

                {/* Alternative methods */}
                <div className="mt-3 bg-[#20283D]/50 rounded-lg p-3 border border-[#3A4568]/50">
                  <p className="text-[10px] font-bold text-[#A9B5CB] mb-2">💡 طرق بديلة:</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2 text-[10px] text-[#A9B5CB]/80">
                      <span className="text-[#2F96F0]">•</span>
                      <span><strong className="text-[#F5F5F5]">Console سريع:</strong> بعد ما تفتح F12، اكتب: <code className="bg-[#20283D] px-1 rounded font-mono">document.cookie.match(/ssid=([^;]+)/)[1]</code></span>
                    </li>
                    <li className="flex items-start gap-2 text-[10px] text-[#A9B5CB]/80">
                      <span className="text-[#2F96F0]">•</span>
                      <span><strong className="text-[#F5F5F5]">Extension:</strong> تستخدم Chrome Extension مخصص يسحب الـ Token تلقائي (قريباً)</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warning for real account */}
        {!isDemo && (
          <div className="bg-[#D0011B]/8 border border-[#D0011B]/25 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-[#D0011B]" />
              <h3 className="text-sm font-bold text-[#D0011B]">⚠️ تحذير: حساب حقيقي</h3>
            </div>
            <p className="text-[11px] text-[#D0011B]/80 leading-relaxed">
              أنت على وشك التداول بفلوس حقيقية. في التداول بالخيارات (Options)، الخسارة ممكن تكون كاملة لمبلغ الصفقة. لا تتداول بأموال لا يمكنك تحمل خسارتها. ننصحك تجرب في حساب تجريبي الأول قبل التداول الحقيقي.
            </p>
          </div>
        )}

        {/* Token expiry note */}
        <div className="bg-[#2F96F0]/8 border border-[#2F96F0]/15 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#2F96F0] flex-shrink-0" />
            <p className="text-[10px] text-[#A9B5CB] leading-relaxed">
              <strong className="text-[#F5F5F5]">ملحوظة:</strong> الـ SSID Token ينتهي بعد فترة (عادة ساعات). لو انقطع الاتصال، جدد الـ Token من المتصفح وسجل دخول مرة ثانية.
            </p>
          </div>
        </div>

        <div className="text-center text-[9px] text-[#A9B5CB]/40 pt-2">
          Alfa Expert v2.0 • تداول آلي ذكي • غير تابع لـ Expert Option
        </div>
      </div>
    </div>
  )
}
