import { Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { requestSection } from '~/content/home';
import type { Field, FieldErrors } from '~/lib/sample-request/rules';
import { LIMITS, normalize, validate } from '~/lib/sample-request/rules';
import { submitSampleRequestFn } from '~/lib/sample-request/server';

type Status = 'idle' | 'sending' | 'ok' | 'duplicate' | 'rate_limited' | 'network' | 'invalid';

const copy = requestSection.form;

export function SampleRequestForm() {
  const [values, setValues] = useState({ email: '', organization: '', areaOfInterest: '', useCase: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const honeypot = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const update = (field: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const focusFirstError = (errs: FieldErrors) => {
    const first = (['email', 'organization', 'areaOfInterest', 'useCase'] as Field[]).find((f) => errs[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    const local = validate(normalize(values));
    if (Object.keys(local).length) {
      setErrors(local);
      setStatus('invalid');
      focusFirstError(local);
      return;
    }
    setStatus('sending');
    try {
      const res = await submitSampleRequestFn({
        data: { ...values, website: honeypot.current?.value ?? '' }
      });
      if (res.status === 'invalid') {
        setErrors(res.errors);
        setStatus('invalid');
        focusFirstError(res.errors);
        return;
      }
      setStatus(res.status);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch {
      setStatus('network');
    }
  };

  if (status === 'ok' || status === 'duplicate') {
    const msg = status === 'ok' ? copy.success : copy.duplicate;
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        role='status'
        className='brackets flex min-h-[420px] flex-col justify-center p-8 outline-none'
      >
        <p className='label text-amber'>
          <span aria-hidden='true' className='mr-2 inline-block size-1.5 bg-amber align-middle' />
          {status === 'ok' ? 'Request logged' : 'Already registered'}
        </p>
        <p className='display mt-5 text-[44px]'>{msg.title}</p>
        <p className='mt-4 max-w-sm text-muted'>{msg.body}</p>
        <dl className='readout mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]'>
          <dt className='label'>Email</dt>
          <dd className='truncate text-ink'>{values.email.trim().toLowerCase()}</dd>
          <dt className='label'>Area</dt>
          <dd className='truncate text-ink'>{values.areaOfInterest.trim()}</dd>
        </dl>
      </div>
    );
  }

  const field = (name: Field) => ({
    id: `req-${name}`,
    name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `req-${name}-error` : name === 'areaOfInterest' ? 'req-areaOfInterest-hint' : undefined
  });
  const inputCls = (name: Field) =>
    `mt-2 block h-12 w-full border bg-bg px-3 text-[16px] text-ink placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-0 ${
      errors[name] ? 'border-danger' : 'border-line-strong hover:border-ink/60'
    }`;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className='relative' aria-describedby='req-status'>
      <div className='grid gap-6 sm:grid-cols-2'>
        <div>
          <label htmlFor='req-email' className='label text-ink'>
            {copy.email.label}
          </label>
          <input
            {...field('email')}
            type='email'
            autoComplete='email'
            inputMode='email'
            required
            maxLength={LIMITS.emailMax}
            placeholder={copy.email.placeholder}
            value={values.email}
            onChange={update('email')}
            className={inputCls('email')}
          />
          <FieldError name='email' errors={errors} />
        </div>
        <div>
          <label htmlFor='req-organization' className='label text-ink'>
            {copy.organization.label}
          </label>
          <input
            {...field('organization')}
            type='text'
            autoComplete='organization'
            required
            maxLength={LIMITS.organizationMax}
            placeholder={copy.organization.placeholder}
            value={values.organization}
            onChange={update('organization')}
            className={inputCls('organization')}
          />
          <FieldError name='organization' errors={errors} />
        </div>
        <div className='sm:col-span-2'>
          <div className='flex items-baseline justify-between gap-4'>
            <label htmlFor='req-areaOfInterest' className='label text-ink'>
              {copy.areaOfInterest.label}
            </label>
            <span id='req-areaOfInterest-hint' className='readout text-[11px] text-muted'>
              {values.areaOfInterest.length}/{LIMITS.areaOfInterestMax}
              <span className='sr-only'> characters. {copy.areaOfInterest.hint}</span>
            </span>
          </div>
          <input
            {...field('areaOfInterest')}
            type='text'
            required
            maxLength={LIMITS.areaOfInterestMax}
            placeholder={copy.areaOfInterest.placeholder}
            value={values.areaOfInterest}
            onChange={update('areaOfInterest')}
            className={inputCls('areaOfInterest')}
          />
          <FieldError name='areaOfInterest' errors={errors} />
        </div>
        <div className='sm:col-span-2'>
          <label htmlFor='req-useCase' className='label text-ink'>
            {copy.useCase.label}
          </label>
          <div className='relative'>
            <select
              {...field('useCase')}
              required
              value={values.useCase}
              onChange={update('useCase')}
              className={`${inputCls('useCase')} appearance-none pr-10 ${values.useCase ? '' : 'text-muted'}`}
            >
              <option value='' disabled>
                {copy.useCase.placeholder}
              </option>
              {copy.useCase.options.map((o) => (
                <option key={o.value} value={o.value} className='text-ink'>
                  {o.label}
                </option>
              ))}
            </select>
            <svg
              className='pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-muted'
              width='12'
              height='8'
              viewBox='0 0 12 8'
              aria-hidden='true'
            >
              <path d='M1 1 L6 6 L11 1' fill='none' stroke='currentColor' strokeWidth='1.4' />
            </svg>
          </div>
          <FieldError name='useCase' errors={errors} />
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden='true' className='absolute -left-[9999px] top-0 h-px w-px overflow-hidden'>
        <label htmlFor='req-website'>Website</label>
        <input ref={honeypot} id='req-website' name='website' type='text' tabIndex={-1} autoComplete='off' defaultValue='' />
      </div>

      <div id='req-status' role='alert' aria-live='assertive' className='mt-6 min-h-6 text-[14px]'>
        {status === 'invalid' ? <p className='text-danger'>{copy.invalid}</p> : null}
        {status === 'rate_limited' ? <p className='text-amber'>{copy.rateLimited}</p> : null}
        {status === 'network' ? <p className='text-amber'>{copy.networkError}</p> : null}
      </div>

      <div className='mt-4 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
        <button type='submit' className='btn btn-primary min-w-[260px]' disabled={status === 'sending'} aria-busy={status === 'sending'}>
          {status === 'sending' ? copy.submitting : copy.submit}
        </button>
        <p className='max-w-xs text-[13px] text-muted'>
          {copy.privacy.replace(' Read the privacy notice.', '')}{' '}
          <Link
            to='/privacy'
            className="relative text-ink underline underline-offset-4 after:absolute after:inset-x-0 after:-inset-y-[15px] after:content-['']"
          >
            Read the privacy notice.
          </Link>
        </p>
      </div>
    </form>
  );
}

function FieldError({ name, errors }: { name: Field; errors: FieldErrors }) {
  if (!errors[name]) return null;
  return (
    <p id={`req-${name}-error`} className='mt-2 text-[13px] text-danger'>
      {errors[name]}
    </p>
  );
}
