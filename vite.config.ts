import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
	// cloudflare(): runs worker/ (the /api) in workerd during dev and builds it with the SPA
	plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss(), cloudflare()],
})
