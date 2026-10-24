import { jsonResponse } from '../server/json.ts'

export default {
  fetch(request: Request) {
    // Vercel overwrites this header at its edge. Never infer the visitor by
    // asking the upstream to locate this function's outbound IP.
    const ip = request.headers.get('x-vercel-forwarded-for')
      ?? request.headers.get('x-forwarded-for')
    return jsonResponse(request, ip?.split(',')[0]?.trim())
  },
}
