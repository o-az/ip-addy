# IP Addy development

IP Addy is a Vite + React app deployed on Vercel. Keep changes focused, do not add tests unless asked, and avoid TypeScript casts and non-null assertions when proper narrowing works.

## Commands

Use Bun (the version in package.json), or run mise install to set up the tooling.

- bun install --frozen-lockfile
- bun dev
- bun format
- bun lint
- bun check
- bun check:types
- bun run build
- bun preview

The single root tsconfig.json covers the app, server, API, and tooling. Keep rewriteRelativeImportExtensions enabled at the root. Vercel reads this file when compiling the Node function; the .ts imports must become .js imports in the emitted function.

Formatting and linting match o-az/h0n0. mise ci also runs the hk formatting/lint hooks, type checking, and the production build. GitHub checks use the same mise task; Vercel's GitHub integration handles deployment, so no Cloudflare credentials or separate deployment action is needed.

## Deployment and local JSON routes

The existing GitHub deployments use **Vercel**. `api/[ip].ts` is a Vercel Node function; `vercel.json` sends JSON URLs to it and serves the SPA for IP paths. The function uses Vercel's edge-provided client IP header, never its own outbound address. Deploy the full repository with the Vite framework preset, not only the `dist` directory. No API keys or extra environment variables are needed.

Run `bun install --frozen-lockfile`, then `bun dev`. Vite middleware provides the same JSON routes locally. It uses the socket address rather than trusting forwarding headers; for loopback requests it resolves the developer network's public IPv4 via ipify. A reverse proxy in front of the local server is not equivalent to Vercel's trusted edge and may report that proxy's IP.

`bun run build` type-checks both client and server code. `bun preview` serves the build with the same local JSON middleware and SPA fallback.
