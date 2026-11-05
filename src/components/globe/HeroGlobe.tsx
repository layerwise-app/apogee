import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { constellation } from '~/content/constellation';
import { hero } from '~/content/home';
import { getSatellites, nearestSatellite } from '~/lib/constellation-sim';
import { formatDuration, formatLat, formatLon, formatUtc } from '~/lib/format';
import type { StationContact } from '~/lib/orbits';
import { findNextStationContact, satelliteState } from '~/lib/orbits';
import { SimClock } from '~/lib/sim-clock';
import { HERO_VIEW } from './hero-view';
import { useGlobe, useInView, usePageVisible, useReducedMotion } from './useGlobe';

/** Camera distance (Earth radii) that makes the globe 80% of the frame. */
export const HERO_DISTANCE = 5.506;

type Readouts = {
  alt: HTMLElement | null;
  vel: HTMLElement | null;
  gnd: HTMLElement | null;
  lat: HTMLElement | null;
  lon: HTMLElement | null;
  pass: HTMLElement | null;
  passLabel: HTMLElement | null;
  clock: HTMLElement | null;
};

export function HeroGlobe({
  frameClassName,
  telemetryClassName
}: {
  frameClassName: string;
  telemetryClassName: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(frameRef, '100px');
  const pageVisible = usePageVisible();
  const sats = getSatellites();
  const clockRef = useRef<SimClock | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const readouts = useRef<Readouts>({
    alt: null,
    vel: null,
    gnd: null,
    lat: null,
    lon: null,
    pass: null,
    passLabel: null,
    clock: null
  });

  // The clock starts at the visitor's real time, so the sun and the
  // satellites are where they really would be.
  // The clock and the first satellite depend on the visitor's time, so they
  // are set after hydration (the server can't know them).
  useEffect(() => {
    clockRef.current ??= new SimClock(Date.now(), constellation.simTimeScale);
    // Up and to the left of centre, clear of the telemetry panel.
    // oxlint-disable-next-line react/set-state-in-effect -- client-only initial value
    setSelected(nearestSatellite(HERO_VIEW.lat + 22, HERO_VIEW.lon - 18, Date.now()));
  }, []);

  useEffect(() => {
    clockRef.current?.setScale(reduced ? 1 : constellation.simTimeScale);
  }, [reduced]);

  const { engineRef, status } = useGlobe(
    canvasRef,
    () =>
      clockRef.current
        ? {
            mode: 'hero',
            sats,
            clock: clockRef.current,
            view: HERO_VIEW,
            distance: HERO_DISTANCE,
            spin: 2.2,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            onSelectSatellite: (i) => setSelected(i)
          }
        : null,
    inView && pageVisible
  );

  useEffect(() => {
    const engine = engineRef.current;
    if (status !== 'ready' || !engine || selected === null) return;
    engine.selected = selected;
    engine.invalidate();
  }, [selected, status, engineRef]);

  // Telemetry: computed from the orbit model ten times a second while visible.
  useEffect(() => {
    if (selected === null || !inView || !pageVisible) return;
    const clock = clockRef.current;
    if (!clock) return;
    const sat = sats[selected];
    let contact: StationContact | null = null;
    const r = readouts.current;
    const tick = () => {
      const t = clock.now();
      const s = satelliteState(sat, t);
      if (!contact || t > contact.losMs) {
        contact = findNextStationContact(
          sat,
          constellation.groundStations,
          t,
          constellation.stationMinElevationDeg
        );
      }
      set(r.alt, s.altKm.toFixed(2));
      set(r.vel, s.speedKms.toFixed(3));
      set(r.gnd, s.groundSpeedKms.toFixed(3));
      set(r.lat, formatLat(s.lat));
      set(r.lon, formatLon(s.lon));
      set(r.clock, formatUtc(t));
      if (contact) {
        const inContact = t >= contact.aosMs;
        set(r.passLabel, contact.stationId);
        set(
          r.pass,
          inContact ? `LOS ${formatDuration(contact.losMs - t)}` : `T−${formatDuration(contact.aosMs - t)}`
        );
      } else {
        set(r.passLabel, '---');
        set(r.pass, '--:--:--');
      }
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => clearInterval(id);
  }, [selected, inView, pageVisible, sats]);

  const step = useCallback(
    (d: number) => setSelected((i) => ((i ?? 0) + d + sats.length) % sats.length),
    [sats.length]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    const k = e.shiftKey ? 15 : 5;
    if (e.key === 'ArrowLeft') engine.nudge(k, 0);
    else if (e.key === 'ArrowRight') engine.nudge(-k, 0);
    else if (e.key === 'ArrowUp') engine.nudge(0, -k);
    else if (e.key === 'ArrowDown') engine.nudge(0, k);
    else return;
    e.preventDefault();
  };

  const satName = selected === null ? '-----' : sats[selected].id;
  const plane = selected === null ? '-' : sats[selected].plane;
  const ready = status === 'ready';

  const bind = useMemo(
    () => (key: keyof Readouts) => (el: HTMLElement | null) => {
      readouts.current[key] = el;
    },
    []
  );

  return (
    <>
      {/* A keyboard-operable picture: arrow keys turn the globe. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={frameRef}
        className={frameClassName}
        role='img'
        aria-label={hero.globeLabel}
        aria-describedby='hero-globe-hint'
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus is how keyboards turn it
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <img
          src='/globe-still.svg'
          alt=''
          width={1040}
          height={1040}
          decoding='async'
          className='pointer-events-none absolute left-1/2 top-1/2 h-auto w-[83.2%] -translate-x-1/2 -translate-y-1/2 select-none transition-opacity duration-700'
          style={{ opacity: ready ? 0 : 1 }}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          aria-hidden='true'
          className='absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-700 active:cursor-grabbing'
          style={{ opacity: ready ? 1 : 0 }}
        />
      </div>
      <p id='hero-globe-hint' className='sr-only'>
        {hero.globeHint} Arrow keys turn the globe when it has focus.
      </p>

      <Telemetry
        satName={satName}
        plane={plane}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        bind={bind}
        timeScale={reduced ? 1 : constellation.simTimeScale}
        className={telemetryClassName}
      />
    </>
  );
}

function set(el: HTMLElement | null, text: string) {
  if (el && el.textContent !== text) el.textContent = text;
}

function Telemetry({
  satName,
  plane,
  onPrev,
  onNext,
  bind,
  timeScale,
  className
}: {
  satName: string;
  plane: string;
  onPrev: () => void;
  onNext: () => void;
  bind: (key: keyof Readouts) => (el: HTMLElement | null) => void;
  timeScale: number;
  className: string;
}) {
  const t = hero.telemetry;
  return (
    <section
      aria-label={`${t.title} for satellite ${satName}`}
      className={`brackets bg-bg/80 p-4 ${className}`}
    >
      <div className='flex items-center justify-between gap-3 border-b border-line pb-3'>
        <h2 className='label text-ink'>
          <span className='mr-2 inline-block size-1.5 translate-y-[-1px] bg-amber align-middle' aria-hidden='true' />
          {t.title}
        </h2>
        <div className='flex items-center'>
          <button
            type='button'
            onClick={onPrev}
            className='flex size-11 items-center justify-center text-muted hover:text-ink'
            aria-label='Previous satellite'
          >
            <Chevron dir='left' />
          </button>
          <p className='readout min-w-[7ch] text-center text-[13px] leading-tight text-ink' aria-live='polite'>
            {satName}
            <span className='block text-[10px] tracking-[0.14em] text-muted'>PLANE {plane}</span>
          </p>
          <button
            type='button'
            onClick={onNext}
            className='flex size-11 items-center justify-center text-muted hover:text-ink'
            aria-label='Next satellite'
          >
            <Chevron dir='right' />
          </button>
        </div>
      </div>
      <dl className='readout grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 pt-3 text-[13px] sm:max-lg:grid-cols-[auto_1fr_auto_1fr]'>
        <dt className='label'>{t.altitude}</dt>
        <dd className='text-right text-amber'>
          <span ref={bind('alt')}>---.--</span> <span className='text-muted'>km</span>
        </dd>
        <dt className='label'>{t.velocity}</dt>
        <dd className='text-right text-amber'>
          <span ref={bind('vel')}>-.---</span> <span className='text-muted'>km/s</span>
        </dd>
        <dt className='label'>Ground</dt>
        <dd className='text-right text-ink'>
          <span ref={bind('gnd')}>-.---</span> <span className='text-muted'>km/s</span>
        </dd>
        <dt className='label'>{t.latitude}</dt>
        <dd className='text-right text-amber' ref={bind('lat')}>
          --.----° -
        </dd>
        <dt className='label'>{t.longitude}</dt>
        <dd className='text-right text-amber' ref={bind('lon')}>
          ---.----° -
        </dd>
        <dt className='label'>{t.nextPass}</dt>
        <dd className='text-right text-amber'>
          <span ref={bind('passLabel')} className='mr-2 text-ink'>
            ---
          </span>
          <span ref={bind('pass')}>T−--:--:--</span>
        </dd>
      </dl>
      <div className='mt-3 flex items-center justify-between gap-3 border-t border-line pt-3'>
        <p className='label whitespace-nowrap'>
          {t.simClock} ×{timeScale}
        </p>
        <p className='readout whitespace-nowrap text-[11px] text-muted'>
          <span ref={bind('clock')}>---------- --:--:--</span> UTC
        </p>
      </div>
    </section>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width='12' height='12' viewBox='0 0 12 12' aria-hidden='true'>
      <path
        d={dir === 'left' ? 'M8 2 L4 6 L8 10' : 'M4 2 L8 6 L4 10'}
        fill='none'
        stroke='currentColor'
        strokeWidth='1.4'
      />
    </svg>
  );
}
