import type { AuditEntry, Portfolio, Program } from '../shared/types'

export { MAX_PDF_BYTES, programs } from '../shared/types'
export type { Application, AuditEntry, Portfolio, Program } from '../shared/types'

// program colour coding, shared by the grid chips and the detail panels
export const programColor: Record<Program, string> = {
  regular: 'bg-plum text-cream',
  inter: 'bg-teal text-navy',
  hds: 'bg-sun text-navy',
}

export class ApiError extends Error {
  status: number
  body: Record<string, unknown>
  constructor(status: number, message: string, body: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.json === undefined ? init?.headers : { 'content-type': 'application/json', ...init?.headers },
    body: init?.json === undefined ? init?.body : JSON.stringify(init.json),
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? res.statusText, body)
  return body as T
}

// public list, fetched once per page load and shared by the grid and the viewer
let published: Promise<Portfolio[]> | undefined
export const getPublished = () => (published ??= api<Portfolio[]>('/portfolios').catch((e) => ((published = undefined), Promise.reject(e))))

export const admin = {
  me: () => api<{ name: string; discordId: string }>('/admin/me'),
  list: () => api<Portfolio[]>('/admin/portfolios'),
  create: (body: Partial<Portfolio> & { filename?: string }) => api<Portfolio>('/admin/portfolios', { method: 'POST', json: body }),
  update: (id: string, body: Partial<Portfolio>) => api<Portfolio>(`/admin/portfolios/${id}`, { method: 'PATCH', json: body }),
  remove: (id: string) => api<void>(`/admin/portfolios/${id}`, { method: 'DELETE' }),
  audit: () => api<AuditEntry[]>('/admin/audit'),
}
