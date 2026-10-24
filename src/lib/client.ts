// Details the browser exposes about the device and connection.

interface NetworkInformation {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

interface NavigatorExtras {
  connection?: NetworkInformation
  deviceMemory?: number
  userAgentData?: {
    platform?: string
    mobile?: boolean
    brands?: { brand: string; version: string }[]
  }
}

export type Row = [label: string, value: string]

function gpuRenderer(): string | null {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    if (!gl) return null
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    return ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER))
  } catch {
    return null
  }
}

function browserName(): string {
  const nav = navigator as Navigator & NavigatorExtras
  const brands = nav.userAgentData?.brands?.filter(b => !/not.?a.?brand/i.test(b.brand))
  if (brands?.length) {
    const preferred = brands.find(b => b.brand !== 'Chromium') ?? brands[0]
    if (preferred) return `${preferred.brand} ${preferred.version}`
  }
  const ua = navigator.userAgent
  const match = ua.match(/(Edg|OPR|Firefox|Chrome|Version)\/([\d.]+)/) ?? null
  const [, name, version] = match ?? []
  if (!name || !version) return 'Unknown'
  const names: Record<string, string> = {
    Edg: 'Edge',
    OPR: 'Opera',
    Version: 'Safari'
  }
  return `${names[name] ?? name} ${version.split('.')[0]}`
}

const yesNo = (v: boolean) => (v ? 'Yes' : 'No')

export function deviceRows(): Row[] {
  const nav = navigator as Navigator & NavigatorExtras
  const rows: (Row | null)[] = [
    ['Browser', browserName()],
    ['Platform', nav.userAgentData?.platform || navigator.platform || 'Unknown'],
    [
      'Mobile',
      nav.userAgentData
        ? yesNo(!!nav.userAgentData.mobile)
        : yesNo(navigator.maxTouchPoints > 0 && /Mobi/.test(navigator.userAgent))
    ],
    ['CPU cores', String(navigator.hardwareConcurrency ?? 'Unknown')],
    nav.deviceMemory ? ['Memory', `≥ ${nav.deviceMemory} GB`] : null,
    ['GPU', gpuRenderer() ?? 'Unknown'],
    ['Screen', `${screen.width} × ${screen.height} @ ${window.devicePixelRatio}x`],
    ['Viewport', `${window.innerWidth} × ${window.innerHeight}`],
    ['Color depth', `${screen.colorDepth}-bit`],
    ['Touch points', String(navigator.maxTouchPoints)]
  ]
  return rows.filter((r): r is Row => r !== null)
}

export function browserRows(): Row[] {
  const nav = navigator as Navigator & NavigatorExtras
  const conn = nav.connection
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const rows: (Row | null)[] = [
    ['Languages', navigator.languages.join(', ')],
    ['Time zone', tz],
    ['Cookies', navigator.cookieEnabled ? 'Enabled' : 'Disabled'],
    ['Do Not Track', navigator.doNotTrack === '1' ? 'On' : 'Off'],
    ['Color scheme', matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'],
    ['Reduced motion', yesNo(matchMedia('(prefers-reduced-motion: reduce)').matches)],
    ['Online', yesNo(navigator.onLine)],
    conn?.effectiveType ? ['Connection', conn.effectiveType.toUpperCase()] : null,
    conn?.downlink !== undefined ? ['Downlink', `~${conn.downlink} Mbps`] : null,
    conn?.rtt !== undefined ? ['Round trip', `~${conn.rtt} ms`] : null,
    conn?.saveData !== undefined ? ['Data saver', yesNo(conn.saveData)] : null,
    ['Referrer', document.referrer || 'None']
  ]
  return rows.filter((r): r is Row => r !== null)
}
