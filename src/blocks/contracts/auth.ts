import type { IsoDateTime } from "./domain";

/** Roles used by both the backend guards and the frontend UI. */
export type Role = "admin" | "editor" | "custodian";

export interface AuthenticatedUser {
	readonly id: string;
	readonly email: string;
	readonly name: string | null;
	readonly roles: readonly Role[];
}

export interface SignInInput {
	readonly email: string;
	readonly password: string;
}

export interface SignUpInput extends SignInInput {
	readonly name: string;
}

export interface AuthSession {
	readonly user: AuthenticatedUser;
	readonly expiresAt: IsoDateTime;
}

/** Server-side authentication boundary (`backend-auth`). */
export interface AuthService {
	readonly getSession: (request: Request) => Promise<AuthSession | null>;
	/** Throws when there is no session or the role is missing. */
	readonly requireRole: (
		request: Request,
		roles: readonly Role[],
	) => Promise<AuthenticatedUser>;
}
