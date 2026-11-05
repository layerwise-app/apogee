import { beforeEach, describe, expect, it } from 'vitest';
import type { Mailer, OwnerEmail, RequestStore, SampleRequest } from './rules';
import { LIMITS, hashVisitor, normalize, submitSampleRequest, validate } from './rules';

type Row = SampleRequest & { id: string; createdAt: Date; ownerNotified: boolean };

function memoryStore() {
  const rows: Row[] = [];
  const attempts: { visitorHash: string; at: Date }[] = [];
  const store: RequestStore = {
    async countAttemptsSince(h, since) {
      return attempts.filter((a) => a.visitorHash === h && a.at >= since).length;
    },
    async recordAttempt(h, at) {
      attempts.push({ visitorHash: h, at });
    },
    async emailExists(email) {
      return rows.some((r) => r.email === email);
    },
    async insert(row) {
      if (rows.some((r) => r.email === row.email)) return null;
      const id = `id-${rows.length + 1}`;
      rows.push({ ...row, id, ownerNotified: false });
      return id;
    },
    async countOwnerNotificationsSince(since) {
      return rows.filter((r) => r.ownerNotified && r.createdAt >= since).length;
    },
    async markOwnerNotified(id) {
      const r = rows.find((x) => x.id === id);
      if (r) r.ownerNotified = true;
    }
  };
  return { store, rows, attempts };
}

function memoryMailer(ok = true) {
  const sent: OwnerEmail[] = [];
  const mailer: Mailer = {
    async send(m) {
      sent.push(m);
      return ok;
    }
  };
  return { mailer, sent };
}

const valid = {
  email: 'Ada@Halden-Re.example',
  organization: 'Halden Re',
  areaOfInterest: 'Port of Durban',
  useCase: 'insurance',
  website: ''
};

const NOW = new Date('2026-11-05T10:00:00Z');

describe('validation', () => {
  it('accepts a complete request and normalizes it', () => {
    const n = normalize({ ...valid, organization: '  Halden   Re ' });
    expect(n.email).toBe('ada@halden-re.example');
    expect(n.organization).toBe('Halden Re');
    expect(validate(n)).toEqual({});
  });

  it('requires every field', () => {
    const errors = validate(normalize({}));
    expect(Object.keys(errors).sort()).toEqual(['areaOfInterest', 'email', 'organization', 'useCase']);
  });

  it('rejects malformed email addresses', () => {
    for (const email of ['ada', 'ada@', 'ada@host', 'a b@c.de', '@x.io']) {
      expect(validate(normalize({ ...valid, email })).email, email).toBeDefined();
    }
  });

  it('limits area of interest to 120 characters', () => {
    expect(validate(normalize({ ...valid, areaOfInterest: 'x'.repeat(120) })).areaOfInterest).toBeUndefined();
    expect(validate(normalize({ ...valid, areaOfInterest: 'x'.repeat(121) })).areaOfInterest).toBeDefined();
  });

  it('only accepts the listed use cases', () => {
    for (const useCase of ['insurance', 'agriculture', 'maritime', 'disaster-response', 'government', 'other']) {
      expect(validate(normalize({ ...valid, useCase })).useCase).toBeUndefined();
    }
    expect(validate(normalize({ ...valid, useCase: 'mining' })).useCase).toBeDefined();
  });

  it('ignores non-string input safely', () => {
    expect(normalize({ email: 42, organization: { x: 1 } }).email).toBe('');
    expect(normalize(null).organization).toBe('');
  });
});

describe('submission', () => {
  let s: ReturnType<typeof memoryStore>;
  let m: ReturnType<typeof memoryMailer>;
  const ctx = (over: Partial<Parameters<typeof submitSampleRequest>[1]> = {}) => ({
    visitorHash: 'visitor-a',
    now: NOW,
    ownerEmail: '',
    store: s.store,
    mailer: m.mailer,
    ...over
  });

  beforeEach(() => {
    s = memoryStore();
    m = memoryMailer();
  });

  it('saves a valid request', async () => {
    expect(await submitSampleRequest(valid, ctx())).toEqual({ status: 'ok' });
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].email).toBe('ada@halden-re.example');
  });

  it('returns field errors and saves nothing for invalid input', async () => {
    const res = await submitSampleRequest({ ...valid, email: 'nope' }, ctx());
    expect(res.status).toBe('invalid');
    expect(s.rows).toHaveLength(0);
    expect(s.attempts).toHaveLength(0);
  });

  it('says "already on the list" for the same email and adds no row', async () => {
    await submitSampleRequest(valid, ctx());
    const res = await submitSampleRequest({ ...valid, email: ' ADA@halden-re.example ', organization: 'Other' }, ctx());
    expect(res).toEqual({ status: 'duplicate' });
    expect(s.rows).toHaveLength(1);
  });

  it('treats a filled honeypot as success but stores nothing', async () => {
    const res = await submitSampleRequest({ ...valid, website: 'https://spam.example' }, ctx({ ownerEmail: 'owner@apogee.example' }));
    expect(res).toEqual({ status: 'ok' });
    expect(s.rows).toHaveLength(0);
    expect(m.sent).toHaveLength(0);
  });

  it('allows five submissions per visitor per hour, then rate-limits', async () => {
    for (let i = 0; i < LIMITS.perVisitorPerHour; i++) {
      const res = await submitSampleRequest({ ...valid, email: `user${i}@example.com` }, ctx());
      expect(res.status).toBe('ok');
    }
    const res = await submitSampleRequest({ ...valid, email: 'sixth@example.com' }, ctx());
    expect(res).toEqual({ status: 'rate_limited' });
    expect(s.rows).toHaveLength(5);
  });

  it('counts duplicates toward the limit', async () => {
    for (let i = 0; i < 5; i++) await submitSampleRequest(valid, ctx());
    expect((await submitSampleRequest({ ...valid, email: 'new@example.com' }, ctx())).status).toBe('rate_limited');
  });

  it('limits each visitor separately', async () => {
    for (let i = 0; i < 5; i++) await submitSampleRequest({ ...valid, email: `a${i}@example.com` }, ctx());
    const res = await submitSampleRequest({ ...valid, email: 'b@example.com' }, ctx({ visitorHash: 'visitor-b' }));
    expect(res.status).toBe('ok');
  });

  it('lets a visitor submit again after an hour', async () => {
    for (let i = 0; i < 5; i++) await submitSampleRequest({ ...valid, email: `a${i}@example.com` }, ctx());
    const later = new Date(NOW.getTime() + 3_600_001);
    expect((await submitSampleRequest({ ...valid, email: 'late@example.com' }, ctx({ now: later }))).status).toBe('ok');
  });

  it('sends no email when ownerEmail is empty', async () => {
    await submitSampleRequest(valid, ctx());
    expect(m.sent).toHaveLength(0);
  });

  it('emails only the owner, never the visitor', async () => {
    await submitSampleRequest(valid, ctx({ ownerEmail: 'owner@apogee.example' }));
    expect(m.sent).toHaveLength(1);
    expect(m.sent[0].to).toBe('owner@apogee.example');
    for (const msg of m.sent) expect(msg.to).not.toContain('halden-re');
    expect(m.sent[0].text).toContain('ada@halden-re.example');
    expect(s.rows[0].ownerNotified).toBe(true);
  });

  it('escapes what visitors typed in the owner email html', async () => {
    await submitSampleRequest({ ...valid, organization: '<b>Evil</b>' }, ctx({ ownerEmail: 'owner@apogee.example' }));
    expect(m.sent[0].html).not.toContain('<b>Evil</b>');
    expect(m.sent[0].html).toContain('&#60;b&#62;Evil');
  });

  it('stops emailing after 100 notifications in a day but keeps saving', async () => {
    for (let i = 0; i < LIMITS.ownerEmailsPerDay + 3; i++) {
      const res = await submitSampleRequest(
        { ...valid, email: `u${i}@example.com` },
        ctx({ ownerEmail: 'owner@apogee.example', visitorHash: `v${i}` })
      );
      expect(res.status).toBe('ok');
    }
    expect(m.sent).toHaveLength(LIMITS.ownerEmailsPerDay);
    expect(s.rows).toHaveLength(LIMITS.ownerEmailsPerDay + 3);
    expect(s.rows.filter((r) => r.ownerNotified)).toHaveLength(LIMITS.ownerEmailsPerDay);
  });

  it('starts a fresh email allowance each UTC day', async () => {
    for (let i = 0; i < LIMITS.ownerEmailsPerDay; i++) {
      await submitSampleRequest({ ...valid, email: `d1-${i}@example.com` }, ctx({ ownerEmail: 'o@apogee.example', visitorHash: `v${i}` }));
    }
    const tomorrow = new Date('2026-11-06T00:00:01Z');
    await submitSampleRequest({ ...valid, email: 'd2@example.com' }, ctx({ ownerEmail: 'o@apogee.example', now: tomorrow }));
    expect(m.sent).toHaveLength(LIMITS.ownerEmailsPerDay + 1);
  });

  it('still saves the request when the email fails', async () => {
    const failing = memoryMailer(false);
    const res = await submitSampleRequest(valid, ctx({ ownerEmail: 'owner@apogee.example', mailer: failing.mailer }));
    expect(res.status).toBe('ok');
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].ownerNotified).toBe(false);
  });
});

describe('visitor hashing', () => {
  it('never contains the IP and depends on the salt', async () => {
    const a = await hashVisitor('203.0.113.7', 'salt-1');
    const b = await hashVisitor('203.0.113.7', 'salt-2');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('203');
    expect(a).not.toBe(b);
    expect(await hashVisitor('203.0.113.7', 'salt-1')).toBe(a);
  });
});
