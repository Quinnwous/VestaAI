import type { Metadata } from 'next'

// app/login/page.tsx is 'use client' (interactief inlogformulier) en kan zelf geen
// metadata exporteren — dat moet via deze server-layout.
export const metadata: Metadata = {
  title: 'Inloggen — VestaAI',
  description: 'Log in op uw kantooromgeving.',
  alternates: {
    canonical: '/login',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
