/** 528000000 → "528 مليون", 830846 → "830,000" */
export function formatSpeakers(n) {
  if (!n) return '—'
  if (n >= 1e6) return `${Math.round(n / 1e6).toLocaleString('en-US')} مليون`
  return (Math.round(n / 1e4) * 1e4 || n).toLocaleString('en-US')
}
