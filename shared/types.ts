// shared by the Worker (worker/) and the SPA (src/); no runtime imports here

export const programs = ["regular", "inter", "hds"] as const
export type Program = (typeof programs)[number]
export const MAX_PDF_BYTES = 25 * 1024 * 1024

export type Application = { program: Program; round: 1 | 2; project: string }

export type Portfolio = {
	id: string
	slug: string
	name: string
	nickname: string
	year: number // TCAS year, e.g. 68
	school: string
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
