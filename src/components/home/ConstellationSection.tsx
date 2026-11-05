import { SectionHeader } from '~/components/hud/SectionHeader';
import { Screen } from '~/components/Screen';
import { MissionTimeline } from '~/components/timeline/MissionTimeline';
import { constellationSection } from '~/content/home';

export function ConstellationSection() {
  const c = constellationSection;
  return (
    <section id='constellation' aria-labelledby='constellation-title' className='pt-28 lg:pt-40'>
      <div className='shell'>
        <SectionHeader index={c.index} label={c.label} aside='Scroll to follow one satellite' />
        <div className='mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12'>
          <h2 id='constellation-title' className='display text-[clamp(44px,6vw,96px)] lg:col-span-7'>
            {c.title}
          </h2>
          <p className='max-w-md self-end text-[17px] text-muted lg:col-span-4 lg:col-start-9'>{c.intro}</p>
        </div>
      </div>
      <div className='mt-14 lg:mt-10'>
        <Screen id='constellation-timeline' className='shell aspect-[16/9]'>
          <MissionTimeline />
        </Screen>
      </div>
      <div className='shell mt-20 lg:mt-28'>
        <dl className='grid grid-cols-2 border-t border-line lg:grid-cols-4'>
          {c.numbers.map((n, i) => (
            <div
              key={n.label}
              className={`border-b border-line py-8 pr-4 lg:border-b-0 ${i % 2 === 1 ? 'pl-4 max-lg:border-l lg:pl-6' : ''} ${i > 0 ? 'lg:border-l lg:pl-6' : ''}`}
            >
              <dt className='label'>{n.label}</dt>
              <dd className='display mt-4 text-[clamp(64px,8vw,128px)] leading-[0.85]'>
                {n.value}
                {n.unit ? <span className='ml-2 align-top text-[0.32em] text-muted'>{n.unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
