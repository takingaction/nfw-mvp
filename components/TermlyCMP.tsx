'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    Termly?: {
      initialize?: () => void;
    };
  }
}

/**
 * Termly's script itself is loaded first in <head> by the root layout
 * (lib/termly.ts), so Auto Blocker can hold back other scripts until consent.
 * This component only re-initialises Termly after client-side navigation, as
 * Termly's single-page-app guidance requires.
 */
export default function TermlyCMP() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (window.Termly?.initialize) {
      window.Termly.initialize()
    }
  }, [pathname, searchParams])

  return null
}
