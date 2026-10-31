// shared by the Worker (worker/) and the SPA (src/); no runtime imports here

export const programs = ["regular", "inter", "hds"] as const
export type Program = (typeof programs)[number]
export const MAX_PDF_BYTES = 25 * 1024 * 1024

export const roles = ["staff", "admin"] as const
export type Role = (typeof roles)[number] // staff: manage portfolios; admin: staff + manage users

// an allowlisted Discord account; name/image appear once they've logged in at least once
export type Member = { discordId: string; note: string | null; role: Role; name: string | null; image: string | null }

export type Application = { program: Program; round: 1 | 2; project: string }

export type Portfolio = {
	id: string
	slug: string
	nickname: string
	year: number // TCAS year, e.g. 68
	achievements: string[]
	published: boolean
	fileVersion: string | null
	createdAt: string
	updatedAt: string
	applications: Application[]
	pdf: string | null
	cover: string | null
}

export type AuditEntry = {
	id: number
	at: string
	actor: string
	actorDiscordId: string
	action: "create" | "update" | "publish" | "unpublish" | "upload" | "delete"
	portfolioId: string
	slug: string
	snapshot: Portfolio | null
}
