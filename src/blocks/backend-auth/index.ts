import type { AuthService } from "../contracts";

export type {
	AuthService,
	AuthSession,
	AuthenticatedUser,
	Role,
	SignInInput,
	SignUpInput,
} from "../contracts";

export const BLOCK = "backend-auth" as const;

/**
 * TODO(backend-auth): wrap the better-auth instance from `#/lib/auth` with
 * role checks and the `AuthService` interface used by server functions.
 */
export function createAuthService(): AuthService {
	throw new Error(
		"backend-auth: createAuthService() is not implemented — see README.md",
	);
}
