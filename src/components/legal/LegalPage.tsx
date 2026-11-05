import { SectionHeader } from '~/components/hud/SectionHeader';
import type { LegalSection } from '~/content/legal';
import { formatDate } from '~/lib/format';

export function LegalPage({
  label,
  title,
  updated,
  intro,
  sections
}: {
  label: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <article className='shell pb-28 pt-[calc(var(--header-h)+56px)] lg:pb-40'>
      <SectionHeader index='—' label={label} aside={<>Updated <time dateTime={updated}>{formatDate(updated)}</time></>} />
      <div className='mt-10 grid gap-12 lg:mt-14 lg:grid-cols-12'>
        <h1 className='display text-[clamp(52px,8vw,120px)] lg:col-span-5'>{title}</h1>
        <div className='lg:col-span-6 lg:col-start-7'>
          <p className='text-[19px] text-ink'>{intro}</p>
          {sections.map((s) => (
            <section key={s.heading} className='mt-12 border-t border-line pt-6'>
              <h2 className='label text-ink'>{s.heading}</h2>
              <div className='prose-plain mt-4 text-[17px] text-muted'>
                {s.paragraphs.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
