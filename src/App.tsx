import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { browserRows, deviceRows } from './lib/client'
import { fetchAddress, isValidIp, lookupIp, type IpInfo } from './lib/ip'
import './App.css'

type LookupResult =
  | { target: string; status: 'error'; message: string }
  | { target: string; status: 'ready'; info: IpInfo }

type LookupState = LookupResult | { status: 'loading' }

type UrlTarget = { target: string; invalid: string | null }

const invalidMessage = (ip: string) => `"${ip}" is not a valid IPv4 or IPv6 address`

/** Path lookups take precedence over legacy ?ip= links. Never fetch invalid input. */
function readUrlTarget(): UrlTarget {
  let path: string
  try {
    path = decodeURIComponent(window.location.pathname.slice(1).replace(/\/$/, ''))
  } catch {
    return { target: '', invalid: window.location.pathname.slice(1) }
  }
  const raw = path || new URLSearchParams(window.location.search).get('ip')?.trim() || ''
  if (raw && !isValidIp(raw)) return { target: '', invalid: raw }
  return { target: raw, invalid: null }
}

/** New lookups use paths; unrelated query parameters and the hash are kept. */
function urlWithTarget(ip: string): string {
  const url = new URL(window.location.href)
  url.pathname = ip ? `/${ip}` : '/'
  url.searchParams.delete('ip')
  return url.toString()
}

type TableRow = [label: string, value: ReactNode]
type Section = { title: string; rows: TableRow[]; footer?: ReactNode }

/** Lets long IPv6 addresses wrap only between groups. */
function BreakableIp({ ip }: { ip: string }) {
  return ip.split(':').map((part, i) => (
    <Fragment key={i}>
      {i > 0 && (
        <>
          :<wbr />
        </>
      )}
      {part}
    </Fragment>
  ))
}

function CopyButton({
  text,
  label,
  idleText = 'Copy',
  className = 'copy',
  iconOnly = false,
}: {
  text: string
  label: string
  idleText?: string
  className?: string
  iconOnly?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API is unavailable (insecure context, denied permission): legacy path.
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.append(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      if (!ok) return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  // Text labels share a grid cell; icon feedback keeps the same dimensions.
  return (
    <>
      <button type="button" className={className} onClick={copy} aria-label={label} title={label}>
        {iconOnly ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {copied ? <path d="m5 12 4 4L19 6" /> : (
                <>
                  <rect x="8" y="8" width="12" height="12" rx="2" />
                  <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
                </>
              )}
            </svg>
          </>
        ) : (
          <>
            <span className={copied ? 'hidden' : undefined}>{idleText}</span>
            <span className={copied ? undefined : 'hidden'} aria-live="polite">
              Copied
            </span>
          </>
        )}
      </button>
      {iconOnly && <span className="sr-only" role="status">{copied ? 'Copied' : ''}</span>}
    </>
  )
}

function Clock({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now)
  } catch {
    return '—'
  }
}

function MapBox({ lat, lon }: { lat: number; lon: number }) {
  const d = 0.08
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=11/${lat}/${lon}`
  return (
    <div className="map">
      <iframe title="Approximate location map" src={embed} loading="lazy" />
      <a href={link} target="_blank" rel="noreferrer">
        Open larger map ↗
      </a>
    </div>
  )
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : String(v)

const yesNo = (v: boolean | null) => (v === null ? '—' : v ? 'Yes' : 'No')

function ipSections(info: IpInfo, ipv6: ReactNode | undefined): Section[] {
  const { latitude: lat, longitude: lon } = info
  const network: TableRow[] = [
    ipv6 === undefined ? ['IP version', dash(info.type)] : ['IPv6', ipv6],
    ['Organization', dash(info.connection.org)],
    ['ASN', info.connection.asn ? `AS${info.connection.asn}` : '—'],
    ['Domain', dash(info.connection.domain)],
    ['Hostname', dash(info.connection.hostname)],
  ]
  return [
    { title: 'Network', rows: network },
    {
      title: 'Location',
      rows: [
        ['City', dash(info.city)],
        ['Region', dash(info.region)],
        ['Postal code', dash(info.postal)],
        ['Country', info.country ? `${info.country} (${info.countryCode})` : '—'],
        ['Continent', dash(info.continent)],
        ['Capital', dash(info.capital)],
        ['In the EU', yesNo(info.isEu)],
        ['Calling code', dash(info.callingCode)],
        [
          'Coordinates',
          lat !== null && lon !== null ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : '—',
        ],
      ],
      footer: lat !== null && lon !== null ? <MapBox lat={lat} lon={lon} /> : undefined,
    },
    {
      title: 'Time',
      rows: [
        ['Time zone', dash(info.timezone.id)],
        ['Abbreviation', dash(info.timezone.abbr)],
        ['UTC offset', dash(info.timezone.utc)],
        ['Daylight saving', yesNo(info.timezone.isDst)],
        ['Local time there', info.timezone.id ? <Clock key="there" timeZone={info.timezone.id} /> : '—'],
        ['Your time', <Clock key="here" timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />],
      ],
    },
  ]
}

function InfoTable({ sections }: { sections: Section[] }) {
  return (
    <table className="info">
      {sections.map((section) => (
        <tbody key={section.title}>
          <tr>
            <th colSpan={2} scope="colgroup">
              {section.title}
            </th>
          </tr>
          {section.rows.map(([label, value]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{value}</td>
            </tr>
          ))}
          {section.footer && (
            <tr>
              <td colSpan={2} className="section-footer">
                {section.footer}
              </td>
            </tr>
          )}
        </tbody>
      ))}
    </table>
  )
}

export default function App() {
  const [initial] = useState(readUrlTarget)
  const [target, setTarget] = useState(initial.target) // '' means "my own IP"
  const [badIp, setBadIp] = useState(initial.invalid) // invalid URL value, never fetched
  const [editing, setEditing] = useState(initial.invalid !== null)
  const [draft, setDraft] = useState(initial.invalid ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  // undefined = still resolving, null = not available on this network.
  const [v4, setV4] = useState<string | null | undefined>(undefined)
  const [v6, setV6] = useState<string | null | undefined>(undefined)
  const [inputError, setInputError] = useState<string | null>(initial.invalid === null ? null : invalidMessage(initial.invalid))

  const [device] = useState(deviceRows)
  const [browser] = useState(browserRows)

  // For "my IP", look up the IPv4 address so the details match the headline; fall
  // back to whatever address the provider sees when there is no IPv4. null = wait.
  const lookupKey = badIp !== null ? null : target || (v4 === undefined ? null : (v4 ?? ''))

  // A result for a previous key means the current lookup is still in flight.
  const state: LookupState =
    result && result.target === lookupKey ? result : { status: 'loading' }

  useEffect(() => {
    if (lookupKey === null) return
    const controller = new AbortController()
    lookupIp(lookupKey, controller.signal)
      .then((info) => setResult({ target: lookupKey, status: 'ready', info }))
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            target: lookupKey,
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          })
      })
    return () => controller.abort()
  }, [lookupKey])

  useEffect(() => {
    const controller = new AbortController()
    fetchAddress('v4', controller.signal).then((ip) => {
      if (!controller.signal.aborted) setV4(ip)
    })
    fetchAddress('v6', controller.signal).then((ip) => {
      if (!controller.signal.aborted) setV6(ip)
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const onPop = () => {
      const next = readUrlTarget()
      setTarget(next.target)
      setBadIp(next.invalid)
      setDraft(next.invalid ?? '')
      setInputError(next.invalid === null ? null : invalidMessage(next.invalid))
      setEditing(next.invalid !== null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else if (restoreFocus.current) {
      restoreFocus.current = false
      editRef.current?.focus()
    }
  }, [editing])

  const close = () => {
    restoreFocus.current = true
    setEditing(false)
    setInputError(null)
  }

  const goTo = (ip: string) => {
    if (urlWithTarget(ip) !== window.location.href) {
      history.pushState(null, '', urlWithTarget(ip))
      setTarget(ip)
      setBadIp(null)
    }
    close()
  }

  const startEditing = () => {
    setDraft(badIp ?? (info?.ip ?? target))
    setEditing(true)
  }

  const cancel = () => {
    if (badIp !== null) {
      // Drop the unusable lookup path or query so the page falls back to your own IP.
      history.replaceState(null, '', urlWithTarget(''))
      setBadIp(null)
    }
    close()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const ip = draft.trim()
    if (ip && !isValidIp(ip)) {
      setInputError(invalidMessage(ip))
      return
    }
    if (badIp === null && ip === (target || info?.ip || '')) {
      close()
      return
    }
    goTo(ip)
    window.scrollTo({ top: 0 })
  }

  const info = state.status === 'ready' ? state.info : null

  // For your own IP, show the IPv6 address in the table unless it is already the headline.
  let ipv6: ReactNode | undefined
  if (!target && info && v6 !== info.ip) {
    ipv6 = v6 === undefined ? '…' : v6 === null ? 'Not available' : <BreakableIp ip={v6} />
  }

  const sections: Section[] = [
    ...(info ? ipSections(info, ipv6) : []),
    { title: 'Device', rows: device },
    {
      title: 'Browser',
      rows: [...browser, ['User agent', <span key="ua" className="mono">{navigator.userAgent}</span>]],
    },
  ]

  const json = info
    ? JSON.stringify(
        {
          ...info,
          ...(target ? {} : { addresses: { ipv4: v4 ?? null, ipv6: v6 ?? null } }),
          device: Object.fromEntries(device),
          browser: { ...Object.fromEntries(browser), userAgent: navigator.userAgent },
        },
        null,
        2,
      )
    : null

  return (
    <main>
      <header className="hero">
        <form className="ip-line" onSubmit={onSubmit} onKeyDown={onKeyDown}>
          <h1 className={info?.ip.includes(':') || (editing && draft.includes(':')) ? 'ip ip-v6' : 'ip'}>
            {editing ? (
              <input
                ref={inputRef}
                className="ip-input"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setInputError(null)
                }}
                aria-label="IP address to look up"
                aria-invalid={inputError !== null}
                aria-describedby={inputError ? 'ip-error' : undefined}
                placeholder="e.g. 8.8.8.8"
                inputMode="text"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            ) : state.status === 'loading' ? (
              <span className="skeleton">000.000.000.000</span>
            ) : info ? (
              info.ip
            ) : (
              'Lookup failed'
            )}
          </h1>
          <div className="ip-actions">
            {editing ? (
              <Fragment key="editing">
                <button type="submit" className="copy primary">
                  Look up
                </button>
                <button type="button" className="copy" onClick={cancel}>
                  Cancel
                </button>
              </Fragment>
            ) : (
              <Fragment key="display">
                <button
                  ref={editRef}
                  type="button"
                  className="ip-action"
                  onClick={startEditing}
                  aria-label="Edit IP address"
                  title="Edit IP address"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m16 3 5 5-12 12-6 1 1-6Z" />
                    <path d="m14 5 5 5" />
                  </svg>
                </button>
                {info && <CopyButton text={info.ip} label="Copy IP address" className="ip-action" iconOnly />}
              </Fragment>
            )}
          </div>
        </form>
        {inputError && (
          <p className="input-error" id="ip-error" role="alert">
            {inputError}
          </p>
        )}
        {!editing && state.status === 'error' && <p className="isp">{state.message}</p>}
        {!editing && info && <p className="isp">{info.connection.isp ?? 'Unknown ISP'}</p>}
        {!editing && state.status === 'loading' && <p className="isp">&nbsp;</p>}
        {(target || badIp !== null) && (
          <button type="button" className="copy my-ip" onClick={() => goTo('')}>
            My IP
          </button>
        )}
      </header>

      <InfoTable sections={sections} />

      {json && (
        <CopyButton
          text={json}
          label="Copy all details as JSON"
          idleText="Copy all as JSON"
          className="copy copy-json"
        />
      )}

      <footer>
        IP data from {info?.source ?? 'ipwho.is'}. Locations are approximate. Device and browser
        details are read locally by your browser.
      </footer>
    </main>
  )
}
