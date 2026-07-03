import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(251,252,251,.92)', backdropFilter: 'saturate(150%) blur(14px)', borderBottom: '1px solid #E4EAE6' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(26,107,69,.28)', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 19, letterSpacing: '-.04em' }}>V</span>
            </span>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: '#0E1A13' }}>
              Vesta<span style={{ color: '#1A6B45' }}>AI</span>
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#EAF5EE', color: '#1A6B45', letterSpacing: '.02em' }}>
              Platform-admin
            </span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                style={{ fontSize: 14, fontWeight: 600, color: '#5A6B61', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
              >
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
