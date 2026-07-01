'use client'

import { useEffect, useRef, useState } from 'react'
import type { BagSuggestie } from '@/app/api/bag/suggest/route'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestie: BagSuggestie) => void
  disabled?: boolean
  placeholder?: string
}

export function AddressAutocomplete({ value, onChange, onSelect, disabled, placeholder }: Props) {
  const [suggesties, setSuggesties] = useState<BagSuggestie[]>([])
  const [open, setOpen] = useState(false)
  const [actief, setActief] = useState(-1)
  const [bezig, setBezig] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!value || value.length < 4) {
      setSuggesties([])
      setOpen(false)
      return
    }
    setBezig(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/bag/suggest?q=${encodeURIComponent(value)}`)
        const data: BagSuggestie[] = await res.json()
        setSuggesties(Array.isArray(data) ? data : [])
        setOpen(Array.isArray(data) && data.length > 0)
        setActief(-1)
      } catch {
        setSuggesties([])
        setOpen(false)
      } finally {
        setBezig(false)
      }
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActief(i => Math.min(i + 1, suggesties.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActief(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && actief >= 0) {
      e.preventDefault()
      kies(suggesties[actief])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function kies(s: BagSuggestie) {
    onChange(s.label)
    setSuggesties([])
    setOpen(false)
    setActief(-1)
    onSelect(s)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 11,
    border: '1px solid #DCE5DF',
    padding: '11px 40px 11px 14px',
    fontSize: 14,
    color: '#0E1A13',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    opacity: disabled ? 0.5 : 1,
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(false) }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggesties.length > 0 && setOpen(true)}
          disabled={disabled}
          placeholder={placeholder ?? 'Herengracht 1, Amsterdam'}
          style={inputStyle}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {bezig && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA6A0" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
        )}
      </div>

      {open && suggesties.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 4,
            borderRadius: 11,
            border: '1px solid #DCE5DF',
            background: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            listStyle: 'none',
            padding: '4px 0',
            overflow: 'hidden',
          }}
          role="listbox"
        >
          {suggesties.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === actief}
              onMouseDown={e => { e.preventDefault(); kies(s) }}
              onMouseEnter={() => setActief(i)}
              style={{
                padding: '10px 14px',
                fontSize: 14,
                cursor: 'pointer',
                color: '#0E1A13',
                background: i === actief ? '#F0F6F2' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A6B45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
