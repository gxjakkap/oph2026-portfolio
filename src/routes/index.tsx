import { Tag, TagGroup } from "@heroui/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo } from "react"

import { ApplicationBadges } from "../ApplicationBadges"
import mascotLook from "../assets/mascot-look.webp"
import { getPublished, programs, type Portfolio, type Program } from "../data"
import { useT } from "../i18n"

type Search = { program?: Program; round?: 1 | 2; project?: string }

export const Route = createFileRoute("/")({
	validateSearch: (s: Record<string, unknown>): Search => ({
		program: programs.includes(s.program as Program) ? (s.program as Program) : undefined,
		round: s.round === 1 || s.round === 2 ? s.round : undefined,
		project: typeof s.project === "string" ? s.project : undefined,
	}),
	loader: getPublished,
	component: Home,
})

// Shuffle once per browser session: sort by hash(seed + slug), so Back doesn't reshuffle
// and newly added slugs still slot in somewhere.
const seed = (sessionStorage.seed ||= Math.random().toString(36).slice(2))
const fnv = (s: string) => {
	let h = 2166136261
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
	return h >>> 0
}

function Home() {
	const t = useT()
	const { program, round, project } = Route.useSearch()
	const navigate = Route.useNavigate()
	const portfolios = Route.useLoaderData()
	const [shuffled, projects] = useMemo(
		() => [
			portfolios.toSorted((a, b) => fnv(seed + a.slug) - fnv(seed + b.slug)),
			[...new Set(portfolios.flatMap((p) => p.applications.map((a) => a.project)))].sort((a, b) =>
				a.localeCompare(b, "th")
			),
		],
		[portfolios]
	)
	const set = (patch: Search) => navigate({ search: (s) => ({ ...s, ...patch }), replace: true })

	// all filters must hold for the same application, e.g. "inter, round 2"
	const shown = shuffled.filter((p) =>
		p.applications.some(
			(a) => (!program || a.program === program) && (!round || a.round === round) && (!project || a.project === project)
		)
	)

	return (
		<>
			<div className="mb-6 text-cream">
				<h1 className="text-3xl font-extrabold sm:text-4xl">{t.heading}</h1>
			</div>

			<div className="mb-8 flex flex-col gap-3 rounded-3xl border-3 border-navy bg-cream p-5 shadow-[5px_5px_0_var(--color-navy)]">
				<FilterRow
					label={t.program}
					value={program}
					options={programs.map((p) => [p, t.programs[p]])}
					onChange={(v) => set({ program: v })}
				/>
				<FilterRow
					label={t.round}
					value={round}
					options={[
						[1, t.roundN(1)],
						[2, t.roundN(2)],
					]}
					onChange={(v) => set({ round: v })}
				/>
				{projects.length > 0 && (
					<label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
						<span className="w-20 shrink-0 text-sm font-extrabold text-navy">{t.project}</span>
						<select
							value={project ?? ""}
							onChange={(e) => set({ project: e.target.value || undefined })}
							className={`w-full min-w-0 rounded-full border-2 border-navy px-3 py-1 text-sm font-semibold sm:w-auto [&>option]:bg-cream [&>option]:text-navy ${project ? "bg-plum text-cream" : "bg-cream text-navy"}`}>
							<option value="">{t.all}</option>
							{projects.map((p) => (
								<option key={p} value={p}>
									{p}
								</option>
							))}
						</select>
					</label>
				)}
			</div>

			{shown.length ? (
				<ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
					{shown.map((p) => (
						<li key={p.slug}>
							<Card p={p} />
						</li>
					))}
				</ul>
			) : (
				<div className="flex flex-col items-center gap-3 py-12 text-center text-cream">
					<img src={mascotLook} alt="" className="w-36" />
					<p className="text-lg font-semibold">{t.empty}</p>
					{(program || round || project) && (
						<Link to="/" search={{}} className="font-semibold underline underline-offset-4">
							{t.clear}
						</Link>
					)}
				</div>
			)}
		</>
	)
}

const ALL = "__all"

function FilterRow<K extends string | number>(props: {
	label: string
	value?: K
	options: [K, string][]
	onChange: (v?: K) => void
}) {
	const t = useT()
	return (
		<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
			<span className="w-20 shrink-0 text-sm font-extrabold text-navy">{props.label}</span>
			<TagGroup
				aria-label={props.label}
				selectionMode="single"
				disallowEmptySelection
				selectedKeys={[props.value ?? ALL]}
				onSelectionChange={(keys) => {
					const k = [...keys][0]
					props.onChange(k === ALL ? undefined : (k as K))
				}}>
				<TagGroup.List className="flex flex-wrap gap-2">
					{[[ALL, t.all] as const, ...props.options].map(([id, label]) => (
						<Tag
							key={id}
							id={id}
							className="rounded-full border-2 border-navy bg-cream px-3 py-1 text-sm font-semibold text-navy data-[selected=true]:bg-plum data-[selected=true]:text-cream">
							{label}
						</Tag>
					))}
				</TagGroup.List>
			</TagGroup>
		</div>
	)
}

function Card({ p }: { p: Portfolio }) {
	return (
		<Link
			to="/p/$slug"
			params={{ slug: p.slug }}
			className="group block h-full overflow-hidden rounded-2xl border-3 border-navy bg-cream text-navy shadow-[5px_5px_0_var(--color-navy)] transition motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[6px_9px_0_var(--color-navy)]">
			<img
				src={p.cover!}
				alt=""
				loading="lazy"
				className="aspect-[3/4] w-full border-b-3 border-navy bg-white object-cover object-top"
			/>
			<div className="p-3">
				<p className="text-lg font-extrabold leading-tight">{p.nickname}</p>
				<div className="mt-2 flex flex-col gap-1">
					<ApplicationBadges apps={p.applications} />
				</div>
			</div>
		</Link>
	)
}
