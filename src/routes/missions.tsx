import { createFileRoute } from '@tanstack/react-router';
import { SectionHeader } from '~/components/hud/SectionHeader';
import { SmartLink } from '~/components/layout/SmartLink';
import { missions, nextMission, satellitesInService, statusLabels } from '~/content/missions';
import type { MissionStatus } from '~/content/missions';
import { pages } from '~/content/pages';
import { formatDate, formatTimeUtc } from '~/lib/format';
import { siteUrl } from '~/lib/site';
import { siteConfig } from '~/site.config';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/missions')({
  head: () =>
    seo({
      title: pages.missions.title,
      description: pages.missions.description,
      path: pages.missions.path,
      image: pages.missions.image,
      imageAlt: pages.missions.imageAlt,
      jsonLd: missions.map((m) => ({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: `${m.id} launch`,
        startDate: m.launchAt,
        eventStatus: 'https://schema.org/EventScheduled',
        location: { '@type': 'Place', name: m.launchSite },
        organizer: { '@type': 'Organization', name: siteConfig.company, url: siteUrl('/') },
        description: m.summary
      }))
    }),
  component: MissionsPage
});

const statusTone: Record<MissionStatus, string> = {
  operational: 'text-ink',
  retired: 'text-muted',
  scheduled: 'text-amber',
  failed: 'text-danger'
};

function MissionsPage() {
  const launched = missions.filter((m) => m.status !== 'scheduled');
  const deployed = launched.reduce((n, m) => n + m.satellites, 0);
  const stats = [
    { label: 'Launches', value: String(launched.length) },
    { label: 'Satellites deployed', value: String(deployed) },
    { label: 'In service', value: String(satellitesInService) },
    { label: 'Next launch', value: nextMission ? nextMission.id : '—' }
  ];
  return (
    <>
      <section className='shell pt-[calc(var(--header-h)+56px)]'>
        <SectionHeader index='01' label='Missions' aside='Launch history' />
        <div className='mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12'>
          <h1 className='display text-[clamp(64px,10vw,160px)] lg:col-span-7'>Missions</h1>
          <p className='max-w-md self-end text-[18px] text-muted lg:col-span-4 lg:col-start-9'>
            Every launch since the first two pathfinders, with what each one put into orbit and where it is now.
          </p>
        </div>
        <dl className='mt-16 grid grid-cols-2 border-t border-line lg:grid-cols-4'>
          {stats.map((s, i) => (
            <div key={s.label} className={`border-b border-line py-6 pr-4 ${i % 2 ? 'border-l pl-4 lg:pl-6' : ''} ${i > 0 ? 'lg:border-l lg:pl-6' : ''} lg:border-b-0`}>
              <dt className='label'>{s.label}</dt>
              <dd className='display mt-3 text-[clamp(48px,5vw,80px)] leading-[0.85]'>{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby='history-title' className='shell pb-28 pt-20 lg:pb-40 lg:pt-28'>
        <h2 id='history-title' className='label text-ink'>
          Launch history
        </h2>
        <div className='mt-6 overflow-x-auto'>
          <table className='w-full min-w-0 border-collapse text-left lg:min-w-[960px]'>
            <caption className='sr-only'>Apogee Orbital launches, oldest first</caption>
            <thead className='max-lg:sr-only'>
              <tr className='border-y border-line-strong'>
                {['Mission', 'Launch (UTC)', 'Vehicle', 'Launch site', 'Satellites', 'Plane', 'Status'].map((h) => (
                  <th key={h} scope='col' className='label py-3 pr-4 font-medium'>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {missions.map((m) => (
                <tr key={m.id} id={m.id.toLowerCase()} className='border-b border-line align-top max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-3 max-lg:py-6'>
                  <th scope='row' className='py-6 pr-4 max-lg:col-span-2 max-lg:py-0'>
                    <span className='display block text-[40px] leading-none'>{m.id}</span>
                    <span className='mt-3 block max-w-[34ch] text-[14px] font-normal text-muted lg:max-w-[28ch]'>{m.summary}</span>
                  </th>
                  <Cell label='Launch (UTC)'>
                    <time dateTime={m.launchAt}>{formatDate(m.launchAt)}</time>
                    <span className='readout block text-[12px] text-muted'>{formatTimeUtc(m.launchAt)}</span>
                  </Cell>
                  <Cell label='Vehicle'>{m.vehicle}</Cell>
                  <Cell label='Launch site'>{m.launchSite}</Cell>
                  <Cell label='Satellites'>
                    <span className='readout'>{m.satellites}</span>
                  </Cell>
                  <Cell label='Plane'>{m.plane}</Cell>
                  <Cell label='Status'>
                    <span className={`label ${statusTone[m.status]}`}>
                      <span
                        aria-hidden='true'
                        className={`mr-2 inline-block size-1.5 rounded-full align-middle ${
                          m.status === 'scheduled' ? 'bg-amber' : m.status === 'operational' ? 'bg-ink' : 'border border-muted'
                        }`}
                      />
                      {statusLabels[m.status]}
                    </span>
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className='mt-20 flex flex-col items-start gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between'>
          <p className='display text-[clamp(32px,4vw,56px)]'>See what they see.</p>
          <SmartLink href={siteConfig.cta.href} className='btn btn-primary'>
            {siteConfig.cta.label}
          </SmartLink>
        </div>
      </section>
    </>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <td className='py-6 pr-4 text-[15px] max-lg:py-0'>
      <span className='label block lg:hidden'>{label}</span>
      {children}
    </td>
  );
}
