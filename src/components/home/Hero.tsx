import { Screen } from '~/components/Screen';
import { HeroGlobe } from '~/components/globe/HeroGlobe';
import { SmartLink } from '~/components/layout/SmartLink';
import { constellation } from '~/content/constellation';
import { hero } from '~/content/home';
import { siteConfig } from '~/site.config';

const globeFrame =
  'relative left-1/2 mt-4 aspect-square w-[min(124vw,760px)] -translate-x-1/2 outline-none lg:absolute lg:left-[calc(71%-var(--g)/2)] lg:top-[calc(55%-var(--g)/2)] lg:mt-0 lg:w-[var(--g)] lg:translate-x-0 focus-visible:outline-1 focus-visible:outline-line-strong';

export function Hero() {
  const planes = constellation.planes.length;
  const total = planes * constellation.satellitesPerPlane;
  return (
    <section
      aria-labelledby='hero-title'
      className='relative isolate overflow-hidden pb-10 lg:min-h-[max(780px,100svh)] lg:pb-0'
      style={{ '--g': 'min(112svh, 72vw, 1240px)' } as React.CSSProperties}
    >
      <div className='shell relative z-10 pt-[calc(var(--header-h)+48px)] lg:pointer-events-none lg:pt-[calc(var(--header-h)+11svh)]'>
        <div className='max-w-[620px] lg:pointer-events-auto'>
          <p className='label'>
            <span aria-hidden='true' className='mr-2 inline-block size-1.5 rounded-full bg-amber align-middle' />
            {hero.eyebrow}
          </p>
          <h1 id='hero-title' className='display mt-6 text-[clamp(58px,8vw,136px)]'>
            {hero.headline.map((line) => (
              <span key={line} className='block'>
                {line}
              </span>
            ))}
          </h1>
          <p className='mt-8 max-w-[460px] text-[18px] leading-[1.55] text-muted lg:max-xl:max-w-[400px]'>{hero.subhead}</p>
          <div className='mt-10 flex flex-wrap items-center gap-x-8 gap-y-4'>
            <SmartLink href={siteConfig.cta.href} className='btn btn-primary'>
              {siteConfig.cta.label}
            </SmartLink>
            <SmartLink href={hero.secondaryLink.href} className='link-arrow'>
              {hero.secondaryLink.label}
              <svg width='10' height='12' viewBox='0 0 10 12' aria-hidden='true'>
                <path d='M5 0 V11 M1 7 L5 11 L9 7' fill='none' stroke='currentColor' strokeWidth='1.3' />
              </svg>
            </SmartLink>
          </div>
          <p className='label mt-12 max-lg:hidden'>
            {total} satellites · {planes} planes · {constellation.altitudeKm} km sun-synchronous
          </p>
        </div>
      </div>

      <Screen id='hero-globe' className={globeFrame} sizes='(min-width: 1024px) 72vw, 100vw'>
        <HeroGlobe
          frameClassName={globeFrame}
          telemetryClassName='relative z-10 mx-[var(--gutter)] -mt-6 lg:absolute lg:bottom-10 lg:right-[var(--gutter)] lg:mx-0 lg:mt-0 lg:w-[320px]'
        />
      </Screen>
    </section>
  );
}
