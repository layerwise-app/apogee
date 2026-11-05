import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// This site has no accounts, so it has no Better Auth tables. After changing
// a table, run `pnpm run db:generate --name <what_changed>` and
// `pnpm run db:migrate`. Migrations are applied to the production D1 database
// when the app is published.

/**
 * "Request sample imagery" form submissions. They show up in the project's
 * Database panel in Layerwise. One row per work email.
 */
export const sampleRequests = sqliteTable(
  'sample_requests',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** Lowercased and trimmed, so the same address can't be added twice. */
    email: text('email').notNull().unique(),
    organization: text('organization').notNull(),
    areaOfInterest: text('area_of_interest').notNull(),
    useCase: text('use_case').notNull(),
    /** True when the owner was emailed about this request. */
    ownerNotified: integer('owner_notified', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
  },
  (table) => [index('sample_requests_created_at_idx').on(table.createdAt)]
);

/**
 * One row per accepted form attempt, used for the 5-per-hour limit. Visitors
 * are identified by a salted SHA-256 of their IP address; raw IP addresses are
 * never stored. Rows older than a day are deleted as new ones arrive.
 */
export const formAttempts = sqliteTable(
  'form_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    visitorHash: text('visitor_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [
    index('form_attempts_visitor_created_idx').on(
      table.visitorHash,
      table.createdAt
    )
  ]
);

/** Server-only values generated on first use, like the visitor hash salt. */
export const appSecrets = sqliteTable('app_secrets', {
  name: text('name').primaryKey(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
});
