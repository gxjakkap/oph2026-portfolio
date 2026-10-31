import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export const getDb = (env: Env) => drizzle(env.DB, { schema })

let auth: ReturnType<typeof create> | undefined
// one instance per isolate; env is fixed for the isolate's lifetime
export const getAuth = (env: Env) => (auth ??= create(env))

const create = (env: Env) =>
  betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(env), { provider: 'sqlite', schema }),
    socialProviders: {
      discord: { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET },
    },
    // signed cookie cache: most admin requests skip the session lookup in D1
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  })
