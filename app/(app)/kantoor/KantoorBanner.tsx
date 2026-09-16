'use client'

import { useState } from 'react'

/**
 * Scherpe, volle-breedte sfeerfoto van het kantoor bovenaan de kantoorpagina — de
 * vervanger van het vervaagde watermerk dat voorheen in de zijmarges van de hele
 * ingelogde omgeving stond (te vaag om professioneel oogde). Hier, op de pagina die
 * juist over het kantoor zelf gaat, mag de foto scherp en op volle breedte staan.
 * Verdwijnt geheel bij een kapotte URL — nooit een gebroken-afbeelding-icoon.
 */
export function KantoorBanner({ url, naam }: { url: string; naam: string }) {
  const [kapot, setKapot] = useState(false)
  if (kapot) return null

  return (
    <div
      className="rounded-2xl overflow-hidden mb-8"
      style={{ boxShadow: 'var(--merk-shadow-card)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Sfeerbeeld van ${naam}`}
        onError={() => setKapot(true)}
        className="w-full aspect-[21/9] object-cover block"
      />
    </div>
  )
}
