import { redirect } from "@tanstack/react-router";

import { getSessionUserFn } from "#/server/forms";

/** Route guard: redirect signed-out visitors to the login page. */
export async function requireSession() {
	const session = await getSessionUserFn();
	if (!session) {
		throw redirect({ to: "/logowanie" });
	}
	return session;
}
