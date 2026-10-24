export interface IpInfo {
  ip: string
  type: string | null
  continent: string | null
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
  postal: string | null
  latitude: number | null
  longitude: number | null
  callingCode: string | null
  capital: string | null
  isEu: boolean | null
  timezone: {
    id: string | null
    abbr: string | null
    utc: string | null
    isDst: boolean | null
  }
  connection: {
    asn: number | null
    org: string | null
    isp: string | null
    domain: string | null
    hostname: string | null
  }
  source: string
}

// Shapes of the upstream responses, limited to the fields we read.
interface IpWhoIsResponse {
  success: boolean
  message?: string
  ip: string
  type?: string
  continent?: string
  country?: string
  country_code?: string
  region?: string
  city?: string
  postal?: string
  latitude?: number
  longitude?: number
  is_eu?: boolean
  calling_code?: string
  capital?: string
  connection?: { asn?: number; org?: string; isp?: string; domain?: string }
  timezone?: { id?: string; abbr?: string; is_dst?: boolean; utc?: string }
}

interface IpApiCoResponse {
  error?: boolean
  reason?: string
  ip: string
  version?: string
  city?: string
  region?: string
  country_name?: string
  country_code?: string
  continent_code?: string
  postal?: string
  latitude?: number
  longitude?: number
  timezone?: string
  utc_offset?: string
  country_calling_code?: string
  country_capital?: string
  in_eu?: boolean
  asn?: string
  org?: string
}

interface IpInfoIoResponse {
  ip: string
  hostname?: string
  city?: string
  region?: string
  country?: string
  loc?: string
  org?: string
  postal?: string
  timezone?: string
  error?: { title?: string; message?: string }
}

const orNull = <T>(value: T | undefined | ''): T | null =>
  value === undefined || value === '' ? null : value

async function fromIpWhoIs(ip: string, signal: AbortSignal): Promise<IpInfo> {
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal })
  const data = (await res.json()) as IpWhoIsResponse
  if (!data.success) throw new Error(data.message ?? 'ipwho.is lookup failed')
  return {
    ip: data.ip,
    type: orNull(data.type),
    continent: orNull(data.continent),
    country: orNull(data.country),
    countryCode: orNull(data.country_code),
    region: orNull(data.region),
    city: orNull(data.city),
    postal: orNull(data.postal),
    latitude: orNull(data.latitude),
    longitude: orNull(data.longitude),
    callingCode: data.calling_code ? `+${data.calling_code}` : null,
    capital: orNull(data.capital),
    isEu: orNull(data.is_eu),
    timezone: {
      id: orNull(data.timezone?.id),
      abbr: orNull(data.timezone?.abbr),
      utc: orNull(data.timezone?.utc),
      isDst: orNull(data.timezone?.is_dst),
    },
    connection: {
      asn: orNull(data.connection?.asn),
      org: orNull(data.connection?.org),
      isp: orNull(data.connection?.isp),
      domain: orNull(data.connection?.domain),
      hostname: null,
    },
    source: 'ipwho.is',
  }
}

async function fromIpApiCo(ip: string, signal: AbortSignal): Promise<IpInfo> {
  const path = ip ? `${encodeURIComponent(ip)}/json/` : 'json/'
  const res = await fetch(`https://ipapi.co/${path}`, { signal })
  const data = (await res.json()) as IpApiCoResponse
  if (data.error) throw new Error(data.reason ?? 'ipapi.co lookup failed')
  const asn = data.asn ? Number(data.asn.replace(/^AS/i, '')) : NaN
  const utc = data.utc_offset
    ? `${data.utc_offset.slice(0, 3)}:${data.utc_offset.slice(3)}`
    : null
  return {
    ip: data.ip,
    type: orNull(data.version),
    continent: orNull(data.continent_code),
    country: orNull(data.country_name),
    countryCode: orNull(data.country_code),
    region: orNull(data.region),
    city: orNull(data.city),
    postal: orNull(data.postal),
    latitude: orNull(data.latitude),
    longitude: orNull(data.longitude),
    callingCode: orNull(data.country_calling_code),
    capital: orNull(data.country_capital),
    isEu: orNull(data.in_eu),
    timezone: { id: orNull(data.timezone), abbr: null, utc, isDst: null },
    connection: {
      asn: Number.isNaN(asn) ? null : asn,
      org: orNull(data.org),
      isp: orNull(data.org),
      domain: null,
      hostname: null,
    },
    source: 'ipapi.co',
  }
}

async function fromIpInfoIo(ip: string, signal: AbortSignal): Promise<IpInfo> {
  const path = ip ? `${encodeURIComponent(ip)}/json` : 'json'
  const res = await fetch(`https://ipinfo.io/${path}`, { signal })
  const data = (await res.json()) as IpInfoIoResponse
  if (data.error || !res.ok) throw new Error(data.error?.message ?? 'ipinfo.io lookup failed')
  // org looks like "AS15169 Google LLC".
  const orgMatch = data.org?.match(/^AS(\d+)\s+(.*)$/)
  const [lat, lon] = (data.loc ?? '').split(',').map(Number)
  const hasLoc = data.loc !== undefined && !Number.isNaN(lat) && !Number.isNaN(lon)
  const countryName = data.country
    ? (new Intl.DisplayNames(['en'], { type: 'region' }).of(data.country) ?? data.country)
    : null
  return {
    ip: data.ip,
    type: data.ip.includes(':') ? 'IPv6' : 'IPv4',
    continent: null,
    country: countryName,
    countryCode: orNull(data.country),
    region: orNull(data.region),
    city: orNull(data.city),
    postal: orNull(data.postal),
    latitude: hasLoc ? lat : null,
    longitude: hasLoc ? lon : null,
    callingCode: null,
    capital: null,
    isEu: null,
    timezone: { id: orNull(data.timezone), abbr: null, utc: null, isDst: null },
    connection: {
      asn: orgMatch ? Number(orgMatch[1]) : null,
      org: orgMatch ? orgMatch[2] : orNull(data.org),
      isp: orgMatch ? orgMatch[2] : orNull(data.org),
      domain: null,
      hostname: orNull(data.hostname),
    },
    source: 'ipinfo.io',
  }
}

const providers = [fromIpWhoIs, fromIpApiCo, fromIpInfoIo]

const IPV4 = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

export function isValidIp(value: string): boolean {
  if (IPV4.test(value)) return true
  if (!value.includes(':') || !/^[\da-f:.]+$/i.test(value)) return false
  // The URL parser validates bracketed IPv6 literals for us.
  try {
    new URL(`http://[${value}]`)
    return true
  } catch {
    return false
  }
}

/** Look up an IP address (or the caller's own IP when `ip` is empty). */
export async function lookupIp(ip: string, signal: AbortSignal): Promise<IpInfo> {
  // Free tiers rate-limit aggressively, so fall through providers in order.
  let firstError: unknown
  for (const provider of providers) {
    try {
      return await provider(ip, AbortSignal.any([signal, AbortSignal.timeout(5000)]))
    } catch (err) {
      if (signal.aborted) throw err
      firstError ??= err
    }
  }
  throw firstError
}

/** Resolve the caller's address over a specific IP family; null when unavailable. */
export async function fetchAddress(
  family: 'v4' | 'v6',
  signal: AbortSignal,
): Promise<string | null> {
  const host = family === 'v4' ? 'api.ipify.org' : 'api6.ipify.org'
  try {
    const res = await fetch(`https://${host}?format=json`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    })
    const data = (await res.json()) as { ip?: string }
    return data.ip ?? null
  } catch {
    return null
  }
}
