import { pdfjs } from 'react-pdf'

// set right after react-pdf's own import (its README: same module that imports react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

// copied into public/ by `bun run pdfjs`; cmaps are needed for Thai text
export const pdfOptions = { cMapUrl: '/cmaps/', standardFontDataUrl: '/standard_fonts/', wasmUrl: '/wasm/' }
export { pdfjs }
