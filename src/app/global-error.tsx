'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          fontFamily: 'VT323, monospace',
          backgroundColor: '#000',
          color: '#0f0',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          border: '4px solid #0f0',
          boxShadow: '0 0 20px #0f0'
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: '#f0f' }}>SYSTEM ERROR</h1>
          <div style={{
            backgroundColor: '#111',
            padding: '20px',
            border: '2px solid #0f0',
            maxWidth: '600px',
            marginBottom: '20px'
          }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '10px' }}>ERROR: {error.message}</p>
            {error.digest && (
              <p style={{ fontSize: '1.2rem', color: '#ff0', marginBottom: '10px' }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            style={{
              fontFamily: 'VT323, monospace',
              fontSize: '1.5rem',
              padding: '10px 20px',
              backgroundColor: '#0f0',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}
          >
            RESET SYSTEM
          </button>
          <div style={{ marginTop: '30px', fontSize: '1.2rem', color: '#0ff' }}>
            <p>MADE BY RANDOM MF FROM G BLOCK 758</p>
          </div>
        </div>
      </body>
    </html>
  )
}