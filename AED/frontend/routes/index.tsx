import { createFileRoute } from "@tanstack/react-router";

import { PolandMap } from "#/map/poland-map";
import { Badge } from "#/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<Card>
				<CardHeader>
					<CardTitle>
						<h1 className="font-bold text-4xl">Mapa Polski</h1>
					</CardTitle>
					<CardDescription className="flex flex-wrap items-center gap-2 text-lg">
						Protomaps + MapLibre GL JS
						<Badge variant="secondary">dane © OpenStreetMap</Badge>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PolandMap />
				</CardContent>
			</Card>
		</main>
	);
}
