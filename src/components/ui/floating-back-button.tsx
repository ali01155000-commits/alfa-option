'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

/**
 * Floating back button - appears on every page except the landing page (/).
 * Fixed at bottom-left corner so it never conflicts with page headers.
 */
export function FloatingBackButton() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Hide on landing page (root) and before hydration to avoid SSR mismatch
  if (!mounted || pathname === '/') return null

  return (
    <button
      onClick={() => router.back()}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full bg-[#2D3651]/95 border border-[#3A4568] text-[#F5F5F5] px-4 py-2.5 text-xs font-bold shadow-xl backdrop-blur-sm hover:bg-[#3A4568] transition-all active:scale-95"
      aria-label="رجوع للصفحة السابقة"
    >
      <ChevronRight className="w-4 h-4" />
      رجوع
    </button>
  )
}
