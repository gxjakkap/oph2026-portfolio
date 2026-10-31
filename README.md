# portfolio-oph

Portfolio showcase for CPE KMUTT Open House 2026 → portfolio.cpesu.com

One Cloudflare Worker (`oph2026-portfolio`) serves the React SPA and the Hono API at `/api/*`.
Data lives in D1, files in R2 (served from portfolio-files.cpesu.com). Admins log in with Discord at `/admin`.

## Local dev

```sh
bun install
cp .dev.vars.example .dev.vars            # add DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET
docker compose up -d                      # RustFS = local R2 (S3 API :9000, console :9001)
bun run db:migrate:local                  # local D1
bun run seed                              # optional: sample portfolios from Archive.zip (gitignored)
bun run dev                               # http://localhost:5173 (add --host for Tailscale)
```

The Discord app needs the redirect `http://localhost:5173/api/auth/callback/discord`
(and `https://portfolio.cpesu.com/api/auth/callback/discord` for prod).

### Admin access

Log in at `/admin`. If you're not on the allowlist, the page shows your Discord ID. Add it:

```sh
bunx wrangler d1 execute oph2026-portfolio --local  --command "INSERT INTO admins (discord_id, note) VALUES ('<id>', '<who>')"
bunx wrangler d1 execute oph2026-portfolio --remote --command "INSERT INTO admins (discord_id, note) VALUES ('<id>', '<who>')"
```

## Schema changes

Edit `worker/schema.ts`, then `bun run db:generate` and apply with
`wrangler d1 migrations apply oph2026-portfolio --local` / `--remote`.

## Uploads

The browser renders the cover from page 1 and uploads the PDF and cover straight to R2 (RustFS locally)
through presigned URLs from the API. PDFs are capped at 25 MB; compress bigger ones first.

## Deploy

Workers Builds (git integration): build command `bun run build`, deploy command `bunx wrangler deploy`.
Secrets: `wrangler secret put` for `BETTER_AUTH_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (an R2 API token scoped to the bucket).
