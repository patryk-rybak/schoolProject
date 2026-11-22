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
			<div className="flex items-center gap-3 text-sm">
				<span className="text-muted-foreground">
					Witaj <strong>{session.user.username ?? session.user.name}</strong>!
				</span>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleSignOut}
				>
					Wyloguj
				</Button>
			</div>
		);
	}

	return (
		<Button asChild={true} size="sm">
			<Link to="/logowanie">Zaloguj / Zarejestruj</Link>
		</Button>
	);
}
