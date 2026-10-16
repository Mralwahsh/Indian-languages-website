// Every writing system the app can display.
// - fontClass: Tailwind utility defined in index.css
// - fontFile: TTF in /public/fonts used by harfbuzz for glyph outlines
// - sanscript: scheme name in @indic-transliteration/sanscript (null = not generated from Devanagari)
// - dravidianFinal: keep an explicit virama on word-final consonants (these scripts don't drop the "a")
export const SCRIPTS = {
  devanagari: { name: 'Devanagari', fontClass: 'font-deva', fontFile: 'NotoSansDevanagari-Bold.ttf', sanscript: 'devanagari', dir: 'ltr' },
  urdu: { name: 'Perso-Arabic (Nastaliq)', fontClass: 'font-urdu', fontFile: 'NotoNastaliqUrdu-Regular.ttf', sanscript: null, dir: 'rtl' },
  arabic: { name: 'Arabic', fontClass: 'font-arab', fontFile: 'NotoNaskhArabic-Bold.ttf', sanscript: null, dir: 'rtl' },
  tamil: { name: 'Tamil', fontClass: 'font-taml', fontFile: 'NotoSansTamil-Bold.ttf', sanscript: 'tamil', dir: 'ltr', dravidianFinal: true },
  bengali: { name: 'Bengali', fontClass: 'font-beng', fontFile: 'NotoSansBengali-Bold.ttf', sanscript: 'bengali', dir: 'ltr' },
  assamese: { name: 'Assamese', fontClass: 'font-beng', fontFile: 'NotoSansBengali-Bold.ttf', sanscript: 'assamese', dir: 'ltr' },
  telugu: { name: 'Telugu', fontClass: 'font-telu', fontFile: 'NotoSansTelugu-Bold.ttf', sanscript: 'telugu', dir: 'ltr', dravidianFinal: true },
  kannada: { name: 'Kannada', fontClass: 'font-knda', fontFile: 'NotoSansKannada-Bold.ttf', sanscript: 'kannada', dir: 'ltr', dravidianFinal: true },
  malayalam: { name: 'Malayalam', fontClass: 'font-mlym', fontFile: 'NotoSansMalayalam-Bold.ttf', sanscript: 'malayalam', dir: 'ltr', dravidianFinal: true },
  gujarati: { name: 'Gujarati', fontClass: 'font-gujr', fontFile: 'NotoSansGujarati-Bold.ttf', sanscript: 'gujarati', dir: 'ltr' },
  gurmukhi: { name: 'Gurmukhi', fontClass: 'font-guru', fontFile: 'NotoSansGurmukhi-Bold.ttf', sanscript: 'gurmukhi', dir: 'ltr' },
  odia: { name: 'Odia', fontClass: 'font-orya', fontFile: 'NotoSansOriya-Bold.ttf', sanscript: 'oriya', dir: 'ltr' },
  meitei: { name: 'Meitei Mayek', fontClass: 'font-mtei', fontFile: 'NotoSansMeeteiMayek-Bold.ttf', sanscript: 'manipuri', dir: 'ltr', dravidianFinal: true },
  tibetan: { name: 'Tibetan', fontClass: 'font-tibt', fontFile: 'NotoSerifTibetan-Bold.ttf', sanscript: 'tibetan', dir: 'ltr' },
  olchiki: { name: 'Ol Chiki', fontClass: 'font-olck', fontFile: 'NotoSansOlChiki-Bold.ttf', sanscript: 'ol_chiki', dir: 'ltr' },
  latin: { name: 'Latin', fontClass: 'font-display', fontFile: null, sanscript: null, dir: 'ltr' },
}

export const scriptFont = (script) => SCRIPTS[script]?.fontClass ?? 'font-display'
export const scriptDir = (script) => SCRIPTS[script]?.dir ?? 'ltr'
