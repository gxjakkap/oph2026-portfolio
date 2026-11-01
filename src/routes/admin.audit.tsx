import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo } from "react"

import { panel } from "../admin/ui"
import { admin, type AuditEntry } from "../data"
import { useT } from "../i18n"

export const Route = createFileRoute("/admin/audit")({
	loader: admin.audit,
	component: Audit,
})

function Audit() {
	const t = useT()
	const a = t.admin
	const log = Route.useLoaderData()
	const diffs = useMemo(() => diffLog(log), [log])
	return (
		<div className={`${panel} overflow-x-auto p-3`}>
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b-2 border-navy">
						<th className="p-2">{a.when}</th>
						<th className="p-2">{a.who}</th>
						<th className="p-2">{a.action}</th>
						<th className="p-2">slug</th>
						<th className="p-2">{a.snapshot}</th>
					</tr>
				</thead>
				<tbody>
					{log.map((e, k) => (
						<tr key={e.id} className="border-b border-navy/10 align-top">
							<td className="p-2 whitespace-nowrap">{new Date(e.at).toLocaleString(t.locale)}</td>
							<td className="p-2" title={e.actorDiscordId}>
								{e.actor}
							</td>
							<td className="p-2 font-semibold">{a.actions[e.action]}</td>
							<td className="p-2 font-mono">
								{e.action === "delete" ? (
									e.slug
								) : (
									<Link to="/admin/$id" params={{ id: e.portfolioId }} className="text-lilac hover:underline">
										{e.slug}
									</Link>
								)}
							</td>
							<td className="p-2">
								<Diff lines={diffs[k]} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

type Line = [" " | "+" | "-" | "…", string]

const lines = (s: unknown) => (s == null ? [] : JSON.stringify(s, null, 2).split("\n"))

// LCS line diff; snapshots are ~25 lines so O(n·m) is fine
function diff(a: string[], b: string[]): Line[] {
	const L = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
	for (let i = a.length - 1; i >= 0; i--)
		for (let j = b.length - 1; j >= 0; j--)
			L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
	const out: Line[] = []
	let i = 0
	let j = 0
	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			out.push([" ", a[i++]])
			j++
		} else if (L[i + 1][j] >= L[i][j + 1]) out.push(["-", a[i++]])
		else out.push(["+", b[j++]])
	}
	while (i < a.length) out.push(["-", a[i++]])
	while (j < b.length) out.push(["+", b[j++]])
	return out
}

// keep 2 lines of context around changes, fold the rest
function fold(d: Line[]): Line[] {
	const near = (k: number) => d.slice(Math.max(0, k - 2), k + 3).some(([op]) => op !== " ")
	const out: Line[] = []
	d.forEach((l, k) => {
		if (near(k)) out.push(l)
		else if (out.at(-1)?.[0] !== "…") out.push(["…", ""])
	})
	return out
}

// the log is newest first; each entry diffs against the same portfolio's next-older snapshot
function diffLog(log: AuditEntry[]): Line[][] {
	const prev = new Map<string, unknown>()
	const out: Line[][] = []
	for (let k = log.length - 1; k >= 0; k--) {
		const e = log[k]
		const now = lines(e.snapshot)
		if (e.action === "delete") out[k] = now.map((l) => ["-", l])
		else if (e.action === "create") out[k] = now.map((l) => ["+", l])
		else if (!prev.has(e.portfolioId)) out[k] = now.map((l) => [" ", l]) // older version fell outside the log window
		else out[k] = fold(diff(lines(prev.get(e.portfolioId)), now))
		prev.set(e.portfolioId, e.snapshot)
	}
	return out
}

const lineStyle = {
	" ": "",
	"+": "bg-green-500/20 text-green-200",
	"-": "bg-red-500/20 text-red-200",
	"…": "text-cream/40",
}

function Diff({ lines }: { lines: Line[] }) {
	const added = lines.filter(([op]) => op === "+").length
	const removed = lines.filter(([op]) => op === "-").length
	return (
		<details>
			<summary className="cursor-pointer text-lilac">
				JSON{" "}
				<span className="font-mono text-xs">
					{added > 0 && <span className="text-green-700">+{added}</span>}{" "}
					{removed > 0 && <span className="text-red-700">−{removed}</span>}
				</span>
			</summary>
			<pre className="mt-1 max-w-xl overflow-x-auto rounded-lg bg-navy py-2 text-xs text-cream">
				{lines.map(([op, text], k) => (
					<div key={k} className={`px-2 ${lineStyle[op]}`}>
						{op === "…" ? "⋯" : `${op} ${text}`}
					</div>
				))}
			</pre>
		</details>
	)
}
