'use client'

import { useState } from 'react'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, LogIn, Eye, EyeOff, AlertTriangle, Info, Shield } from 'lucide-react'

export default function LoginPage() {
  const { eoLogin } = useTradingStore()
  const [token, setToken] = useState('')
  const [isDemo, setIsDemo] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!token.trim()) {
      setError('الرجاء إدخال الـ SSID Token')
      return
    }
    setLoading(true)
    setError('')
    
    const success = await eoLogin(token.trim(), isDemo)
    setLoading(false)
    
    if (!success) {
      setError('فشل الاتصال - تأكد من صحة الـ Token')
    }
  }

  return (
    <div className="min-h-screen bg-[#272E4A] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#2F96F0] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#2F96F0]/30">
            <TrendingUp className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Alfa Expert</h1>
          <p className="text-sm text-[#A9B5CB] mt-1">تداول آلي ذكي على Expert Option</p>
        </div>

        {/* Login Card */}
        <Card className="border-[#3A4568] bg-[#2D3651] shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-[#F5F5F5]">
              <LogIn className="w-5 h-5 text-[#2F96F0]" />
              تسجيل الدخول
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account Mode Toggle */}
            <div>
              <label className="text-xs text-[#A9B5CB] mb-2 block font-medium">نوع الحساب</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsDemo(true)}
                  className={`py-2.5 rounded-lg border text-sm font-bold transition-all ${
                    isDemo
                      ? 'bg-[#2F96F0] text-white border-[#2F96F0] shadow-md shadow-[#2F96F0]/20'
                      : 'bg-[#20283D] border-[#3A4568] text-[#A9B5CB] hover:bg-[#2D3651]'
                  }`}
                >
                  🎮 تجريبي (Demo)
                </button>
                <button
                  onClick={() => setIsDemo(false)}
                  className={`py-2.5 rounded-lg border text-sm font-bold transition-all ${
                    !isDemo
                      ? 'bg-[#D0011B] text-white border-[#D0011B] shadow-md shadow-[#D0011B]/20'
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
                  className="font-mono text-sm bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-11 pr-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A9B5CB] hover:text-[#F5F5F5]"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D0011B] flex-shrink-0" />
                <span className="text-xs text-[#D0011B]">{error}</span>
              </div>
            )}

            {/* Login Button */}
            <Button
              onClick={handleLogin}
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
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول إلى Expert Option
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* How to get Token */}
        <Card className="border-[#3A4568] bg-[#2D3651]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#2F96F0]" />
              <h3 className="text-xs font-bold text-[#F5F5F5]">كيف تجيب الـ SSID Token</h3>
            </div>
            <ol className="space-y-2 text-[11px] text-[#A9B5CB]">
              <li className="flex gap-2">
                <span className="bg-[#2F96F0] text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0">1</span>
                <span>افتح موقع <strong className="text-[#F5F5F5]">expertoption.com</strong> وسجل دخول</span>
              </li>
              <li className="flex gap-2">
                <span className="bg-[#2F96F0] text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0">2</span>
                <span>اضغط <strong className="text-[#F5F5F5]">F12</strong> لفتح Developer Tools</span>
              </li>
              <li className="flex gap-2">
                <span className="bg-[#2F96F0] text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0">3</span>
                <span>روح <strong className="text-[#F5F5F5]">Application → Cookies</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="bg-[#2F96F0] text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0">4</span>
                <span>دور على كوكي <strong className="text-[#F5F5F5]">ssid</strong> وانسخ قيمتها</span>
              </li>
              <li className="flex gap-2">
                <span className="bg-[#2F96F0] text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold flex-shrink-0">5</span>
                <span>الصق الـ Token هنا واضغط تسجيل الدخول</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Warning for real account */}
        {!isDemo && (
          <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-[#D0011B]" />
              <h3 className="text-xs font-bold text-[#D0011B]">تحذير: حساب حقيقي</h3>
            </div>
            <p className="text-[10px] text-[#D0011B]/80 leading-relaxed">
              أنت على وشك التداول بفلوس حقيقية. الخسارة ممكن تكون كاملة. لا تتداول بأموال لا يمكنك تحمل خسارتها. ننصحك تختبر في حساب تجريبي الأول.
            </p>
          </div>
        )}

        <div className="text-center text-[9px] text-[#A9B5CB]/60 pt-2">
          Alfa Expert v2.0 • تداول آلي ذكي • غير تابع لـ Expert Option
        </div>
      </div>
    </div>
  )
}
