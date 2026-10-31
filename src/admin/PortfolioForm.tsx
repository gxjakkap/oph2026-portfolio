import { useState } from "react"

import { admin, programs, type Application, type Portfolio } from "../data"
import { useT } from "../i18n"
import { TooBigError, uploadPdf } from "../upload"
import { btn, btnPrimary, field, label, panel } from "./ui"

type Props = { initial?: Portfolio; projects: string[]; onSaved: (p: Portfolio) => void }

const errorText = (e: unknown, tooBig: string) =>
	e instanceof TooBigError ? tooBig : e instanceof Error ? e.message : String(e)

export function PortfolioForm({ initial, projects, onSaved }: Props) {
	const t = useT()
	const a = t.admin
	const [slug, setSlug] = useState(initial?.slug ?? "")
	const [name, setName] = useState(initial?.name ?? "")
	const [nickname, setNickname] = useState(initial?.nickname ?? "")
	const [year, setYear] = useState(initial?.year ?? 68)
	const [school, setSchool] = useState(initial?.school ?? "")
	const [achievements, setAchievements] = useState(initial?.achievements.join("\n") ?? "")
	const [apps, setApps] = useState<Application[]>(initial?.applications ?? [])
	const [file, setFile] = useState<File | null>(null)
	const [busy, setBusy] = useState("")
	const [error, setError] = useState("")
	const [saved, setSaved] = useState(false)

	const setApp = (i: number, patch: Partial<Application>) =>
		setApps(apps.map((x, j) => (j === i ? { ...x, ...patch } : x)))

	async function save(e: React.FormEvent) {
		e.preventDefault()
		setError("")
		setSaved(false)
		setBusy(a.saving)
		try {
			const body = {
				slug,
				name,
				nickname,
				year,
				school,
				achievements: achievements
					.split("\n")
					.map((s) => s.trim())
					.filter(Boolean),
				applications: apps,
			}
			let p = initial ? await admin.update(initial.id, body) : await admin.create(body)
			if (file) {
				setBusy(a.uploading)
				p = await uploadPdf(p.id, file)
				setFile(null)
			}
			setSaved(true)
			onSaved(p)
		} catch (err) {
			setError(errorText(err, a.tooBig))
		} finally {
			setBusy("")
		}
	}

	return (
		<form onSubmit={save} className={`${panel} flex flex-col gap-4`}>
			<div className="grid gap-4 sm:grid-cols-2">
				<label className={label}>
					{a.nickname}
					<input className={field} value={nickname} onChange={(e) => setNickname(e.target.value)} />
				</label>
				<label className={label}>
					{a.name}
					<input className={field} value={name} onChange={(e) => setName(e.target.value)} />
				</label>
				<label className={label}>
					{a.school}
					<input className={field} value={school} onChange={(e) => setSchool(e.target.value)} />
				</label>
				<label className={label}>
					{a.year}
					<input
						className={field}
						type="number"
						min={50}
						max={99}
						value={year}
						onChange={(e) => setYear(Number(e.target.value))}
					/>
				</label>
				<label className={label}>
					{a.slug}
					<input
						className={`${field} font-mono`}
						value={slug}
						onChange={(e) => setSlug(e.target.value)}
						pattern="[a-z0-9]+(-[a-z0-9]+)*"
						title={a.slugHint}
						required={!!initial}
						placeholder={a.slugHint}
					/>
				</label>
			</div>

			<label className={label}>
				{a.achievementsHint}
				<textarea className={field} rows={4} value={achievements} onChange={(e) => setAchievements(e.target.value)} />
			</label>

			<fieldset className="flex flex-col gap-2">
				<legend className="mb-1 text-sm font-bold">{a.applications}</legend>
				{apps.map((x, i) => (
					<div key={i} className="flex flex-wrap items-center gap-2">
						<select
							className={`${field} w-auto`}
							value={x.program}
							onChange={(e) => setApp(i, { program: e.target.value as Application["program"] })}>
							{programs.map((p) => (
								<option key={p} value={p}>
									{t.programs[p]}
								</option>
							))}
						</select>
						<select
							className={`${field} w-auto`}
							value={x.round}
							onChange={(e) => setApp(i, { round: Number(e.target.value) as 1 | 2 })}>
							<option value={1}>{t.roundN(1)}</option>
							<option value={2}>{t.roundN(2)}</option>
						</select>
						<input
							className={`${field} min-w-40 flex-1`}
							list="projects"
							placeholder={a.project}
							value={x.project}
							required
							onChange={(e) => setApp(i, { project: e.target.value })}
						/>
						<button type="button" className={btn} onClick={() => setApps(apps.filter((_, j) => j !== i))}>
							{a.remove}
						</button>
					</div>
				))}
				<datalist id="projects">
					{projects.map((p) => (
						<option key={p} value={p} />
					))}
				</datalist>
				<button
					type="button"
					className={`${btn} self-start`}
					onClick={() => setApps([...apps, { program: "regular", round: 1, project: "" }])}>
					{a.addApplication}
				</button>
			</fieldset>

			<label className={label}>
				{initial?.pdf ? a.replacePdf : a.pdf}
				<input
					type="file"
					accept="application/pdf"
					className="text-sm font-normal file:mr-3 file:rounded-full file:border-2 file:border-navy file:bg-cream file:px-3 file:py-1 file:font-bold"
					onChange={(e) => {
						const f = e.target.files?.[0] ?? null
						setFile(f)
						if (f && !slug)
							setSlug(
								f.name
									.replace(/\.pdf$/i, "")
									.toLowerCase()
									.replace(/[^a-z0-9]+/g, "-")
									.replace(/^-|-$/g, "")
							)
					}}
				/>
				{initial?.pdf && (
					<a href={initial.pdf} target="_blank" rel="noreferrer" className="font-semibold text-lilac hover:underline">
						{a.currentPdf}
					</a>
				)}
			</label>

			{error && <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}
			<div className="flex items-center gap-3">
				<button type="submit" className={btnPrimary} disabled={!!busy}>
					{busy || a.save}
				</button>
				{saved && <span className="text-sm font-semibold text-navy/70">{a.saved}</span>}
			</div>
		</form>
	)
}
