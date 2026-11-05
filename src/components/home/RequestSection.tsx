import { SectionHeader } from '~/components/hud/SectionHeader';
import { SampleRequestForm } from '~/components/home/SampleRequestForm';
import { requestSection } from '~/content/home';

export function RequestSection() {
  return (
    <section id='request' aria-labelledby='request-title' className='shell pb-28 pt-28 lg:pb-40 lg:pt-40'>
      <SectionHeader index={requestSection.index} label={requestSection.label} aside='No account needed' />
      <div className='mt-10 grid gap-14 lg:mt-14 lg:grid-cols-12 lg:gap-8'>
        <div className='lg:col-span-5'>
          <h2 id='request-title' className='display text-[clamp(44px,6vw,96px)]'>
            {requestSection.title}
          </h2>
          <p className='mt-8 max-w-md text-[17px] text-muted'>{requestSection.body}</p>
          <ul className='mt-10 border-t border-line'>
            {requestSection.points.map((p) => (
              <li key={p} className='flex items-center gap-4 border-b border-line py-3 text-[15px]'>
                <span className='size-1.5 shrink-0 bg-ink' aria-hidden='true' />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className='lg:col-span-6 lg:col-start-7'>
          <SampleRequestForm />
        </div>
      </div>
    </section>
  );
}
