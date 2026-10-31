import { and, count, desc, eq, inArray } from "drizzle-orm"
import { Hono } from "hono"
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"

import { MAX_PDF_BYTES, programs, roles, type Application, type Role } from "../shared/types"
import { getAuth, getDb } from "./auth"
import { fileKeys, s3 } from "./s3"
import { account, admins, applications, auditLog, portfolios, user } from "./schema"

const MAX_COVER_BYTES = 2 * 1024 * 1024
type Actor = { name: string; discordId: string; role: Role }
type Db = ReturnType<typeof getDb>

// ---- validation (admin input is still untrusted input) ----

const bad = (msg: string) => new HTTPException(400, { message: msg })
const str = (v: unknown, field: string, max = 200) => {
	if (typeof v !== "string" || v.length > max) throw bad(`${field}: expected text up to ${max} chars`)
	return v.trim()
}
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const slugOf = (v: unknown) => {
	const s = str(v, "slug", 80)
	if (!SLUG.test(s)) throw bad("slug: use a-z, 0-9 and single dashes")
	return s
}

function parseFields(b: Record<string, unknown>) {
	const out: Partial<typeof portfolios.$inferInsert> = {}
	if ("slug" in b) out.slug = slugOf(b.slug)
	if ("name" in b) out.name = str(b.name, "name")
	if ("nickname" in b) out.nickname = str(b.nickname, "nickname")
	if ("school" in b) out.school = str(b.school, "school")
	if ("year" in b) {
		if (!Number.isInteger(b.year) || (b.year as number) < 50 || (b.year as number) > 99)
			throw bad("year: TCAS year, e.g. 68")
		out.year = b.year as number
	}
	if ("achievements" in b) {
		if (!Array.isArray(b.achievements) || b.achievements.length > 50) throw bad("achievements: expected a list")
		out.achievements = b.achievements.map((a) => str(a, "achievement", 300)).filter(Boolean)
	}
	if ("published" in b) {
		if (typeof b.published !== "boolean") throw bad("published: expected true/false")
		out.published = b.published
	}
	return out
}

function parseApplications(v: unknown): Application[] {
	if (!Array.isArray(v) || v.length > 10) throw bad("applications: expected a list")
	return v.map((a) => {
		if (!programs.includes(a?.program)) throw bad("application program: regular, inter or hds")
		if (a.round !== 1 && a.round !== 2) throw bad("application round: 1 or 2")
		const project = str(a.project, "project", 100)
		if (!project) throw bad("application project is required")
		return { program: a.program, round: a.round, project }
	})
}

// ---- reads ----

async function load(db: Db, where?: ReturnType<typeof eq>) {
	const rows = await db.select().from(portfolios).where(where).orderBy(desc(portfolios.updatedAt))
	const apps = rows.length
		? await db
				.select()
				.from(applications)
				.where(
					inArray(
						applications.portfolioId,
						rows.map((r) => r.id)
					)
				)
		: []
	return rows.map((r) => ({
		...r,
		applications: apps
			.filter((a) => a.portfolioId === r.id)
			.map(({ program, round, project }) => ({ program, round, project })),
	}))
}

type Row = Awaited<ReturnType<typeof load>>[number]

const withUrls = (env: Env, p: Row) => {
	const keys = p.fileVersion ? fileKeys(p.id, p.fileVersion) : null
	return {
		...p,
		pdf: keys && `${env.FILES_URL}/${keys.pdf}`,
		cover: keys && `${env.FILES_URL}/${keys.cover}`,
	}
}

async function one(db: Db, id: string) {
	const [p] = await load(db, eq(portfolios.id, id))
	if (!p) throw new HTTPException(404, { message: "portfolio not found" })
	return p
}

// slug from a filename or name: "reg_Thamonnut_goodstudent" -> "reg-thamonnut-goodstudent"; unique-ified with -2, -3...
async function freeSlug(db: Db, wanted: string) {
	const base =
		wanted
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 70) || "portfolio"
	const taken = new Set((await db.select({ s: portfolios.slug }).from(portfolios)).map((r) => r.s))
	let slug = base
	for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`
	return slug
}

const audit = (
	db: Db,
	actor: Actor,
	action: typeof auditLog.$inferInsert.action,
	p: { id: string; slug: string },
	snapshot: unknown
) =>
	db
		.insert(auditLog)
		.values({ actor: actor.name, actorDiscordId: actor.discordId, action, portfolioId: p.id, slug: p.slug, snapshot })

// ---- auth ----

type AdminEnv = { Bindings: Env; Variables: { actor: Actor } }

// any allowlisted role (staff or admin)
const requireStaff = createMiddleware<AdminEnv>(async (c, next) => {
	const s = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers })
	if (!s) return c.json({ error: "unauthenticated" }, 401)
	const db = getDb(c.env)
	const acc = await db
		.select({ discordId: account.accountId })
		.from(account)
		.where(and(eq(account.userId, s.user.id), eq(account.providerId, "discord")))
		.get()
	const allowed = acc && (await db.select().from(admins).where(eq(admins.discordId, acc.discordId)).get())
	// the Discord id is returned so a new admin can hand it to someone who can add them
	if (!allowed) return c.json({ error: "forbidden", discordId: acc?.discordId ?? null }, 403)
	c.set("actor", { name: s.user.name, discordId: acc.discordId, role: allowed.role })
	await next()
})

const requireAdmin = createMiddleware<AdminEnv>(async (c, next) => {
	if (c.get("actor").role !== "admin") return c.json({ error: "admins only" }, 403)
	await next()
})

// ---- users (the allowlist) ----

const DISCORD_ID = /^\d{17,20}$/
const roleOf = (v: unknown) => {
	if (!roles.includes(v as Role)) throw bad("role: staff or admin")
	return v as Role
}
const noteOf = (v: unknown) => (v == null ? null : str(v, "note", 100) || null)

async function adminCount(db: Db) {
	return (await db.select({ n: count() }).from(admins).where(eq(admins.role, "admin")).get())?.n ?? 0
}

async function member(db: Db, discordId: string) {
	const m = await db.select().from(admins).where(eq(admins.discordId, discordId)).get()
	if (!m) throw new HTTPException(404, { message: "user not found" })
	return m
}

const usersApi = new Hono<AdminEnv>()
	.use(requireAdmin)
	// allowlist + Discord name/avatar for anyone who has logged in
	.get("/", async (c) =>
		c.json(
			await getDb(c.env)
				.select({
					discordId: admins.discordId,
					note: admins.note,
					role: admins.role,
					name: user.name,
					image: user.image,
				})
				.from(admins)
				.leftJoin(account, and(eq(account.accountId, admins.discordId), eq(account.providerId, "discord")))
				.leftJoin(user, eq(user.id, account.userId))
				.orderBy(admins.role, admins.discordId)
		)
	)
	.post("/", async (c) => {
		const db = getDb(c.env)
		const b = await c.req.json<Record<string, unknown>>()
		const discordId = str(b.discordId, "discordId", 20)
		if (!DISCORD_ID.test(discordId)) throw bad("discordId: a Discord user id is 17-20 digits")
		if (await db.select().from(admins).where(eq(admins.discordId, discordId)).get()) throw bad("already on the list")
		await db.insert(admins).values({ discordId, note: noteOf(b.note), role: roleOf(b.role ?? "staff") })
		return c.json(await member(db, discordId), 201)
	})
	.patch("/:discordId", async (c) => {
		const db = getDb(c.env)
		const m = await member(db, c.req.param("discordId"))
		const b = await c.req.json<Record<string, unknown>>()
		const patch: Partial<typeof admins.$inferInsert> = {}
		if ("note" in b) patch.note = noteOf(b.note)
		if ("role" in b) {
			patch.role = roleOf(b.role)
			// nobody can lock themselves (or everyone) out
			if (patch.role !== m.role && m.discordId === c.get("actor").discordId) throw bad("you can't change your own role")
			if (m.role === "admin" && patch.role === "staff" && (await adminCount(db)) <= 1)
				throw bad("keep at least one admin")
		}
		if (Object.keys(patch).length) await db.update(admins).set(patch).where(eq(admins.discordId, m.discordId))
		return c.json(await member(db, m.discordId))
	})
	.delete("/:discordId", async (c) => {
		const db = getDb(c.env)
		const m = await member(db, c.req.param("discordId"))
		if (m.discordId === c.get("actor").discordId) throw bad("you can't remove yourself")
		if (m.role === "admin" && (await adminCount(db)) <= 1) throw bad("keep at least one admin")
		// existing sessions stop working on their next request: every admin request re-checks the allowlist
		await db.delete(admins).where(eq(admins.discordId, m.discordId))
		return c.body(null, 204)
	})

// ---- routes ----

const adminApi = new Hono<AdminEnv>()
	.use(requireStaff)
	.route("/users", usersApi)
	.get("/me", (c) => c.json(c.get("actor")))
	.get("/portfolios", async (c) => c.json((await load(getDb(c.env))).map((p) => withUrls(c.env, p))))
	.post("/portfolios", async (c) => {
		const db = getDb(c.env)
		const b = await c.req.json<Record<string, unknown>>()
		const fields = parseFields({ ...b, published: false })
		const apps = "applications" in b ? parseApplications(b.applications) : []
		// bulk upload sends a filename; the form sends a slug it already checked
		fields.slug = await freeSlug(db, typeof b.slug === "string" ? b.slug : str(b.filename ?? "portfolio", "filename"))
		const [row] = await db
			.insert(portfolios)
			.values({ ...fields, slug: fields.slug })
			.returning()
		if (apps.length) await db.insert(applications).values(apps.map((a) => ({ ...a, portfolioId: row.id })))
		const p = await one(db, row.id)
		await audit(db, c.get("actor"), "create", p, p)
		return c.json(withUrls(c.env, p), 201)
	})
	.patch("/portfolios/:id", async (c) => {
		const db = getDb(c.env)
		const before = await one(db, c.req.param("id"))
		const b = await c.req.json<Record<string, unknown>>()
		const fields = parseFields(b)
		const apps = "applications" in b ? parseApplications(b.applications) : null
		if (fields.slug && fields.slug !== before.slug) {
			const clash = await db.select().from(portfolios).where(eq(portfolios.slug, fields.slug)).get()
			if (clash) throw bad("slug: already used by another portfolio")
		}
		if (fields.published && !before.published) {
			if (!before.fileVersion) throw bad("upload a PDF before publishing")
			if (!(apps ?? before.applications).length) throw bad("add at least one application before publishing")
		}
		// D1 has no interactive transactions; batch runs these atomically
		await db.batch([
			db
				.update(portfolios)
				.set({ ...fields, updatedAt: new Date() })
				.where(eq(portfolios.id, before.id)),
			...(apps
				? [
						db.delete(applications).where(eq(applications.portfolioId, before.id)),
						...apps.map((a) => db.insert(applications).values({ ...a, portfolioId: before.id })),
					]
				: []),
		])
		const p = await one(db, before.id)
		const onlyToggle = Object.keys(b).length === 1 && "published" in b
		await audit(db, c.get("actor"), onlyToggle ? (p.published ? "publish" : "unpublish") : "update", p, p)
		return c.json(withUrls(c.env, p))
	})
	.delete("/portfolios/:id", async (c) => {
		const db = getDb(c.env)
		const p = await one(db, c.req.param("id"))
		await db.delete(portfolios).where(eq(portfolios.id, p.id))
		if (p.fileVersion) {
			const keys = fileKeys(p.id, p.fileVersion)
			await Promise.all([s3(c.env).delete(keys.pdf), s3(c.env).delete(keys.cover)])
		}
		await audit(db, c.get("actor"), "delete", p, p)
		return c.body(null, 204)
	})
	// step 1 of an upload: presigned PUT urls for a new file version
	.post("/portfolios/:id/upload", async (c) => {
		const p = await one(getDb(c.env), c.req.param("id"))
		const { pdfSize, coverSize, coverType } = await c.req.json<{
			pdfSize: number
			coverSize: number
			coverType: string
		}>()
		if (!Number.isInteger(pdfSize) || pdfSize <= 0 || pdfSize > MAX_PDF_BYTES) throw bad("pdf: over the 25 MB limit")
		if (!Number.isInteger(coverSize) || coverSize <= 0 || coverSize > MAX_COVER_BYTES) throw bad("cover: too large")
		if (coverType !== "image/webp" && coverType !== "image/jpeg") throw bad("cover: webp or jpeg")
		const version = Date.now().toString(36)
		const keys = fileKeys(p.id, version)
		const store = s3(c.env)
		return c.json({
			version,
			pdf: await store.presignPut(keys.pdf, "application/pdf", pdfSize),
			cover: await store.presignPut(keys.cover, coverType, coverSize),
		})
	})
	// step 2: the browser has PUT both files; verify them and switch the portfolio over
	.post("/portfolios/:id/files", async (c) => {
		const db = getDb(c.env)
		const p = await one(db, c.req.param("id"))
		const { version } = await c.req.json<{ version: string }>()
		if (!/^[a-z0-9]{6,12}$/.test(version ?? "")) throw bad("bad version")
		const store = s3(c.env)
		const keys = fileKeys(p.id, version)
		const [pdf, cover] = await Promise.all([store.head(keys.pdf), store.head(keys.cover)])
		const size = Number(pdf.headers.get("content-length"))
		if (!pdf.ok || !cover.ok || size > MAX_PDF_BYTES) {
			await Promise.all([store.delete(keys.pdf), store.delete(keys.cover)])
			throw bad("upload incomplete or too large; try again")
		}
		await db.update(portfolios).set({ fileVersion: version, updatedAt: new Date() }).where(eq(portfolios.id, p.id))
		if (p.fileVersion) {
			const old = fileKeys(p.id, p.fileVersion)
			await Promise.all([store.delete(old.pdf), store.delete(old.cover)])
		}
		const after = await one(db, p.id)
		await audit(db, c.get("actor"), "upload", after, after)
		return c.json(withUrls(c.env, after))
	})
	.get("/audit", async (c) => c.json(await getDb(c.env).select().from(auditLog).orderBy(desc(auditLog.id)).limit(300)))

const app = new Hono<{ Bindings: Env }>()
	.basePath("/api")
	.on(["GET", "POST"], "/auth/*", (c) => getAuth(c.env).handler(c.req.raw))
	.get("/portfolios", async (c) => {
		const rows = await load(getDb(c.env), eq(portfolios.published, true))
		return c.json(rows.filter((p) => p.fileVersion).map((p) => withUrls(c.env, p)))
	})
	.route("/admin", adminApi)

app.onError((err, c) => {
	if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
	console.error(err)
	return c.json({ error: "internal error" }, 500)
})

export default app
