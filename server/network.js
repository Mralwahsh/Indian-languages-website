import os from 'node:os'

const isPrivate = (ip) =>
  /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)

// Adapters that exist on many laptops but that phones can never reach
const VIRTUAL = /virtualbox|vmware|vethernet|hyper-v|wsl|docker|loopback|bluetooth|tailscale|zerotier|vpn|tap|tun/i
const VIRTUAL_SUBNET = /^192\.168\.56\./ // VirtualBox host-only default

/** All non-internal IPv4 addresses of this machine, e.g. [{ name: 'Wi-Fi', address: '192.168.1.20' }] */
export function listIPv4() {
  const out = []
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      const v4 = a.family === 'IPv4' || a.family === 4
      if (v4 && !a.internal) out.push({ name, address: a.address })
    }
  }
  return out
}

/** Higher = better guess for "the address phones can reach". */
function score({ name, address }) {
  if (address.startsWith('192.168.137.')) return 100 // Windows Mobile Hotspot
  if (address.startsWith('169.254.')) return -10 // no DHCP
  let s = isPrivate(address) ? 50 : 10
  if (VIRTUAL.test(name) || VIRTUAL_SUBNET.test(address)) s -= 40
  if (/wi-?fi|wlan|wireless|local area connection\*/i.test(name)) s += 10
  return s
}

/**
 * The address phones should use to reach this laptop.
 * 1. HOST_IP env variable (manual override)
 * 2. Windows Mobile Hotspot address (192.168.137.x)
 * 3. a private IPv4 on a real (non-virtual) adapter, Wi-Fi first
 * 4. any IPv4, else localhost
 */
export function getLanIp() {
  if (process.env.HOST_IP) return process.env.HOST_IP
  const best = listIPv4().sort((a, b) => score(b) - score(a))[0]
  return best?.address ?? 'localhost'
}
