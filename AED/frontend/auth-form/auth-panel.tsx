import { useEffect, useId, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/u;
const MIN_PASSWORD_LENGTH = 8;
const SYNTHETIC_EMAIL_DOMAIN = "users.local";

type Mode = "login" | "register";

interface AuthError {
	readonly code?: string | undefined;
	readonly message?: string | undefined;
}

export function AuthPanel() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	useEffect(() => {
		if (session) {
			navigate({ to: "/", replace: true });
		}
	}, [navigate, session]);

	if (session) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<h1 className="font-bold text-2xl">Konto użytkownika</h1>
				</CardTitle>
				<CardDescription>
					Logowanie lub rejestracja przy użyciu nazwy użytkownika i hasła.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-5">
				<AuthForm />

				<div className="grid gap-2 border-t pt-4">
					<Button
						type="button"
						variant="outline"
						className="w-full"
						disabled={true}
						title="Funkcja niedostępna"
					>
						Logowanie przez gov.pl
					</Button>
					<p className="text-muted-foreground text-xs">
						Logowanie przez gov.pl jest obecnie niedostępne.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: keeping the form fields together is easier to review.
function AuthForm() {
	const navigate = useNavigate();
	const formId = useId();
	const [mode, setMode] = useState<Mode>("login");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const normalized = username.trim().toLowerCase();
		const validationError = validateCredentials({
			mode,
			username: normalized,
			password,
			confirmation,
		});
		if (validationError) {
			setError(validationError);
			return;
		}

		setPending(true);
		try {
			const result =
				mode === "login"
					? await authClient.signIn.username({
							username: normalized,
							password,
						})
					: await authClient.signUp.email({
							email: `${normalized}@${SYNTHETIC_EMAIL_DOMAIN}`,
							password,
							name: normalized,
							username: normalized,
						});

			if (result.error) {
				setError(authErrorMessage(result.error));
				return;
			}

			setPassword("");
			setConfirmation("");
			await navigate({ to: "/", replace: true });
		} finally {
			setPending(false);
		}
	}

	return (
		<form className="grid gap-4" onSubmit={handleSubmit}>
			<ModeButtons
				mode={mode}
				onChange={(nextMode) => {
					setMode(nextMode);
					setError(null);
				}}
			/>

			<div className="grid gap-2">
				<Label htmlFor={`${formId}-username`}>Nazwa użytkownika</Label>
				<Input
					id={`${formId}-username`}
					name="username"
					autoComplete="username"
					minLength={3}
					maxLength={30}
					required={true}
					value={username}
					onChange={(event) => setUsername(event.target.value)}
					disabled={pending}
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor={`${formId}-password`}>Hasło</Label>
				<Input
					id={`${formId}-password`}
					name="password"
					type="password"
					autoComplete={mode === "login" ? "current-password" : "new-password"}
					minLength={MIN_PASSWORD_LENGTH}
					required={true}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					disabled={pending}
				/>
			</div>

			{mode === "register" ? (
				<div className="grid gap-2">
					<Label htmlFor={`${formId}-password-confirm`}>
						Potwierdzenie hasła
					</Label>
					<Input
						id={`${formId}-password-confirm`}
						name="password-confirmation"
						type="password"
						autoComplete="new-password"
						minLength={MIN_PASSWORD_LENGTH}
						required={true}
						value={confirmation}
						onChange={(event) => setConfirmation(event.target.value)}
						disabled={pending}
					/>
				</div>
			) : null}

			{error ? (
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			) : null}

			<Button type="submit" disabled={pending}>
				{pending ? "Trwa przetwarzanie…" : submitLabel(mode)}
			</Button>
		</form>
	);
}

function ModeButtons(props: { mode: Mode; onChange: (mode: Mode) => void }) {
	return (
		<div className="flex gap-2">
			<Button
				type="button"
				variant={props.mode === "login" ? "default" : "outline"}
				onClick={() => props.onChange("login")}
			>
				Logowanie
			</Button>
			<Button
				type="button"
				variant={props.mode === "register" ? "default" : "outline"}
				onClick={() => props.onChange("register")}
			>
				Rejestracja
			</Button>
		</div>
	);
}

interface Credentials {
	readonly mode: Mode;
	readonly username: string;
	readonly password: string;
	readonly confirmation: string;
}

function validateCredentials(credentials: Credentials): string | null {
	if (!USERNAME_PATTERN.test(credentials.username)) {
		return "Nazwa użytkownika musi zawierać od 3 do 30 znaków: litery, cyfry lub znak podkreślenia (_).";
	}
	if (credentials.password.length < MIN_PASSWORD_LENGTH) {
		return `Hasło musi składać się z co najmniej ${MIN_PASSWORD_LENGTH} znaków.`;
	}
	if (
		credentials.mode === "register" &&
		credentials.password !== credentials.confirmation
	) {
		return "Podane hasła nie są identyczne.";
	}
	return null;
}

function submitLabel(mode: Mode): string {
	return mode === "login" ? "Logowanie" : "Rejestracja";
}

function authErrorMessage(error: AuthError): string {
	switch (error.code) {
		case "USERNAME_IS_ALREADY_TAKEN":
			return "Nazwa użytkownika jest już zajęta.";
		case "INVALID_USERNAME_OR_PASSWORD":
			return "Nieprawidłowa nazwa użytkownika lub hasło.";
		case "USERNAME_TOO_SHORT":
			return "Nazwa użytkownika jest zbyt krótka.";
		case "USERNAME_TOO_LONG":
			return "Nazwa użytkownika jest zbyt długa.";
		case "INVALID_USERNAME":
			return "Nazwa użytkownika zawiera niedozwolone znaki.";
		case "PASSWORD_TOO_SHORT":
			return `Hasło musi składać się z co najmniej ${MIN_PASSWORD_LENGTH} znaków.`;
		default:
			return (
				error.message ?? "Nie udało się wykonać operacji. Spróbuj ponownie."
			);
	}
}
