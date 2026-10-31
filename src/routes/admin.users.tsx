import { Trash, UserPlus } from "@phosphor-icons/react"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { btnDanger, btnPrimary, field, label, panel } from "../admin/ui"
import { admin, roles, type Member, type Role } from "../data"
import { useT } from "../i18n"

export const Route = createFileRoute("/admin/users")({
	// staff never see the tab; the API also refuses them
	beforeLoad: ({ context }) => {
		if (context.me.role !== "admin") throw redirect({ to: "/admin" })
	},
	loader: admin.users,
	component: Users,
})

function Users() {
	const a = useT().admin
	const list = Route.useLoaderData()
	const { me } = Route.useRouteContext()
	const router = useRouter()
	const [error, setError] = useState("")
	const [busy, setBusy] = useState("")
	const [form, setForm] = useState({ discordId: "", note: "", role: "staff" as Role })

	const run = async (key: string, fn: () => Promise<unknown>) => {
		setError("")
		setBusy(key)
		try {
			await fn()
			await router.invalidate()
			return true
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e))
			return false
		} finally {
			setBusy("")
		}
	}

	const add = async (e: React.FormEvent) => {
		e.preventDefault()
		if (await run("add", () => admin.addUser(form))) setForm({ discordId: "", note: "", role: "staff" })
	}

	const remove = (m: Member) => {
		if (confirm(a.confirmRemove(m.name ?? m.note ?? m.discordId))) run(m.discordId, () => admin.removeUser(m.discordId))
	}

	return (
		<div className="flex flex-col gap-4">
			<form onSubmit={add} className={`${panel} flex flex-wrap items-end gap-3`}>
				<label className={`${label} min-w-48 flex-1`}>
					{a.discordId}
					<input
						className={`${field} font-mono`}
						value={form.discordId}
						onChange={(e) => setForm({ ...form, discordId: e.target.value.trim() })}
						inputMode="numeric"
						pattern="\d{17,20}"
						required
					/>
				</label>
				<label className={`${label} min-w-48 flex-1`}>
					{a.note}
					<input className={field} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
				</label>
				<label className={label}>
					{a.role}
					<RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} />
				</label>
				<button type="submit" className={btnPrimary} disabled={busy === "add"}>
					<UserPlus />
					{a.addUser}
				</button>
				<p className="w-full text-sm text-navy/70">{a.roleHint}</p>
			</form>

			{error && <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}

			<ul className="flex flex-col gap-3">
				{list.map((m) => {
					const self = m.discordId === me.discordId
					return (
						<li key={m.discordId} className={`${panel} flex flex-wrap items-center gap-4 p-3`}>
							{m.image ? (
								<img src={m.image} alt="" className="size-12 shrink-0 rounded-full border-2 border-navy" />
							) : (
								<div className="size-12 shrink-0 rounded-full border-2 border-dashed border-navy/40" />
							)}
							<div className="min-w-0 flex-1">
								<p className="font-extrabold">
									{m.name ?? a.neverLoggedIn}
									{self && <span className="font-semibold text-navy/60"> ({a.you})</span>}
								</p>
								<p className="font-mono text-xs text-navy/60">{m.discordId}</p>
								{m.note && <p className="text-sm text-navy/70">{m.note}</p>}
							</div>
							<RoleSelect
								value={m.role}
								disabled={self || busy === m.discordId}
								onChange={(role) => run(m.discordId, () => admin.updateUser(m.discordId, { role }))}
							/>
							<button className={btnDanger} disabled={self || busy === m.discordId} onClick={() => remove(m)}>
								<Trash />
								{a.remove}
							</button>
						</li>
					)
				})}
			</ul>
		</div>
	)
}

function RoleSelect({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
	const a = useT().admin
	return (
		<select
			className={`${field} w-auto disabled:opacity-60`}
			value={value}
			disabled={disabled}
			onChange={(e) => onChange(e.target.value as Role)}>
			{roles.map((r) => (
				<option key={r} value={r}>
					{a.roles[r]}
				</option>
			))}
		</select>
	)
}
