'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    Termly?: {
      initialize?: () => void;
    };
  }
}

const SCRIPT_SRC_BASE = 'https://app.termly.io'
const WEBSITE_UUID = '182a3bc4-4347-44b6-b918-ef8406dd41e1'

export default function TermlyCMP({ autoBlock, masterConsentsOrigin }: { autoBlock?: boolean; masterConsentsOrigin?: string }) {
  const scriptSrc = useMemo(() => {
    const src = new URL(SCRIPT_SRC_BASE)
    src.pathname = `/resource-blocker/${WEBSITE_UUID}`
    if (autoBlock) {
      src.searchParams.set('autoBlock', 'on')
    }
    if (masterConsentsOrigin) {
      src.searchParams.set('masterConsentsOrigin', masterConsentsOrigin)
    }
    return src.toString()
  }, [autoBlock, masterConsentsOrigin])

  const isScriptAdded = useRef(false)

  useEffect(() => {
    if (isScriptAdded.current) return
    const script = document.createElement('script')
    script.src = scriptSrc
    document.head.appendChild(script)
    isScriptAdded.current = true
  }, [scriptSrc])

  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    window.Termly?.initialize()
  }, [pathname, searchParams])

  return null
}