import { useEffect, useRef } from 'react';
import { SectionHeader } from '~/components/hud/SectionHeader';
import { SmartLink } from '~/components/layout/SmartLink';
import { missionsSection } from '~/content/home';
import { missions, nextMission } from '~/content/missions';
import { formatDate, formatTimeUtc } from '~/lib/format';

const pad = (n: number) => String(n).padStart(2, '0');

/** Days, hours, minutes, seconds to a launch, ticking in place. */
function Countdown({ iso }: { iso: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const target = Date.parse(iso);
    const tick = () => {
      const ms = target - Date.now();
      const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (ref.current) {
        ref.current.textContent = ms > 0 ? `T−${pad(d)}d ${pad(h)}:${pad(m)}:${pad(sec)}` : 'Launch window open';
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <span ref={ref} className='readout'>
      T−--d --:--:--
    </span>
  );
}

export function MissionsSection() {
  const m = nextMission;
  const launched = missions.filter((x) => x.status !== 'scheduled').length;
  return (
    <section id='missions' aria-labelledby='missions-title' className='shell pt-28 lg:pt-40'>
      <SectionHeader index={missionsSection.index} label={missionsSection.label} aside={`${launched} launches to date`} />
      {m ? (
        <div className='mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-8'>
          <div className='lg:col-span-6'>
            <h2 id='missions-title' className='label text-ink'>
              {missionsSection.title}
            </h2>
            <p className='display mt-4 text-[clamp(96px,15vw,240px)] leading-[0.8]'>{m.id}</p>
          </div>
          <div className='flex flex-col justify-end lg:col-span-6'>
            <p className='readout text-[clamp(26px,3vw,40px)] leading-none text-amber' aria-label='Countdown to launch'>
              <Countdown iso={m.launchAt} />
            </p>
            <dl className='mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-4'>
              <div>
                <dt className='label'>Date</dt>
                <dd className='mt-1 text-[17px]'>
                  <time dateTime={m.launchAt}>{formatDate(m.launchAt)}</time>
                </dd>
                <dd className='readout text-[12px] text-muted'>{formatTimeUtc(m.launchAt)}</dd>
              </div>
              <div>
                <dt className='label'>Site</dt>
                <dd className='mt-1 text-[17px]'>{m.launchSite}</dd>
              </div>
              <div>
                <dt className='label'>Vehicle</dt>
                <dd className='mt-1 text-[17px]'>{m.vehicle}</dd>
              </div>
              <div>
                <dt className='label'>Payload</dt>
                <dd className='mt-1 text-[17px]'>{m.satellites} satellites</dd>
              </div>
            </dl>
            <p className='mt-6 max-w-lg text-muted'>{m.summary}</p>
            <div className='mt-8'>
              <SmartLink href={missionsSection.link.href} className='link-arrow'>
                {missionsSection.link.label}
                <svg width='14' height='10' viewBox='0 0 14 10' aria-hidden='true'>
                  <path d='M0 5 H12 M8 1 L12 5 L8 9' fill='none' stroke='currentColor' strokeWidth='1.3' />
                </svg>
              </SmartLink>
            </div>
          </div>
        </div>
      ) : (
        <div className='mt-10'>
          <h2 id='missions-title' className='display text-[48px]'>
            {missionsSection.title}
          </h2>
          <p className='mt-4 text-muted'>{missionsSection.noUpcoming}</p>
          <SmartLink href={missionsSection.link.href} className='link-arrow mt-6'>
            {missionsSection.link.label}
          </SmartLink>
        </div>
      )}
    </section>
  );
}
