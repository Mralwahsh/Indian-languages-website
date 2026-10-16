// Small Devanagari toolkit: parse into syllables, guess Hindi schwa deletion,
// and render a "phonetic" spelling (explicit viramas) + a readable romanisation.

const VIRAMA = '्'
const NUKTA = '़'

const isConsonant = (c) => /[क-हक़-य़ॸ-ॿ]/.test(c)
const isIndependentVowel = (c) => /[ऄ-औॠॡॲ-ॷ]/.test(c)
const isMatra = (c) => /[ऺऻा-ौॎॏॕ-ॗॢॣ]/.test(c)
const isModifier = (c) => /[ऀ-ः]/.test(c)

/**
 * Parse one Devanagari word into syllables:
 * { cons: ['क', 'ष'], vowel: 'ा' | 'a' (inherent) | null (dead), independent: 'अ'|null, mods: 'ं' }
 */
export function parseSyllables(word) {
  const chars = [...word.normalize('NFC')]
  const syl = []
  let joinNext = false
  for (let i = 0; i < chars.length; i++) {
    let c = chars[i]
    if (isConsonant(c)) {
      if (chars[i + 1] === NUKTA) c += chars[++i]
      const cur = syl[syl.length - 1]
      if (joinNext && cur) {
        cur.cons.push(c)
        cur.vowel = 'a'
      } else {
        syl.push({ cons: [c], vowel: 'a', independent: null, mods: '' })
      }
      joinNext = false
    } else if (c === VIRAMA) {
      const cur = syl[syl.length - 1]
      if (cur) cur.vowel = null
      joinNext = true
    } else if (isMatra(c)) {
      const cur = syl[syl.length - 1]
      if (cur) cur.vowel = c
      joinNext = false
    } else if (isIndependentVowel(c)) {
      syl.push({ cons: [], vowel: c, independent: c, mods: '' })
      joinNext = false
    } else if (isModifier(c)) {
      const cur = syl[syl.length - 1]
      if (cur) cur.mods += c
    }
  }
  // A trailing virama means the word ended on a dead consonant; nothing to join.
  return syl
}

/** Marks which inherent "a" vowels Hindi speakers don't pronounce (simplified rule). */
export function applySchwaDeletion(syl) {
  const s = syl.map((x) => ({ ...x, cons: [...x.cons] }))
  const n = s.length
  if (n > 1) {
    const last = s[n - 1]
    if (last.vowel === 'a' && last.cons.length === 1 && !last.mods) last.vowel = null
  }
  for (let i = n - 2; i >= 1; i--) {
    const cur = s[i]
    const prev = s[i - 1]
    const next = s[i + 1]
    if (
      cur.vowel === 'a' &&
      cur.cons.length === 1 &&
      !cur.mods &&
      prev.vowel !== null &&
      next.cons.length === 1 &&
      next.vowel !== null
    ) {
      cur.vowel = null
    }
  }
  return s
}

/** Rebuild Devanagari from syllables; dead consonants get an explicit virama. */
export function renderSyllables(syl) {
  return syl
    .map((x) => {
      if (x.independent) return x.independent + x.mods
      const cluster = x.cons.join(VIRAMA)
      if (x.vowel === null) return cluster + VIRAMA + x.mods
      if (x.vowel === 'a') return cluster + x.mods
      return cluster + x.vowel + x.mods
    })
    .join('')
}

/** Devanagari spelling → spelling with viramas wherever the vowel is silent. */
export function toPhoneticDevanagari(word) {
  return renderSyllables(applySchwaDeletion(parseSyllables(word)))
}

const ROMAN_CONS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'फ़': 'f', 'ड़': 'r', 'ढ़': 'rh', 'य़': 'y',
}
const ROMAN_VOWEL = {
  'a': 'a', 'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e',
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऑ': 'o',
}
const romanMods = (m) => m.replace(/[ऀँं]/g, 'n').replace(/ः/g, 'h')

/** Readable pronunciation with syllable hyphens, e.g. अहमद → "ah-mad". */
export function devanagariToPronunciation(word) {
  const syl = applySchwaDeletion(parseSyllables(word))
  const chunks = []
  for (const x of syl) {
    const consRoman = x.cons.map((c) => ROMAN_CONS[c] ?? '')
    if (x.vowel === null) {
      // silent vowel → consonants close the previous syllable
      if (chunks.length) chunks[chunks.length - 1] += consRoman.join('')
      else chunks.push(consRoman.join(''))
      continue
    }
    let onset = consRoman
    if (consRoman.length > 1 && chunks.length) {
      chunks[chunks.length - 1] += consRoman.slice(0, -1).join('')
      onset = consRoman.slice(-1)
    }
    chunks.push(onset.join('') + (ROMAN_VOWEL[x.vowel] ?? '') + romanMods(x.mods))
  }
  return chunks.filter(Boolean).join('-')
}

/** Remove nukta dots (for scripts that don't have those sounds). */
export const stripNukta = (s) => s.normalize('NFC').replaceAll(NUKTA, '')
export { VIRAMA, NUKTA }
