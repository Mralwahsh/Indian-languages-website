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
