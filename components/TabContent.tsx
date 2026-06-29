'use client'

import { useState } from 'react'

interface TabContentProps {
  label?: string
  content: string
  wordCount?: boolean
  wordLimit?: number
  charLimit?: number
}

export function TabContent({ label, content, wordCount, wordLimit, charLimit }: TabContentProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const words = content.trim().split(/\s+/).length
  const chars = content.length
  const overLimit = charLimit ? chars > charLimit : false
  const nearLimit = charLimit ? chars > charLimit * 0.9 : false

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        {label && (
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        )}
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {wordCount && wordLimit && (
            <span className={`text-xs tabular-nums ${words > wordLimit ? 'text-red-600 font-medium' : words > wordLimit * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
              {words}/{wordLimit} woorden{words > wordLimit ? ' — te lang!' : ''}
            </span>
          )}
          {wordCount && !wordLimit && (
            <span className="text-xs text-gray-400">{words} woorden</span>
          )}
          {charLimit && (
            <span className={`text-xs tabular-nums font-medium ${
              overLimit ? 'text-red-600' : nearLimit ? 'text-orange-500' : 'text-gray-400'
            }`}>
              {chars.toLocaleString('nl-NL')}/{charLimit.toLocaleString('nl-NL')} tekens
              {overLimit && ' — te lang!'}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {copied ? '✓ Gekopieerd' : 'Kopieer'}
          </button>
        </div>
      </div>
      <div className={`rounded-lg border bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed ${
        overLimit ? 'border-red-200' : 'border-gray-100'
      }`}>
        {content}
      </div>
    </div>
  )
}
