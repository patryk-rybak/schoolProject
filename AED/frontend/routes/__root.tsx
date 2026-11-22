import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";

import { SessionControls } from "#/auth-form/site-header";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Mapa AED" },
		],
		links: [
			{ rel: "icon", type: "image/png", href: "/favicon-128.png" },
			{ rel: "stylesheet", href: appCss },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="pl">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen bg-background text-foreground antialiased">
				<header className="border-b">
					<nav
						aria-label="Nawigacja główna"
						className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3"
					>
						<Link
							to="/"
							className="flex items-center gap-2 font-semibold"
							activeOptions={{ exact: true }}
						>
							<img
								src="/materialy/mascot-128.png"
								alt="Symbol programu DANE AED RAZEM"
								width={64}
								height={64}
								className="h-16 w-auto shrink-0"
							/>
							Mapa AED
						</Link>
						<div className="flex flex-wrap items-center gap-4 text-sm">
							<Link
								to="/"
								activeOptions={{ exact: true }}
								activeProps={{ className: "font-semibold underline" }}
								className="text-muted-foreground hover:text-foreground"
							>
								Mapa AED
							</Link>
							<Link
								to="/dodaj-aed"
								activeProps={{ className: "font-semibold underline" }}
								className="text-muted-foreground hover:text-foreground"
							>
								Dodaj AED
							</Link>
							<Link
								to="/moje-aed"
								activeProps={{ className: "font-semibold underline" }}
								className="text-muted-foreground hover:text-foreground"
							>
								Moje AED
							</Link>
							<Link
								to="/zrodla"
								activeProps={{ className: "font-semibold underline" }}
								className="text-muted-foreground hover:text-foreground"
							>
								Źródła danych
							</Link>
						</div>
						<div className="ml-auto">
							<SessionControls />
						</div>
					</nav>
				</header>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
