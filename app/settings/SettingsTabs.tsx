'use client'

import { useState, useEffect } from 'react'
import type { Kantoor, Makelaar } from '@/lib/supabase'
import { AccountTab } from './tabs/AccountTab'
import { HuisstijlTab } from './tabs/HuisstijlTab'
import { TeamTab } from './tabs/TeamTab'

type Tab = 'account' | 'huisstijl' | 'team'

const VALID_TABS = new Set<Tab>(['account', 'huisstijl', 'team'])

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'huisstijl', label: 'Huisstijl' },
    { id: 'team', label: 'Team' },
  ]

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              active === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'account' && <AccountTab makelaar={makelaar} kantoor={kantoor} />}
      {active === 'huisstijl' && <HuisstijlTab kantoor={kantoor} isAdmin={isAdmin} />}
      {active === 'team' && <TeamTab teamleden={teamleden} kantoorId={kantoor.id} isAdmin={isAdmin} kantoorPlan={kantoor.plan} />}
    </div>
  )
}
