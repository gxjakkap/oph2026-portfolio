import { useEffect, useRef, useState } from "react"
import { Document, Page } from "react-pdf"

import mascotLoading from "./assets/mascot-loading.webp"
import { useT } from "./i18n"
import { pdfOptions } from "./pdfjs"

// ponytail: phones with DPR 3 would allocate ~50MB per canvas; 2 is sharp enough
const dpr = Math.min(2, window.devicePixelRatio)

export function Pdf({ url }: { url: string }) {
	const t = useT()
	const ref = useRef<HTMLDivElement>(null)
	const [width, setWidth] = useState(0)
	const [pages, setPages] = useState(0)

	useEffect(() => {
		const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
		ro.observe(ref.current!)
		return () => ro.disconnect()
	}, [])

	return (
		<div ref={ref} className="min-w-0 flex-1">
			<Document
				file={url}
				options={pdfOptions}
				suspense={false}
				onLoadSuccess={(d) => setPages(d.numPages)}
				loading={
					<div className="flex flex-col items-center gap-2 py-16 text-cream">
						<img src={mascotLoading} alt="" className="w-32 motion-safe:animate-bounce" />
						<p className="font-semibold">{t.loading}</p>
					</div>
				}
				error={<p className="py-16 text-center font-semibold text-cream">{t.pdfError}</p>}
				className="flex flex-col gap-4">
				{width > 0 && Array.from({ length: pages }, (_, i) => <LazyPage key={i} n={i + 1} width={width} />)}
			</Document>
		</div>
	)
}

// Renders only while near the viewport; keeps its height when unmounted so scroll doesn't jump.
function LazyPage({ n, width }: { n: number; width: number }) {
	const ref = useRef<HTMLDivElement>(null)
	const [near, setNear] = useState(n === 1)
	const [ratio, setRatio] = useState(Math.SQRT2)

	useEffect(() => {
		const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "150% 0px" })
		io.observe(ref.current!)
		return () => io.disconnect()
	}, [])

	return (
		<div
			ref={ref}
			style={{ height: width * ratio }}
			className="overflow-hidden rounded-xl bg-white shadow-[5px_5px_0_var(--color-navy)] ring-3 ring-navy">
			{near && (
				<Page
					pageNumber={n}
					width={width}
					devicePixelRatio={dpr}
					renderTextLayer={false}
					renderAnnotationLayer={false}
					loading=""
					onLoadSuccess={(pg) => setRatio(pg.originalHeight / pg.originalWidth)}
				/>
			)}
		</div>
	)
}
