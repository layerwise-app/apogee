import { CaptureCrop } from '~/components/capture/CaptureCrop';
import { SectionHeader } from '~/components/hud/SectionHeader';
import { Screen } from '~/components/Screen';
import { Wordmark } from '~/components/home/Wordmark';
import { industries } from '~/content/home';
import { getSite } from '~/content/sites';
import { formatLat, formatLon } from '~/lib/format';

export function IndustriesSection() {
  return (
    <section id='industries' aria-labelledby='industries-title' className='shell pt-28 lg:pt-40'>
      <SectionHeader index={industries.index} label={industries.label} />
      <h2 id='industries-title' className='display mt-10 max-w-4xl text-[clamp(44px,6vw,96px)] lg:mt-14'>
        {industries.title}
      </h2>
      <ul className='mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4'>
        {industries.items.map((item, i) => {
          const site = getSite(item.siteId)!;
          return (
            <li key={item.id} className={i % 2 === 1 ? 'lg:mt-24' : ''}>
              <div className='brackets p-2'>
                <Screen id={`capture-${site.id}`} className='aspect-[4/5] w-full'>
                  <CaptureCrop
                    site={site}
                    falseColor={item.falseColor}
                    zoom={1.9}
                    label={`${site.name}: ${site.subject}${item.falseColor ? ', false color' : ''}`}
                    className='aspect-[4/5] w-full'
                  />
                </Screen>
              </div>
              <p className='label mt-4 flex justify-between gap-3'>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span className='readout'>
                  {formatLat(site.lat, 2)} {formatLon(site.lon, 2)}
                </span>
              </p>
              <h3 className='display mt-3 text-[34px]'>{item.name}</h3>
              <p className='mt-3 text-[16px] text-muted'>{item.sentence}</p>
            </li>
          );
        })}
      </ul>
      <div className='mt-20 border-t border-line pt-8'>
        <p className='label'>Working with teams at</p>
        <ul className='mt-6 flex flex-wrap items-center gap-x-12 gap-y-6'>
          {industries.customers.map((name, i) => (
            <li key={name}>
              <Wordmark name={name} variant={i} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
