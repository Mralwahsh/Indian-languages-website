// Nicknames for the chess leaderboard, checked the same way on the phone and on the server.

export const NICK_MAX = 12

// Short words must match a whole word (so ordinary words that contain them stay allowed);
// longer ones are blocked anywhere in the name.
const WHOLE = ['كس', 'زب', 'طيز', 'نيك', 'خول', 'sex', 'ass', 'fag', 'cum', 'tit', 'tits']
const ANYWHERE = [
  'fuck', 'shit', 'bitch', 'dick', 'cock', 'pussy', 'porn', 'nigg', 'cunt', 'asshole', 'whore', 'slut', 'bastard', 'rape', 'nazi', 'hitler',
  'شرموط', 'قحب', 'منيوك', 'منيك', 'عرص', 'لوطي', 'كسخت', 'زبي', 'نياك', 'متناك',
]

/** A clean nickname (trimmed, at most NICK_MAX characters), or null if it is empty or not allowed. */
export function cleanNickname(raw) {
  const name = String(raw ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f<>{}"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICK_MAX)
  if (!name) return null
  // look through spacing, repeated letters and look-alike digits ("f u c k", "fuuuck", "sh1t")
  const flat = name
    .toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[$5]/g, 's')
    .replace(/[ً-ٟـ]/g, '') // Arabic marks and tatweel
  const words = flat.split(/[^a-z؀-ۿ]+/).filter(Boolean)
  const joined = flat.replace(/[^a-z؀-ۿ]/g, '').replace(/(.)\1+/g, '$1')
  if (words.some((w) => WHOLE.includes(w))) return null
  if (ANYWHERE.some((w) => joined.includes(w.replace(/(.)\1+/g, '$1')))) return null
  return name
}
