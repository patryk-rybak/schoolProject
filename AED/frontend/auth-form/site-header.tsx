import { lazy, Suspense, useEffect, useState } from "react";
import { useHydrated } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";

const AuthSessionControls = lazy(() =>
	import("#/auth-form/auth-session-controls").then((module) => ({
		default: module.AuthSessionControls,
	})),
);

export function SessionControls() {
	const hydrated = useHydrated();
	const [showAuthControls, setShowAuthControls] = useState(false);

	useEffect(() => {
		if (!hydrated) {
			return;
		}

		const idleCallback = globalThis.requestIdleCallback?.bind(globalThis);
		if (idleCallback) {
			const handle = idleCallback(() => setShowAuthControls(true), {
				timeout: 2000,
			});
			return () => globalThis.cancelIdleCallback?.(handle);
		}

		const timeout = globalThis.setTimeout(() => setShowAuthControls(true), 0);
		return () => globalThis.clearTimeout(timeout);
	}, [hydrated]);

	if (!(hydrated && showAuthControls)) {
		return <SessionControlsPlaceholder />;
	}

	return (
		<Suspense fallback={<SessionControlsPlaceholder />}>
			<AuthSessionControls />
		</Suspense>
	);
}

function SessionControlsPlaceholder() {
	return (
		<Button asChild={true} size="sm">
			<a href="/logowanie">Logowanie / Rejestracja</a>
		</Button>
	);
}
