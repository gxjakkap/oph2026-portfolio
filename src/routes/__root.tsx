import { Button } from "@heroui/react"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"

import logos from "../assets/logos.webp"
import mascotAbove from "../assets/mascot-above.webp"
import title from "../assets/title.webp"
import { toggleLang, useT } from "../i18n"

export const Route = createRootRoute({
	component: Root,
	notFoundComponent: NotFound,
})

function Root() {
	const t = useT()
	return (
		<>
			<header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pt-4">
				<Link to="/" search={{}}>
					<img src={title} alt="CPE Open House 2026" className="h-20 w-auto sm:h-28" />
				</Link>
				<div className="flex items-center gap-3">
					<img
						src={logos}
						alt="KMUTT · CPE · KMUTT Engineering Open House"
						className="hidden h-12 w-auto rounded-xl md:block"
					/>
					<Button
						onPress={toggleLang}
						className="rounded-full border-3 border-navy bg-sun font-extrabold text-navy shadow-[3px_3px_0_var(--color-navy)]">
						{t.switchTo}
					</Button>
				</div>
			</header>
			<main className="mx-auto max-w-7xl px-4 pt-4 pb-16">
				<Outlet />
			</main>
		</>
	)
}

function NotFound() {
	const t = useT()
	return (
		<div className="flex flex-col items-center gap-4 py-16 text-center text-cream">
			<img src={mascotAbove} alt="" className="w-40" />
			<p className="text-2xl font-extrabold">{t.notFound}</p>
			<Link to="/" search={{}} className="font-semibold underline underline-offset-4">
				{t.back}
			</Link>
		</div>
	)
}
