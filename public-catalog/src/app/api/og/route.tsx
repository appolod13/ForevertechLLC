import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

// Dynamic, branded social share card (1200x630). Used as the OpenGraph/Twitter
// image for design share links so a real preview of the artwork shows up
// everywhere it's posted. Example:
//   /api/og?title=Cosmic%20Dream&image=https://.../design.png
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTitle = (searchParams.get('title') || 'One-of-one quantum fractal art').slice(0, 90);
  const subtitle = (searchParams.get('subtitle') || 'Type a word. Wear the universe. Never reprinted.').slice(0, 120);
  const image = searchParams.get('image') || '';
  const verified = searchParams.get('verified') === '1';

  let safeImage = '';
  if (/^https?:\/\//i.test(image)) safeImage = image;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          backgroundColor: '#0a0a0f',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left: artwork or branded gradient panel */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '500px',
            height: '630px',
            backgroundColor: '#15101f',
            backgroundImage: 'linear-gradient(135deg, #3a1d6e 0%, #1b1140 60%, #0a0a0f 100%)',
          }}
        >
          {safeImage ? (
            <img
              src={safeImage}
              width={420}
              height={420}
              style={{ objectFit: 'cover', borderRadius: '24px', border: '2px solid rgba(168,120,255,0.5)' }}
            />
          ) : (
            <div style={{ display: 'flex', fontSize: '120px', fontWeight: 800, color: '#a878ff', letterSpacing: '4px' }}>
              PQ
            </div>
          )}
        </div>

        {/* Right: text content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '64px',
            width: '700px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '2px',
                color: '#c4a8ff',
              }}
            >
              PIXELQRYPT
            </div>
            {verified ? (
              <div
                style={{
                  display: 'flex',
                  marginLeft: '16px',
                  padding: '4px 14px',
                  borderRadius: '999px',
                  backgroundColor: '#5b21b6',
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              >
                Verified
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', fontSize: '58px', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px' }}>
            {rawTitle}
          </div>

          <div style={{ display: 'flex', fontSize: '30px', color: '#b8b3c9', lineHeight: 1.4 }}>{subtitle}</div>

          <div
            style={{
              display: 'flex',
              marginTop: '40px',
              fontSize: '24px',
              fontWeight: 600,
              color: '#7dffd4',
            }}
          >
            pixelqrypt.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
