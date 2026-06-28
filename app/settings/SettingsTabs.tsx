'use client'

import { useState } from 'react'
import type { Kantoor, Makelaar } from '@/lib/supabase'
import { AccountTab } from './tabs/AccountTab'
import { HuisstijlTab } from './tabs/HuisstijlTab'
import { TeamTab } from './tabs/TeamTab'

type Tab = 'account' | 'huisstijl' | 'team'

interface Props {
  makelaar: Makelaar
  kantoor: Kantoor
  teamleden: Makelaar[]
  isAdmin: boolean
}

export function SettingsTabs({ makelaar, kantoor, teamleden, isAdmin }: Props) {
  const [active, setActive] = useState<Tab>('account')

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
            onClick={() => setActive(tab.id)}
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
