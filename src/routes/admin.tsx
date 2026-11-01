import { ClockCounterClockwise, CloudArrowUp, FolderOpen, SignOut, Users } from "@phosphor-icons/react"
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"

import { authClient } from "../auth"
import { admin, ApiError } from "../data"
import { useT } from "../i18n"

declare const __BUILD__: { sha: string; message: string; date: string }

export const Route = createFileRoute("/admin")({
	// every /admin page needs an allowlisted Discord login; the API enforces the same check
	beforeLoad: async () => {
		try {
			return { me: await admin.me() }
		} catch (e) {
			if (e instanceof ApiError && e.status === 401) throw redirect({ to: "/admin/login" })
			if (e instanceof ApiError && e.status === 403)
				throw redirect({ to: "/admin/login", search: { forbidden: String(e.body.discordId ?? "") } })
			throw e
		}
	},
	component: AdminLayout,
})

const tab =
	"inline-flex items-center gap-1.5 rounded-full border-2 border-navy bg-cream px-3 py-1 text-sm font-bold text-navy data-[status=active]:bg-plum data-[status=active]:text-cream"

function AdminLayout() {
	const { admin: t, locale } = useT()
	const { me } = Route.useRouteContext()
	return (
		<>
			<nav className="mb-6 flex flex-wrap items-center gap-2 rounded-3xl border-3 border-navy bg-cream p-3 shadow-[5px_5px_0_var(--color-navy)]">
				<span className="mr-2 font-extrabold text-navy">{t.title}</span>
				<Link to="/admin" activeOptions={{ exact: true }} className={tab}>
					<FolderOpen />
					{t.portfolios}
				</Link>
				<Link to="/admin/upload" className={tab}>
					<CloudArrowUp />
					{t.bulk}
				</Link>
				<Link to="/admin/audit" className={tab}>
					<ClockCounterClockwise />
					{t.audit}
				</Link>
				{me.role === "admin" && (
					<Link to="/admin/users" className={tab}>
						<Users />
						{t.users}
					</Link>
				)}
				<span className="ml-auto text-sm text-navy/70">
					{me.name} [{t.roles[me.role]}]
				</span>
				<button
					onClick={() => authClient.signOut().then(() => location.assign("/admin/login"))}
					className="inline-flex items-center gap-1 text-sm font-semibold text-lilac hover:underline">
					<SignOut />
					{t.signOut}
				</button>
			</nav>
			<Outlet />
			<footer className="mt-6 text-center font-mono text-xs text-cream/70">
				{__BUILD__.sha} · {new Date(__BUILD__.date).toLocaleString(locale)} · {__BUILD__.message}
			</footer>
		</>
	)
}
