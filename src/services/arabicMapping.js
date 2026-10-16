// Rule-based Arabic-letter → Urdu / Devanagari conversion for names that aren't
// in the dictionary. Arabic writes no short vowels, so we lean on Devanagari's
// built-in "a" after every consonant — which is how Hindi spells most Arabic names anyway.

const HARAKAT = /[ً-ِْ-ٰٟـ]/g // keep shadda (U+0651)
const SHADDA = 'ّ'

export function normalizeArabic(s) {
  return s
    .replace(HARAKAT, '')
    .replaceAll(SHADDA, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ی/g, 'ي')
    .replace(/ک/g, 'ك')
    .replace(/\s+/g, ' ')
    .trim()
}

// Arabic → Urdu is almost 1:1; only a few letters have Urdu-specific shapes.
const TO_URDU = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ه': 'ہ', 'ة': 'ہ' }
export function arabicToUrdu(word) {
  return [...word.replace(HARAKAT, '')].map((c) => TO_URDU[c] ?? c).join('')
}

// Consonants (approximations where Hindi has no exact sound — TODO: verify choices)
const CONS = {
  'ب': 'ब', 'ت': 'त', 'ث': 'स', 'ج': 'ज', 'ح': 'ह', 'خ': 'ख़', 'د': 'द', 'ذ': 'ज़', 'ر': 'र', 'ز': 'ज़',
  'س': 'स', 'ش': 'श', 'ص': 'स', 'ض': 'ज़', 'ط': 'त', 'ظ': 'ज़', 'غ': 'ग़', 'ف': 'फ़', 'ق': 'क़', 'ك': 'क',
  'ک': 'क', 'ل': 'ल', 'م': 'म', 'ن': 'न', 'ه': 'ह', 'ہ': 'ह', 'پ': 'प', 'چ': 'च', 'گ': 'ग', 'ژ': 'ज़', 'ڤ': 'व',
}
const LONG_A = { matra: 'ा', ind: 'आ' }
const LONG_I = { matra: 'ी', ind: 'ई' }
const LONG_U = { matra: 'ू', ind: 'ऊ' }

export function arabicToDevanagari(word) {
  const c = [...word.replace(HARAKAT, '')]
  let out = ''
  let afterCons = false // last output was a consonant that still carries its inherent "a"
  const vowel = (v) => {
    out += afterCons ? v.matra : v.ind
    afterCons = false
  }
  for (let i = 0; i < c.length; i++) {
    const ch = c[i]
    const next = c[i + 1]
    const atStart = i === 0
    const atEnd = i === c.length - 1

    if (ch === SHADDA) {
      // double the previous consonant
      const m = out.match(/(.़?)$/u)
      if (m && afterCons) out += '्' + m[1]
      continue
    }
    if ('اأإآٱ'.includes(ch)) {
      if (atStart) {
        if (ch === 'آ') out += 'आ'
        else if (ch === 'إ') out += 'इ'
        else if (next === 'ي') { out += 'ई'; i++ }
        else if (next === 'و') { out += 'ऊ'; i++ }
        else out += 'अ'
        afterCons = false
      } else vowel(LONG_A)
      continue
    }
    if (ch === 'ع') {
      if (next === 'ا') { vowel(LONG_A); i++ }
      else if (next === 'ي' || next === 'ی') { out += 'ई'; afterCons = false; i++ }
      else if (next === 'و') { out += 'ऊ'; afterCons = false; i++ }
      else if (atStart) { out += 'अ'; afterCons = false }
      else if (afterCons && !atEnd) { out += 'ा'; afterCons = false }
      continue
    }
    if (ch === 'و') {
      if (atStart || next === 'ا' || !afterCons) { out += 'व'; afterCons = true }
      else vowel(LONG_U)
      continue
    }
    if (ch === 'ي' || ch === 'ی' || ch === 'ى' || ch === 'ئ') {
      if (ch === 'ى' && atEnd) vowel(LONG_A) // alef maqsura: Layla, Mustafa
      else if (atStart) { out += 'य'; afterCons = true }
      else if (afterCons && (next === 'ا' || next === 'و')) { out += 'िय'; afterCons = true }
      else if (!afterCons) { out += ch === 'ئ' ? 'इ' : 'य'; afterCons = ch !== 'ئ' }
      else vowel(LONG_I)
      continue
    }
    if (ch === 'ة') {
      if (atEnd) vowel(LONG_A)
      else { out += 'त'; afterCons = true }
      continue
    }
    if (ch === 'ء' || ch === 'ؤ') continue
    if (CONS[ch]) {
      out += CONS[ch]
      afterCons = true
    }
  }
  return out.normalize('NFC')
}
