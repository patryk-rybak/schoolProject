import { Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export function SessionControls() {
	const { data: session } = authClient.useSession();

	async function handleSignOut() {
		await authClient.signOut();
		globalThis.location.reload();
	}

	if (session) {
		return (
			<Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
				Wyloguj
			</Button>
		);
	}

	return (
		<Button asChild={true} size="sm">
			<Link to="/logowanie">Zaloguj / Zarejestruj</Link>
		</Button>
	);
}
