/**
 * Rules for the "Request sample imagery" form, independent of the database
 * and email services so they can be tested. The server function in
 * ./server.ts plugs in D1 and env.EMAIL.
 */
import { requestSection } from '~/content/home';

export const LIMITS = {
  emailMax: 254,
  organizationMax: 120,
  areaOfInterestMax: 120,
  /** Accepted submissions per visitor per rolling hour. */
  perVisitorPerHour: 5,
  /** Owner notification emails per UTC day; past this, requests are saved without email. */
  ownerEmailsPerDay: 100
};

export const USE_CASES = requestSection.form.useCase.options.map((o) => o.value);

export type Field = 'email' | 'organization' | 'areaOfInterest' | 'useCase';
export type FieldErrors = Partial<Record<Field, string>>;

export type SampleRequest = {
  email: string;
  organization: string;
  areaOfInterest: string;
  useCase: string;
};

export type SubmitResult =
  | { status: 'ok' }
  | { status: 'duplicate' }
  | { status: 'invalid'; errors: FieldErrors }
  | { status: 'rate_limited' };

export interface RequestStore {
  countAttemptsSince(visitorHash: string, since: Date): Promise<number>;
  recordAttempt(visitorHash: string, at: Date): Promise<void>;
  emailExists(email: string): Promise<boolean>;
  /** Returns the new id, or null if the email is already saved. */
  insert(row: SampleRequest & { createdAt: Date }): Promise<string | null>;
  countOwnerNotificationsSince(since: Date): Promise<number>;
  markOwnerNotified(id: string): Promise<void>;
}

export type OwnerEmail = { to: string; subject: string; text: string; html: string };

export interface Mailer {
  send(message: OwnerEmail): Promise<boolean>;
}

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max + 1) : '';

/** Coerces untrusted input into trimmed strings. */
export function normalize(raw: unknown): SampleRequest & { honeypot: string } {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    email: clean(o.email, LIMITS.emailMax).toLowerCase(),
    organization: clean(o.organization, LIMITS.organizationMax),
    areaOfInterest: clean(o.areaOfInterest, LIMITS.areaOfInterestMax),
    useCase: clean(o.useCase, 40),
    honeypot: clean(o.website, 200)
  };
}

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function validate(input: SampleRequest): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.email) errors.email = 'Enter your work email.';
  else if (input.email.length > LIMITS.emailMax || !EMAIL.test(input.email))
    errors.email = 'Enter an email like name@organization.com.';
  if (!input.organization) errors.organization = 'Enter your organization.';
  else if (input.organization.length > LIMITS.organizationMax)
    errors.organization = `Keep it under ${LIMITS.organizationMax} characters.`;
  if (!input.areaOfInterest) errors.areaOfInterest = 'Enter a place name.';
  else if (input.areaOfInterest.length > LIMITS.areaOfInterestMax)
    errors.areaOfInterest = `Keep it under ${LIMITS.areaOfInterestMax} characters.`;
  if (!USE_CASES.includes(input.useCase)) errors.useCase = 'Choose a use case.';
  return errors;
}

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function ownerEmailFor(to: string, r: SampleRequest): OwnerEmail {
  const useCase = requestSection.form.useCase.options.find((o) => o.value === r.useCase)?.label ?? r.useCase;
  const rows: [string, string][] = [
    ['Work email', r.email],
    ['Organization', r.organization],
    ['Area of interest', r.areaOfInterest],
    ['Use case', useCase]
  ];
  return {
    to,
    subject: `Sample imagery request: ${r.organization}`.slice(0, 200),
    text: `New sample imagery request\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n`,
    html: `<p>New sample imagery request</p><table>${rows
      .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#666">${k}</td><td>${escapeHtml(v)}</td></tr>`)
      .join('')}</table>`
  };
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Handles one submission. The owner is the only possible recipient of email:
 * the address typed into the form is stored, never mailed.
 */
export async function submitSampleRequest(
  raw: unknown,
  ctx: {
    visitorHash: string;
    now: Date;
    ownerEmail: string;
    store: RequestStore;
    mailer: Mailer;
  }
): Promise<SubmitResult> {
  const input = normalize(raw);
  // Bots fill the hidden field; tell them it worked and keep nothing.
  if (input.honeypot) return { status: 'ok' };

  const request: SampleRequest = {
    email: input.email,
    organization: input.organization,
    areaOfInterest: input.areaOfInterest,
    useCase: input.useCase
  };
  const errors = validate(request);
  if (Object.keys(errors).length) return { status: 'invalid', errors };

  const hourAgo = new Date(ctx.now.getTime() - 3_600_000);
  const recent = await ctx.store.countAttemptsSince(ctx.visitorHash, hourAgo);
  if (recent >= LIMITS.perVisitorPerHour) return { status: 'rate_limited' };
  await ctx.store.recordAttempt(ctx.visitorHash, ctx.now);

  if (await ctx.store.emailExists(request.email)) return { status: 'duplicate' };
  const id = await ctx.store.insert({ ...request, createdAt: ctx.now });
  if (!id) return { status: 'duplicate' };

  const owner = ctx.ownerEmail.trim();
  if (owner) {
    const sentToday = await ctx.store.countOwnerNotificationsSince(startOfUtcDay(ctx.now));
    if (sentToday < LIMITS.ownerEmailsPerDay) {
      const ok = await ctx.mailer.send(ownerEmailFor(owner, request)).catch(() => false);
      if (ok) await ctx.store.markOwnerNotified(id);
    }
  }
  return { status: 'ok' };
}

/** Salted SHA-256 of the visitor's IP address, hex. */
export async function hashVisitor(ip: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
