'use client'

import { useRouter } from 'next/navigation'
import type { PropertyInput } from '@/lib/schemas'

const DRAFT_KEY = 'vestaai_form_draft'

interface Props {
  invoer: PropertyInput
}

export function RegenereerButton({ invoer }: Props) {
  const router = useRouter()

  const handleClick = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(invoer))
    } catch { /* ignore */ }
    router.push('/object/new')
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Bewerk &amp; regenereer
    </button>
  )
}
