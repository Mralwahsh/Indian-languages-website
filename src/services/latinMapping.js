// English-spelling → ITRANS (a phonetic ASCII scheme sanscript understands).
// English spelling is famously irregular, so this is a best-effort guess.

const isV = (ch) => !!ch && 'aeiou'.includes(ch)
const endsWithVowel = (tok) => /[aeiouAIU]$/.test(tok ?? '')

export function latinToItrans(word) {
  let s = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!s) return ''
  s = s
    .replace(/([aeiou])h$/, '$1') // Sarah → Sara, Noah → Noa
    .replace(/([b-df-hj-kp-tv-z])\1/g, '$1') // Jessica → Jesica (keeps mm/nn/ll: Anna, Emma)
    .replace(/(?<=..)er$/, 'ar') // Peter → Petar
  const magicE = (v) => new RegExp('^' + v + '[b-df-hj-np-tv-z]e$') // Mike, Jane
  const out = []
  let i = 0
  const push = (tok) => {
    // vowel after vowel: add a glide so ITRANS doesn't merge them (Nadia → nAdiyA)
    const prev = out[out.length - 1]
    if (/^[aeiouAIU]/.test(tok) && endsWithVowel(prev)) {
      if (/[iI]$/.test(prev)) out.push('y')
      else if (/[uU]$/.test(prev) && /^[aA]/.test(tok)) out.push('v')
    }
    out.push(tok)
  }
  while (i < s.length) {
    const rest = s.slice(i)
    const c = s[i]
    const after = (k) => s[i + k]
    const isLastAt = (k) => i + k >= s.length

    // consonant clusters spelled with two letters
    const digraphs = [
      ['sch', 'sh'], ['tch', 'ch'], ['kh', 'K'], ['gh', 'G'], ['sh', 'sh'], ['ch', 'ch'],
      ['ph', 'f'], ['th', 'th'], ['dh', 'dh'], ['ck', 'k'], ['qu', 'kv'],
    ]
    const dg = digraphs.find(([k]) => rest.startsWith(k))
    if (dg) { push(dg[1]); i += dg[0].length; continue }

    // vowel combinations
    if (rest.startsWith('aa')) { push('A'); i += 2; continue }
    if (rest.startsWith('ee') || rest.startsWith('ii') || (rest.startsWith('ie') && isLastAt(2))) { push('I'); i += 2; continue }
    if (rest.startsWith('oo') || rest.startsWith('ou')) { push('U'); i += 2; continue }
    if (rest.startsWith('ai') || rest.startsWith('ei') || (rest.startsWith('ay') && !isV(after(2)))) { push('ai'); i += 2; continue }
    if (rest.startsWith('au') || (rest.startsWith('aw') && !isV(after(2)))) { push('au'); i += 2; continue }
    if (rest.startsWith('ey') && isLastAt(2)) { push('e'); i += 2; continue }

    switch (c) {
      case 'a':
        push(isLastAt(1) ? 'A' : magicE('a').test(rest) ? 'e' : 'a'); break
      case 'e': {
        // silent final e after consonant (Jane, Mike) if the word already had a vowel
        const silent = isLastAt(1) && !isV(s[i - 1]) && /[aeiouy]/.test(s.slice(0, i - 1))
        if (!silent) push('e')
        break
      }
      case 'i':
        if (magicE('i').test(rest)) { push('ai'); break }
        // final i, or i in an open syllable (Lina, Rima) → long ī
        push(isLastAt(1) || (!isV(after(1)) && after(1) && isV(after(2)) && !after(2)?.match(/[e]/) && i > 0) ? 'I' : 'i'); break
      case 'o':
        push('o'); break
      case 'u':
        push(isLastAt(1) ? 'U' : 'u'); break
      case 'y':
        if (i === 0 || isV(after(1))) push('y')
        else push(isLastAt(1) ? 'I' : 'i')
        break
      case 'w': case 'v': push('v'); break
      case 'c': push('eiy'.includes(after(1) ?? '') ? 's' : 'k'); break
      case 'x': push('ks'); break
      case 'q': push('q'); break
      case 'j': push('j'); break
      default:
        if (/[bdfghklmnprstz]/.test(c)) push(c)
    }
    i++
  }
  return out.join('')
}
