import type { SignInInput, SignUpInput } from "../contracts";

export const BLOCK = "frontend-auth" as const;

export interface LoginFormProps {
	readonly onSubmit: (input: SignInInput) => void | Promise<void>;
	readonly error?: string | null;
	readonly pending?: boolean;
}

export interface SignUpFormProps {
	readonly onSubmit: (input: SignUpInput) => void | Promise<void>;
	readonly error?: string | null;
	readonly pending?: boolean;
}

/**
 * TODO(frontend-auth): replace the stubs with the real forms.
 * Use `authClient` from `#/lib/auth-client` and shadcn/ui fields.
 */
export function LoginForm(_props: LoginFormProps) {
	return null;
}

export function SignUpForm(_props: SignUpFormProps) {
	return null;
}
