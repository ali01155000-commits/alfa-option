'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
  useBrowserBack?: boolean
}

export function BackButton({
  href = '/',
  label = 'رجوع',
  className = '',
  useBrowserBack = false,
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (useBrowserBack) {
      router.back()
    } else {
      router.push(href)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`text-[#A9B5CB] hover:text-[#F5F5F5] hover:bg-[#3A4568]/50 gap-1 px-2 h-8 ${className}`}
    >
      <ChevronRight className="w-4 h-4" />
      <span className="text-xs font-medium">{label}</span>
    </Button>
  )
}
