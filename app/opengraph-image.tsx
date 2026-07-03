import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'VestaAI — De AI-toolkit voor makelaars'
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
            fontSize: 28,
            fontWeight: 700,
            color: '#1A6B45',
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
          De AI-toolkit
          {'\n'}
          <span style={{ color: '#1A6B45' }}>voor makelaars</span>
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
          Van Funda-tekst tot koper-e-mail — razendsnel professionele content, afgestemd op uw huisstijl.
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
          {['10 teksten', 'Funda-klaar', '30 dagen gratis'].map(label => (
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
