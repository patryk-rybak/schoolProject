import { defineConfig } from "drizzle-kit";

// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
const databaseUrl = Bun.env["DATABASE_URL"] ?? "dev.db";

// biome-ignore lint/style/noDefaultExport: Drizzle Kit requires a default export.
export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "sqlite",
	dbCredentials: {
		url: databaseUrl,
	},
});
