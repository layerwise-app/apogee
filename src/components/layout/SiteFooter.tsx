import { LogoMark } from '~/components/brand/LogoMark';
import { SmartLink } from '~/components/layout/SmartLink';
import { siteConfig } from '~/site.config';

export function SiteFooter() {
  const year = 2026;
  return (
    <footer className='relative border-t border-line'>
      <div className='ticks-major absolute inset-x-0 top-0 h-2 opacity-60' aria-hidden='true' />
      <div className='shell grid gap-12 pb-12 pt-16 md:grid-cols-12 md:gap-8'>
        <div className='md:col-span-5'>
          <div className='flex items-center gap-3'>
            <LogoMark size={34} className='text-ink' />
            <span className='display text-[34px] tracking-[0.04em]'>{siteConfig.company}</span>
          </div>
          <p className='mt-5 max-w-sm text-[15px] text-muted'>{siteConfig.tagline}</p>
          <p className='label mt-6'>{siteConfig.offices.join(' · ')}</p>
        </div>

        <nav aria-label='Footer' className='md:col-span-3'>
          <ul className='grid grid-cols-2 gap-x-6 md:grid-cols-1'>
            {siteConfig.footerLinks.map((link) => (
              <li key={link.href}>
                <SmartLink
                  href={link.href}
                  className='label flex min-h-11 items-center text-ink/85 hover:text-ink'
                >
                  {link.label}
                </SmartLink>
              </li>
            ))}
            {siteConfig.social.map((link) => (
              <li key={link.href}>
                <SmartLink
                  href={link.href}
                  className='label flex min-h-11 items-center text-ink/85 hover:text-ink'
                >
                  {link.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className='flex flex-col items-start gap-8 md:col-span-4 md:items-end'>
          <SmartLink href={siteConfig.cta.href} className='btn btn-ghost'>
            {siteConfig.cta.label}
          </SmartLink>
          <a
            href='https://layerwise.app'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-block py-2'
          >
            <img
              src='https://layerwise.app/powered-by-dark.png'
              width={174}
              height={28}
              loading='lazy'
              alt='Powered by Layerwise'
              className='block h-7 w-[174px]'
            />
          </a>
        </div>
      </div>
      <div className='shell flex flex-col gap-2 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between'>
        <p className='label'>
          © {year} {siteConfig.company}. A fictional company.
        </p>
        <p className='label'>Orbits, passes, and captures on this site are simulated.</p>
      </div>
    </footer>
  );
}
