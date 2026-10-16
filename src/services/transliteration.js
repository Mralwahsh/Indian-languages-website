// Name → Indian scripts.
//
// transliterateName(name) is async on purpose: later it can call our Node backend
// (which calls OpenRouter — API keys must NEVER live in the frontend) without
// changing any UI code. The current version runs fully offline:
//   1. hand-made dictionary (src/data/names.json)
//   2. rule-based fallback (marked approximate)
//
// Devanagari is used as the "pivot": every other Indic script is generated from it.
import Sanscript from '@indic-transliteration/sanscript'
import namesData from '../data/names.json'
import { SCRIPTS } from '../config/scripts.js'
import { arabicToDevanagari, arabicToUrdu, normalizeArabic } from './arabicMapping.js'
import { latinToItrans } from './latinMapping.js'
import { devanagariToPronunciation, stripNukta, toPhoneticDevanagari, VIRAMA } from './devanagari.js'

const ARABIC_RE = /[؀-ۿ]/
const LATIN_RE = /[A-Za-z]/

// --- dictionary lookup -------------------------------------------------------
const byLatin = new Map()
const byArabic = new Map()
for (const entry of namesData.names) {
  entry.latin.forEach((k) => byLatin.set(k, entry))
  entry.arabic.forEach((k) => byArabic.set(normalizeArabic(k).replaceAll(' ', ''), entry))
}

function lookup(word) {
  if (ARABIC_RE.test(word)) return byArabic.get(normalizeArabic(word).replaceAll(' ', ''))
  return byLatin.get(word.toLowerCase().replace(/[^a-z]/g, ''))
}

// --- Devanagari → other scripts ---------------------------------------------
const stripFinalVirama = (s) => (s.endsWith(VIRAMA) ? s.slice(0, -1) : s)

// sanscript only understands the precomposed nukta letters (क़ = U+0958 …)
const NUKTA_PRECOMPOSED = { 'क': 'क़', 'ख': 'ख़', 'ग': 'ग़', 'ज': 'ज़', 'ड': 'ड़', 'ढ': 'ढ़', 'फ': 'फ़', 'य': 'य़' }
const precompose = (s) => s.normalize('NFC').replace(/([कखगजडढफय])़/g, (_, c) => NUKTA_PRECOMPOSED[c])
const toScheme = (deva, scheme) => Sanscript.t(precompose(deva), 'devanagari', scheme)

function postBengali(s, assamese = false) {
  // য is pronounced "j" in Bengali; for a "y" sound mid-word, য় is used.
  let out = s.replace(/(?<=[^\s্])য(?!়)/g, 'য়')
  out = out.replace(/্$/, '')
  if (assamese) out = out.replace(/ব(?=[া-ৌ]|$)/g, 'ৱ')
  return out
}

function postTamil(s) {
  return s
    .replace(/[²³⁴']/g, '')
    .replace(/ஃ(?=[கஸ])/g, '') // ख़/क़ → plain க ; keep ஃப (f) and ஃஜ (z)
    .replace(/ஶ/g, 'ஷ')
    .replace(/(?<=\S)ந(?!்த)/gu, 'ன') // ந mostly starts words (and comes before த); elsewhere ன
}

function postGurmukhi(s) {
  return stripFinalVirama(s)
    .replace(/([ਕ-ਹ]਼?)੍(?=\1)/gu, 'ੱ') // doubled consonant → addak ੱ
    .replace(/੍(?![ਰਵਹ])/gu, '') // Gurmukhi only subjoins ਰ ਵ ਹ
}

const MEITEI_LONSUM = { 'ꯀ': 'ꯛ', 'ꯂ': 'ꯜ', 'ꯃ': 'ꯝ', 'ꯄ': 'ꯞ', 'ꯅ': 'ꯟ', 'ꯇ': 'ꯠ', 'ꯉ': 'ꯡ' }
function postMeitei(s) {
  // Meitei writes final consonants with special "lonsum" letters instead of a virama
  return s.replace(/([ꯀꯂꯃꯄꯅꯇꯉ])꯭$/u, (_, c) => MEITEI_LONSUM[c]).replace(/꯭$/u, '')
}

// Malayalam writes most word-final consonants as special "chillu" letters
const MALAYALAM_CHILLU = { 'ണ': 'ൺ', 'ന': 'ൻ', 'ര': 'ർ', 'ല': 'ൽ', 'ള': 'ൾ', 'ക': 'ൿ' }
const postMalayalam = (s) => s.replace(/([ണനരലളക])്$/u, (_, c) => MALAYALAM_CHILLU[c])

/** One word, already in Devanagari (spelling) → any supported script. */
function wordToScript(hindi, script) {
  const cfg = SCRIPTS[script]
  if (!cfg?.sanscript) return null
  const phonetic = toPhoneticDevanagari(hindi)
  if (script === 'devanagari') return hindi
  if (script === 'tamil') return postTamil(toScheme(phonetic, 'tamil'))
  if (script === 'gurmukhi') return postGurmukhi(toScheme(hindi.normalize('NFC').replace(/क़/g, 'क'), 'gurmukhi'))
  // keep ड़/ढ़ (Bengali has them); drop the other nukta dots
  const noNukta = stripNukta(hindi.normalize('NFC').replace(/ड़/g, '').replace(/ढ़/g, ''))
    .replace(//g, 'ड़').replace(//g, 'ढ़')
  if (script === 'bengali') return postBengali(toScheme(noNukta, 'bengali'))
  if (script === 'assamese') return postBengali(toScheme(noNukta, 'assamese'), true)
  if (cfg.dravidianFinal) {
    const out = toScheme(stripNukta(phonetic), cfg.sanscript)
    if (script === 'meitei') return postMeitei(out)
    if (script === 'malayalam') return postMalayalam(out)
    return out
  }
  return stripFinalVirama(toScheme(stripNukta(hindi), cfg.sanscript).replace(/྄$/, ''))
}

// Devanagari → Urdu (used for Latin-typed names that aren't in the dictionary)
const URDU_CONS = {
  'क': 'ک', 'ख': 'کھ', 'ग': 'گ', 'घ': 'گھ', 'च': 'چ', 'छ': 'چھ', 'ज': 'ج', 'झ': 'جھ', 'ट': 'ٹ', 'ठ': 'ٹھ',
  'ड': 'ڈ', 'ढ': 'ڈھ', 'ण': 'ن', 'त': 'ت', 'थ': 'تھ', 'द': 'د', 'ध': 'دھ', 'न': 'ن', 'प': 'پ', 'फ': 'پھ',
  'ब': 'ب', 'भ': 'بھ', 'म': 'م', 'य': 'ی', 'र': 'ر', 'ल': 'ل', 'व': 'و', 'श': 'ش', 'ष': 'ش', 'स': 'س', 'ह': 'ہ',
  'क़': 'ق', 'ख़': 'خ', 'ग़': 'غ', 'ज़': 'ز', 'फ़': 'ف', 'ड़': 'ڑ', 'ढ़': 'ڑھ',
}
const URDU_MATRA = { 'ा': 'ا', 'ि': '', 'ी': 'ی', 'ु': '', 'ू': 'و', 'े': 'ی', 'ै': 'ی', 'ो': 'و', 'ौ': 'و', 'ृ': 'ر', 'ॉ': 'ا' }
const URDU_INDEPENDENT = { 'अ': 'ا', 'आ': 'آ', 'इ': 'ا', 'ई': 'ای', 'उ': 'ا', 'ऊ': 'او', 'ए': 'ای', 'ऐ': 'ای', 'ओ': 'او', 'औ': 'او', 'ऑ': 'آ' }
const URDU_MEDIAL_INDEPENDENT = { 'अ': 'ا', 'आ': 'ا', 'इ': 'ئ', 'ई': 'ئی', 'उ': 'ؤ', 'ऊ': 'ؤ', 'ए': 'ئ', 'ऐ': 'ئ', 'ओ': 'و', 'औ': 'و' }

function devanagariToUrdu(hindi) {
  const chars = [...hindi.normalize('NFC')]
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    let c = chars[i]
    if (chars[i + 1] === '़') c += chars[++i]
    const isLast = i === chars.length - 1
    if (URDU_CONS[c] !== undefined) out += URDU_CONS[c]
    else if (URDU_MATRA[c] !== undefined) out += isLast && (c === 'े' || c === 'ै') ? 'ے' : URDU_MATRA[c]
    else if (URDU_INDEPENDENT[c] !== undefined) {
      out += i === 0 ? URDU_INDEPENDENT[c] : URDU_MEDIAL_INDEPENDENT[c]
      if (isLast && (c === 'ए' || c === 'ऐ')) out = out.replace(/ی$/, 'ے')
    } else if (c === 'ं' || c === 'ँ') out += isLast ? 'ں' : 'ن'
    else if (c === 'ः') out += 'ہ'
  }
  return out
}

// --- per-word conversion ------------------------------------------------------
function convertWord(word) {
  const entry = lookup(word)
  if (entry) {
    return {
      input: word,
      display: entry.display,
      hindi: entry.hindi,
      urdu: entry.urdu,
      tamil: entry.tamil,
      bengali: entry.bengali,
      // Malayalam isn't in the dictionary (yet): generated from the verified Hindi spelling
      malayalam: entry.malayalam ?? wordToScript(entry.hindi, 'malayalam'),
      pronunciation: entry.pronunciation,
      funNote: entry.funNote ?? null,
      approximate: false,
    }
  }
  let hindi
  let urdu
  if (ARABIC_RE.test(word)) {
    hindi = arabicToDevanagari(word)
    urdu = arabicToUrdu(word)
  } else {
    const itrans = latinToItrans(word)
    hindi = stripFinalVirama(Sanscript.t(itrans, 'itrans', 'devanagari').normalize('NFC'))
    urdu = devanagariToUrdu(toPhoneticDevanagari(hindi))
  }
  return {
    input: word,
    display: word,
    hindi,
    urdu,
    tamil: wordToScript(hindi, 'tamil'),
    bengali: wordToScript(hindi, 'bengali'),
    malayalam: wordToScript(hindi, 'malayalam'),
    pronunciation: devanagariToPronunciation(hindi),
    funNote: null,
    approximate: true,
  }
}

/**
 * @param {string} name English or Arabic letters
 * @returns {Promise<{input, display, hindi, urdu, tamil, bengali, malayalam, pronunciation, approximate, funNote, words}>}
 */
export async function transliterateName(name) {
  const clean = (name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
  if (!clean || (!ARABIC_RE.test(clean) && !LATIN_RE.test(clean))) return null
  const words = clean.split(' ').filter((w) => ARABIC_RE.test(w) || LATIN_RE.test(w)).map(convertWord)
  // "عبد الله" / "Abd Allah" style two-word names may exist as one dictionary entry
  if (words.length === 2) {
    const joined = lookup(clean.replace(' ', ''))
    if (joined) return finalize(clean, [convertWord(clean.replace(' ', ''))])
  }
  return finalize(clean, words)
}

function finalize(input, words) {
  const join = (k) => words.map((w) => w[k]).join(' ')
  return {
    input,
    // keep the visitor's own spelling ("Laila", not the dictionary's "Layla")
    display: words.map((w) => w.input.charAt(0).toUpperCase() + w.input.slice(1)).join(' '),
    hindi: join('hindi'),
    urdu: join('urdu'),
    tamil: join('tamil'),
    bengali: join('bengali'),
    malayalam: join('malayalam'),
    pronunciation: join('pronunciation'),
    approximate: words.some((w) => w.approximate),
    funNote: words.find((w) => w.funNote)?.funNote ?? null,
    words,
  }
}

/**
 * The visitor's name in any script used on the map.
 * The Name-page scripts come straight from the result; others are generated from Devanagari
 * and always counted as approximate.
 * @returns {{ text: string, approximate: boolean } | null}
 */
export function nameInScript(result, script) {
  if (!result) return null
  if (['devanagari', 'urdu', 'tamil', 'bengali', 'malayalam'].includes(script)) {
    const key = script === 'devanagari' ? 'hindi' : script
    return { text: result[key], approximate: result.approximate }
  }
  if (script === 'latin') {
    if (!ARABIC_RE.test(result.display)) return { text: result.display, approximate: false }
    // Arabic-typed name → spell it with Latin letters from the pronunciation ("u-mar" → "Umar")
    const latin = result.words
      .map((w) => w.pronunciation.replace(/-/g, ''))
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    return { text: latin, approximate: true }
  }
  const parts = result.words.map((w) => wordToScript(w.hindi, script))
  if (parts.some((p) => !p)) return null
  return { text: parts.join(' '), approximate: true }
}
