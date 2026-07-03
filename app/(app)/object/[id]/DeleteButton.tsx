'use client'

import { useTransition } from 'react'
import { deleteObject } from './actions'

interface Props {
  objectId: string
  adres: string
}

export function DeleteButton({ objectId, adres }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!window.confirm(`"${adres}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    startTransition(async () => { await deleteObject(objectId) })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {isPending ? 'Verwijderen…' : 'Verwijder object'}
    </button>
  )
}
