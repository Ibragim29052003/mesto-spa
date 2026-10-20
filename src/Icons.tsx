export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Emblem({ kind = 'petals' }: { kind?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
    >
      {kind === 'sun' ? (
        <>
          <circle cx="40" cy="40" r="15" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M40 9v9" transform={`rotate(${i * 30} 40 40)`} />
          ))}
        </>
      ) : kind === 'wave' ? (
        <>
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M10 ${26 + i * 10}c12-14 21-14 30 0s18 14 30 0`}
            />
          ))}
        </>
      ) : (
        <>
          {[0, 60, 120].map((angle) => (
            <ellipse
              key={angle}
              cx="40"
              cy="40"
              rx="15"
              ry="30"
              transform={`rotate(${angle} 40 40)`}
            />
          ))}
        </>
      )}
    </svg>
  )
}

export function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Chevron({
  direction = 'down',
}: {
  direction?: 'up' | 'down' | 'left' | 'right'
}) {
  const paths = {
    down: 'm6 9 6 6 6-6',
    up: 'm6 15 6-6 6 6',
    left: 'm15 6-6 6 6 6',
    right: 'm9 6 6 6-6 6',
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d={paths[direction]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Calendar() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="15" rx="1" />
      <path d="M8 3v4m8-4v4M4 10h16m-11 4h2m3 0h2m-7 3h2" />
    </svg>
  )
}

export function Close() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="m6 6 12 12M6 18 18 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
