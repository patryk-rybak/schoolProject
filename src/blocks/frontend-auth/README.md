# frontend-auth — login and sign-up forms

## Scope

User-facing authentication: login form, registration form, validation messages
(in Polish), error and loading states, keyboard and screen-reader support.

## Owns

- `src/blocks/frontend-auth/**`
- Route files the owner adds: `src/routes/login.tsx`, `src/routes/register.tsx`
  (remember to regenerate `src/routeTree.gen.ts` with `bun run dev` — never edit
  it by hand)

## Public API

```ts
import { LoginForm, SignUpForm } from "#/blocks/frontend-auth";
```

Both components accept `onSubmit`, `error` and `pending`; they never call the
API themselves, so they stay testable and reusable.

## Depends on

- `#/blocks/contracts` — `SignInInput`, `SignUpInput`
- `#/lib/auth-client` — the better-auth client (owned by `backend-auth`)
- `#/components/ui/*` — shadcn fields/buttons (generated, do not hand-edit)

## Done when

- [ ] Login and registration work against the real backend session
- [ ] Field-level validation with Polish messages; server errors surfaced
- [ ] Loading state, disabled submit, no double submit
- [ ] WCAG 2.2 AA: labels, focus order, visible focus, 4.5:1 contrast,
      errors announced (`aria-live`), works at 200% zoom
- [ ] Responsive from 320 px upwards
- [ ] Component tests for validation and error rendering
- [ ] No changes outside the block except the two route files
