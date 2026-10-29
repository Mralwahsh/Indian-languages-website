# Booth setup: India Fighters (phone-controlled game)

The laptop runs the whole website **and** a small server. Visitors' phones join the laptop's own Wi-Fi hotspot and open the controller page. No internet is needed.

```
 phone ──Wi-Fi──► laptop hotspot (192.168.137.1) ──► Node server :3000 ──► /fight on the laptop screen
```

---

## 1. Once, before the event

### Install
```bash
npm install
```
Do this while you still have internet. After that, nothing is downloaded at runtime.

### Set the Wi-Fi name and password
Edit [`src/config/booth.json`](src/config/booth.json) so it matches the hotspot you'll create in step 2. It's used for the small Wi-Fi QR code on the lobby screen:

```json
{ "wifi": { "ssid": "India-Booth", "password": "namaste2026", "security": "WPA" } }
```

Rebuild after changing it (`npm start` rebuilds automatically).

---

## 2. Turn on the Windows Mobile Hotspot

1. **Settings → Network & internet → Mobile hotspot**.
2. Click **Edit** (or *Properties*) and set:
   - **Network name**: the same `ssid` as in `booth.json`
   - **Network password**: the same `password` (8+ characters)
   - **Band**: *2.4 GHz* works with every phone; *Any available* is also fine.
3. **Share my internet connection from**: pick whatever Windows offers.
   - If the laptop is **not** connected to anything else, phones get no internet. That's fine: the game only talks to the laptop.
   - If the laptop **is** on the university Wi-Fi, phones may get internet through it. That's harmless, and phones stay connected more happily.
4. Turn **Mobile hotspot → On**.
5. Open **Power saving** (on the same page) and turn **OFF** "When no devices are connected, automatically turn off mobile hotspot". Otherwise it switches itself off after a few minutes.

> ⚠️ Some Windows versions refuse to start the hotspot when the laptop has **no** network connection at all. If that happens, connect the laptop to any Wi-Fi (or a phone's hotspot) first, then turn the Mobile hotspot on.

The laptop's address on its own hotspot is almost always **`192.168.137.1`**. The server finds it automatically and puts it in the QR code.

---

## 3. Allow port 3000 through the firewall

The first time the server starts, Windows may show **"Windows Defender Firewall has blocked some features of Node.js"**. Tick **both Private and Public networks** and click **Allow**. The hotspot network is often treated as *Public*.

If you missed the prompt, or phones still can't connect, add the rule yourself in **PowerShell as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "India Speaks booth (TCP 3000)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any
```

(Only for development with phones: also allow `5173`, the Vite dev server.)

To remove it after the event:

```powershell
Remove-NetFirewallRule -DisplayName "India Speaks booth (TCP 3000)"
```

---

## 4. Start the booth

```bash
npm start
```

This builds the site and starts the server. The terminal prints:

```
  🇮🇳 India Speaks server (booth / production) on port 3000
     Laptop:  http://localhost:3000/fight
     Phones:  http://192.168.137.1:3000/controller
```

1. Open **http://localhost:3000/fight** in Chrome or Edge on the laptop.
2. Click the **⛶** button (fullscreen). That click also unlocks the game sounds; browsers only play sound after a click on the page.
3. Check the lobby: the big QR code must show **`http://192.168.137.1:3000/controller`**.
   - If it shows another address, restart with `HOST_IP=192.168.137.1 npm start` (PowerShell: `$env:HOST_IP="192.168.137.1"; npm start`).
4. Test with your own phone once (scan Wi-Fi QR → scan controller QR → press a button).

Already built and just want to start again quickly? Use `npm run serve`.

### Keys on the laptop

| Key | Action |
| --- | --- |
| **Esc** / **من جديد** button | End the match, back to the lobby |
| **A D W S** + **J K L I** | Play P1 with the keyboard (move + punch / kick / block / special), for testing without a phone |
| **P** | Show / hide ping (debug) |
| **M** | Sound on / off |

### What visitors do (shown on the lobby screen)

1. Scan the small QR code → join the booth Wi-Fi
2. Turn off mobile data
3. Scan the big QR code → the controller opens in the browser
4. Turn the phone sideways and press any button to start

---

## 5. Troubleshooting

| Problem | Fix |
| --- | --- |
| **Phone says "No internet" / "Internet may not be available"** | That's expected. Tap **Stay connected / Keep Wi-Fi connection**. The game doesn't need internet. |
| **iPhone keeps loading or can't open the page** | Turn off **Mobile Data** (Settings → Mobile Data), or turn off **Wi-Fi Assist** at the bottom of the Mobile Data screen. Otherwise iOS sends traffic over 4G/5G instead of the booth Wi-Fi. |
| **Android switches back to 4G** | Turn off mobile data, or turn off *Switch to mobile data / Adaptive Wi-Fi* in Wi-Fi settings. |
| **Phone can't reach the page at all** | ① The phone is on the booth Wi-Fi? ② The address in the QR is `192.168.137.1`? ③ The firewall rule from step 3 exists? ④ Try `http://192.168.137.1:3000/controller` by typing it into the phone's browser. ⑤ Restart the server. |
| **QR code shows `192.168.56.x` or another strange address** | That's a virtual network adapter (VirtualBox, VMware, WSL…). Start with `HOST_IP=192.168.137.1` (see step 4). |
| **"الخادم غير متصل" (server not connected) on the lobby** | The Node server isn't running. Run `npm start` again. |
| **"اللعبة ممتلئة" (game full) on a phone** | Player 1 is already taken by another phone. Wait for the match to end, or press **Esc** on the laptop. |
| **A player's phone locked mid-match** | The game pauses automatically. Unlock the phone (the page reconnects into the same slot by itself) or scan the QR again. A 3-2-1 countdown resumes the fight. |
| **No sound** | Click anywhere on the laptop page once (browser rule), and check **M** / the speaker button. |
| **Hotspot turned itself off** | Turn off *Power saving* in the Mobile hotspot settings (step 2.5). |

---

## 6. Development (with phones)

```bash
npm run dev
```

This starts the Node server (port 3000) and Vite (port 5173, reachable from the network) together. Open `http://localhost:5173/fight`. The QR code then points to port 5173, and Vite forwards the game traffic to the Node server. Remember the firewall rule for 5173.

Debug helpers: add `?timer=1` to the `/fight` URL to keep the game running in a background tab. In development builds the game scene is available as `window.__fightScene` in the console.

---

## 7. Virtual tours (`/tour`)

Visitors walk through 360° photos of places in India with a phone that works like a gamepad. It uses the same hotspot, firewall rule and server as the football game, but its **own controller page**: the football `/controller` is not affected.

```
 Laptop:  http://localhost:3000/tour
 Phones:  http://192.168.137.1:3000/tour-controller   (the QR code on the tour screen)
```

1. Open **http://localhost:3000/tour** (or click **جولات** in the top bar).
2. The visitor joins the booth Wi-Fi (small QR), then scans the big QR and turns the phone sideways.
3. On the map, the **left stick** picks a place (← →) and pushing it **up** enters the tour.

### The phone controller

| Control | What it does |
| --- | --- |
| Left stick (orange) | **Up**: walk forward to the next viewpoint in the direction you are looking (keeps walking every 0.8 s while held). **Left / right**: step to a side path. **Down**: turn around. |
| Right stick (blue) | Look around. The further you push, the faster it turns. It eases to a stop when you let go. |
| ⊕ / ⊖ | Zoom in / out while held |
| ℹ️ | Facts about the place on the laptop screen (press again to hide) |
| ⏭️ | Next place |
| 🗺️ | Back to the map |

The phone buzzes briefly on every step and twice when there is no path that way. **Only one phone controls the tour at a time.** A second phone shows "شخص آخر يتحكم بالجولة" and takes over automatically when the first one leaves (a phone that drops out keeps its seat for 15 s so it can reconnect).

### Keys on the laptop (testing without a phone)

| Key | Action |
| --- | --- |
| **W A S D** | Move stick (on the map: A / D choose a place, W enters) |
| **Arrow keys** | Look around |
| **+ / −** | Zoom |
| **I** | Facts |
| **N** | Next place |
| **Esc** | Back to the map |

### Offline photos or Google Street View

The booth default is **offline**: 23 freely licensed 360° photos in `public/tours/` for 6 places (Sanchi Stupa, Gateway of India, Ajanta Caves, Ellora Caves, Hyderabad, Udayagiri Caves), with no internet needed.

All of them are full 360° photos. The Sanchi, Ajanta, Ellora and Udayagiri ones are cropped a little below the horizon (their bottom had a watermark and the photographer), so the view stops about 15° down. Free 360° photos of the Taj Mahal, Meenakshi Temple, Kailasa or the root bridges don't exist yet; to add a place later, drop its 360° photo(s) in `public/tours/` and add an entry to `src/tour/places.js`.

Google Street View can be used instead when the laptop has internet:

1. Create a Google Maps API key with **Maps JavaScript API** enabled, and restrict it to your domain / `localhost`.
2. Put it in a file named **`.env.local`** in the project folder (this file is not committed):
   ```
   VITE_GOOGLE_MAPS_API_KEY=your-key-here
   ```
3. In [`src/tour/config.js`](src/tour/config.js) set `provider: 'auto'` (Street View when online, offline photos otherwise) or `'google'`.
4. Rebuild with `npm start`. If Google fails to load, or rejects the key, the tour falls back to the offline photos by itself.

**Test page: `/streetview-test`** (e.g. http://localhost:5173/streetview-test, not in the top bar). Use it to check the key before the event:

- The chips at the top say whether the key is set, the laptop is online, the Google script loaded and **whether Google accepted the key**. Google finds panoramas even with a bad key and only refuses when it draws one, so "Key: accepted" appears only after a panorama is actually shown.
- Pick a ready-made place (Taj Mahal, Meenakshi, Kailasa, the root bridges, the Golden Temple… and the current tour places in green) or type a latitude / longitude. Set the search radius, and tick "outdoor only" to skip visitors' photo spheres.
- It shows the panorama id, distance, date, author and how many walkable neighbours it has. Walk and look around with the same keys as the tour (W A S D, arrows, + / −).
- **Copy** gives a ready line such as `google: { panoId: '…', heading: 120 },` for that place in [`src/tour/places.js`](src/tour/places.js), so the tour opens exactly on that panorama, facing that way.

All the "feel" settings (stick dead zone, look speed, smoothing, walk interval, zoom speed, keys) are in [`src/tour/config.js`](src/tour/config.js). Places, facts and walking directions are in [`src/tour/places.js`](src/tour/places.js).

### Test with a real phone before the event

- [ ] Scan the tour QR: the controller opens, shows the place name at the top and a green dot.
- [ ] Hold the phone upright: the "turn your phone" screen appears; sideways: the controls come back.
- [ ] Both sticks at the same time (walk + look) work with two thumbs.
- [ ] Look stick: smooth turning, stops gently on release, can't look past straight up/down.
- [ ] Walk all the way around Sanchi Stupa (south → east → north → west gate) and down into the Ajanta caves; the phone buzzes once per step.
- [ ] Look all the way around and up/down in each place: no black areas.
- [ ] Walk into a wall: double buzz and "لا يوجد طريق في هذا الاتجاه" on the laptop.
- [ ] Pull the left stick down: a smooth 180° turn.
- [ ] Hold ⊕ / ⊖, then ℹ️, ⏭️ and 🗺️.
- [ ] No page zoom, scrolling, text selection or long-press menu while playing.
- [ ] A second phone shows the "wait for your turn" screen, and takes over after the first phone closes the page.
- [ ] Lock the first phone for a few seconds, then unlock: it reconnects and still controls the tour.
- [ ] The football `/controller` still works as before.

Debug helper: add `?timer=1` to the `/tour` URL to keep the tour running in a background tab. In development builds the active tour is available as `window.__tour`.

---

## 8. Raga Tiles (`/tiles-qr` on the laptop, `/tiles` on phones)

A piano-tiles game that visitors play **on their own phones**, as many at once as you like. The laptop only shows a QR code; the game and its music run on each phone (sound comes from the phone's speaker, never the laptop).

```
 Laptop:  http://localhost:3000/tiles-qr       (only the big QR code; Esc goes back to the site)
 Phones:  http://192.168.137.1:3000/tiles      (what the QR code opens)
```

1. Open **http://localhost:3000/tiles-qr** on the laptop (fullscreen with F11).
2. Visitors join the booth Wi-Fi first (the Wi-Fi QR is on the other pages, e.g. the tour or football screen), then scan this QR code.
3. On the phone: wait for the short loading bar → **اضغط للبدء** (Tap to start; this also switches the sound on) → pick a song and Easy / Normal.

The phone downloads everything once (about 110 KB: the game, one font and the songs, nothing else from the site). After that it needs no network at all: no server calls, no sockets, so a Wi-Fi drop mid-song changes nothing.

**Sound tip for iPhones:** Web audio is muted when the **silent switch** (side of the iPhone) is on. The game shows "لا يوجد صوت؟ أطفئ الوضع الصامت 🔔"; flip the switch and turn the volume up.

### The two kinds of song

| Mode | How it plays |
| --- | --- |
| **Respectful** (the National Anthem) | The melody plays by itself from start to finish at its normal tempo, and the tiles fall with it. Tapping only adds points and a soft glow; missing never stops the music. No fail sound, no game over, no speed-up, no effects. A calm screen before ("Jana Gana Mana", one line about Tagore) and a calm "شكرًا لك" at the end. |
| **Classic** | The first tile waits for a tap; then each correct tap plays that tile's note (hold the long tiles). Missing a tile or tapping an empty lane ends the round → "حاول مرة أخرى". |

Easy shows fewer tiles (only notes on the beat; in classic the notes in between play by themselves after the tap). Best scores are saved per song and difficulty on each phone.

### Add a song from a MIDI file

Songs are JSON files in `public/songs/`, listed in `public/songs/index.json` (respectful songs are always shown first). The converter writes both:

```bash
npm run song -- path/to/song.mid --title "Song name" --title-ar "اسم الأغنية"
```

**The National Anthem is included**: its melody (Rabindranath Tagore) comes from the public-domain score harmonized by Herbert Murrill (1950) on Wikimedia Commons, played at the official length of about 52 seconds. How it was made, and the source files, are in [`songs-src/`](songs-src/README.md). To use a different MIDI of it instead:

```bash
npm run song -- path/to/jana-gana-mana.mid --preset anthem
```

The preset sets the id `jana-gana-mana`, the titles, the one-line intro and **respectful** mode, and overwrites the current file. Run `npm start` again to rebuild.

The converter prints every track of the MIDI file and picks the melody (the highest non-drum track). Useful options:

| Option | When |
| --- | --- |
| `--track 2` | It picked the wrong track: choose the melody track from the printed list |
| `--min-gap 0.16` | It warns that notes are too fast: drop ornaments closer than this |
| `--tempo-scale 0.9` | Play slower (0.9) or faster (1.1) |
| `--transpose -12` | Move up or down (it already moves the melody into a comfortable piano range) |
| `--mode respectful` | Any other song that must play uninterrupted |
| `--dry-run` | Only print what it would do |

Use only MIDI files you are allowed to use (public domain, or your own arrangement). The classic "لحن تجريبي" song is an original test tune.

Melodies written as LilyPond notation (common on Wikipedia/Commons) can be turned into MIDI first with `node scripts/lilypond-melody-to-midi.js melody.ly out.mid --relative "c''" --seconds 52` (the melody line only).

### Tapping

A tile counts when you touch the tile itself or near it: half a tile above or below it, and a little into the lanes beside it. Tiles can be tapped early, before they reach the line (they then score "جيد" instead of "ممتاز"). Tapping a tile you have just played again doesn't count as a mistake. The sizes are in `TOUCH` and `TILE_SEC` in [`src/tiles/config.js`](src/tiles/config.js).

### Test with real phones before the event

- [ ] Scan the QR on `/tiles-qr`: the loading bar finishes, then "اضغط للبدء".
- [ ] Sound plays on an Android phone and on an iPhone (silent switch off).
- [ ] Classic: tap the first tile to start; a wrong tap ends the round; "حاول مرة أخرى" restarts.
- [ ] Hold tiles: holding keeps the note sounding; two fingers at once work.
- [ ] Respectful: put the phone down without tapping: the melody plays to the end and "شكرًا لك" appears.
- [ ] Turn Wi-Fi off after the song list appears: everything still works.
- [ ] Three or four phones playing at the same time.
- [ ] No page zoom, scrolling or long-press menu while playing; turning the phone sideways shows "أمسك الهاتف بشكل عمودي".

Debug helper: `/tiles?timer=1` keeps the game running in a background tab (for testing on the laptop).
