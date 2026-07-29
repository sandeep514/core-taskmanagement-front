import { useEffect, useMemo, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'taskflow_pwa_install_dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true ||
    document.referrer.includes('android-app://')
  )
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ may report as Mac
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOSDevice || iPadOs
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // Safari on iOS (exclude Chrome/Firefox/Edge iOS wrappers)
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(ua)
}

/**
 * Shows how to install TaskFlow as a home-screen app.
 * - Android/Chrome: uses native beforeinstallprompt when available
 * - iOS Safari: step-by-step Share → Add to Home Screen (no native prompt on iOS)
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosHelp, setIosHelp] = useState(false)

  const platform = useMemo(() => {
    if (isIos()) return 'ios' as const
    return 'other' as const
  }, [])

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBip)

    // iOS never fires beforeinstallprompt — show guided install after a short delay
    let timer: number | undefined
    if (platform === 'ios' && isSafari()) {
      timer = window.setTimeout(() => setVisible(true), 1800)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      if (timer) window.clearTimeout(timer)
    }
  }, [platform])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
    setIosHelp(false)
    setDeferred(null)
  }

  const installAndroid = async () => {
    if (!deferred) return
    await deferred.prompt()
    try {
      await deferred.userChoice
    } catch {
      // user dismissed or browser blocked
    }
    setDeferred(null)
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  if (!visible || isStandalone()) return null

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-50 px-3',
        'bottom-[max(0.75rem,env(safe-area-inset-bottom))]',
      )}
      role="dialog"
      aria-label="Install TaskFlow"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Install TaskFlow</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {platform === 'ios'
                ? 'Add TaskFlow to your Home Screen for a full-screen app experience on iPhone and iPad.'
                : 'Install the app on this device for faster access and a home-screen icon.'}
            </p>

            {iosHelp && platform === 'ios' ? (
              <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li className="leading-relaxed">
                  Tap the{' '}
                  <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                    Share <Share className="inline h-3 w-3" />
                  </span>{' '}
                  button in Safari
                </li>
                <li className="leading-relaxed">
                  Scroll and tap <span className="font-semibold text-foreground">Add to Home Screen</span>
                </li>
                <li className="leading-relaxed">
                  Tap <span className="font-semibold text-foreground">Add</span> to confirm
                </li>
              </ol>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {platform === 'ios' ? (
                <Button size="sm" onClick={() => setIosHelp((v) => !v)}>
                  {iosHelp ? 'Hide steps' : 'How to install'}
                </Button>
              ) : (
                <Button size="sm" onClick={installAndroid} disabled={!deferred}>
                  Install
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
