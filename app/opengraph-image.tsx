import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'VestaAI — platform voor makelaars'
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
        {/* Forest Green accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: '#1A6B45',
          }}
        />

        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#1A6B45',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            V
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#1A6B45',
              letterSpacing: '-0.5px',
            }}
          >
            VestaAI
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 60,
            fontWeight: 800,
            color: '#111827',
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            maxWidth: 900,
            marginBottom: 24,
          }}
        >
          <div>Het platform</div>
          <div style={{ color: '#1A6B45' }}>voor makelaars</div>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 24,
            color: '#6b7280',
            maxWidth: 760,
            lineHeight: 1.5,
          }}
        >
          Woningwaardering, marktinzicht en een contentsuite — in de huisstijl van uw kantoor.
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
          {['Waardering', 'Marktinzicht', 'Contentsuite'].map(label => (
            <div
              key={label}
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 50,
                padding: '8px 20px',
                fontSize: 18,
                color: '#166534',
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
