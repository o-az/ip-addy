import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { fetchAddress } from '../src/lib/ip.ts'
import { isJsonPath, jsonResponse } from './json.ts'

async function middleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!isJsonPath(url.pathname)) return next()

  // Local dev trusts the socket, not spoofable forwarding headers. A loopback
  // request represents the developer's own network, so resolve its public IP.
  let clientIp = req.socket.remoteAddress?.replace(/^::ffff:/, '')
  if (/^\/(?:json|api\/json)\/?$/.test(url.pathname)
    && (clientIp === '127.0.0.1' || clientIp === '::1')) {
    clientIp = await fetchAddress('v4', AbortSignal.timeout(5000)) ?? undefined
  }

  const controller = new AbortController()
  res.on('close', () => controller.abort())
  const response = await jsonResponse(new Request(url, {
    method: req.method,
    signal: controller.signal,
  }), clientIp)
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(Buffer.from(await response.arrayBuffer()))
}

export function jsonRoutes(): Plugin {
  return {
    name: 'ip-json-routes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        middleware(req, res, next).catch(next)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        middleware(req, res, next).catch(next)
      })
    },
  }
}
