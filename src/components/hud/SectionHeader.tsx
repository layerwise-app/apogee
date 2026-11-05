/** The HUD rule that opens each section: index, label, and grid ticks. */
export function SectionHeader({
  index,
  label,
  aside
}: {
  index: string;
  label: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className='relative border-t border-line pt-4'>
      <div className='ticks absolute inset-x-0 top-0 h-[5px] opacity-70' aria-hidden='true' />
      <Crosshair className='absolute -left-[5px] -top-[5px]' />
      <Crosshair className='absolute -right-[5px] -top-[5px]' />
      <div className='flex items-center justify-between gap-6 pt-2'>
        <p className='label'>
          <span className='text-ink'>{index}</span>
          <span className='mx-2 text-line-strong' aria-hidden='true'>
            /
          </span>
          {label}
        </p>
        {aside ? <div className='label text-right'>{aside}</div> : null}
      </div>
    </div>
  );
}

/** A small 1 px crosshair mark. */
export function Crosshair({ className = '' }: { className?: string }) {
  return (
    <svg width='11' height='11' viewBox='0 0 11 11' aria-hidden='true' className={`text-line-strong ${className}`}>
      <path d='M5.5 0 V11 M0 5.5 H11' stroke='currentColor' strokeWidth='1' />
    </svg>
  );
}
