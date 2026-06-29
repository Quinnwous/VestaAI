import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'VestaAI — De AI-assistent voor makelaars'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Blue accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: '#2563eb',
          }}
        />

        {/* Brand */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#111827',
            letterSpacing: '-0.5px',
            marginBottom: 48,
          }}
        >
          VestaAI
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#111827',
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            maxWidth: 800,
            marginBottom: 24,
          }}
        >
          De AI-assistent
          {'\n'}
          <span style={{ color: '#2563eb' }}>voor makelaars</span>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 24,
            color: '#6b7280',
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          8 velden invullen → Funda-tekst, brochure, Instagram, LinkedIn, koper-e-mail en meer.
        </div>

        {/* Bottom badges */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 80,
            display: 'flex',
            gap: 16,
          }}
        >
          {['10 teksten', '7 content-types', '14 dagen gratis'].map(label => (
            <div
              key={label}
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 50,
                padding: '8px 20px',
                fontSize: 18,
                color: '#1e40af',
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
