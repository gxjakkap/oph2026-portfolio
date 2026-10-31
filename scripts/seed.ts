import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

// Dev only: load the sample portfolios from Archive.zip into local D1 + RustFS.
//   docker compose up -d && bun run db:migrate:local && bun run seed
// Needs docker (ghostscript + poppler run in a throwaway image). Re-running replaces the seeded rows.
import { $, S3Client } from "bun"
import sharp from "sharp"

import { MAX_PDF_BYTES, type Program } from "../shared/types"

const ZIP = "Archive.zip"
const env = Object.fromEntries(
	(await Bun.file(".dev.vars").text())
		.split("\n")
		.filter((l) => /^\w+=/.test(l))
		.map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
)
const s3 = new S3Client({
	endpoint: env.S3_ENDPOINT,
	bucket: env.S3_BUCKET,
	accessKeyId: env.S3_ACCESS_KEY_ID,
	secretAccessKey: env.S3_SECRET_ACCESS_KEY,
})

await $`docker build -q -t oph2026-pdftools - < ${new Response(
	"FROM debian:stable-slim\nRUN apt-get update && apt-get install -y --no-install-recommends ghostscript poppler-utils && rm -rf /var/lib/apt/lists/*\n"
)}`

// file names look like {reg|inter|hds}_{name}[_{project}].pdf
const programs: Record<string, Program> = { reg: "regular", inter: "inter", hds: "hds" }
const projects: Record<string, string> = {
	goodstudent: "เรียนดี",
	mou: "MOU",
	"pre-u": "Pre-U",
	ar: "Active Recruitment",
}
const names = (await $`unzip -Z1 ${ZIP}`.text())
	.split("\n")
	.filter((n) => /\.pdf$/i.test(n) && !n.startsWith("__MACOSX"))
const dir = await mkdtemp(join(tmpdir(), "seed-"))
const q = (s: string) => `'${s.replaceAll("'", "''")}'`
const sql = ["DELETE FROM portfolios WHERE id LIKE 'seed-%';"]

for (const path of names) {
	const base = path
		.split("/")
		.pop()!
		.replace(/\.pdf$/i, "")
	const m = base.match(/^(reg|inter|hds)[_-]([^_-]+)(?:[_-](.+))?$/i)
	if (!m) {
		console.warn(`skip ${path}: unexpected name`)
		continue
	}
	const [, prog, rawName, proj] = m
	const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-")
	const id = `seed-${slug}`
	const version = "seed01"
	const work = join(dir, slug)
	await $`mkdir -p ${work}`
	// compress ~150 dpi and render page 1; files go in and out over stdin/stdout (no bind-mount permission issues)
	await $`unzip -p ${ZIP} ${path} | docker run -i --rm oph2026-pdftools sh -c ${"cat > /tmp/in.pdf && gs -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -sOutputFile=/tmp/out.pdf /tmp/in.pdf && pdftoppm -f 1 -l 1 -r 100 -png -singlefile /tmp/out.pdf /tmp/cover && tar -C /tmp -cf - out.pdf cover.png"} | tar -x -C ${work}`
	const pdf = Bun.file(join(work, "out.pdf"))
	if (pdf.size > MAX_PDF_BYTES) {
		console.warn(`skip ${base}: still ${(pdf.size / 1e6).toFixed(1)} MB after compression`)
		continue
	}
	const cover = await sharp(join(work, "cover.png")).resize({ width: 600 }).webp({ quality: 80 }).toBuffer()
	await s3.write(`${id}/${version}/portfolio.pdf`, pdf, { type: "application/pdf" })
	await s3.write(`${id}/${version}/cover`, cover, { type: "image/webp" })

	const display = rawName === "unnamed" ? "Unnamed" : rawName[0].toUpperCase() + rawName.slice(1)
	sql.push(
		`INSERT INTO portfolios (id, slug, name, nickname, year, school, achievements, published, file_version) VALUES (${q(id)}, ${q(slug)}, ${q(display)}, ${q(display)}, 68, ${q("ตัวอย่าง (sample)")}, '[]', 1, ${q(version)});`,
		`INSERT INTO applications (id, portfolio_id, program, round, project) VALUES (${q(id + "-1")}, ${q(id)}, ${q(programs[prog.toLowerCase()])}, 1, ${q(projects[proj?.toLowerCase() ?? ""] ?? "ไม่ระบุ")});`
	)
	console.log(`${slug}: ${(pdf.size / 1e6).toFixed(1)} MB`)
}

await Bun.write(join(dir, "seed.sql"), sql.join("\n"))
await $`bunx wrangler d1 execute oph2026-portfolio --local --file ${join(dir, "seed.sql")}`.quiet()
console.log(`seeded ${(sql.length - 1) / 2} portfolios`)
