import { isValidIp, lookupIp } from '../src/lib/ip.js'

export function isJsonPath(pathname: string): boolean {
  return /^\/(?:json|[^/]*\.json)\/?$/.test(pathname)
    || /^\/api\/[^/]+\/?$/.test(pathname)
}

/** Works with either the original public URL or Vercel's rewritten /api/<ip>. */
export async function jsonResponse(request: Request, clientIp?: string): Promise<Response> {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  const error = (message: string, status: number) =>
    Response.json({ error: message }, { status, headers })

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    headers.set('Allow', 'GET, HEAD')
    return error('Method not allowed', 405)
  }

  let address: string
  try {
    address = decodeURIComponent(new URL(request.url).pathname)
      .replace(/^\/api\//, '/').replace(/\/$/, '').slice(1)
  } catch {
    return error('Invalid IPv4 or IPv6 address', 400)
  }
  const ownIp = address === 'json'
  const ip = ownIp ? clientIp : address.replace(/\.json$/, '')
  if (!ip || !isValidIp(ip)) {
    return ownIp
      ? error('Client IP is unavailable', 503)
      : error('Invalid IPv4 or IPv6 address', 400)
  }

  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15000)])
    const info = await lookupIp(ip, signal)
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(info), {
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch {
    return error('IP lookup failed. Please try again later.', 502)
  }
}
