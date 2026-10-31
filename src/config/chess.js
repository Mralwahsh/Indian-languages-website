// Content of the /chess page ("India & Chess"). Everything a visitor reads is here so it can be corrected.
// Items marked "TODO: verify" must be checked against a reliable source before the booth.

/** World Championship match shown in the countdown card. TODO: verify with FIDE (date, time, place, players). */
export const MATCH = {
  champion: { name: 'Gukesh D', nameAr: 'غوكيش د.' },
  challenger: { name: 'Javokhir Sindarov', nameAr: 'جافوخير سيندروف' },
  cityAr: 'جنيف',
  // Game 1 start, with the time zone. TODO: verify with FIDE (the start time is a guess: 15:00 Geneva time)
  game1: '2026-11-24T15:00:00+01:00',
}

/**
 * From Chaturanga (India) to Shatranj (Persia, the Arab world) to chess.
 * ancient: the piece in Chaturanga (Sanskrit), arabic: its name in Shatranj / Arabic, english: today's piece.
 * TODO: verify every name and meaning.
 */
export const PIECES = [
  { id: 'king', modern: 'K', ancient: { sa: 'राजा', tr: 'rājā', ar: 'الملك (راجا)' }, arabic: 'الشاه / الملك', english: 'King', note: 'الملك هو الملك في اللعب كلّها.' },
  { id: 'queen', modern: 'Q', ancient: { sa: 'मन्त्री', tr: 'mantrī', ar: 'الوزير / المستشار' }, arabic: 'الوزير', english: 'Queen', note: 'كان مستشارًا ضعيفًا يتحرّك مربعًا واحدًا قطريًا، ثم صار أقوى قطعة في أوروبا.' },
  { id: 'bishop', modern: 'B', ancient: { sa: 'गज', tr: 'gaja', ar: 'الفيل' }, arabic: 'الفيل', english: 'Bishop', note: 'ما زال اسمه بالإسبانية «alfil» من العربية «الفيل».' },
  { id: 'knight', modern: 'N', ancient: { sa: 'अश्व', tr: 'aśva', ar: 'الحصان' }, arabic: 'الفرس', english: 'Knight', note: 'الوحيد الذي احتفظ بحركته القديمة نفسها تقريبًا.' },
  { id: 'rook', modern: 'R', ancient: { sa: 'रथ', tr: 'ratha', ar: 'العربة' }, arabic: 'الرخ', english: 'Rook', note: 'كان عربة حربية تجرّها الخيول.' },
  { id: 'pawn', modern: 'P', ancient: { sa: 'पदाति', tr: 'padāti', ar: 'الجندي الراجل' }, arabic: 'البيدق', english: 'Pawn', note: 'جنود المشاة في الصف الأمامي.' },
]

/** TODO: verify the meaning. */
export const CHECKMATE = { persian: 'shāh māt', arabic: 'الشاه مات', meaning: 'الملك عاجز (لا مهرب له)', english: 'Checkmate' }

/** The journey, east to west (India is on the right of the map). TODO: verify every line. */
export const JOURNEY = [
  { id: 'india', name: 'الهند', era: 'نحو القرن السادس', line: 'وُلدت «تشاتورانغا»: جيش من أربعة أقسام، فيلة وخيّالة وعربات ومشاة.' },
  { id: 'persia', name: 'فارس', era: 'نحو القرن السابع', line: 'صارت «شَترنج»، ومنها جاءت كلمة «شاه» وصيحة «شاه مات».' },
  { id: 'arab', name: 'العالم العربي', era: 'القرن الثامن إلى العاشر', line: 'انتشر «الشطرنج» في بغداد وغيرها، وكتب فيه لاعبون كبار مثل الصولي.' },
  { id: 'europe', name: 'أوروبا', era: 'نحو القرن العاشر', line: 'وصل عبر الأندلس وصقلية، وصار الوزير «ملكة» قوية نحو عام 1475.' },
  { id: 'world', name: 'العالم', era: 'اليوم', line: 'يلعبه مئات الملايين حول العالم، في الأندية وعلى الإنترنت.' },
]

/** Short timeline. No photos of real people. TODO: verify every fact. */
export const TIMELINE = [
  { id: 'chaturanga', when: 'نحو القرن السادس', title: 'تشاتورانغا', line: 'أقدم أشكال الشطرنج المعروفة، في الهند.', icon: 'chariot' },
  { id: 'anand', when: '2000', title: 'فيسواناثان أناند', line: 'أول بطل عالم في الشطرنج من الهند.', icon: 'crown' },
  { id: 'gukesh', when: '2024', title: 'غوكيش د.', line: 'أصغر بطل عالم بلا منازع في التاريخ، في سن 18.', icon: 'star' },
]
