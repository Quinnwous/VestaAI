'use client'

import { useState, useEffect } from 'react'
import type { Kantoor, Makelaar } from '@/lib/supabase'
import { AccountTab } from './tabs/AccountTab'
import { TeamTab } from './tabs/TeamTab'
import { WijkenTab } from './tabs/WijkenTab'
import { StatistiekenTab } from './tabs/StatistiekenTab'

type Tab = 'account' | 'team' | 'wijken' | 'statistieken'

const VALID_TABS = new Set<Tab>(['account', 'team', 'wijken', 'statistieken'])

function tabFromHash(): Tab {
  if (typeof window === 'undefined') return 'account'
  const hash = window.location.hash.slice(1) as Tab
  return VALID_TABS.has(hash) ? hash : 'account'
}

interface Props {
  makelaar: Makelaar
  kantoor: Kantoor
  teamleden: Makelaar[]
  isAdmin: boolean
}

export function SettingsTabs({ makelaar, kantoor, teamleden, isAdmin }: Props) {
  const [active, setActive] = useState<Tab>(() => tabFromHash())

  useEffect(() => {
    const onHashChange = () => setActive(tabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleTabChange = (tab: Tab) => {
    setActive(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }

  const alleTabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'account', label: 'Account' },
    { id: 'team', label: 'Team' },
    { id: 'wijken', label: 'SEO Wijken', adminOnly: true },
    { id: 'statistieken', label: 'Statistieken', adminOnly: true },
  ]
  const tabs = alleTabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E9EFEB', marginBottom: 32 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{ padding: '9px 16px', fontSize: 14, fontWeight: active === tab.id ? 700 : 500, cursor: 'pointer', background: 'none', border: 'none', borderBottom: active === tab.id ? '2px solid #1A6B45' : '2px solid transparent', color: active === tab.id ? '#1A6B45' : '#9AA6A0', transition: 'all .15s', marginBottom: -1 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'account' && <AccountTab makelaar={makelaar} kantoor={kantoor} />}
      {active === 'team' && <TeamTab teamleden={teamleden} kantoorId={kantoor.id} isAdmin={isAdmin} kantoorPlan={kantoor.plan} huidigeMakelaarsId={makelaar.id} />}
      {active === 'wijken' && isAdmin && <WijkenTab />}
      {active === 'statistieken' && isAdmin && <StatistiekenTab />}
    </div>
  )
}
