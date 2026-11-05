import { SectionHeader } from '~/components/hud/SectionHeader';
import { Screen } from '~/components/Screen';
import { TaskingDemo } from '~/components/tasking/TaskingDemo';
import { tasking } from '~/content/home';

export function TaskingSection() {
  return (
    <section id='tasking' aria-labelledby='tasking-title' className='shell pt-24 lg:pt-36'>
      <SectionHeader index={tasking.index} label={tasking.label} aside='Live simulation' />
      <div className='mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12'>
        <h2 id='tasking-title' className='display text-[clamp(44px,6vw,96px)] lg:col-span-7'>
          {tasking.title}
        </h2>
        <p className='max-w-md self-end text-[17px] text-muted lg:col-span-4 lg:col-start-9'>{tasking.body}</p>
      </div>
      <div className='mt-12 lg:mt-16'>
        <Screen id='tasking-console' className='aspect-[16/9]'>
          <TaskingDemo />
        </Screen>
      </div>
    </section>
  );
}
