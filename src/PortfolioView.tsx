import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { programColor, type Portfolio } from "./data"
import { useT } from "./i18n"
import { Pdf } from "./Pdf"

// the public detail layout; also used by the admin preview (with its own back link)
export function PortfolioView({ p, back }: { p: Portfolio; back?: ReactNode }) {
	const t = useT()
	return (
		// DOM order = mobile order (info first); row-reverse puts info on the right on desktop
		<div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
			<aside className="shrink-0 rounded-3xl border-3 border-navy bg-cream p-5 text-navy shadow-[5px_5px_0_var(--color-navy)] lg:sticky lg:top-4 lg:w-80">
				{back ?? (
					<Link to="/" className="text-sm font-semibold text-lilac hover:underline">
						← {t.back}
					</Link>
				)}
				<h1 className="mt-3 text-2xl font-extrabold leading-tight">{p.nickname}</h1>
				<p className="font-semibold">{p.name}</p>
				<p className="mt-1 text-sm text-navy/70">
					{p.school} · TCAS{p.year}
				</p>

				<h2 className="mt-5 text-sm font-extrabold uppercase tracking-wide text-plum">{t.applied}</h2>
				<ul className="mt-2 flex flex-col gap-2">
					{p.applications.map((a, i) => (
						<li key={i} className={`rounded-xl px-3 py-2 text-sm ${programColor[a.program]}`}>
							<span className="font-bold">{t.programs[a.program]}</span>
							<br />
							{t.roundN(a.round)} · {a.project}
						</li>
					))}
				</ul>

				{p.achievements.length > 0 && (
					<>
						<h2 className="mt-5 text-sm font-extrabold uppercase tracking-wide text-plum">{t.achievements}</h2>
						<ul className="mt-2 list-disc pl-5 text-sm marker:text-lilac">
							{p.achievements.map((a, i) => (
								<li key={i}>{a}</li>
							))}
						</ul>
					</>
				)}
			</aside>

			{p.pdf ? (
				<Pdf url={p.pdf} />
			) : (
				<p className="flex-1 py-16 text-center font-semibold text-cream">{t.admin.noPdf}</p>
			)}
		</div>
	)
}
