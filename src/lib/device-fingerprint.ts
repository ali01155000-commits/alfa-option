/**
 * Device Fingerprint Utility
 * Generates a unique, stable identifier for the current device/browser.
 */

interface DeviceFingerprint {
  deviceId: string
  deviceInfo: string
  timestamp: number
}

function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
  }
  return hash.toString(16).padStart(8, '0')
}

function collectDeviceSignals(): string {
  const signals: string[] = []
  signals.push(navigator.userAgent)
  signals.push(`${screen.width}x${screen.height}x${screen.colorDepth}`)
  signals.push(String(window.devicePixelRatio || 1))
  try {
    signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch {
    signals.push(String(new Date().getTimezoneOffset()))
  }
  signals.push(navigator.language)
  signals.push(navigator.languages?.join(',') || navigator.language)
  signals.push(navigator.platform || 'unknown')
  signals.push(String(navigator.hardwareConcurrency || 0))
  signals.push(String((navigator as any).deviceMemory || 0))
  signals.push(String(navigator.maxTouchPoints || 0))
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('AlfaOptionFP', 2, 2)
      signals.push(canvas.toDataURL().slice(-50))
    }
  } catch {
    signals.push('no-canvas')
  }
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        signals.push((gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
        signals.push((gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL))
      }
    }
  } catch {
    signals.push('no-webgl')
  }
  return signals.join('|')
}

export function generateDeviceFingerprint(): DeviceFingerprint {
  const signals = collectDeviceSignals()
  const deviceId = 'DEV-' + hashString(signals)
  const ua = navigator.userAgent
  let browser = 'Unknown'
  let os = 'Unknown'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'
  if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  const deviceInfo = `${browser} on ${os} • ${screen.width}x${screen.height}`
  return { deviceId, deviceInfo, timestamp: Date.now() }
}

const DEVICE_FP_KEY = 'alfa_device_fingerprint'
const BOUND_ACCOUNT_KEY = 'alfa_bound_account'

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    const stored = localStorage.getItem(DEVICE_FP_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as DeviceFingerprint
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.deviceId
      }
    }
  } catch {}
  const fp = generateDeviceFingerprint()
  try {
    localStorage.setItem(DEVICE_FP_KEY, JSON.stringify(fp))
  } catch {}
  return fp.deviceId
}

export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Server'
  try {
    const stored = localStorage.getItem(DEVICE_FP_KEY)
    if (stored) {
      return (JSON.parse(stored) as DeviceFingerprint).deviceInfo
    }
  } catch {}
  return generateDeviceFingerprint().deviceInfo
}

interface BoundAccount {
  email: string
  deviceId: string
  boundAt: number
  confirmed: boolean
}

export function bindAccountToDevice(email: string): { success: boolean; conflict?: string; message?: string } {
  if (typeof window === 'undefined') return { success: true }
  const currentDeviceId = getDeviceId()
  try {
    const stored = localStorage.getItem(BOUND_ACCOUNT_KEY)
    if (stored) {
      const bound = JSON.parse(stored) as BoundAccount
      if (bound.email === email && bound.deviceId === currentDeviceId) {
        return { success: true }
      }
      if (bound.email === email && bound.deviceId !== currentDeviceId) {
        return {
          success: false,
          conflict: 'device_changed',
          message: 'هذا الحساب مربوط بجهاز آخر! كل حساب يشتغل على جهاز واحد فقط.',
        }
      }
      if (bound.email !== email && bound.deviceId === currentDeviceId) {
        return {
          success: false,
          conflict: 'account_bound',
          message: `هذا الجهاز مربوط بحساب آخر (${bound.email}). كل جهاز يشتغل بحساب واحد فقط.`,
        }
      }
      return {
        success: false,
        conflict: 'rebind_required',
        message: 'الجهاز مربوط بحساب آخر. لازم تسجل خروج الأول.',
      }
    }
    const binding: BoundAccount = {
      email,
      deviceId: currentDeviceId,
      boundAt: Date.now(),
      confirmed: false,
    }
    localStorage.setItem(BOUND_ACCOUNT_KEY, JSON.stringify(binding))
    return { success: true }
  } catch {
    return { success: true }
  }
}

export function checkDeviceAuthorization(email: string): { authorized: boolean; message?: string } {
  if (typeof window === 'undefined') return { authorized: true }
  const currentDeviceId = getDeviceId()
  try {
    const stored = localStorage.getItem(BOUND_ACCOUNT_KEY)
    if (stored) {
      const bound = JSON.parse(stored) as BoundAccount
      if (bound.email === email && bound.deviceId === currentDeviceId) {
        return { authorized: true }
      }
      if (bound.email === email && bound.deviceId !== currentDeviceId) {
        return {
          authorized: false,
          message: 'هذا الحساب مربوط بجهاز آخر! لازم تستخدم الجهاز الأصلي.',
        }
      }
      if (bound.email !== email && bound.deviceId === currentDeviceId) {
        return {
          authorized: false,
          message: `هذا الجهاز مربوط بحساب آخر. لازم تسجل خروج الأول.`,
        }
      }
    }
    return { authorized: true }
  } catch {
    return { authorized: true }
  }
}

export function clearAccountBinding(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(BOUND_ACCOUNT_KEY)
  } catch {}
}

export function getBoundAccount(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(BOUND_ACCOUNT_KEY)
    if (stored) {
      return (JSON.parse(stored) as BoundAccount).email
    }
  } catch {}
  return null
}

export function confirmBinding(): void {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(BOUND_ACCOUNT_KEY)
    if (stored) {
      const bound = JSON.parse(stored) as BoundAccount
      bound.confirmed = true
      localStorage.setItem(BOUND_ACCOUNT_KEY, JSON.stringify(bound))
    }
  } catch {}
}
