import { Chip } from "@heroui/react"

import { programColor, type Application } from "./data"
import { useT } from "./i18n"

// per application: curriculum (colour-coded) + project carrying its round, e.g. [ปกติ] [Active Recruitment · รอบ 1]
export function ApplicationBadges({ apps }: { apps: Application[] }) {
	const t = useT()
	return apps.map((a, i) => (
		<div key={i} className="flex flex-wrap gap-1">
			<Chip size="sm" className={`font-bold ${programColor[a.program]}`}>
				<Chip.Label>{t.programsShort[a.program]}</Chip.Label>
			</Chip>
			<Chip size="sm" className="border-2 border-navy bg-cream font-semibold text-navy">
				<Chip.Label>
					{a.project} - {t.roundN(a.round)}
				</Chip.Label>
			</Chip>
		</div>
	))
}
