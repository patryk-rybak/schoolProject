---
name: tanstack
description: Load version-matched TanStack Start, Router, Query, and Table guidance from installed packages before changing TanStack code.
allowed-tools: Bash(bunx --no-install --package @tanstack/intent intent *), Bash(bunx @tanstack/intent@latest *), Read, Grep, Glob
---

# TanStack Agent Skills

This repository installs TanStack packages that ship their own `SKILL.md` guidance. Load the installed version before editing TanStack code instead of relying on general knowledge.

## Workflow

1. List the available skills:

   ```bash
   bunx --no-install --package @tanstack/intent intent list
   ```

2. Load the skill that matches the task. Common entry points:

   - Start setup, root route, rendering: `@tanstack/react-start#react-start`
   - Start server functions and API routes: `@tanstack/start-client-core#start-core`
   - Router core concepts, routes, loaders: `@tanstack/router-core#router-core`
   - React Router hooks and components: `@tanstack/react-router#react-router`
   - Router plus Query integration: `@tanstack/react-router#compositions/router-query`
   - Table setup: `@tanstack/react-table#getting-started`

   ```bash
   bunx --no-install --package @tanstack/intent intent load <package>#<skill>
   ```

3. Follow the loaded guidance while making the change. Load sub-skills when the task spans multiple concerns, such as routing plus data loading.

If the CLI is unavailable, run `bun install` and retry. Do not fetch guidance from the network.

For shadcn components, use the `/shadcn` skill and the configured shadcn MCP server.
