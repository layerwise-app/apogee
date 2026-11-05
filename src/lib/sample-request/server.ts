import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { and, count, eq, gte, lt } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { db } from '~/db';
import { appSecrets, formAttempts, sampleRequests } from '~/db/schema';
import { siteConfig } from '~/site.config';
import type { Mailer, RequestStore } from './rules';
import { hashVisitor, submitSampleRequest } from './rules';

const SALT_NAME = 'visitor-hash-salt';

/** The salt is random per project, created on first use, and never leaves the server. */
async function getSalt() {
  const existing = await db.select({ value: appSecrets.value }).from(appSecrets).where(eq(appSecrets.name, SALT_NAME));
  if (existing[0]) return existing[0].value;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await db.insert(appSecrets).values({ name: SALT_NAME, value }).onConflictDoNothing();
  const row = await db.select({ value: appSecrets.value }).from(appSecrets).where(eq(appSecrets.name, SALT_NAME));
  return row[0].value;
}

const store: RequestStore = {
  async countAttemptsSince(visitorHash, since) {
    const [row] = await db
      .select({ n: count() })
      .from(formAttempts)
      .where(and(eq(formAttempts.visitorHash, visitorHash), gte(formAttempts.createdAt, since)));
    return row?.n ?? 0;
  },
  async recordAttempt(visitorHash, at) {
    await db.batch([
      db.insert(formAttempts).values({ visitorHash, createdAt: at }),
      // Fingerprints are only needed for an hour; keep a day at most.
      db.delete(formAttempts).where(lt(formAttempts.createdAt, new Date(at.getTime() - 86_400_000)))
    ]);
  },
  async emailExists(email) {
    const rows = await db.select({ id: sampleRequests.id }).from(sampleRequests).where(eq(sampleRequests.email, email));
    return rows.length > 0;
  },
  async insert(row) {
    const rows = await db
      .insert(sampleRequests)
      .values(row)
      .onConflictDoNothing({ target: sampleRequests.email })
      .returning({ id: sampleRequests.id });
    return rows[0]?.id ?? null;
  },
  async countOwnerNotificationsSince(since) {
    const [row] = await db
      .select({ n: count() })
      .from(sampleRequests)
      .where(and(eq(sampleRequests.ownerNotified, true), gte(sampleRequests.createdAt, since)));
    return row?.n ?? 0;
  },
  async markOwnerNotified(id) {
    await db.update(sampleRequests).set({ ownerNotified: true }).where(eq(sampleRequests.id, id));
  }
};

const mailer: Mailer = {
  async send(message) {
    const { error } = await env.EMAIL.send(message);
    if (error) console.warn(`[sample-request] owner email: ${error.code} ${error.message}`);
    return !error;
  }
};

function visitorIp() {
  return (
    getRequestHeader('cf-connecting-ip') ||
    getRequestHeader('x-real-ip') ||
    getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export const submitSampleRequestFn = createServerFn({ method: 'POST' })
  // Shape only; every rule is checked in submitSampleRequest.
  .validator((data: Record<string, string>) => data)
  .handler(async ({ data }) => {
    const visitorHash = await hashVisitor(visitorIp(), await getSalt());
    return submitSampleRequest(data, {
      visitorHash,
      now: new Date(),
      ownerEmail: siteConfig.ownerEmail,
      store,
      mailer
    });
  });
