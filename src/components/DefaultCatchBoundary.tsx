import { Link, rootRouteId, useMatch, useRouter } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId
  });

  console.error(error);

  return (
    <section className='shell flex min-h-[70svh] flex-col justify-center gap-8 pt-[calc(var(--header-h)+48px)]'>
      <p className='label text-amber'>Fault · something went wrong</p>
      <h1 className='display text-[clamp(48px,9vw,120px)]'>Telemetry error</h1>
      <p className='max-w-md text-muted'>
        This page failed to load. Try again, or go back to the home page.
      </p>
      <div className='flex flex-wrap gap-3'>
        <button type='button' className='btn btn-primary' onClick={() => router.invalidate()}>
          Try again
        </button>
        {isRoot ? null : (
          <Link to='/' className='btn btn-ghost'>
            Home
          </Link>
        )}
      </div>
    </section>
  );
}
