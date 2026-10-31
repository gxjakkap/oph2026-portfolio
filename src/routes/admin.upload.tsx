import { CheckCircle, CircleNotch, CloudArrowUp, HourglassMedium, WarningCircle } from "@phosphor-icons/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"

import { panel } from "../admin/ui"
import { admin, MAX_PDF_BYTES } from "../data"
import { useT } from "../i18n"
import { TooBigError, uploadPdf } from "../upload"

export const Route = createFileRoute("/admin/upload")({ component: Bulk })

type Item = { name: string; status: "queued" | "uploading" | "done" | "failed"; id?: string; error?: string }

function Bulk() {
	const a = useT().admin
	const [items, setItems] = useState<Item[]>([])
	const [over, setOver] = useState(false)

	// one file at a time: each becomes a draft, then its PDF + cover go straight to R2
	async function start(files: File[]) {
		const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
		const offset = items.length
		setItems((xs) => [...xs, ...pdfs.map((f) => ({ name: f.name, status: "queued" as const }))])
		const set = (i: number, patch: Partial<Item>) =>
			setItems((xs) => xs.map((x, j) => (j === offset + i ? { ...x, ...patch } : x)))
		for (const [i, f] of pdfs.entries()) {
			set(i, { status: "uploading" })
			let id: string | undefined
			try {
				if (f.size > MAX_PDF_BYTES) throw new TooBigError() // before creating a draft for it
				id = (await admin.create({ filename: f.name.replace(/\.pdf$/i, "") })).id
				await uploadPdf(id, f)
				set(i, { status: "done", id })
			} catch (e) {
				set(i, {
					status: "failed",
					id,
					error: e instanceof TooBigError ? a.tooBig : e instanceof Error ? e.message : String(e),
				})
			}
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<label
				onDragOver={(e) => (e.preventDefault(), setOver(true))}
				onDragLeave={() => setOver(false)}
				onDrop={(e) => (e.preventDefault(), setOver(false), start([...e.dataTransfer.files]))}
				className={`${panel} flex cursor-pointer flex-col items-center gap-2 border-dashed py-12 text-center font-semibold ${over ? "bg-sun" : ""}`}>
				<CloudArrowUp size={56} />
				{a.bulkHint}
				<input
					type="file"
					accept="application/pdf"
					multiple
					className="sr-only"
					onChange={(e) => (start([...(e.target.files ?? [])]), (e.target.value = ""))}
				/>
			</label>
			{items.length > 0 && (
				<ul className={`${panel} flex flex-col divide-y-2 divide-navy/10 p-3`}>
					{items.map((x, i) => (
						<li key={i} className="flex flex-wrap items-center gap-3 py-2">
							<span className="min-w-0 flex-1 truncate font-mono text-sm">{x.name}</span>
							<span
								className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
									x.status === "done" ? "bg-teal" : x.status === "failed" ? "bg-red-200 text-red-900" : "bg-navy/10"
								}`}>
								<StatusIcon status={x.status} />
								{a.status[x.status]}
							</span>
							{x.id && (
								<Link
									to="/admin/$id"
									params={{ id: x.id }}
									className="text-sm font-semibold text-lilac hover:underline">
									{a.edit}
								</Link>
							)}
							{x.error && <p className="w-full text-sm text-red-800">{x.error}</p>}
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

const StatusIcon = ({ status }: { status: Item["status"] }) =>
	status === "done" ? (
		<CheckCircle />
	) : status === "failed" ? (
		<WarningCircle />
	) : status === "uploading" ? (
		<CircleNotch className="motion-safe:animate-spin" />
	) : (
		<HourglassMedium />
	)
