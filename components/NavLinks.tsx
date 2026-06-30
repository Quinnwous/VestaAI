'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks() {
  const pathname = usePathname()

  const links = [
    { href: '/object/new', label: 'Nieuw object' },
    { href: '/dashboard', label: 'Overzicht' },
    { href: '/kalender', label: 'Kalender' },
  ]

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      {links.map(({ href, label }) => {
        const isActive = pathname === href
          || (href === '/dashboard' && pathname.startsWith('/object/') && !pathname.endsWith('/new'))
          || (href === '/kalender' && pathname.startsWith('/kalender'))
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              fontSize: 15,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#1A6B45' : '#5A6B61',
              textDecoration: 'none',
              transition: 'color .15s',
            }}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
