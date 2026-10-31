import { Button } from "@heroui/react"
import { ArrowLeft, IconContext, Translate } from "@phosphor-icons/react"
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
		// icons: bold to match the thick outlines, text-sized, decorative (always beside a text label)
		<IconContext.Provider value={{ weight: "bold", size: "1.15em", "aria-hidden": true }}>
			<header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
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
						<Translate />
						{t.switchTo}
					</Button>
				</div>
			</header>
			<main className="mx-auto max-w-7xl px-4 pt-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
				<Outlet />
			</main>
		</IconContext.Provider>
	)
}

function NotFound() {
	const t = useT()
	return (
		<div className="flex flex-col items-center gap-4 py-16 text-center text-cream">
			<img src={mascotAbove} alt="" className="w-40" />
			<p className="text-2xl font-extrabold">{t.notFound}</p>
			<Link to="/" search={{}} className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
				<ArrowLeft />
				{t.back}
			</Link>
		</div>
	)
}
