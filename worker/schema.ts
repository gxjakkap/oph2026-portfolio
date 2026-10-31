import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const now = sql`(unixepoch() * 1000)`
const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID())
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(now).$onUpdate(() => new Date()),
}

export const portfolios = sqliteTable('portfolios', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull().default(''),
  nickname: text('nickname').notNull().default(''),
  year: integer('year').notNull().default(68), // TCAS year
  school: text('school').notNull().default(''),
  achievements: text('achievements', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  // R2 keys are {id}/{fileVersion}/portfolio.pdf|cover.webp; a new version busts the CDN cache. null = no files yet
  fileVersion: text('file_version'),
  ...timestamps,
})

export const applications = sqliteTable(
  'applications',
  {
    id: id(),
    portfolioId: text('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
    program: text('program', { enum: ['regular', 'inter', 'hds'] }).notNull(),
    round: integer('round').$type<1 | 2>().notNull(),
    project: text('project').notNull(),
  },
  (t) => [index('applications_portfolio_idx').on(t.portfolioId)],
)

// Discord user ids allowed into /admin. No UI: `wrangler d1 execute` (see README)
export const admins = sqliteTable('admins', {
  discordId: text('discord_id').primaryKey(),
  note: text('note'),
})

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  at: integer('at', { mode: 'timestamp_ms' }).notNull().default(now),
  actor: text('actor').notNull(), // Discord display name at the time
  actorDiscordId: text('actor_discord_id').notNull(),
  action: text('action', { enum: ['create', 'update', 'publish', 'unpublish', 'upload', 'delete'] }).notNull(),
  portfolioId: text('portfolio_id').notNull(),
  slug: text('slug').notNull(),
  snapshot: text('snapshot', { mode: 'json' }), // the record after the change (before, for delete)
})

// better-auth core tables (from better-auth/db getAuthTables)
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(), // the Discord user id for providerId 'discord'
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})
