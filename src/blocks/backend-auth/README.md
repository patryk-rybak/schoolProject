# backend-auth — sessions, roles, guards

## Scope

Server-side authentication and authorisation: better-auth wiring, session
lookup, roles (`admin`, `editor`, `custodian`), guards for server functions and
API routes, rate limiting, and an audit trail of privileged actions.

## Owns

- `src/blocks/backend-auth/**`
- `src/lib/auth.ts`, `src/lib/auth-client.ts` (extend, don't rewrite)
- `src/routes/api/auth/$.ts` and the `/api/auth/*` mount

## Public API

```ts
import { createAuthService } from "#/blocks/backend-auth";
import type { Role } from "#/blocks/backend-auth";
```

`AuthService.getSession(request)` and `.requireRole(request, roles)` are the only
way other blocks check identity.

## Depends on

- `#/blocks/contracts` — `AuthenticatedUser`, `Role`
- `#/db` — better-auth tables live in the existing Drizzle database

## Done when

- [ ] Email + password sign-in works end to end; session cookie is HttpOnly
- [ ] Role matrix documented and enforced on the server (401 vs 403)
- [ ] One protected example route proves the guard works
- [ ] Login attempts rate-limited; errors do not leak whether an account exists
- [ ] Audit log of role changes and data mutations
- [ ] Tests: session valid/expired, each role against each guard
- [ ] The existing `/api/auth/$` route keeps working (no breaking change)
