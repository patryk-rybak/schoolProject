import { createFileRoute } from "@tanstack/react-router";

import { AuthPanel } from "#/auth-form/auth-panel";

export const Route = createFileRoute("/logowanie")({ component: LoginPage });

function LoginPage() {
	return (
		<main className="mx-auto flex min-h-[75vh] w-full max-w-6xl items-center justify-center p-6">
			<div className="w-full max-w-md">
				<AuthPanel />
			</div>
		</main>
	);
}
