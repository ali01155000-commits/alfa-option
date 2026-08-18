'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/store/trading-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Shield, Bot, Zap, TrendingUp, Star, Crown, CheckCircle2,
  Coins, Award, Sparkles, ChevronLeft, Key, ShoppingCart,
  BarChart3, Target, Brain, Cpu, ArrowRight, Lock,
  AlertTriangle, Gift, Wallet, Copy, Check, Send,
  Camera, QrCode, MessageCircle, ExternalLink,
  Fingerprint, Rocket, Flame
} from 'lucide-react'
import Image from 'next/image'

type PageState = 'landing' | 'activation' | 'success'
type BuyStep = 'idle' | 'wallet' | 'screenshot' | 'send'

// ============ WALLET ADDRESSES ============
const WALLETS = [
  {
    address: '0x01338E0788D52C0cA35C36aB7281Cf3e6B4780Bd',
    network: 'BEP20 (BNB Smart Chain)',
    networkShort: 'BEP20',
    currency: 'USDT',
    color: '#F0B90B',
    qrImage: '/wallet-bep20-qr.png',
  },
  {
    address: 'TGGsJVHMbWwXmzNNXcrhmeHMd7Z3w8t5dx',
    network: 'TRC20 (TRON)',
    networkShort: 'TRC20',
    currency: 'USDT',
    color: '#FF0013',
    qrImage: '/wallet-trc20-qr.png',
  },
]
const SUBSCRIPTION_PRICE = '$150'
const TELEGRAM_CHANNEL = '@ALFa_proo'
const DEMO_CODE = 'ALFA-DEMO-2024'

// Generate a unique payment reference ID
function generatePaymentId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ALFA-${timestamp}-${random}`
}

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

  const [pageState, setPageState] = useState<PageState>('activation')
  const [activationCode, setActivationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)

  // Buy flow state
  const [buyStep, setBuyStep] = useState<BuyStep>('idle')
  const [paymentId, setPaymentId] = useState('')
  const [walletCopied, setWalletCopied] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState(0) // 0 = BEP20, 1 = TRC20

  const handleEnterBot = () => {
    setPageState('activation')
    setBuyStep('idle')
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
      setShowSuccessAnim(true)
      setPageState('success')
      setTimeout(() => {
        router.push('/login')
      }, 2500)
    } else {
      setError('كود التفعيل غير صحيح — تأكد من الكود وحاول مرة أخرى')
    }
    setVerifying(false)
  }

  const handleDemoCode = () => {
    setActivationCode(DEMO_CODE)
    setError('')
  }

  const handleBuyCode = () => {
    // Generate unique payment ID
    const newPaymentId = generatePaymentId()
    setPaymentId(newPaymentId)
    setBuyStep('wallet')
  }

  const copyWalletAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(WALLETS[selectedWallet].address)
      setWalletCopied(true)
      setTimeout(() => setWalletCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = WALLETS[selectedWallet].address
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setWalletCopied(true)
      setTimeout(() => setWalletCopied(false), 2000)
    }
  }, [selectedWallet])

  const handleSendToTelegram = () => {
    const wallet = WALLETS[selectedWallet]
    const message = encodeURIComponent(
      `🔑 طلب كود تفعيل Alfa Option\n\n` +
      `📋 رقم المرجع: ${paymentId}\n` +
      `💰 المبلغ: ${SUBSCRIPTION_PRICE} USDT\n` +
      `🌐 الشبكة: ${wallet.network}\n` +
      `📍 المحفظة: ${wallet.address}\n\n` +
      `✅ تم إرسال المبلغ لعنوان المحفظة\n` +
      `📸 مرفق سكرين شوت إثبات الدفع\n\n` +
      `⏳ بانتظار الكود...`
    )
    window.open(`https://t.me/ALFa_proo?text=${message}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#272E4A] text-[#F5F5F5]">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#2F96F0]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#57BC9A]/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-8">
        {/* Logo + Brand */}
        <div className="text-center mb-6">
          <div className="relative w-24 h-24 mx-auto mb-3">
            <Image
              src="/robot-image.png"
              alt="Alfa Option Robot"
              fill
              className="object-contain drop-shadow-[0_0_30px_rgba(47,150,240,0.5)]"
              priority
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] flex items-center justify-center shadow-lg shadow-[#2F96F0]/30">
              <span className="text-xl font-black text-white">α</span>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-[#2F96F0] via-[#57BC9A] to-[#2F96F0] bg-clip-text text-transparent">
              Alfa Option
            </h1>
          </div>
          <p className="text-xs text-[#A9B5CB] font-medium">
            روبوت تداول ذكي يعمل لك أوتوماتيك
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-[#57BC9A]/10 border border-[#57BC9A]/30 text-[9px] font-bold text-[#57BC9A]">v3.0</span>
            <span className="px-2 py-0.5 rounded-full bg-[#2F96F0]/10 border border-[#2F96F0]/30 text-[9px] font-bold text-[#2F96F0]">AI</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[9px] font-bold text-[#FFD700]">Protection</span>
          </div>
        </div>

        {/* ============ ACTIVATION STATE - PRIMARY ============ */}
        {pageState === 'activation' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Main Activation Card */}
            <Card className="border-[#2F96F0]/40 bg-gradient-to-b from-[#2D3651] to-[#222940] shadow-2xl shadow-[#2F96F0]/15 overflow-hidden">
              <CardContent className="p-6 space-y-5">
                {/* Header */}
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] animate-pulse opacity-20" />
                    <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] flex items-center justify-center shadow-xl shadow-[#2F96F0]/40">
                      <Fingerprint className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-[#F5F5F5]">دخول البوت</h2>
                  <p className="text-sm text-[#A9B5CB] mt-1.5">أدخل كود التفعيل عشان تدخل البوت وتبدأ تداول</p>
                </div>

                {/* Code Input */}
                <div>
                  <label className="text-xs text-[#A9B5CB] mb-2 block font-semibold">كود التفعيل</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2F96F0]" />
                    <Input
                      type="text"
                      placeholder="ALFA-XXXX-XXXX"
                      value={activationCode}
                      onChange={(e) => { setActivationCode(e.target.value.toUpperCase()); setError('') }}
                      className="bg-[#20283D] border-[#3A4568] text-[#F5F5F5] h-16 pl-12 text-center text-xl font-mono font-bold tracking-[0.2em] placeholder:text-[#3A4568] placeholder:text-base placeholder:tracking-normal placeholder:font-normal focus:border-[#2F96F0] focus:ring-[#2F96F0]/20"
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                      disabled={verifying}
                      maxLength={20}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-[#D0011B]/10 border border-[#D0011B]/30 rounded-xl p-3 flex items-start gap-2 animate-in fade-in duration-200">
                    <AlertTriangle className="w-4 h-4 text-[#D0011B] flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-[#D0011B]">{error}</span>
                  </div>
                )}

                {/* Verify Button - Main CTA */}
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifying || !activationCode.trim()}
                  className="w-full h-14 text-base font-black bg-gradient-to-r from-[#2F96F0] to-[#1A6DD0] hover:from-[#1A7DE8] hover:to-[#1560B8] text-white rounded-2xl shadow-2xl shadow-[#2F96F0]/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {verifying ? (
                    <span className="flex items-center gap-2">
                      <Zap className="w-5 h-5 animate-pulse" />
                      جاري التحقق من الكود...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Rocket className="w-5 h-5" />
                      دخول البوت
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                {/* Demo code hint */}
                <div className="bg-[#57BC9A]/8 border border-[#57BC9A]/25 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-[#57BC9A]" />
                    <span className="text-xs font-bold text-[#57BC9A]">تجربة مجانية</span>
                  </div>
                  <p className="text-[11px] text-[#A9B5CB] mb-2 leading-relaxed">
                    عايز تجرب البوت الأول؟ استخدم الكود التجريبي:
                  </p>
                  <button
                    onClick={handleDemoCode}
                    className="w-full bg-[#20283D] border border-[#57BC9A]/30 rounded-lg p-2.5 text-center font-mono font-bold text-[#57BC9A] text-sm tracking-wider hover:bg-[#57BC9A]/10 transition-all"
                  >
                    {DEMO_CODE}
                    <span className="block text-[9px] text-[#A9B5CB] font-normal mt-0.5 tracking-normal">اضغط هنا عشان تحط الكود تلقائي</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#3A4568]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#2D3651] px-4 text-[#A9B5CB]">أو</span>
                  </div>
                </div>

                {/* ============ BUY CODE FLOW ============ */}
                {buyStep === 'idle' && (
                  <div className="space-y-3">
                    <Button
                      onClick={handleBuyCode}
                      className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFC700] hover:to-[#FF9500] text-[#1A1F2E] rounded-xl shadow-lg shadow-[#FFD700]/20 transition-all hover:scale-[1.01]"
                    >
                      <ShoppingCart className="w-4 h-4 ml-1.5" />
                      شراء كود تفعيل — {SUBSCRIPTION_PRICE}/شهر
                    </Button>
                    <div className="bg-[#20283D] rounded-lg p-3 border border-[#3A4568]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Gift className="w-3.5 h-3.5 text-[#FFD700]" />
                        <span className="text-[10px] font-bold text-[#F5F5F5]">كيف تحصل على كود التفعيل؟</span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-[#A9B5CB]">1️⃣ أرسل {SUBSCRIPTION_PRICE} USDT لعنوان المحفظة</p>
                        <p className="text-[10px] text-[#A9B5CB]">2️⃣ التقط سكرين شوت لإثبات الدفع</p>
                        <p className="text-[10px] text-[#A9B5CB]">3️⃣ أرسله لقناة تليجرام {TELEGRAM_CHANNEL}</p>
                        <p className="text-[10px] text-[#A9B5CB]">4️⃣ هنرسلك كود التفعيل فوراً!</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Wallet Address */}
                {buyStep === 'wallet' && (
                  <div className="space-y-3">
                    {/* Payment ID */}
                    <div className="bg-[#2F96F0]/10 border border-[#2F96F0]/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Key className="w-4 h-4 text-[#2F96F0]" />
                        <span className="text-[10px] font-bold text-[#2F96F0]">رقم المرجع الخاص بك</span>
                      </div>
                      <p className="text-sm font-mono font-bold text-[#F5F5F5] text-center tracking-wider">{paymentId}</p>
                      <p className="text-[9px] text-[#A9B5CB] text-center mt-1">احتفظ بهذا الرقم — سيُستخدم لتتبع الدفع</p>
                    </div>

                    {/* Network Tabs - BEP20 / TRC20 */}
                    <div className="flex gap-1 bg-[#222940] rounded-lg p-1">
                      {WALLETS.map((w, i) => (
                        <button
                          key={i}
                          onClick={() => { setSelectedWallet(i); setWalletCopied(false) }}
                          className={`flex-1 py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${selectedWallet === i ? 'shadow-md text-white' : 'text-[#A9B5CB] hover:text-[#F5F5F5]'}`}
                          style={selectedWallet === i ? { backgroundColor: w.color } : {}}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          {w.networkShort}
                        </button>
                      ))}
                    </div>

                    {/* Wallet Info Card */}
                    <div className="bg-[#20283D] rounded-xl p-4 border border-[#FFD700]/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Wallet className="w-5 h-5 text-[#FFD700]" />
                        <h3 className="text-sm font-bold text-[#F5F5F5]">عنوان المحفظة</h3>
                        <span className="mr-auto px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: `${WALLETS[selectedWallet].color}20`, color: WALLETS[selectedWallet].color, border: `1px solid ${WALLETS[selectedWallet].color}50` }}>
                          {WALLETS[selectedWallet].network}
                        </span>
                      </div>

                      {/* Amount to send */}
                      <div className="bg-[#272E4A] rounded-lg p-3 mb-3 text-center">
                        <p className="text-[10px] text-[#A9B5CB] mb-1">المبلغ المطلوب</p>
                        <p className="text-3xl font-black text-[#FFD700]">{SUBSCRIPTION_PRICE}</p>
                        <p className="text-[10px] text-[#A9B5CB]">{WALLETS[selectedWallet].currency} على شبكة {WALLETS[selectedWallet].networkShort}</p>
                      </div>

                      {/* QR Code */}
                      <div className="bg-[#272E4A] rounded-lg p-3 mb-3 flex justify-center">
                        <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2" style={{ borderColor: `${WALLETS[selectedWallet].color}50` }}>
                          <Image
                            src={WALLETS[selectedWallet].qrImage}
                            alt={`QR Code ${WALLETS[selectedWallet].networkShort}`}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>

                      {/* Wallet address */}
                      <div className="bg-[#272E4A] rounded-lg p-3 mb-3">
                        <p className="text-[10px] text-[#A9B5CB] mb-1.5">عنوان المحفظة:</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-mono text-[#F5F5F5] break-all flex-1 leading-relaxed" dir="ltr">{WALLETS[selectedWallet].address}</p>
                          <button
                            onClick={copyWalletAddress}
                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{ backgroundColor: `${WALLETS[selectedWallet].color}20` }}
                          >
                            {walletCopied ? <Check className="w-4 h-4 text-[#57BC9A]" /> : <Copy className="w-4 h-4" style={{ color: WALLETS[selectedWallet].color }} />}
                          </button>
                        </div>
                        {walletCopied && (
                          <p className="text-[9px] text-[#57BC9A] font-bold mt-1 text-center">✅ تم النسخ!</p>
                        )}
                      </div>

                      {/* Step indicator */}
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ backgroundColor: WALLETS[selectedWallet].color }}>1</span>
                        <p className="text-[11px] text-[#A9B5CB]">أرسل {SUBSCRIPTION_PRICE} {WALLETS[selectedWallet].currency} على شبكة {WALLETS[selectedWallet].networkShort} للعنوان أعلاه</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setBuyStep('screenshot')}
                      className="w-full h-11 text-sm font-bold bg-[#2F96F0] hover:bg-[#1A7DE8] text-white rounded-xl"
                    >
                      تم الإرسال ← الخطوة التالية
                      <ArrowRight className="w-4 h-4 mr-1" />
                    </Button>

                    <Button
                      onClick={() => setBuyStep('idle')}
                      variant="ghost"
                      className="w-full text-[#A9B5CB] text-xs hover:bg-[#20283D]"
                    >
                      <ChevronLeft className="w-3 h-3 ml-1" />
                      رجوع
                    </Button>
                  </div>
                )}

                {/* Step 2: Screenshot */}
                {buyStep === 'screenshot' && (
                  <div className="space-y-3">
                    <div className="bg-[#20283D] rounded-xl p-4 border border-[#57BC9A]/20">
                      <div className="text-center mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#57BC9A]/10 flex items-center justify-center mx-auto mb-2">
                          <Camera className="w-7 h-7 text-[#57BC9A]" />
                        </div>
                        <h3 className="text-sm font-bold text-[#F5F5F5]">التقط سكرين شوت</h3>
                        <p className="text-[10px] text-[#A9B5CB] mt-1">صوّر إثبات الدفع من تطبيق المحفظة</p>
                      </div>

                      <div className="space-y-2">
                        {[
                          'افتح تطبيق المحفظة اللي أرسلت منها',
                          'روح لصفحة تأكيد التحويل',
                          'صوّر السكرين شوت (يوضح المبلغ + العنوان + التاريخ)',
                          'تأكد إن الصورة واضحة ومقروءة',
                        ].map((text, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#57BC9A]/20 text-[#57BC9A] flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-[10px] text-[#A9B5CB] leading-relaxed">{text}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <span className="w-6 h-6 rounded-full bg-[#57BC9A] flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">2</span>
                        <p className="text-[11px] text-[#A9B5CB]">التقط سكرين شوت لإثبات الدفع</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setBuyStep('send')}
                      className="w-full h-11 text-sm font-bold bg-[#57BC9A] hover:bg-[#4AA88A] text-white rounded-xl"
                    >
                      عندي السكرين شوت ← الخطوة التالية
                      <ArrowRight className="w-4 h-4 mr-1" />
                    </Button>

                    <Button
                      onClick={() => setBuyStep('wallet')}
                      variant="ghost"
                      className="w-full text-[#A9B5CB] text-xs hover:bg-[#20283D]"
                    >
                      <ChevronLeft className="w-3 h-3 ml-1" />
                      رجوع
                    </Button>
                  </div>
                )}

                {/* Step 3: Send to Telegram */}
                {buyStep === 'send' && (
                  <div className="space-y-3">
                    <div className="bg-[#20283D] rounded-xl p-4 border border-[#0088CC]/20">
                      <div className="text-center mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#0088CC]/10 flex items-center justify-center mx-auto mb-2">
                          <Send className="w-7 h-7 text-[#0088CC]" />
                        </div>
                        <h3 className="text-sm font-bold text-[#F5F5F5]">أرسل لقناة تليجرام</h3>
                        <p className="text-[10px] text-[#A9B5CB] mt-1">أرسل السكرين شوت + رقم المرجع لقناة الدعم</p>
                      </div>

                      {/* Summary */}
                      <div className="bg-[#272E4A] rounded-lg p-3 mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#A9B5CB]">رقم المرجع:</span>
                          <span className="font-mono font-bold text-[#2F96F0]" dir="ltr">{paymentId}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#A9B5CB]">المبلغ:</span>
                          <span className="font-bold text-[#FFD700]">{SUBSCRIPTION_PRICE} USDT</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#A9B5CB]">الشبكة:</span>
                          <span className="font-bold" style={{ color: WALLETS[selectedWallet].color }}>{WALLETS[selectedWallet].network}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#A9B5CB]">القناة:</span>
                          <span className="font-bold text-[#0088CC]">{TELEGRAM_CHANNEL}</span>
                        </div>
                      </div>

                      <div className="bg-[#0088CC]/10 rounded-lg p-3 border border-[#0088CC]/20">
                        <div className="flex items-center gap-2 mb-1.5">
                          <MessageCircle className="w-4 h-4 text-[#0088CC]" />
                          <span className="text-[10px] font-bold text-[#0088CC]">الرسالة تتكون تلقائي</span>
                        </div>
                        <p className="text-[10px] text-[#A9B5CB] leading-relaxed">
                          لما تضغط الزرار، تليجرام هيفتح برسالة جاهزة فيها رقم المرجع والمبلغ — بس أرفق السكرين شوت وأرسل!
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <span className="w-6 h-6 rounded-full bg-[#0088CC] flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">3</span>
                        <p className="text-[11px] text-[#A9B5CB]">أرسل السكرين شوت لقناة {TELEGRAM_CHANNEL}</p>
                      </div>
                    </div>

                    {/* SEND TO TELEGRAM BUTTON */}
                    <Button
                      onClick={handleSendToTelegram}
                      className="w-full h-12 text-sm font-bold bg-gradient-to-r from-[#0088CC] to-[#006699] hover:from-[#0077BB] hover:to-[#005588] text-white rounded-xl shadow-lg shadow-[#0088CC]/20"
                    >
                      <Send className="w-4 h-4 ml-1.5" />
                      أرسل لـ {TELEGRAM_CHANNEL}
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    </Button>

                    {/* After sending */}
                    <div className="bg-[#57BC9A]/10 border border-[#57BC9A]/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-[#57BC9A]" />
                        <span className="text-[10px] font-bold text-[#57BC9A]">بعد الإرسال:</span>
                      </div>
                      <p className="text-[10px] text-[#A9B5CB] leading-relaxed">
                        هنراجع السكرين شوت ونرسلك كود التفعيل على نفس المحادثة. الكود يوصللك خلال دقائق!
                      </p>
                    </div>

                    <Button
                      onClick={() => setBuyStep('screenshot')}
                      variant="ghost"
                      className="w-full text-[#A9B5CB] text-xs hover:bg-[#20283D]"
                    >
                      <ChevronLeft className="w-3 h-3 ml-1" />
                      رجوع
                    </Button>
                  </div>
                )}

                {/* Quick info about bot */}
                {buyStep === 'idle' && (
                  <div className="bg-[#20283D] rounded-xl p-3 border border-[#3A4568]">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-[#FF6B35]" />
                      <span className="text-[10px] font-bold text-[#F5F5F5]">ال بوت يقدم إيه؟</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Bot, text: 'تداول آلي 24/7', color: '#2F96F0' },
                        { icon: Brain, text: '5 استراتيجيات ذكية', color: '#57BC9A' },
                        { icon: Shield, text: 'حماية Alfa Coins', color: '#FFD700' },
                        { icon: Target, text: 'إدارة مخاطر أوتو', color: '#2F96F0' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: item.color }} />
                          <span className="text-[10px] text-[#A9B5CB]">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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

        {/* ============ SUCCESS STATE ============ */}
        {pageState === 'success' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <Card className="border-[#57BC9A]/40 bg-gradient-to-b from-[#2D3651] to-[#222940] shadow-2xl shadow-[#57BC9A]/15">
              <CardContent className="p-8 text-center">
                <div className={`w-24 h-24 rounded-full bg-[#57BC9A]/10 flex items-center justify-center mx-auto mb-4 ${showSuccessAnim ? 'animate-bounce' : ''}`}>
                  <CheckCircle2 className="w-12 h-12 text-[#57BC9A]" />
                </div>
                <h2 className="text-2xl font-black text-[#57BC9A] mb-2">تم التفعيل بنجاح! 🎉</h2>
                <p className="text-sm text-[#A9B5CB] mb-1">الكود تم قبوله — البوت جاهز!</p>
                <p className="text-xs text-[#A9B5CB] mb-4">جاري التحويل لصفحة تسجيل الدخول...</p>
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4 text-[#2F96F0] animate-pulse" />
                  <span className="text-xs text-[#2F96F0]">تحميل...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[#2F96F0] flex items-center justify-center">
              <span className="text-xs font-black text-white">α</span>
            </div>
            <span className="text-xs font-bold text-[#A9B5CB]">Alfa Option v3.0</span>
          </div>
          <p className="text-[9px] text-[#3A4568]">
            تداول آلي ذكي • حماية Alfa Coins
          </p>
          <p className="text-[8px] text-[#3A4568] mt-1">
            ⚠️ تداول العملات ينطوي على مخاطر عالية
          </p>
        </div>
      </div>
    </div>
  )
}
