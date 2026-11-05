import { useCallback, useEffect, useRef, useState } from 'react';
import { CaptureViewer } from '~/components/capture/CaptureViewer';
import { useGlobe, useInView, usePageVisible, useReducedMotion } from '~/components/globe/useGlobe';
import { Crosshair } from '~/components/hud/SectionHeader';
import { constellation } from '~/content/constellation';
import { tasking } from '~/content/home';
import type { Site } from '~/content/sites';
import { sites } from '~/content/sites';
import { getSatellites } from '~/lib/constellation-sim';
import { customSite } from '~/lib/custom-site';
import { isLand } from '~/lib/earth/land';
import { formatDuration, formatLat, formatLon, formatUtc } from '~/lib/format';
import type { Pass } from '~/lib/orbits';
import { countPasses, findBestPass, maxCentralAngleForOffNadir, orbitRadius, R_MEAN } from '~/lib/orbits';
import { SimClock, easeInOutCubic } from '~/lib/sim-clock';

type Stage = 'idle' | 'countdown' | 'imaging' | 'delivered' | 'nopass' | 'water';

const IDLE_DISTANCE = 4.6;
const FOCUS_DISTANCE = 3.05;
const passOptions = {
  maxOffNadirDeg: constellation.maxOffNadirDeg,
  minSunElevationDeg: constellation.minSunElevationDeg,
  horizonMs: 36 * 3_600_000
};
const accessRadiusKm =
  maxCentralAngleForOffNadir(constellation.maxOffNadirDeg, orbitRadius(constellation.altitudeKm)) * R_MEAN;

export function TaskingDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(stageRef, '200px');
  const pageVisible = usePageVisible();
  const reduced = useReducedMotion();
  const sats = getSatellites();
  const clockRef = useRef<SimClock | null>(null);
  const taskId = useRef(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [site, setSite] = useState<Site | null>(null);
  const [pass, setPass] = useState<Pass | null>(null);
  const [revisits, setRevisits] = useState<number | null>(null);
  const countdownRef = useRef<HTMLSpanElement>(null);
  const clockText = useRef<HTMLSpanElement>(null);
  const [progress, setProgress] = useState(0);

  // Starts at the visitor's real time; set after hydration.
  useEffect(() => {
    clockRef.current ??= new SimClock(Date.now(), constellation.simTimeScale);
  }, []);

  const taskRef = useRef<(lat: number, lon: number, preset?: Site) => void>(() => {});

  const { engineRef, status } = useGlobe(
    canvasRef,
    () =>
      clockRef.current
        ? {
            mode: 'tasking',
            sats,
            clock: clockRef.current,
            view: { lon: 10, lat: 25 },
            distance: IDLE_DISTANCE,
            spin: 1.4,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            onPickPoint: (lat, lon) => taskRef.current(lat, lon)
          }
        : null,
    inView && pageVisible
  );

  const task = useCallback(
    (lat: number, lon: number, preset?: Site) => {
      const clock = clockRef.current;
      if (!clock) return;
      const id = ++taskId.current;
      const target = preset ?? customSite(lat, lon);
      setSite(target);
      setRevisits(null);
      setProgress(0);
      const engine = engineRef.current;
      if (engine) {
        engine.site = { lat: target.lat, lon: target.lon, radiusKm: accessRadiusKm };
        engine.selected = -1;
        engine.emphasizeTrack = false;
        engine.flyTo(target.lat, target.lon, FOCUS_DISTANCE);
      }
      if (!preset && !isLand(lat, lon)) {
        setPass(null);
        setStage('water');
        return;
      }
      const now = clock.now();
      const best = findBestPass(sats, target, now, passOptions);
      setPass(best);
      if (!best) {
        setStage('nopass');
        return;
      }
      const satIndex = sats.findIndex((s) => s.id === best.satId);
      if (engine) {
        engine.selected = satIndex;
        engine.trackWindow = { past: 30, future: 45 };
      }
      // Count the day's revisits without blocking the click.
      window.setTimeout(() => {
        if (taskId.current !== id) return;
        setRevisits(countPasses(sats, target, now, 86_400_000, passOptions));
      }, 60);

      if (reduced) {
        clock.set(best.endMs);
        engine?.invalidate();
        setStage('delivered');
        return;
      }
      setStage('countdown');
      clock.warpTo(best.startMs, constellation.taskingCountdownSeconds * 1000, easeInOutCubic).then(() => {
        if (taskId.current !== id) return;
        setStage('imaging');
        if (engine) engine.emphasizeTrack = true;
        clock
          .warpTo(best.endMs, constellation.taskingPassSeconds * 1000, (t) => t)
          .then(() => {
            if (taskId.current !== id) return;
            setStage('delivered');
          });
      });
    },
    [engineRef, reduced, sats]
  );
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  // Readouts tick from the simulation clock while something is happening.
  useEffect(() => {
    if (!inView || !pageVisible) return;
    const clock = clockRef.current;
    if (!clock) return;
    let raf = 0;
    const tick = () => {
      const t = clock.now();
      if (clockText.current) clockText.current.textContent = formatUtc(t);
      if (pass && countdownRef.current) {
        if (stage === 'countdown') countdownRef.current.textContent = `T−${formatDuration(pass.startMs - t)}`;
        else if (stage === 'imaging') {
          countdownRef.current.textContent = `T+${formatDuration(t - pass.startMs)}`;
          setProgress(Math.min(1, (t - pass.startMs) / (pass.endMs - pass.startMs)));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, pageVisible, pass, stage]);

  const reset = () => {
    taskId.current++;
    setStage('idle');
    setSite(null);
    setPass(null);
    setRevisits(null);
    const engine = engineRef.current;
    if (engine) {
      engine.site = null;
      engine.selected = -1;
      engine.emphasizeTrack = false;
      engine.release();
    }
    canvasRef.current?.parentElement?.focus();
  };

  const onGlobeKey = (e: React.KeyboardEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    const k = e.shiftKey ? 12 : 4;
    if (e.key === 'ArrowLeft') engine.nudge(k, 0);
    else if (e.key === 'ArrowRight') engine.nudge(-k, 0);
    else if (e.key === 'ArrowUp') engine.nudge(0, k);
    else if (e.key === 'ArrowDown') engine.nudge(0, -k);
    else if (e.key === 'Enter' || e.key === ' ') {
      const c = engine.centerLatLon();
      task(c.lat, c.lon);
    } else return;
    e.preventDefault();
  };

  const busy = stage === 'countdown' || stage === 'imaging';
  const delivered = stage === 'delivered' && site && pass;
  const sat = pass ? sats.find((s) => s.id === pass.satId) : undefined;

  const meta = delivered
    ? [
        { label: 'Satellite', value: pass.satId },
        { label: 'Captured', value: `${formatUtc(pass.tcaMs).slice(11)} UTC` },
        { label: 'Off-nadir', value: `${pass.offNadirDeg.toFixed(1)}°` },
        { label: 'Sun elevation', value: `${pass.sunElevationDeg.toFixed(1)}°` },
        { label: 'Ground range', value: `${pass.groundRangeKm.toFixed(0)} km` },
        { label: 'Passes / 24 h', value: revisits === null ? '…' : String(revisits) }
      ]
    : undefined;

  const steps: { key: keyof typeof tasking.steps; state: 'done' | 'active' | 'todo' }[] = [
    { key: 'target', state: site ? 'done' : 'active' },
    { key: 'assigned', state: pass ? 'done' : site && stage !== 'nopass' && stage !== 'water' ? 'active' : 'todo' },
    { key: 'countdown', state: stage === 'countdown' ? 'active' : stage === 'imaging' || stage === 'delivered' ? 'done' : 'todo' },
    { key: 'imaging', state: stage === 'imaging' ? 'active' : stage === 'delivered' ? 'done' : 'todo' },
    { key: 'delivered', state: stage === 'delivered' ? 'done' : 'todo' }
  ];

  return (
    <div className='grid border border-line lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(260px,300px)]'>
      {/* Site list */}
      <div className='border-b border-line p-4 lg:border-b-0 lg:border-r'>
        <h3 className='label'>{tasking.listLabel}</h3>
        <ul className='mt-3 grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-1 lg:bg-transparent lg:gap-0'>
          {sites.map((s, i) => {
            const active = site?.id === s.id;
            return (
              <li key={s.id} className='bg-bg lg:border-b lg:border-line'>
                <button
                  type='button'
                  onClick={() => task(s.lat, s.lon, s)}
                  aria-pressed={active}
                  className={`group flex min-h-14 w-full items-start gap-3 px-2 py-2.5 text-left transition-colors lg:px-1 ${
                    active ? 'bg-raised' : 'hover:bg-surface'
                  }`}
                >
                  <span className={`readout mt-0.5 text-[11px] ${active ? 'text-amber' : 'text-muted'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className='min-w-0'>
                    <span className='block text-[15px] leading-tight text-ink'>{s.name}</span>
                    <span className='mt-1 block text-[12px] leading-snug text-muted'>{s.subject}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className='mt-4 text-[13px] text-muted'>{tasking.clickHint}</p>
      </div>

      {/* Stage: the globe, then the capture */}
      <div className='relative min-w-0 border-b border-line lg:border-b-0'>
        <div ref={stageRef} className='relative aspect-square w-full sm:aspect-[4/3]'>
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- keyboard-operable globe widget */}
          <div
            className='group absolute inset-0 outline-none'
            tabIndex={delivered ? -1 : 0}
            role='application'
            aria-label={`Tasking globe. ${tasking.keyboardHint}`}
            onKeyDown={onGlobeKey}
            aria-hidden={delivered ? true : undefined}
            style={{ visibility: delivered ? 'hidden' : 'visible' }}
          >
            <img
              src='/globe-still.svg'
              alt=''
              width={1040}
              height={1040}
              loading='lazy'
              decoding='async'
              className='pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-auto -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700'
              style={{ opacity: status === 'ready' ? 0 : 0.85 }}
            />
            <canvas
              ref={canvasRef}
              aria-hidden='true'
              className='absolute inset-0 h-full w-full cursor-crosshair touch-pan-y transition-opacity duration-700'
              style={{ opacity: status === 'ready' ? 1 : 0 }}
            />
            {/* Keyboard crosshair: Enter tasks the point under it. */}
            <div className='pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 group-focus-visible:block'>
              <svg width='44' height='44' viewBox='0 0 44 44' aria-hidden='true' className='text-ink'>
                <path d='M22 0 V16 M22 28 V44 M0 22 H16 M28 22 H44' stroke='currentColor' strokeWidth='1' />
              </svg>
            </div>
            <div className='pointer-events-none absolute inset-x-4 top-4 flex justify-between'>
              <p className='label bg-bg/80 px-1.5 py-1'>
                Sim ×{reduced ? 1 : constellation.simTimeScale} · <span ref={clockText} className='readout'>---</span> UTC
              </p>
              <Crosshair />
            </div>
            {status === 'unavailable' ? (
              <p className='label absolute inset-x-4 bottom-4'>
                The 3D globe needs WebGL. Pick a site from the list to task it.
              </p>
            ) : (
              <p className='label pointer-events-none absolute bottom-4 left-4 max-w-[calc(100%-2rem)] bg-bg/80 px-1.5 py-1 max-sm:hidden'>
                {tasking.keyboardHint}
              </p>
            )}
          </div>

          {delivered ? (
            <div className='absolute inset-0 overflow-y-auto bg-bg p-3 sm:p-4'>
              <CaptureViewer
                key={site.id}
                site={site}
                reveal
                headingId='capture-heading'
                defaultFalseColor={site.kind === 'vineyard'}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Status */}
      <div className='flex flex-col p-4 lg:border-l lg:border-line' aria-live='polite'>
        <h3 className='label' id='capture-heading'>
          {site ? (
            <span className='text-ink'>{site.name}</span>
          ) : (
            'Status'
          )}
        </h3>
        {site ? (
          <p className='readout mt-1 text-[12px] text-muted'>
            {formatLat(site.lat, 2)} · {formatLon(site.lon, 2)}
          </p>
        ) : (
          <p className='mt-2 text-[15px] text-muted'>{tasking.idle}</p>
        )}

        <ol className='mt-5 space-y-0 border-t border-line'>
          {steps.map((s) => (
            <li key={s.key} className='flex items-center justify-between border-b border-line py-2.5'>
              <span className={`label ${s.state === 'todo' ? '' : 'text-ink'}`}>{tasking.steps[s.key]}</span>
              <StepValue
                step={s.key}
                state={s.state}
                stage={stage}
                site={site}
                pass={pass}
                satPlane={sat?.plane}
                countdownRef={countdownRef}
                progress={progress}
              />
            </li>
          ))}
        </ol>

        {stage === 'water' ? <p className='mt-4 text-[14px] text-amber'>Open water. Pick a point on land or a coastline.</p> : null}
        {stage === 'nopass' ? <p className='mt-4 text-[14px] text-amber'>{tasking.noPass}</p> : null}

        {delivered ? (
          <>
            <dl className='readout mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]'>
              {meta!.map((m) => (
                <div key={m.label}>
                  <dt className='label'>{m.label}</dt>
                  <dd className='mt-0.5 text-amber'>{m.value}</dd>
                </div>
              ))}
            </dl>
            <p className='mt-5 text-[14px] leading-snug text-muted'>{site.caption}</p>
            <button type='button' onClick={reset} className='btn btn-ghost mt-5 w-full'>
              {tasking.viewer.another}
            </button>
          </>
        ) : (
          <div className='mt-auto pt-6'>
            <p className='label'>{tasking.revisitsLabel}</p>
            <p className='readout mt-1 text-[28px] leading-none text-ink'>
              {revisits === null ? (busy || site ? '··' : '--') : revisits}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepValue({
  step,
  state,
  stage,
  site,
  pass,
  satPlane,
  countdownRef,
  progress
}: {
  step: keyof typeof tasking.steps;
  state: 'done' | 'active' | 'todo';
  stage: Stage;
  site: Site | null;
  pass: Pass | null;
  satPlane?: string;
  countdownRef: React.RefObject<HTMLSpanElement | null>;
  progress: number;
}) {
  const cls = 'readout text-right text-[12px]';
  if (step === 'target') return <span className={`${cls} ${site ? 'text-ink' : 'text-muted'}`}>{site ? 'Locked' : 'Waiting'}</span>;
  if (step === 'assigned')
    return (
      <span className={`${cls} ${pass ? 'text-amber' : 'text-muted'}`}>
        {pass ? `${pass.satId} · ${satPlane}` : stage === 'nopass' || stage === 'water' ? 'None' : '---'}
      </span>
    );
  if (step === 'countdown') {
    if (!pass) return <span className={`${cls} text-muted`}>--:--:--</span>;
    return (
      <span className={`${cls} ${state === 'active' ? 'text-amber' : 'text-ink'}`}>
        {state === 'active' ? (
          <span ref={countdownRef}>T−--:--:--</span>
        ) : (
          `${formatUtc(pass.startMs).slice(11)} UTC`
        )}
      </span>
    );
  }
  if (step === 'imaging') {
    if (state === 'active')
      return (
        <span className={`${cls} flex items-center gap-2 text-amber`}>
          <span className='relative h-1 w-16 bg-line' aria-hidden='true'>
            <span className='absolute inset-y-0 left-0 bg-amber' style={{ width: `${progress * 100}%` }} />
          </span>
          {Math.round(progress * 100)}%
        </span>
      );
    return (
      <span className={`${cls} ${state === 'done' ? 'text-ink' : 'text-muted'}`}>
        {state === 'done' && pass ? `${pass.offNadirDeg.toFixed(1)}° off-nadir` : '---'}
      </span>
    );
  }
  return <span className={`${cls} ${state === 'done' ? 'text-amber' : 'text-muted'}`}>{state === 'done' ? 'Ready' : '---'}</span>;
}
