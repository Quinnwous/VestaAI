const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      // plausible.io (analytics, app/layout.tsx) + api.pdok.nl (item 7.1: MapLibre-
      // vectortiles + glyphs voor de BRT-Achtergrondkaart) blijven/komen hier.
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.resend.com https://plausible.io https://api.pdok.nl",
      // MapLibre GL parseert vectortiles in een web worker die het zelf als blob: laadt.
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

// Opt-in bundle-analyse (item 12.3): `ANALYZE=true npm run build` schrijft
// .next/analyze/*.html met een treemap van elke client-/server-bundel.
// Nooit actief in een gewone build — alleen devDependency, geen productie-impact.
// ⚠️ Next 16-les: @next/bundle-analyzer werkt niet onder Turbopack (de nieuwe
// standaard voor `next build`) — het `build`-script in package.json schakelt
// daarom alleen bij ANALYZE=true terug naar `--webpack`, een gewone build
// blijft Turbopack.
import withBundleAnalyzerInit from '@next/bundle-analyzer'
// openAnalyzer: false — anders opent elke analyse-build drie tabbladen in de
// standaardbrowser (les 30 sep 2026). Open de rapporten zelf als je ze wilt zien.
const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

export default withBundleAnalyzer(nextConfig)
