'use client';

// Loading state for /floor. Renders skeleton rows + a fake "Next Action" card
// shell so the first paint matches the layout that's about to arrive — no
// content-shift on load.

export default function FloorPageSkeleton() {
  return (
    <main style={{ background: '#000', minHeight: '100vh', color: '#fff', padding: '20px 24px' }}>
      <div
        style={{
          maxWidth: 1640,
          margin: '0 auto',
        }}
      >
        {/* Page header skeleton */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 12, width: 120, background: '#0d0d0d', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 28, width: 320, background: '#0d0d0d', borderRadius: 4 }} />
        </div>

        {/* Filter strip skeleton */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ width: 80, height: 28, background: '#0d0d0d', borderRadius: 999 }} />
          ))}
        </div>

        {/* Sheet skeleton — 12 placeholder rows at the locked 44px height */}
        <div style={{ background: '#080808', border: '1px solid #1e1e1e', borderRadius: 12 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '50px 1fr 140px 100px 110px 130px 140px 60px 60px 60px',
              gap: 12,
              padding: '12px 14px',
              borderBottom: '1px solid #1e1e1e',
              background: '#0d0d0d',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} style={{ height: 10, background: '#1a1a1a', borderRadius: 3 }} />
            ))}
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 44,
                borderBottom: '1px solid #1a1a1a',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                gap: 12,
              }}
            >
              <div style={{ width: 14, height: 10, background: '#0d0d0d', borderRadius: 2 }} />
              <div style={{ width: 28, height: 28, background: '#0d0d0d', borderRadius: 7 }} />
              <div style={{ width: 180, height: 12, background: '#0d0d0d', borderRadius: 3 }} />
              <div style={{ width: 100, height: 10, background: '#0d0d0d', borderRadius: 3, marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
