Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
bun install
bun run dev
```

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Use the format `<type>(<scope>): <description>`, for example:

```bash
git commit -m "feat(ui): add data table filters"
git commit -m "fix(auth): handle expired sessions"
```

Common types are `feat`, `fix`, `docs`, `style`, `refactor`, `test`, and `chore`.

# Building For Production

To build this application for production:

```bash
bun run build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`

## Linting & Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The following scripts are available:


```bash
bun run lint
bun run format
bun run check
```


## Deploy with Nitro

This project uses Nitro's Bun preset and runs on the [Bun](https://bun.com) runtime.

```bash
bun run build
bun .output/server/index.mjs
```

The build output is a self-contained Bun server. To deploy, push the `.output/` directory to your host and run the server command above.

For host-specific presets (Vercel, Netlify, Cloudflare, AWS Lambda, etc.) and tuning, see https://v3.nitro.build/deploy.


## Database

The app uses Bun's native SQLite driver through `drizzle-orm/bun-sqlite`. The database file comes from `DATABASE_URL` (defaults to `dev.db`) and WAL mode is enabled at startup.

```bash
bun run db:generate
bun run db:push
```

Drizzle Kit runs on Bun too. `@libsql/client` is installed as a dev dependency because Drizzle Kit needs a SQLite client for its CLI commands; the application itself uses `bun:sqlite`.


## Map

The home page renders a [Protomaps](https://protomaps.com) basemap of Poland with [MapLibre GL JS](https://maplibre.org/) and Polish labels.

Generate the local PMTiles extract (about 100 MB at zoom 10, ignored by git):

```bash
bun run map:tiles
```

The script downloads the latest Protomaps daily build and extracts Poland into `public/poland.pmtiles`. Override the output with `POLAND_MAXZOOM`, `POLAND_BBOX`, or `PROTOMAPS_PLANET_URL`. To use a hosted PMTiles archive instead, set `VITE_PROTOMAPS_PMTILES_URL`.

`bun install` also copies the self-contained MapLibre worker into `public/` via the `postinstall` script, so the map does not depend on a worker CDN.


## Shadcn

Add components using the latest version of [Shadcn](https://ui.shadcn.com/).

```bash
bunx --bun shadcn@latest add button
```


## AI Tooling

- TanStack Agent Skills are enabled through `@tanstack/intent`. `package.json#intent.skills` permits `@tanstack/*`; run `bunx @tanstack/intent@latest list` to inspect the skills that ship with the installed packages.
- The shadcn skill is installed in `.claude/skills/shadcn` and is available in Jcode as `/shadcn`. It reads `components.json` and provides project-aware component guidance.
- The shadcn MCP server is configured in `.jcode/mcp.json` and `.mcp.json`. It runs the shadcn CLI through Bun and can search the official registry. Pass `registries: ["@shadcn"]` explicitly when a client starts outside the project directory.

## T3Env

- You can use T3Env to add type safety to your environment variables.
- Add Environment variables to the `src/env.mjs` file.
- Use the environment variables in your code.

### Usage

```ts
import { env } from "#/env";

console.log(env.VITE_APP_TITLE);
```





## Setting up Better Auth

1. Generate and set the `BETTER_AUTH_SECRET` environment variable in your `.env.local`:

   ```bash
   bunx --bun @better-auth/cli secret
   ```

2. Visit the [Better Auth documentation](https://www.better-auth.com) to unlock the full potential of authentication in your app.

### Adding a Database (Optional)

Better Auth can work in stateless mode, but to persist user data, add a database:

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  // ... rest of config
});
```

Then run migrations:

```bash
bunx --bun @better-auth/cli migrate
```



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).



# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
