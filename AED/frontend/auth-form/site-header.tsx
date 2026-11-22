import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export function SiteHeader() {
	const { data: session } = authClient.useSession();

	async function handleSignOut() {
		await authClient.signOut();
		globalThis.location.reload();
	}

	return (
		<header className="border-b bg-background">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
				<a className="font-semibold" href="/">
					Mapa AED
				</a>
				{session ? (
					<div className="flex items-center gap-3 text-sm">
						<span className="text-muted-foreground">
							Zalogowano jako{" "}
							<strong>{session.user.username ?? session.user.name}</strong>
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
				) : null}
			</div>
		</header>
	);
}
