# IP Addy

Shows your public IP address and everything that can be derived from it or from your browser:

- **IP**: public IPv4 (with copy button) and ISP up top, IPv6 in the table, lookup of any other IP
- **Location**: city, region, postal code, country + flag, continent, capital, EU membership, calling code, coordinates, map (OpenStreetMap)
- **Network**: ISP, organization, ASN, domain, reverse hostname (when available)
- **Time**: IP time zone, UTC offset, DST, live local time there vs. yours
- **Device / browser**: browser, platform, CPU cores, memory, GPU, screen, viewport, languages, time zone, cookies, DNT, color scheme, connection type/speed, user agent
- **Copy all as JSON**: every field above in one JSON blob

IP data comes from free public APIs, tried in order until one succeeds: [ipwho.is](https://ipwho.is), [ipapi.co](https://ipapi.co), [ipinfo.io](https://ipinfo.io). IPv4/IPv6 detection uses [ipify](https://www.ipify.org). No API keys or backend required.
