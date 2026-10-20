<div align="center">

<img src="public/favicon.svg" width="96" alt="Ashoka Chakra logo" />

# India Speaks · الهند تتحدّث

**An interactive, offline booth website that shows visitors how many languages India speaks.**
Built for the India booth at **HTU International Week** (Al Hussein Technical University, Jordan).

<p dir="rtl"><b>موقع تفاعلي يعرّف زوّار جناح الهند بتنوّع لغات الهند وخطوطها: اكتب اسمك وشاهده بخطوط هندية، استكشف خريطة اللغات، والعب «خمّن الخط»!</b></p>

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![HarfBuzz](https://img.shields.io/badge/HarfBuzz-WASM-ff9933)
![Offline](https://img.shields.io/badge/works-100%25_offline-138808)
![Interface](https://img.shields.io/badge/UI-Arabic_(RTL)-000080)

</div>

---

## 📸 Screenshots

| Home | Your Name |
| :---: | :---: |
| ![Home page](docs/screenshots/home.jpg) | ![Your name in five Indian scripts](docs/screenshots/your-name.jpg) |
| **Language map** | **Attract mode (idle screen)** |
| ![Map of India coloured by language family](docs/screenshots/map.jpg) | ![Idle screen in the colours of the Indian flag](docs/screenshots/attract-mode.jpg) |

## ✨ What visitors can do

A guide stands next to the laptop and walks each visitor through it in 1–2 minutes. Every screen gives them something to *do*, not text to read.

| Page | What happens |
| --- | --- |
| 🏠 **Home** | Animated counters (22 official languages · 120+ major languages · 19,500+ mother tongues), the 17 languages on Indian banknotes, and **"You already know some Hindi!"**: Hindi words that are also Arabic (किताब = كتاب). Hover a card to see it in Urdu. |
| ✍️ **Your Name** | Type a name in Arabic or English and see it in **Hindi, Urdu, Tamil, Bengali and Malayalam**. Tap a card to see how the name is built letter by letter, press **"Watch it being written"** to see each letter traced, and **"Take a photo!"** for a full-screen souvenir card. |
| 🗺️ **Map** | India's 36 states and union territories coloured by language family, with neighbouring countries in gray. Hover a state for "Hello" in its language; click it to see **the visitor's own name in that state's script** (Telugu, Gujarati, Tibetan, Meitei Mayek…). |
| 🎮 **Game** | "Guess the Script": 5 quick rounds; pick which of four words is written in, say, Tamil. Speed bonus and today's high score. |
| 🥋 **India Fighters** | A side-view fighting game on the laptop, **controlled with the visitor's own phone** (no app: scan a QR code, the phone becomes a gamepad). Two original fighters, Veer and Tara, fight in a palace courtyard at sunset: best of 3, special moves, a beatable CPU opponent, and the phone vibrates when you get hit. |
| 💤 **Attract mode** | After 30 s without input, a full-screen Indian-flag loop says "Hello" in many Indian scripts until someone touches the laptop. |

## 🚀 Quick start

You need [Node.js](https://nodejs.org/) 20.19 or newer (22 LTS recommended).

```bash
git clone https://github.com/Mralwahsh/Indian-languages-website.git
cd Indian-languages-website
npm install        # once, while you have internet
npm start          # builds the site and serves it on http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm start` | Build + start the booth server on port 3000 (site, game and phone controller). |
| `npm run serve` | Start the server again without rebuilding. |
| `npm run dev` | Development: Node server + Vite with live reload (http://localhost:5173), reachable from phones on the same network. |
| `npm run sim` | Plays hundreds of fights with the real game engine to check the balance (no browser needed). |

**Using phones as controllers? Read [BOOTH_SETUP.md](BOOTH_SETUP.md)**: Windows Mobile Hotspot, firewall, start-up and troubleshooting.

After `npm install` everything runs **without internet**: fonts, map data and the HarfBuzz engine are all inside the project.

## 🎪 At the booth

| Control | What it does |
| --- | --- |
| **⛶** button | Fullscreen. |
| **من جديد** button or **Esc** | New visitor: clears the name and everything else, back to Home. In fullscreen, a short Esc press resets; *holding* Esc exits fullscreen (Chrome / Edge). |
| No input for 30 s | Attract mode starts. Any input closes it. If it keeps running for 90 more seconds, the previous visitor's name is wiped. |
| Game keys **1 – 4**, **Enter** | Answer / start: handy for the guide. |
| Fight page: **A D W S + J K L I**, **P**, **M** | Play P1 on the keyboard, show ping, sound on/off. |

Timings are in [`src/config/booth.js`](src/config/booth.js).

**Before the event**

- [ ] Run `npm start` once with **Wi-Fi turned off** and click through every page
- [ ] Follow [BOOTH_SETUP.md](BOOTH_SETUP.md) and play one fight with a real phone
- [ ] Use Chrome or Edge, browser zoom 100 %, fullscreen on
- [ ] Turn off sleep / screensaver and keep the charger connected

## 🛠️ Tech stack

| | |
| --- | --- |
| Framework | React 19 + Vite, React Router |
| Server | Node.js + Express + Socket.IO (local network only, no database) |
| Game | Phaser 3, with a separate pure-JS fight engine |
| Styling | Tailwind CSS 4, Framer Motion animations, right-to-left Arabic layout |
| Map | d3-geo + topojson-client |
| Scripts | [`@indic-transliteration/sanscript`](https://github.com/indic-transliteration/sanscript.js) for transliteration, [HarfBuzz](https://github.com/harfbuzz/harfbuzzjs) (WebAssembly) for real glyph shapes |
| Fonts | Self-hosted Noto fonts for 14 scripts + Noto Kufi / Noto Sans Arabic for the interface |

## ⚙️ How it works

### From a name to five scripts (offline, no AI yet)

```mermaid
flowchart LR
    A[Visitor types a name] --> B{In the dictionary?<br/>58 common names}
    B -- yes --> C[Hand-written spellings]
    B -- no --> D{Arabic or English letters?}
    D -- Arabic --> E[Letter rules<br/>خ→ख़ ز→ज़ ق→क़ …]
    D -- English --> F[Spelling rules → ITRANS<br/>→ sanscript]
    E --> G[Devanagari]
    F --> G
    C --> G
    G --> H[Tamil · Bengali · Malayalam · Telugu · Gujarati<br/>Gurmukhi · Odia · Tibetan · Meitei …]
    E --> I[Urdu]
```

- Names from rules get an **"≈ تهجئة تقريبية"** (approximate spelling) badge.
- Devanagari is the hub: every other Indic script is generated from it, with script-specific fixes (Tamil ன/ஃப, Gurmukhi ੱ, Malayalam chillu letters, Meitei final letters, Bengali য়).
- A simple Hindi "schwa deletion" rule turns अहमद into the pronunciation *ah-mad*.

### Phones as game controllers

```mermaid
flowchart LR
    P[📱 Phone<br/>/controller] -- "press / release<br/>(Socket.IO)" --> S[Node server<br/>room: P1, P2]
    S -- input --> L[💻 Laptop /fight<br/>Phaser game]
    L -- hit --> S -- vibrate --> P
```

- The server only **relays button presses and releases** and keeps track of who is Player 1 / Player 2. Each slot is a phone or the CPU. Phase 1 = one phone vs the CPU. Switching `P2_MODE` in [`shared/protocol.js`](shared/protocol.js) to `'human'` lets a second phone take P2.
- The game reads every player through the same **InputSource** interface (phone, keyboard or CPU), so it never knows where input comes from.
- The fight logic (`src/game/engine/`) is plain JavaScript with no Phaser, running at a fixed 60 steps per second. That's why `npm run sim` can test it in Node.
- A phone that drops (screen lock, Wi-Fi hiccup) pauses the match and gets **its own slot back** when it reconnects.

### Real letter shapes

Indian scripts join and reorder letters (ि is written *before* the consonant it follows; ब + ् + र becomes ब्र). Instead of faking this, the site runs **HarfBuzz**, the same text-shaping engine browsers use, on the bundled Noto fonts and draws every glyph as an SVG path. That's what makes two features possible:

- **Letter breakdown:** each part of a syllable is coloured *inside* the real glyph as it's explained.
- **Handwriting animation:** each glyph's outline is traced and then filled.

## 📁 Project structure

```
server/          Express + Socket.IO booth server (room with P1/P2 slots, LAN-IP detection)
shared/          protocol.js: socket event names, shared by server and browser
public/
  data/          india_states.topojson (state borders), neighbors.topojson (gray countries)
  fonts/         Noto .ttf files, used by CSS and by HarfBuzz
src/
  pages/         HomePage, MapPage, NamePage, GamePage, FightPage (laptop), ControllerPage (phone)
  components/    TopBar, AttractMode, GlyphText, LetterBreakdown, StatePanel, fight/ (lobby, stage, QR)…
  game/
    characters/  one config file per fighter (colours, sprite paths, move stats) + README
    engine/      Fighter + Match: pure fight simulation
    input/       InputSource: Keyboard, Network (phone), CPU
    phaser/      FightScene, stage, fighter views, HUD
  services/      dataService (all data access) · transliteration · glyphService (HarfBuzz) · scriptInfo
  data/          languages, states, names, arabicWords, gameRounds (.json)
  config/        booth.json (hotspot Wi-Fi name/password), booth.js (timings), scripts, nameScripts
scripts/         simulate-fights.mjs (npm run sim)
```

## ✏️ Editing the content

All texts shown to visitors are plain JSON in [`src/data/`](src/data). No code changes needed:

| To change… | Edit |
| --- | --- |
| Language facts, greetings, speaker numbers | [`languages.json`](src/data/languages.json) |
| State names and facts | [`states.json`](src/data/states.json) |
| Names and their spellings (add a `"malayalam"` field to override the generated one) | [`names.json`](src/data/names.json) |
| Hindi ⇄ Arabic word cards | [`arabicWords.json`](src/data/arabicWords.json) |
| Game words | [`gameRounds.json`](src/data/gameRounds.json) |
| Hotspot Wi-Fi name / password (Wi-Fi QR code) | [`src/config/booth.json`](src/config/booth.json) |
| Fighters, moves, damage, real sprite art | [`src/game/characters/`](src/game/characters) ([guide](src/game/characters/README.md)) |
| CPU difficulty, round length | [`src/game/config.js`](src/game/config.js) |

## 🧭 Roadmap

- **India Fighters, Phase 2**: two phones fight each other (the server already has P1/P2 slots).

The code is ready for a backend (**Node.js + Supabase + OpenRouter**):

- `transliterateName()` is already `async`: swap its body for a call to the Node API to get AI spellings for any name.
- Every `get…()` function in `dataService.js` returns the same shape as the JSON files, so they can read from Supabase tables instead.
- 🔒 API keys stay on the server: never put them in the frontend.

## ✅ To verify before the event

<details>
<summary>Spellings and facts that need a check by native speakers (click to open)</summary>

**Names and words**
- [ ] All 58 names in `names.json` (Hindi, Urdu, Tamil, Bengali + pronunciation)
- [ ] Malayalam names (generated automatically from the Hindi spelling)
- [ ] The 12 word cards in `arabicWords.json` and the 8 game words × 10 languages in `gameRounds.json`
- [ ] Arabic letter choices in `src/services/arabicMapping.js` (ث→स, ذ/ض/ظ→ज़, ص→स, ط→त, ع)
- [ ] Letter-breakdown explanations in `src/services/scriptInfo.js`

**Arabic text**
- [ ] All interface text, translated facts, and Arabic names of states and languages (`nameAr`)
- [ ] Greetings written in Arabic letters (`helloPronunciationAr`, e.g. नमस्ते → «نَمَستي»)
- [ ] Map labels for countries and seas (`LABELS` in `src/pages/MapPage.jsx`)

**Greetings**
- [ ] Kashmiri «آداب» · Santali ᱡᱚᱦᱟᱨ · Manipuri ꯈꯨꯔꯨꯝꯖꯔꯤ · Ladakhi ཇུ་ལེ · Khasi "Kumno" · Nagamese "Kineka ase?"

**Facts and numbers**
- [ ] Home counters (22 · 120+ · 19,500+) and banknotes (17 languages)
- [ ] Speaker numbers in `languages.json` (Census 2011, rounded)
- [ ] Every fact marked `TODO: verify` in `languages.json` and `states.json`

</details>

## 🙏 Credits

- **Map data:** [DataMeet](https://github.com/datameet/maps) state boundaries (CC BY 2.5 India) and [Natural Earth](https://www.naturalearthdata.com/) countries with India's point of view (public domain).
- **Fonts:** [Noto](https://notofonts.github.io/) and [Bricolage Grotesque](https://fontsource.org/fonts/bricolage-grotesque) (SIL Open Font License).
- **Numbers:** Census of India 2011.

<div align="center">

Made with 🧡🤍💚 by the India team · HTU International Week

</div>
