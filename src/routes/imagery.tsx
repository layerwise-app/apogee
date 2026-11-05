import { createFileRoute } from '@tanstack/react-router';
import { CaptureViewer } from '~/components/capture/CaptureViewer';
import { SectionHeader } from '~/components/hud/SectionHeader';
import { SmartLink } from '~/components/layout/SmartLink';
import { Screen } from '~/components/Screen';
import { gallery, imageryIntro, products, specs } from '~/content/imagery';
import { pages } from '~/content/pages';
import { sites } from '~/content/sites';
import { countWord, formatLat, formatLon } from '~/lib/format';
import { siteUrl } from '~/lib/site';
import { siteConfig } from '~/site.config';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/imagery')({
  head: () =>
    seo({
      title: pages.imagery.title,
      description: pages.imagery.description,
      path: pages.imagery.path,
      image: pages.imagery.image,
      imageAlt: pages.imagery.imageAlt,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Apogee imagery products',
        itemListElement: products.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Service',
            name: p.name,
            description: p.summary,
            provider: { '@type': 'Organization', name: siteConfig.company, url: siteUrl('/') }
          }
        }))
      }
    }),
  component: ImageryPage
});

function ImageryPage() {
  return (
    <>
      <section className='shell pt-[calc(var(--header-h)+56px)]'>
        <SectionHeader index='01' label={imageryIntro.label} aside='Products and specifications' />
        <div className='mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12'>
          <h1 className='display text-[clamp(56px,9vw,148px)] lg:col-span-8'>{imageryIntro.title}</h1>
          <p className='max-w-md self-end text-[18px] text-muted lg:col-span-4'>{imageryIntro.body}</p>
        </div>
      </section>

      <section aria-labelledby='products-title' className='shell pt-24 lg:pt-32'>
        <h2 id='products-title' className='sr-only'>
          Products
        </h2>
        <ol className='border-t border-line'>
          {products.map((p, i) => (
            <li key={p.id} id={p.id} className='grid gap-6 border-b border-line py-10 lg:grid-cols-12 lg:gap-8 lg:py-14'>
              <p className='readout text-[13px] text-muted lg:col-span-1'>{String(i + 1).padStart(2, '0')}</p>
              <h3 className='display text-[clamp(40px,4.5vw,68px)] lg:col-span-4'>{p.name}</h3>
              <p className='text-[17px] text-muted lg:col-span-4'>{p.summary}</p>
              <div className='lg:col-span-3'>
                <ul className='space-y-2 text-[15px]'>
                  {p.details.map((d) => (
                    <li key={d} className='flex gap-3'>
                      <span className='mt-[9px] size-1 shrink-0 bg-ink' aria-hidden='true' />
                      {d}
                    </li>
                  ))}
                </ul>
                <p className='label mt-5 text-amber'>{p.readout}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby='specs-title' className='shell pt-24 lg:pt-36'>
        <SectionHeader index='02' label={specs.title} />
        <div className='mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12'>
          <div className='lg:col-span-4'>
            <h2 id='specs-title' className='display text-[clamp(44px,4.6vw,72px)]'>
              {specs.title}
            </h2>
            <p className='mt-6 max-w-xs text-[15px] text-muted'>The same for every satellite in all three planes.</p>
          </div>
          <div className='lg:col-span-8'>
            <table className='w-full border-collapse text-left'>
              <caption className='sr-only'>Imagery specifications</caption>
              <tbody>
                {specs.rows.map((r) => (
                  <tr key={r.label} className='border-b border-line align-top max-sm:flex max-sm:flex-col max-sm:py-4'>
                    <th scope='row' className='label w-[30%] py-5 pr-6 font-medium text-ink max-sm:w-auto max-sm:py-0'>
                      {r.label}
                    </th>
                    <td className='py-5 max-sm:py-0 max-sm:pt-2'>
                      <p className='text-[17px]'>{r.value}</p>
                      {r.note ? <p className='mt-1 text-[14px] text-muted'>{r.note}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby='gallery-title' className='shell pb-28 pt-24 lg:pb-40 lg:pt-36'>
        <SectionHeader index='03' label={gallery.label} aside={`${sites.length} sites`} />
        <div className='mt-10 grid gap-10 lg:grid-cols-12'>
          <h2 id='gallery-title' className='display text-[clamp(44px,6vw,96px)] lg:col-span-7'>
            {gallery.title.replace('{count}', countWord(sites.length))}
          </h2>
          <p className='max-w-md self-end text-[17px] text-muted lg:col-span-4 lg:col-start-9'>{gallery.body}</p>
        </div>
        <ol className='mt-16 space-y-20 lg:space-y-28'>
          {sites.map((s, i) => (
            <li key={s.id} id={s.id} className='grid gap-6 lg:grid-cols-12 lg:gap-8'>
              <div className={`lg:col-span-9 ${i % 2 ? 'lg:order-2 lg:col-start-4' : ''}`}>
                <Screen id={`capture-${s.id}`} className='aspect-[3/2] w-full' sizes='(min-width: 1024px) 75vw, 100vw'>
                  <CaptureViewer site={s} headingId={`gallery-${s.id}`} defaultFalseColor={s.kind === 'vineyard'} />
                </Screen>
              </div>
              <div className={`lg:col-span-3 ${i % 2 ? 'lg:order-1 lg:col-start-1 lg:row-start-1' : ''}`}>
                <p className='label'>
                  {String(i + 1).padStart(2, '0')} · {s.subject}
                </p>
                <h3 id={`gallery-${s.id}`} className='display mt-3 text-[44px]'>
                  {s.name}
                </h3>
                <p className='mt-1 text-[15px] text-muted'>{s.region}</p>
                <p className='readout mt-4 text-[12px] text-amber'>
                  {formatLat(s.lat, 4)} · {formatLon(s.lon, 4)}
                </p>
                <p className='mt-5 text-[16px] text-muted'>{s.caption}</p>
                <dl className='readout mt-6 grid grid-cols-2 gap-y-2 border-t border-line pt-4 text-[12px]'>
                  <dt className='label'>Scene</dt>
                  <dd className='text-ink'>{s.sceneWidthKm} km wide</dd>
                  <dt className='label'>Cloud</dt>
                  <dd className='text-ink'>{s.cloudPercent}%</dd>
                </dl>
              </div>
            </li>
          ))}
        </ol>
        <div className='mt-24 flex flex-col items-start gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between'>
          <p className='display text-[clamp(32px,4vw,56px)]'>Want one of your own places?</p>
          <SmartLink href={siteConfig.cta.href} className='btn btn-primary'>
            {siteConfig.cta.label}
          </SmartLink>
        </div>
      </section>
    </>
  );
}
