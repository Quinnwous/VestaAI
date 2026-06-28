'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks() {
  const pathname = usePathname()

  const links = [
    { href: '/object/new', label: 'Nieuw object' },
    { href: '/dashboard', label: 'Overzicht' },
  ]

  return (
    <nav className="flex items-center gap-4 text-sm">
      {links.map(({ href, label }) => {
        const isActive = pathname === href || (href === '/dashboard' && pathname.startsWith('/object/') && !pathname.endsWith('/new'))
        return (
          <Link
            key={href}
            href={href}
            className={`transition-colors font-medium ${
              isActive
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
