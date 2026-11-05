import { useEffect, useRef, useState } from 'react';
import { useInView } from '~/components/globe/useGlobe';
import { constellationSection } from '~/content/home';
import { EVENTS, drawTimeline, formatMet, missionState } from './scene';

const STILLS = [0.06, 0.38, 0.63, 0.95];

function sizeCanvas(c: HTMLCanvasElement) {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return { w, h, dpr };
}

/** Desktop: a pinned canvas driven by scroll while the page scrolls normally. */
function ScrollTimeline() {
  const track = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const met = useRef<HTMLSpanElement>(null);
  const alt = useRef<HTMLSpanElement>(null);
  const vel = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [metNow, setMetNow] = useState(0);
  const inView = useInView(track, '0px');

  useEffect(() => {
    if (!inView) return;
    const el = track.current;
    const c = canvas.current;
    if (!el || !c || el.offsetParent === null) return;
    let raf = 0;
    let last = -1;
    let lastStage = -1;
    let lastEventsMet = -1;
    const frame = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const p = Math.max(0, Math.min(1, -rect.top / (span || 1)));
      const { w, h, dpr } = sizeCanvas(c);
      if (Math.abs(p - last) < 1e-5 && c.dataset.size === `${w}x${h}`) return;
      last = p;
      c.dataset.size = `${w}x${h}`;
      const ctx = c.getContext('2d');
      if (ctx) drawTimeline(ctx, w, h, p, dpr);
      const st = missionState(p);
      if (met.current) met.current.textContent = formatMet(st.met);
      if (alt.current) alt.current.textContent = st.altKm.toFixed(1).padStart(5, '0');
      if (vel.current) vel.current.textContent = st.speedKms.toFixed(2);
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (st.stage !== lastStage) {
        lastStage = st.stage;
        setStage(st.stage);
      }
      if (Math.abs(st.met - lastEventsMet) > 1) {
        lastEventsMet = st.met;
        setMetNow(st.met);
      }
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    request();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      cancelAnimationFrame(raf);
    };
  }, [inView]);

  const stages = constellationSection.stages;
  return (
    <div ref={track} className='relative h-[440vh]'>
      <div className='sticky top-0 h-[100svh] overflow-hidden'>
        <canvas ref={canvas} className='absolute inset-0 h-full w-full' role='img' aria-label='Wireframe animation of a satellite going from launch to first light.' />
        <div className='shell pointer-events-none relative flex h-full flex-col justify-between pb-10 pt-[calc(var(--header-h)+28px)]'>
          <div className='flex items-start justify-between gap-8'>
            <ol className='w-[340px] space-y-1'>
              {stages.map((s, i) => (
                <li key={s.id} className={`border-l py-2 pl-4 transition-colors duration-300 ${i === stage ? 'border-amber' : 'border-line'}`}>
                  <p className={`label ${i === stage ? 'text-amber' : ''}`}>
                    {String(i + 1).padStart(2, '0')} · {s.name}
                  </p>
                  {i === stage ? <p className='mt-2 text-[15px] leading-snug text-ink'>{s.sentence}</p> : null}
                </li>
              ))}
            </ol>
            <dl className='brackets readout grid w-[260px] grid-cols-[auto_1fr] gap-x-4 gap-y-2 bg-bg/70 p-4 text-[13px]'>
              <dt className='label'>Mission</dt>
              <dd className='text-right text-amber'>
                <span ref={met}>T+00:00:00</span>
              </dd>
              <dt className='label'>Altitude</dt>
              <dd className='text-right text-amber'>
                <span ref={alt}>000.0</span> <span className='text-muted'>km</span>
              </dd>
              <dt className='label'>Velocity</dt>
              <dd className='text-right text-amber'>
                <span ref={vel}>0.36</span> <span className='text-muted'>km/s</span>
              </dd>
            </dl>
          </div>
          <div className='flex items-end justify-between gap-8'>
            <ul className='readout space-y-1 text-[12px]' aria-label='Events'>
              {EVENTS[stage].map((e) => {
                const done = metNow >= e.at;
                return (
                  <li key={e.label} className={done ? 'text-ink' : 'text-muted'}>
                    <span className={done ? 'text-amber' : ''}>{done ? '[ OK ]' : '[    ]'}</span> {e.label}
                  </li>
                );
              })}
            </ul>
            <div className='w-[40%]'>
              <div className='flex justify-between'>
                {stages.map((s, i) => (
                  <span key={s.id} className={`label ${i <= stage ? 'text-ink' : ''}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                ))}
              </div>
              <div className='relative mt-2 h-px bg-line-strong'>
                <div ref={bar} className='absolute inset-0 origin-left bg-amber' style={{ transform: 'scaleX(0)' }} />
              </div>
              <div className='ticks mt-1 h-2 opacity-70' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Still({ p, label }: { p: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const near = useInView(ref, '300px');
  const drawn = useRef(false);
  useEffect(() => {
    const c = ref.current;
    if (!near || drawn.current || !c || c.offsetParent === null) return;
    drawn.current = true;
    const { w, h, dpr } = sizeCanvas(c);
    const ctx = c.getContext('2d');
    if (ctx) drawTimeline(ctx, w, h, p, dpr);
  }, [near, p]);
  return <canvas ref={ref} className='block aspect-[4/3] w-full bg-bg' role='img' aria-label={label} />;
}

/** Phones and reduced motion: the four stages as a list with stills. */
function StageList() {
  return (
    <ol className='shell grid gap-12 sm:grid-cols-2'>
      {constellationSection.stages.map((s, i) => {
        const st = missionState(STILLS[i]);
        return (
          <li key={s.id}>
            <div className='brackets p-2'>
              <Still p={STILLS[i]} label={`${s.name}: wireframe still`} />
            </div>
            <p className='label mt-4 flex justify-between'>
              <span className='text-amber'>
                {String(i + 1).padStart(2, '0')} · {s.name}
              </span>
              <span className='readout'>
                {formatMet(st.met)} · {st.altKm.toFixed(0)} km
              </span>
            </p>
            <p className='mt-3 text-[16px] text-muted'>{s.sentence}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function MissionTimeline() {
  return (
    <>
      <div className='hidden lg:motion-safe:block'>
        <ScrollTimeline />
      </div>
      <div className='lg:motion-safe:hidden'>
        <StageList />
      </div>
    </>
  );
}
