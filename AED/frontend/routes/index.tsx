import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { LazyPolandMap } from "#/map/lazy-poland-map";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
			<Card>
				<CardHeader>
					<CardTitle>
						<h1 className="font-bold text-4xl">Mapa AED</h1>
					</CardTitle>
					<CardDescription className="flex flex-wrap items-center gap-2 text-lg">
						Lokalizacje defibrylatorów AED w Polsce
						<Badge variant="secondary">© OpenStreetMap</Badge>
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center justify-end gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<Button asChild={true} size="sm" variant="outline">
								<a href="/data/aed.xlsx" download={true}>
									<Download />
									Pobierz dane XLSX
								</a>
							</Button>
						</div>
					</div>
					<LazyPolandMap deferred={true} />
				</CardContent>
			</Card>
		</main>
	);
}
