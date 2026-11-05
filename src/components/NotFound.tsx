import { Link, useRouterState } from '@tanstack/react-router';
import { notFoundPage } from '~/content/pages';

/** The 404 page: a lost-signal readout in the site's HUD style. */
export function NotFound() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <section className='shell flex min-h-[calc(100svh-var(--header-h))] flex-col justify-center pb-20 pt-[calc(var(--header-h)+48px)]'>
      <p className='label text-amber'>
        <span aria-hidden='true' className='mr-2 inline-block size-1.5 bg-amber align-middle' />LOS · Error 404
      </p>
      <h1 className='display mt-6 text-[clamp(64px,14vw,200px)]'>{notFoundPage.heading}</h1>
      <div className='mt-10 grid gap-10 md:grid-cols-12'>
        <p className='max-w-md text-[19px] text-muted md:col-span-5'>{notFoundPage.body}</p>
        <dl className='brackets readout grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 p-5 text-[13px] md:col-span-5 md:col-start-8'>
          <dt className='label'>Requested</dt>
          <dd className='truncate text-ink'>{path}</dd>
          <dt className='label'>Carrier</dt>
          <dd className='text-amber'>None</dd>
          <dt className='label'>Signal</dt>
          <dd className='text-amber'>−∞ dB</dd>
          <dt className='label'>Last contact</dt>
          <dd className='text-ink'>/</dd>
        </dl>
      </div>
      <svg
        className='mt-12 h-16 w-full text-line-strong'
        viewBox='0 0 1200 64'
        preserveAspectRatio='none'
        aria-hidden='true'
      >
        <path
          d='M0 32 H220 L232 10 L244 54 L256 18 L268 44 L280 30 L292 33 H1200'
          fill='none'
          stroke='currentColor'
          strokeWidth='1'
          vectorEffect='non-scaling-stroke'
        />
        <path d='M300 32 H1200' stroke='var(--apg-accent)' strokeWidth='1' strokeDasharray='2 6' vectorEffect='non-scaling-stroke' />
      </svg>
      <div className='mt-12'>
        <Link to='/' className='btn btn-primary'>
          {notFoundPage.home}
        </Link>
      </div>
    </section>
  );
}
