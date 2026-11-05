/** Fictional customer wordmarks, drawn in SVG. */
export function Wordmark({ name, variant }: { name: string; variant: number }) {
  const v = variant % 5;
  const common = { height: 28, role: 'img' as const, 'aria-label': name, className: 'text-ink/70' };
  if (v === 0)
    return (
      <svg viewBox='0 0 150 28' width={150} {...common}>
        <path d='M2 6 L12 22 L22 6' fill='none' stroke='currentColor' strokeWidth='2.4' />
        <text x='32' y='20' fill='currentColor' fontFamily='var(--apg-font-display)' fontSize='19' fontWeight='600' letterSpacing='1.5' style={{ fontStretch: '75%' }}>
          HALDEN RE
        </text>
      </svg>
    );
  if (v === 1)
    return (
      <svg viewBox='0 0 176 28' width={176} {...common}>
        <circle cx='12' cy='14' r='9' fill='none' stroke='currentColor' strokeWidth='2' />
        <circle cx='12' cy='14' r='3' fill='currentColor' />
        <text x='28' y='20' fill='currentColor' fontFamily='var(--apg-font-body)' fontSize='17' fontWeight='500'>
          Corvane Mutual
        </text>
      </svg>
    );
  if (v === 2)
    return (
      <svg viewBox='0 0 150 28' width={150} {...common}>
        <path d='M2 22 C8 6 16 6 22 22 M8 22 C11 14 13 14 16 22' fill='none' stroke='currentColor' strokeWidth='2' />
        <text x='30' y='20' fill='currentColor' fontFamily='var(--apg-font-body)' fontSize='17' fontWeight='300' letterSpacing='0.5'>
          meridia agri
        </text>
      </svg>
    );
  if (v === 3)
    return (
      <svg viewBox='0 0 140 28' width={140} {...common}>
        <rect x='2' y='6' width='16' height='16' fill='none' stroke='currentColor' strokeWidth='2' />
        <path d='M2 14 H18' stroke='currentColor' strokeWidth='2' />
        <text x='26' y='20' fill='currentColor' fontFamily='var(--apg-font-mono)' fontSize='15' fontWeight='500' letterSpacing='2'>
          TESSALINE
        </text>
      </svg>
    );
  return (
    <svg viewBox='0 0 150 28' width={150} {...common}>
      <path d='M4 20 H22 M8 14 H18 M11 8 H15' stroke='currentColor' strokeWidth='2.2' />
      <text x='30' y='20' fill='currentColor' fontFamily='var(--apg-font-display)' fontSize='19' fontWeight='500' letterSpacing='2.5' style={{ fontStretch: '62%' }}>
        OSTRA RELIEF
      </text>
    </svg>
  );
}
