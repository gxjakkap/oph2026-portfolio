import { ArrowLeft } from "@phosphor-icons/react"
import { createFileRoute, Link, notFound } from "@tanstack/react-router"

import { admin } from "../data"
import { useT } from "../i18n"
import { PortfolioView } from "../PortfolioView"

export const Route = createFileRoute("/admin/$id/preview")({
	loader: async ({ params }) => {
		const p = (await admin.list()).find((x) => x.id === params.id)
		if (!p) throw notFound()
		return p
	},
	component: Preview,
})

function Preview() {
	const p = Route.useLoaderData()
	const a = useT().admin
	const back = (
		<Link
			to="/admin/$id"
			params={{ id: p.id }}
			className="inline-flex items-center gap-1 text-sm font-semibold text-lilac hover:underline">
			<ArrowLeft />
			{a.backToEdit}
		</Link>
	)
	return (
		<>
			{!p.published && <p className="mb-4 rounded-2xl bg-sun px-4 py-2 font-bold text-navy">{a.previewBanner}</p>}
			<PortfolioView p={p} back={back} />
		</>
	)
}
