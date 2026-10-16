// What each character in a name "does", for the letter-breakdown view (texts in Arabic).
// Devanagari, Bengali, Tamil and Malayalam share the same Unicode layout
// (Bengali = +0x80, Tamil = +0x280, Malayalam = +0x400), so one table of sounds covers all;
// script-specific twists are layered on top.
// TODO: verify explanations with a native speaker of each script.

const DEVA_SOUNDS = {
  // consonants (inherent vowel "a" included)
  0x15: 'ka', 0x16: 'kha', 0x17: 'ga', 0x18: 'gha', 0x19: 'ṅa', 0x1a: 'cha', 0x1b: 'chha', 0x1c: 'ja', 0x1d: 'jha', 0x1e: 'ña',
  0x1f: 'ṭa', 0x20: 'ṭha', 0x21: 'ḍa', 0x22: 'ḍha', 0x23: 'ṇa', 0x24: 'ta', 0x25: 'tha', 0x26: 'da', 0x27: 'dha', 0x28: 'na',
  0x29: 'ṉa', 0x2a: 'pa', 0x2b: 'pha', 0x2c: 'ba', 0x2d: 'bha', 0x2e: 'ma', 0x2f: 'ya', 0x30: 'ra', 0x31: 'ṟa', 0x32: 'la',
  0x33: 'ḷa', 0x34: 'ḻa', 0x35: 'va', 0x36: 'sha', 0x37: 'ṣha', 0x38: 'sa', 0x39: 'ha',
  // independent vowels
  0x05: 'a', 0x06: 'ā', 0x07: 'i', 0x08: 'ī', 0x09: 'u', 0x0a: 'ū', 0x0b: 'ṛ', 0x0e: 'e', 0x0f: 'ē', 0x10: 'ai', 0x11: 'ŏ', 0x12: 'o', 0x13: 'ō', 0x14: 'au',
  // vowel signs
  0x3e: 'ā', 0x3f: 'i', 0x40: 'ī', 0x41: 'u', 0x42: 'ū', 0x43: 'ṛ', 0x46: 'e', 0x47: 'ē', 0x48: 'ai', 0x49: 'ŏ', 0x4a: 'o', 0x4b: 'ō', 0x4c: 'au', 0x57: 'au',
}

const kindOf = (off) => {
  if (off >= 0x15 && off <= 0x39) return 'consonant'
  if (off >= 0x58 && off <= 0x5f) return 'consonant'
  if (off >= 0x7a && off <= 0x7f) return 'consonant' // Malayalam chillu letters
  if (off >= 0x05 && off <= 0x14) return 'vowel'
  if ((off >= 0x3e && off <= 0x4c && off !== 0x4d) || off === 0x57) return 'vowel-sign'
  if (off === 0x4d) return 'virama'
  if (off === 0x3c) return 'nukta'
  if (off >= 0x01 && off <= 0x03) return 'nasal'
  return 'other'
}

const BASES = { devanagari: 0x0900, bengali: 0x0980, tamil: 0x0b80, malayalam: 0x0d00 }

const KIND_LABEL = {
  consonant: 'حرف',
  vowel: 'حرف علّة',
  'vowel-sign': 'علامة حركة',
  virama: 'علامة تسكين',
  nukta: 'نقطة نوكتا',
  nasal: 'علامة أنفية',
  other: 'علامة',
}

// Where a vowel sign sits relative to its consonant
const SIGN_POSITION = {
  devanagari: { 0x3f: 'before' },
  bengali: { 0x3f: 'before', 0x47: 'before', 0x48: 'before', 0x4b: 'around', 0x4c: 'around' },
  tamil: { 0x46: 'before', 0x47: 'before', 0x48: 'before', 0x4a: 'around', 0x4b: 'around', 0x4c: 'around' },
  malayalam: { 0x46: 'before', 0x47: 'before', 0x48: 'before', 0x4a: 'around', 0x4b: 'around', 0x4c: 'around' },
}

const GRANTHA = 'حرف «غرانثا» مستعار لكتابة أصوات غير تاميلية.'

const SPECIAL = {
  devanagari: {
    0x093c: { kind: 'nukta', note: 'نقطة تحت الحرف تصنع صوتًا جديدًا، لكتابة أصوات عربية وفارسية مثل ق خ غ ز ف!' },
    0x094d: { kind: 'virama', note: 'تحذف الـ«a» المخفية، فيلتصق الحرف بالحرف الذي بعده (مثل السكون).' },
    0x0902: { kind: 'nasal', sound: 'n/m', note: 'نقطة فوق الحرف = صوت «ن» أو «م» من الأنف.' },
    0x0901: { kind: 'nasal', sound: '~', note: 'هلال ونقطة = انطق حرف العلة من الأنف.' },
    0x0903: { kind: 'nasal', sound: 'h', note: 'نقطتان = نفَس خفيف مثل «هـ».' },
  },
  bengali: {
    0x09bc: { kind: 'nukta', note: 'نقطة تغيّر صوت الحرف: য় = «ي».' },
    0x09cd: { kind: 'virama', note: 'تحذف حرف العلة المخفي، فتلتصق الحروف ببعضها.' },
    0x09af: { kind: 'consonant', sound: 'ja', note: 'يشبه حرف य (يا) في الهندية، لكنه في البنغالية يُنطق «ج»!' },
    0x09df: { kind: 'consonant', sound: 'ya' },
    0x09ce: { kind: 'consonant', sound: 't', note: 'حرف «ت» خاص لا يأتي بعده حرف علة.' },
    0x0982: { kind: 'nasal', sound: 'ng' },
    0x0981: { kind: 'nasal', sound: '~', note: 'انطق حرف العلة من الأنف.' },
  },
  tamil: {
    0x0bcd: { kind: 'virama', note: 'نقطة فوق الحرف (بُلّي) تحذف حرف العلة: க (ka) ← க் (k)، مثل السكون في العربية.' },
    0x0b83: { kind: 'other', sound: 'f/z/kh', note: 'ثلاث نقاط! توضع قبل الحرف لكتابة أصوات أجنبية: ஃப = «ف».' },
    0x0b95: { kind: 'consonant', sound: 'ka', note: 'التاميلية تستخدم حرفًا واحدًا لصوتَي «ك» و«غ»!' },
    0x0b9a: { kind: 'consonant', sound: 'cha', note: 'حرف واحد لصوتَي «تش» و«س».' },
    0x0b9f: { kind: 'consonant', sound: 'ṭa' },
    0x0ba4: { kind: 'consonant', sound: 'ta', note: 'حرف واحد لصوتَي «ت» و«د».' },
    0x0baa: { kind: 'consonant', sound: 'pa', note: 'حرف واحد لصوتَي «ب» و«پ».' },
    0x0bb4: { kind: 'consonant', sound: 'zha', note: 'صوت «ژ» التاميلي الشهير، تجده في كلمة «تاميل» نفسها: தமிழ்!' },
    0x0b9c: { kind: 'consonant', sound: 'ja', note: GRANTHA },
    0x0bb8: { kind: 'consonant', sound: 'sa', note: GRANTHA },
    0x0bb9: { kind: 'consonant', sound: 'ha', note: GRANTHA },
    0x0bb7: { kind: 'consonant', sound: 'sha', note: GRANTHA },
  },
  malayalam: {
    0x0d4d: { kind: 'virama', note: 'علامة «تشاندراكّالا»: تحذف حرف العلة، وفي آخر الكلمة تعطي صوت «ـُ» خفيفًا.' },
    0x0d02: { kind: 'nasal', sound: 'm', note: 'دائرة صغيرة = صوت «م» في آخر المقطع.' },
    0x0d34: { kind: 'consonant', sound: 'zha', note: 'صوت «ژ» المالايالامي الشهير، تجده في كلمة «مالايالام» نفسها!' },
    0x0d31: { kind: 'consonant', sound: 'ṟa', note: 'صوت «ر» قوي، وهو مختلف عن ര.' },
    0x0d7a: { kind: 'consonant', sound: 'ṇ', note: 'حرف «تشيلّو»: ساكن بلا حرف علة، له شكل خاص في آخر الكلمة.' },
    0x0d7b: { kind: 'consonant', sound: 'n', note: 'حرف «تشيلّو»: «ن» ساكنة لها شكل خاص في آخر الكلمة.' },
    0x0d7c: { kind: 'consonant', sound: 'r', note: 'حرف «تشيلّو»: «ر» ساكنة لها شكل خاص في آخر الكلمة.' },
    0x0d7d: { kind: 'consonant', sound: 'l', note: 'حرف «تشيلّو»: «ل» ساكنة لها شكل خاص في آخر الكلمة.' },
    0x0d7e: { kind: 'consonant', sound: 'ḷ', note: 'حرف «تشيلّو»: ساكن له شكل خاص في آخر الكلمة.' },
    0x0d7f: { kind: 'consonant', sound: 'k', note: 'حرف «تشيلّو»: «ك» ساكنة لها شكل خاص في آخر الكلمة.' },
  },
}

const POSITION_NOTE = {
  before: 'تُكتب قبل الحرف، لكنها تُنطق بعده!',
  around: 'تلتفّ حول الحرف: جزء على كل جانب!',
}

const INHERENT = { devanagari: 'a', bengali: 'o', tamil: 'a', malayalam: 'a' }

function describeIndic(ch, script) {
  const cp = ch.codePointAt(0)
  const special = SPECIAL[script]?.[cp]
  const off = cp - BASES[script]
  const kind = special?.kind ?? kindOf(off)
  const sound = special?.sound ?? DEVA_SOUNDS[off] ?? ''
  const label = KIND_LABEL[kind] ?? KIND_LABEL.other
  let note = special?.note ?? null
  if (kind === 'consonant' && script === 'bengali' && sound.endsWith('a')) {
    return { ch, kind, label, sound: sound.slice(0, -1) + 'o', note: note ?? 'في البنغالية يُنطق حرف العلة المخفي «o» وليس «a».' }
  }
  if (kind === 'vowel-sign') {
    const pos = SIGN_POSITION[script]?.[off]
    note = note ?? (pos ? POSITION_NOTE[pos] : 'حروف العلة تلتصق بالحروف كعلامات صغيرة، مثل الحركات في العربية.')
  }
  if (kind === 'vowel') note = note ?? 'في بداية المقطع يُكتب حرف العلة كحرف كامل.'
  if (kind === 'consonant') note = note ?? `حرف ساكن معه حرف العلة «${INHERENT[script]}» مخفيًّا بداخله: «${sound}».`
  return { ch, kind, label, sound, note }
}

// --- Urdu ------------------------------------------------------------------
// [Urdu letter name, sound, exists in Arabic?, note]
const URDU = {
  'ا': ['ألف', 'a / ā', true], 'آ': ['ألف ممدودة', 'ā', true], 'ب': ['بے', 'b', true],
  'پ': ['پے', 'p', false, 'حرف «پ» (P)، غير موجود في العربية!'],
  'ت': ['تے', 't', true], 'ٹ': ['ٹے', 'ṭ', false, '«ت» يُنطق واللسان ملتفّ للخلف، صوت غير موجود في العربية.'],
  'ث': ['ثے', 's', true, 'في الأردية يُنطق «س» وليس «ث».'],
  'ج': ['جیم', 'j', true], 'چ': ['چے', 'ch', false, 'صوت «تش»، حرف جديد مأخوذ من ج.'], 'ح': ['بڑی حے', 'h', true], 'خ': ['خے', 'kh', true],
  'د': ['دال', 'd', true], 'ڈ': ['ڈال', 'ḍ', false, '«د» يُنطق واللسان ملتفّ للخلف.'], 'ذ': ['ذال', 'z', true, 'في الأردية يُنطق «ز».'], 'ر': ['رے', 'r', true],
  'ڑ': ['ڑے', 'ṛ', false, '«ر» سريعة واللسان ملتفّ، صوت هندي جدًا!'], 'ز': ['زے', 'z', true], 'ژ': ['ژے', 'zh', false], 'س': ['سین', 's', true], 'ش': ['شین', 'sh', true],
  'ص': ['صاد', 's', true, 'في الأردية يُنطق «س».'], 'ض': ['ضاد', 'z', true, 'في الأردية تُنطق الضاد «ز»!'], 'ط': ['طوئے', 't', true], 'ظ': ['ظوئے', 'z', true], 'ع': ['عین', '(حرف علة)', true],
  'غ': ['غین', 'gh', true], 'ف': ['فے', 'f', true], 'ق': ['قاف', 'q', true], 'ک': ['کاف', 'k', true, 'هو نفس الكاف العربية ك، بشكل مختلف قليلًا.'],
  'گ': ['گاف', 'g', false, 'صوت «گ» (G): كاف مع خط إضافي في الأعلى.'], 'ل': ['لام', 'l', true], 'م': ['میم', 'm', true], 'ن': ['نون', 'n', true],
  'ں': ['نون غنّہ', '~', false, 'نون بلا نقطة: انطق حرف العلة من الأنف.'], 'و': ['واؤ', 'v / ū / o', true], 'ہ': ['چھوٹی ہے', 'h', true, 'هاء الأردية العادية، بشكل مختلف قليلًا.'],
  'ھ': ['دو چشمی ہے', 'h', false, '«الهاء ذات العينين»: تضيف نفَسًا للحرف قبلها: ک + ھ = کھ (kh).'], 'ء': ['ہمزہ', 'ʾ', true], 'ی': ['یے', 'y / ī', true, 'مثل الياء العربية ي، لكن بلا نقاط في آخر الكلمة.'],
  'ے': ['بڑی یے', 'e', false, '«الياء الكبيرة»، لصوت «ي» ممالة (e) في آخر الكلمات.'], 'ئ': ['یے ہمزہ', '(حرف علة)', true], 'ؤ': ['واؤ ہمزہ', '(حرف علة)', true],
}

function describeUrdu(ch) {
  const info = URDU[ch]
  if (info) {
    const [label, sound, known, extra] = info
    return { ch, kind: 'letter', label, sound, known, note: extra ?? (known ? 'نفس الحرف العربي ✓' : null) }
  }
  if (/[ً-ٰٟ]/.test(ch)) return { ch, kind: 'mark', label: 'حركة', sound: '', known: true, note: 'الحركات القصيرة، وعادةً لا تُكتب، تمامًا كالعربية.' }
  return { ch, kind: 'other', label: ch, sound: '', known: true, note: null }
}

/** Describe one code point in a given script. */
export function describeChar(ch, script) {
  if (script === 'urdu') return describeUrdu(ch)
  if (BASES[script]) return describeIndic(ch, script)
  return { ch, kind: 'other', label: ch, sound: '', note: null }
}

/**
 * Split text into "blocks" (grapheme clusters) with their code point ranges.
 * @returns {{ text: string, start: number, parts: {ch, index, ...info}[] }[]}
 */
export function breakIntoBlocks(text, script) {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const blocks = []
  let cpIndex = 0
  for (const { segment } of seg.segment(text)) {
    const cps = [...segment]
    if (segment.trim()) {
      const parts = mergeNukta(cps.map((ch, k) => ({ ...describeChar(ch, script), index: cpIndex + k })), script)
      blocks.push({ text: segment, start: cpIndex, parts })
    }
    cpIndex += cps.length
  }
  return blocks
}

// consonant + nukta → one part ("ज़ = za"), which is how people think of it
function mergeNukta(parts, script) {
  const out = []
  for (const p of parts) {
    const prev = out[out.length - 1]
    if (p.kind === 'nukta' && prev?.kind === 'consonant') {
      const NUKTA_SOUNDS = { 'क': 'qa', 'ख': 'kha (خ)', 'ग': 'gha (غ)', 'ज': 'za', 'फ': 'fa', 'ड': 'ṛa', 'ढ': 'ṛha', 'য': 'ya' }
      out[out.length - 1] = {
        ...prev,
        ch: prev.ch + p.ch,
        indices: [prev.index, p.index],
        sound: NUKTA_SOUNDS[prev.ch] ?? prev.sound,
        label: 'حرف + نقطة',
        note: script === 'devanagari' ? 'النقطة تحت الحرف تحوّله إلى صوت عربي أو فارسي!' : p.note,
      }
    } else out.push({ ...p, indices: [p.index] })
  }
  return out
}

/** Short sound of a whole block, e.g. "lī" (inherent vowel dropped before a virama). */
export function blockSound(block, script) {
  if (script === 'urdu') return block.parts.map((p) => p.sound).join('')
  let s = ''
  const inherent = INHERENT[script] ?? 'a'
  block.parts.forEach((p) => {
    if (p.kind === 'consonant') s += p.sound.replace(/\s.*$/, '')
    else if (p.kind === 'vowel-sign') s = s.endsWith(inherent) ? s.slice(0, -inherent.length) + p.sound : s + p.sound
    else if (p.kind === 'virama') s = s.endsWith(inherent) ? s.slice(0, -inherent.length) : s
    else if (p.kind === 'vowel') s += p.sound
    else if (p.kind === 'nasal') s += p.sound === '~' ? '̃' : p.sound
  })
  return s.replace(/ \(.*\)/, '')
}
