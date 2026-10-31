import { Button } from "@heroui/react"
import { DiscordLogo, SignOut } from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"

import mascotLook from "../assets/mascot-look.webp"
import { authClient } from "../auth"
import { useT } from "../i18n"

// outside the /admin layout (trailing underscore), so it isn't behind the admin guard
export const Route = createFileRoute("/admin_/login")({
	validateSearch: (s: Record<string, unknown>): { forbidden?: string } =>
		typeof s.forbidden === "string" ? { forbidden: s.forbidden } : {},
	component: Login,
})

function Login() {
	const t = useT().admin
	const { forbidden } = Route.useSearch()
	return (
		<div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4 rounded-3xl border-3 border-navy bg-cream p-8 text-center text-navy shadow-[5px_5px_0_var(--color-navy)]">
			<img src={mascotLook} alt="" className="w-28" />
			<h1 className="text-2xl font-extrabold">{t.title}</h1>
			{forbidden === undefined ? (
				<>
					<p className="text-navy/70">{t.loginHint}</p>
					<Button
						onPress={() => authClient.signIn.social({ provider: "discord", callbackURL: "/admin" })}
						className="rounded-full border-3 border-navy bg-plum px-6 font-extrabold text-cream shadow-[3px_3px_0_var(--color-navy)]">
						<DiscordLogo size="1.4em" />
						{t.login}
					</Button>
				</>
			) : (
				<>
					<p className="font-semibold">{t.forbidden}</p>
					<p className="text-sm text-navy/70">{t.forbiddenHint}</p>
					<code className="rounded-lg bg-navy px-3 py-1 font-mono text-cream select-all">{forbidden || "—"}</code>
					<Button
						onPress={() => authClient.signOut().then(() => location.assign("/admin/login"))}
						className="rounded-full border-3 border-navy bg-cream font-bold text-navy">
						<SignOut />
						{t.signOut}
					</Button>
				</>
			)}
		</div>
	)
}
