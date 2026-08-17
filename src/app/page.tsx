'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Shield, Bot, Zap, TrendingUp, Star, Crown, CheckCircle2,
  Coins, Award, Sparkles, ChevronLeft, Key, ShoppingCart,
  BarChart3, Target, Brain, Cpu, ArrowRight, Lock,
  AlertTriangle, Gift, Wallet
} from 'lucide-react'
import Image from 'next/image'

type PageState = 'landing' | 'activation' | 'success'

export default function LandingPage() {
  const router = useRouter()
  const { eoConnection, activation, verifyActivation } = useTradingStore()

  // If already logged in, redirect to trading
  useEffect(() => {
    if (eoConnection.isLoggedIn) {
      router.push('/trading')
    }
  }, [eoConnection.isLoggedIn, router])

  // If already activated (but not logged in), go to login
  useEffect(() => {
    if (activation.isActivated && !eoConnection.isLoggedIn) {
      router.push('/login')
    }
  }, [activation.isActivated, eoConnection.isLoggedIn, router])

  const [pageState, setPageState] = useState<PageState>('landing')
  const [activationCode, setActivationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  const handleEnterBot = () => {
    setPageState('activation')
  }

  const handleVerifyCode = async () => {
    if (!activationCode.trim()) {
      setError('الرجاء إدخال كود التفعيل')
      return
    }
    setVerifying(true)
    setError('')

    const ok = await verifyActivation(activationCode.trim())
    if (ok) {
      setPageState('success')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } else {
      setError('كود التفعيل غير صحيح — تأكد من الكود وحاول مرة أخرى')
    }
    setVerifying(false)
  }

  const handleBuyCode = () => {
    window.open('https://t.me/alfaoption_bot', '_blank')
  }

  return (
    <div className="min-h-screen bg-[#272E4A] text-[#F5F5F5]">
      {/* ============ HERO SECTION ============ */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2F96F0]/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#2F96F0]/5 rounded-full blur-3xl" />

        <div className="relative max-w-lg mx-auto px-4 pt-8 pb-6">
          {/* Logo + Brand */}
          <div className="text-center mb-6">
            <div className="relative w-28 h-28 mx-auto mb-4">
              <Image
                src="/robot-image.png"
                alt="Alfa Option Robot"
                fill
                className="object-contain drop-shadow-[0_0_30px_rgba(47,150,240,0.4)]"
                priority
              />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] flex items-center justify-center shadow-lg shadow-[#2F96F0]/30">
                <span className="text-2xl font-black text-white">α</span>
              </div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-[#2F96F0] via-[#57BC9A] to-[#2F96F0] bg-clip-text text-transparent">
                Alfa Option
              </h1>
            </div>
            <p className="text-sm text-[#A9B5CB] font-medium">
              روبوت تداول ذكي يعمل لك أوتوماتيك
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-[#57BC9A]/10 border border-[#57BC9A]/30 text-[10px] font-bold text-[#57BC9A]">
                v3.0
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#2F96F0]/10 border border-[#2F96F0]/30 text-[10px] font-bold text-[#2F96F0]">
                AI Powered
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[10px] font-bold text-[#FFD700]">
                Protection
              </span>
            </div>
          </div>

          {/* ============ LANDING STATE ============ */}
          {pageState === 'landing' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Subscription Card */}
              <Card className="border-[#2F96F0]/30 bg-gradient-to-b from-[#2D3651] to-[#222940] shadow-xl shadow-[#2F96F0]/10 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#2F96F0]/5 rounded-bl-full" />
                <CardContent className="p-5 relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-[#FFD700]" />
                    <h2 className="text-lg font-bold text-[#F5F5F5]">اشتراك شهري</h2>
                    <span className="mr-auto px-2 py-0.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[10px] font-bold text-[#FFD700]">الأكثر طلباً</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-5xl font-black text-[#F5F5F5]">$150</span>
                    <span className="text-sm text-[#A9B5CB]">/شهرياً</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { icon: Bot, text: 'روبوت تداول آلي 24/7', color: '#2F96F0' },
                      { icon: Brain, text: '5 استراتيجيات ذكية (MA, RSI, MACD, Scalping, Trend)', color: '#57BC9A' },
                      { icon: Shield, text: 'نظام حماية Alfa Coins من الخسارة', color: '#FFD700' },
                      { icon: Target, text: 'إدارة مخاطر أوتوماتيكية', color: '#2F96F0' },
                      { icon: BarChart3, text: 'تداول على 50+ زوج عملات', color: '#57BC9A' },
                      { icon: Coins, text: 'كسب Alfa Coins كل 100 صفقة', color: '#FFD700' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                          <item.icon className="w-4 h-4" style={{ color: item.color }} />
                        </div>
                        <span className="text-xs text-[#A9B5CB] font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bot Power Description */}
              <Card className="border-[#3A4568] bg-[#2D3651]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-5 h-5 text-[#2F96F0]" />
                    <h3 className="text-sm font-bold text-[#F5F5F5]">قوة البوت</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'استراتيجيات', value: '5', icon: Brain, color: '#2F96F0' },
                      { label: 'أزواج العملات', value: '50+', icon: TrendingUp, color: '#57BC9A' },
                      { label: 'نسبة الفوز', value: '72%+', icon: Target, color: '#FFD700' },
                      { label: 'سرعة التنفيذ', value: '<1ث', icon: Zap, color: '#2F96F0' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-[#20283D] rounded-xl p-3 text-center">
                        <stat.icon className="w-5 h-5 mx-auto mb-1" style={{ color: stat.color }} />
                        <p className="text-lg font-black text-[#F5F5F5]">{stat.value}</p>
                        <p className="text-[9px] text-[#A9B5CB]">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Alfa Coins Explanation */}
              <Card className="border-[#FFD700]/30 bg-[#2D3651]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-5 h-5 text-[#FFD700]" />
                    <h3 className="text-sm font-bold text-[#FFD5F5]">نظام Alfa Coins للحماية</h3>
                  </div>
                  <div className="bg-[#20283D] rounded-xl p-3 mb-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-3xl">🪙</span>
                      <span className="text-2xl font-black text-[#FFD700]">100 α</span>
                      <span className="text-xs text-[#A9B5CB]">= صندوق حماية</span>
                    </div>
                    <p className="text-[10px] text-[#A9B5CB] text-center">
                      كل 100 صفقة على البوت = 100 كوين الفا = صندوق حماية من الخسارة
                    </p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { step: '1', text: 'تداول على البوت — كل صفقة تحسب', color: '#2F96F0' },
                      { step: '2', text: 'كل 100 صفقة تكسب صندوق 100 Alfa Coin', color: '#57BC9A' },
                      { step: '3', text: 'Alfa Coins تحميك من الصفقات الخاسرة تلقائياً', color: '#FFD700' },
                      { step: '4', text: 'كل 1 Alfa Coin = $0.10 تعويض من الخسارة', color: '#57BC9A' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                          {item.step}
                        </span>
                        <span className="text-[11px] text-[#A9B5CB]">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ENTER BOT BUTTON - Big and Clear */}
              <Button
                onClick={handleEnterBot}
                className="w-full h-14 text-lg font-black bg-gradient-to-r from-[#2F96F0] to-[#1A6DD0] hover:from-[#1A7DE8] hover:to-[#1560B8] text-white rounded-2xl shadow-2xl shadow-[#2F96F0]/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Bot className="w-6 h-6 ml-2" />
                دخول البوت
                <ArrowRight className="w-5 h-5 mr-2" />
              </Button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 py-2">
                <div className="flex items-center gap-1 text-[10px] text-[#A9B5CB]">
                  <Lock className="w-3 h-3" />
                  <span>آمن 100%</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#A9B5CB]">
                  <Shield className="w-3 h-3" />
                  <span>حماية رصيد</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#A9B5CB]">
                  <Zap className="w-3 h-3" />
                  <span>تنفيذ فوري</span>
                </div>
              </div>
            </div>
          )}

          {/* ============ ACTIVATION STATE ============ */}
          {pageState === 'activation' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Activation Card */}
              <Card className="border-[#2F96F0]/30 bg-[#2D3651] shadow-xl">
                <CardContent className="p-5 space-y-4">
                  <div className="text-center mb-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#2F96F0]/30">
                      <Key className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-[#F5F5F5]">تفعيل البوت</h2>
                    <p className="text-xs text-[#A9B5CB] mt-1">أدخل كود التفعيل للوصول للبوت</p>
                  </div>

                  {/* Code Input */}
                  <div>
                    <label className="text-xs text-[#A9B5CB] mb-1.5 block font-medium">ضع الكود هنا</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A9B5CB]" />
                      <Input
                        type="text"
                        placeholder="ALFA-XXXX-XXXX"
                        value={activationCode}
                        onChange={(e) => { setActivationCode(e.target.value.toUpperCase()); setError('') }}
                        className="bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-14 pl-10 text-center text-lg font-mono font-bold tracking-wider placeholder:text-[#3A4568] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                        disabled={verifying}
                        maxLength={20}
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#D0011B] flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-[#D0011B]">{error}</span>
                    </div>
                  )}

                  {/* Verify Button */}
                  <Button
                    onClick={handleVerifyCode}
                    disabled={verifying || !activationCode.trim()}
                    className="w-full h-12 text-sm font-bold bg-[#2F96F0] hover:bg-[#1A7DE8] text-white rounded-xl shadow-lg shadow-[#2F96F0]/20"
                  >
                    {verifying ? (
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4 animate-pulse" />
                        جاري التحقق...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        تفعيل الكود
                      </span>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#3A4568]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#2D3651] px-3 text-[#A9B5CB]">أو</span>
                    </div>
                  </div>

                  {/* Buy Code Button */}
                  <Button
                    onClick={handleBuyCode}
                    className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFC700] hover:to-[#FF9500] text-[#1A1F2E] rounded-xl shadow-lg shadow-[#FFD700]/20"
                  >
                    <ShoppingCart className="w-4 h-4 ml-1.5" />
                    شراء كود تفعيل
                  </Button>

                  {/* Buy info */}
                  <div className="bg-[#20283D] rounded-lg p-3 border border-[#3A4568]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Gift className="w-3.5 h-3.5 text-[#FFD700]" />
                      <span className="text-[10px] font-bold text-[#F5F5F5]">كيف تحصل على كود التفعيل؟</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-[#A9B5CB]">• اشترك شهرياً بـ $150 واحصل على الكود فوراً</p>
                      <p className="text-[10px] text-[#A9B5CB]">• تواصل معنا على تليجرام لشراء الكود</p>
                      <p className="text-[10px] text-[#A9B5CB]">• الكود يفتح لك كل مميزات البوت + نظام الحماية</p>
                    </div>
                  </div>

                  {/* Back button */}
                  <Button
                    onClick={() => setPageState('landing')}
                    variant="ghost"
                    className="w-full text-[#A9B5CB] hover:text-[#F5F5F5] hover:bg-[#20283D]"
                  >
                    <ChevronLeft className="w-4 h-4 ml-1" />
                    رجوع
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ============ SUCCESS STATE ============ */}
          {pageState === 'success' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <Card className="border-[#57BC9A]/30 bg-[#2D3651] shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#57BC9A]/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-[#57BC9A]" />
                  </div>
                  <h2 className="text-xl font-bold text-[#57BC9A] mb-2">تم التفعيل بنجاح!</h2>
                  <p className="text-sm text-[#A9B5CB] mb-4">جاري التحويل لصفحة تسجيل الدخول...</p>
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="w-4 h-4 text-[#2F96F0] animate-pulse" />
                    <span className="text-xs text-[#2F96F0]">تحميل...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 pb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#2F96F0] flex items-center justify-center">
                <span className="text-xs font-black text-white">α</span>
              </div>
              <span className="text-xs font-bold text-[#A9B5CB]">Alfa Option v3.0</span>
            </div>
            <p className="text-[9px] text-[#3A4568]">
              تداول آلي ذكي • حماية Alfa Coins • غير تابع لأي منصة
            </p>
            <p className="text-[8px] text-[#3A4568] mt-1">
              ⚠️ تداول العملات ينطوي على مخاطر عالية — لا تتداول بأموال لا يمكنك تحمل خسارتها
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
