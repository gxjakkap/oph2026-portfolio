import { api, MAX_PDF_BYTES, type Portfolio } from "./data"
import { pdfjs, pdfOptions } from "./pdfjs"

export class TooBigError extends Error {}

// page 1 -> 600px-wide image. Safari can't encode webp and silently returns png, so fall back to jpeg there
async function renderCover(file: File): Promise<Blob> {
	const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), ...pdfOptions })
	try {
		const doc = await task.promise
		const page = await doc.getPage(1)
		const viewport = page.getViewport({ scale: 600 / page.getViewport({ scale: 1 }).width })
		const canvas = document.createElement("canvas")
		canvas.width = Math.round(viewport.width)
		canvas.height = Math.round(viewport.height)
		await page.render({ canvas, viewport }).promise
		const encode = (type: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, 0.8))
		const webp = await encode("image/webp")
		const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg")
		if (!blob) throw new Error("could not render the cover")
		return blob
	} finally {
		await task.destroy()
	}
}

async function put(url: string, body: Blob, type: string) {
	const res = await fetch(url, { method: "PUT", body, headers: { "content-type": type } })
	if (!res.ok) throw new Error(`upload failed (${res.status})`)
}

// browser -> R2 directly (presigned), then the API verifies and switches the portfolio to the new files
export async function uploadPdf(id: string, file: File): Promise<Portfolio> {
	if (file.size > MAX_PDF_BYTES) throw new TooBigError()
	const cover = await renderCover(file)
	const urls = await api<{ version: string; pdf: string; cover: string }>(`/admin/portfolios/${id}/upload`, {
		method: "POST",
		json: { pdfSize: file.size, coverSize: cover.size, coverType: cover.type },
	})
	await Promise.all([put(urls.pdf, file, "application/pdf"), put(urls.cover, cover, cover.type)])
	return api<Portfolio>(`/admin/portfolios/${id}/files`, { method: "POST", json: { version: urls.version } })
}
