'use client'

import { useState } from 'react'

interface TabContentProps {
  label?: string
  content: string
  wordCount?: boolean
}

export function TabContent({ label, content, wordCount }: TabContentProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const words = content.trim().split(/\s+/).length

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        {label && <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>}
        <div className="flex items-center gap-3 ml-auto">
          {wordCount && (
            <span className="text-xs text-gray-400">{words} woorden</span>
          )}
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {copied ? '✓ Gekopieerd' : 'Kopieer'}
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  )
}
