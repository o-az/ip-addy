# IP Addy

Shows your public IP address and everything that can be derived from it or from your browser:

- **IP**: public IPv4 (with copy button) and ISP up top, IPv6 in the table, inline lookup of any IPv4 or IPv6 address
- **Location**: city, region, postal code, country + flag, continent, capital, EU membership, calling code, coordinates, map (OpenStreetMap)
- **Network**: ISP, organization, ASN, domain, reverse hostname (when available)
- **Time**: IP time zone, UTC offset, DST, live local time there vs. yours
- **Device / browser**: browser, platform, CPU cores, memory, GPU, screen, viewport, languages, time zone, cookies, DNT, color scheme, connection type/speed, user agent
- **Copy all as JSON**: every field above in one JSON blob

IP data comes from free public APIs, tried in order until one succeeds: [ipwho.is](https://ipwho.is), [ipapi.co](https://ipapi.co), [ipinfo.io](https://ipinfo.io). IPv4/IPv6 detection uses [ipify](https://www.ipify.org). No API keys required. The UI calls these APIs directly; JSON URLs use a small server function.

Use the pencil beside the IP address to look up another address. Press Enter to look up, or Escape to cancel. “My IP” returns to your own address. Lookups are saved in the URL as `/8.8.8.8` (IPv6 works too), so you can bookmark or share them; browser Back and Forward restore previous lookups.

## URLs and JSON

New lookup links use paths, for example `/8.8.8.8` or `/2001:4860:4860::8888`.
The editor updates the path; Back and Forward restore previous lookups. Old
`?ip=` links still work. A path takes precedence when both are present, and
“My IP” returns to `/`.

`GET /json` returns the requester's IP details as an actual `application/json`
response. `GET /8.8.8.8.json` (or any IPv6 address followed by `.json`) returns
that address's details. Both use the same provider fallback and normalized
fields as the UI. Browser/device fields are only available in the UI's
“Copy all as JSON” export, not from a server request.

Invalid addresses return `400` with `{"error":"Invalid IPv4 or IPv6 address"}`.
Upstream failures return `502`; a missing client IP returns `503`. Responses
are not cached, so `/json` cannot leak another visitor's IP through a shared
cache. IP geolocation is approximate and providers may reject private addresses.

## Deployment and development

The existing GitHub deployments use **Vercel**. `api/[ip].ts` is a Vercel Node
function; `vercel.json` sends JSON URLs to it and serves the SPA for IP paths.
The function uses Vercel's edge-provided client IP header, never its own outbound
address. Deploy the full repository with the Vite framework preset, not only
the `dist` directory. No API keys or extra environment variables are needed.

Run `npm ci`, then `npm run dev`. Vite middleware provides the same JSON routes
locally. It uses the socket address rather than trusting forwarding headers;
for loopback requests it resolves the developer network's public IPv4 via ipify.
A reverse proxy in front of the local server is not equivalent to Vercel's
trusted edge and may report that proxy's IP.

`npm run build` type-checks both client and server code. `npm run preview`
serves the build with the same local JSON middleware and SPA fallback.
