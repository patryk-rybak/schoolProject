import { createFileRoute } from "@tanstack/react-router";

import { PolandMap } from "#/components/map/poland-map";

function Home() {
	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<header>
				<h1 className="font-bold text-4xl">Mapa Polski</h1>
				<p className="mt-2 text-lg text-muted-foreground">
					Protomaps + MapLibre GL JS · dane © OpenStreetMap
				</p>
			</header>
			<PolandMap />
		</main>
	);
}

export const Route = createFileRoute("/")({ component: Home });
