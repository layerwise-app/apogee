import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { LogoMark } from '~/components/brand/LogoMark';
import { SmartLink } from '~/components/layout/SmartLink';
import { siteConfig } from '~/site.config';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const href = useRouterState({ select: (s) => s.location.href });

  // Close the menu when the route changes (adjusting state during render,
  // so the closed menu never paints on the new page).
  const [menuHref, setMenuHref] = useState(href);
  if (href !== menuHref) {
    setMenuHref(href);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        solid ? 'border-line bg-bg/95' : 'border-transparent bg-transparent'
      }`}
    >
      <a
        href='#main'
        className='btn btn-primary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10'
      >
        Skip to content
      </a>
      <div className='shell flex h-[var(--header-h)] items-center'>
        <Link
          to='/'
          className='-ml-1 flex min-h-11 items-center gap-2.5 pl-1 pr-2'
          aria-label={`${siteConfig.company} home`}
        >
          <LogoMark size={26} className='text-ink' />
          <span className='display text-[23px] leading-none tracking-[0.06em]'>
            {siteConfig.product}
          </span>
        </Link>

        <nav aria-label='Main' className='ml-12 hidden lg:block'>
          <ul className='flex items-center gap-1'>
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <SmartLink
                  href={item.href}
                  className='label flex min-h-11 items-center px-3 text-ink/80 transition-colors hover:text-ink'
                >
                  {item.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className='ml-auto flex items-center gap-2'>
          <SmartLink
            href={siteConfig.cta.href}
            className='btn btn-ghost min-h-11 bg-bg/40 px-4 text-[11px] sm:px-5'
          >
            <span className='sm:hidden'>{siteConfig.cta.shortLabel}</span>
            <span className='hidden sm:inline'>{siteConfig.cta.label}</span>
          </SmartLink>
          <button
            ref={menuButton}
            type='button'
            className='label flex size-11 items-center justify-center border border-line-strong text-ink lg:hidden'
            aria-expanded={open}
            aria-controls='mobile-menu'
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width='18' height='18' viewBox='0 0 18 18' aria-hidden='true'>
              {open ? (
                <path d='M3 3 L15 15 M15 3 L3 15' stroke='currentColor' strokeWidth='1.5' />
              ) : (
                <path d='M2 5 H16 M2 9 H16 M2 13 H16' stroke='currentColor' strokeWidth='1.5' />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        id='mobile-menu'
        hidden={!open}
        className='border-t border-line bg-bg lg:hidden'
      >
        <nav aria-label='Mobile' className='shell py-3'>
          <ul>
            {siteConfig.nav.map((item, i) => (
              <li key={item.href} className='border-b border-line last:border-b-0'>
                <SmartLink
                  href={item.href}
                  className='flex min-h-14 items-center justify-between'
                  onClick={() => setOpen(false)}
                >
                  <span className='display text-[30px]'>{item.label}</span>
                  <span className='label'>{String(i + 1).padStart(2, '0')}</span>
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
