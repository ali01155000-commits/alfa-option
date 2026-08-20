'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Smartphone, ShieldCheck, Zap, Coins, Bot, CheckCircle2, ChevronLeft } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'

function getDownloadUrl(): string {
  if (typeof window === 'undefined') return '/alfa-option.apk'
  return `${window.location.origin}/alfa-option.apk`
}

function getPageUrl(): string {
  if (typeof window === 'undefined') return '/download'
  return `${window.location.origin}/download`
}

export default function DownloadPage() {
  const [mounted, setMounted] = useState(false)
  const [sizeMb, setSizeMb] = useState<string>('~4')

  useEffect(() => {
    setMounted(true)
    // Get real APK size from headers
    fetch('/alfa-option.apk', { method: 'HEAD' })
      .then((r) => {
        const len = Number(r.headers.get('content-length'))
        if (len > 0) setSizeMb((len / 1024 / 1024).toFixed(1))
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#272E4A] to-[#1E2438] text-[#F5F5F5] flex flex-col items-center justify-center p-4">
      {/* Top bar */}
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <BackButton href="/" label="الرئيسية" />
        <span className="text-[10px] text-[#A9B5CB]/60">Alfa Option — تحميل التطبيق</span>
      </div>

      <div className="w-full max-w-lg space-y-5">
        {/* Hero */}
        <div className="text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#2F96F0] to-[#1A6DD0] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-[#2F96F0]/40">
            <span className="text-5xl font-black text-white">α</span>
          </div>
          <h1 className="text-3xl font-bold">تطبيق Alfa Option</h1>
          <p className="text-sm text-[#A9B5CB] mt-2">تداول آلي ذكي على Expert Option — من موبايلك</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="bg-[#57BC9A]/15 text-[#57BC9A] text-[10px] font-bold px-2.5 py-1 rounded-full">v2.0</span>
            <span className="bg-[#2D3651] text-[#A9B5CB] text-[10px] font-bold px-2.5 py-1 rounded-full">Android • {sizeMb} MB</span>
            <span className="bg-[#2D3651] text-[#A9B5CB] text-[10px] font-bold px-2.5 py-1 rounded-full">تسجيل دخول تلقائي ✅</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-[#2D3651] border border-[#3A4568] rounded-2xl p-5 flex flex-col items-center">
          <p className="text-xs font-bold text-[#F5F5F5] mb-3">📱 امسح الكود من موبايلك ونزّل التطبيق على طول</p>
          <div className="bg-white p-3 rounded-xl">
            {mounted ? <QRCodeSVG value={getPageUrl()} size={150} /> : <div className="w-[150px] h-[150px]" />}
          </div>
          <p className="text-[10px] text-[#A9B5CB] mt-2 text-center" dir="ltr">{mounted ? getPageUrl() : ''}</p>
        </div>

        {/* Download button */}
        <a
          href={mounted ? getDownloadUrl() : '#'}
          className="w-full flex items-center justify-center gap-2 h-14 rounded-xl bg-[#2F96F0] hover:bg-[#1A7DE8] text-white text-base font-bold shadow-lg shadow-[#2F96F0]/25 transition-all active:scale-[0.98]"
        >
          <Download className="w-5 h-5" />
          تحميل التطبيق الآن (APK)
        </a>

        {/* Install steps */}
        <div className="bg-[#2D3651] border border-[#3A4568] rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Smartphone className="w-4 h-4 text-[#2F96F0]" />
            <h2 className="text-sm font-bold">خطوط التسطيب</h2>
          </div>
          <div className="space-y-2.5">
            {[
              'اضغط "تحميل التطبيق" وانتظر اكتمال التنزيل',
              'افتح ملف الـ APK (اسمح بـ "مصادر غير معروفة" من الإعدادات لو طُلب)',
              'سطّب التطبيق وافتحه — هيفتح المنصة مباشرة',
              'دخول البوت → كود التفعيل → سجل بحساب Expert Option',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${i === 3 ? 'bg-[#57BC9A]/20 text-[#57BC9A]' : 'bg-[#2F96F0]/20 text-[#2F96F0]'}`}>
                  {i === 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="text-xs text-[#A9B5CB] leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#2D3651] border border-[#3A4568] rounded-xl p-4">
            <Bot className="w-5 h-5 text-[#2F96F0] mb-2" />
            <h3 className="text-xs font-bold mb-1">بوت تداول آلي</h3>
            <p className="text-[10px] text-[#A9B5CB]">5 استراتيجيات ذكية مع حد يومي للربح والخسارة</p>
          </div>
          <div className="bg-[#2D3651] border border-[#3A4568] rounded-xl p-4">
            <ShieldCheck className="w-5 h-5 text-[#57BC9A] mb-2" />
            <h3 className="text-xs font-bold mb-1">دخول تلقائي مضمون</h3>
            <p className="text-[10px] text-[#A9B5CB]">اربط حساب Expert Option بضغطة واحدة من جهازك</p>
          </div>
          <div className="bg-[#2D3651] border border-[#3A4568] rounded-xl p-4">
            <Coins className="w-5 h-5 text-[#FFD700] mb-2" />
            <h3 className="text-xs font-bold mb-1">حماية Alfa Coins</h3>
            <p className="text-[10px] text-[#A9B5CB]">نظام حماية من الخسائر مع مكافآت وصناديق</p>
          </div>
          <div className="bg-[#2D3651] border border-[#3A4568] rounded-xl p-4">
            <Zap className="w-5 h-5 text-[#FF9F43] mb-2" />
            <h3 className="text-xs font-bold mb-1">أسعار لحظية</h3>
            <p className="text-[10px] text-[#A9B5CB]">تدفق مباشر لأزواج العملات والعملات الرقمية</p>
          </div>
        </div>

        <p className="text-center text-[9px] text-[#A9B5CB]/40 leading-relaxed">
          ⚠️ تحذير المخاطر: التداول في Options ينطوي على مخاطر عالية وقد يؤدي لخسارة رأس المال.
          <br />لا تتداول بأموال لا تتحمل خسارتها. Alfa Option v2.0
        </p>
      </div>
    </div>
  )
}
