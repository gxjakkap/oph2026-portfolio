import { execSync } from "node:child_process"

import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const git = (args: string) => execSync(`git ${args}`).toString().trim()

// https://vite.dev/config/
export default defineConfig({
	// shown in the admin footer; "-dirty" flags a deploy of uncommitted code
	define: {
		__BUILD__: JSON.stringify({
			sha: git("rev-parse --short HEAD") + (git("status --porcelain") ? "-dirty" : ""),
			message: git("log -1 --format=%s"),
			date: new Date().toISOString(),
		}),
	},
	// cloudflare(): runs worker/ (the /api) in workerd during dev and builds it with the SPA
	plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss(), cloudflare()],
})
