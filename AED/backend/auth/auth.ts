import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#backend/store/index.ts";
import { account, session, user, verification } from "./schema.ts";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: { user, session, account, verification },
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [username(), tanstackStartCookies()],
});
