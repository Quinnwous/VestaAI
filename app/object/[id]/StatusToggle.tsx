'use client'

import { useState, useTransition } from 'react'
import { toggleObjectStatus } from './actions'

interface Props {
  objectId: string
  initialStatus: 'draft' | 'published'
}

export function StatusToggle({ objectId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleObjectStatus(objectId, status)
      if (result.ok && result.status) {
        setStatus(result.status)
      }
    })
  }

  const isPublished = status === 'published'

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
        isPublished
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } disabled:opacity-60`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-gray-400'}`} />
      {isPending ? 'Opslaan…' : isPublished ? 'Gepubliceerd' : 'Concept'}
    </button>
  )
}
