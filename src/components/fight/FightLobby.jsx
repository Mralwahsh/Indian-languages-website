import { motion } from 'framer-motion'
import QrCode, { wifiQrText } from './QrCode.jsx'
import boothConfig from '../../config/booth.json'
import { SLOT_CHARACTER, SLOT_COLOR, SLOT_LABEL_AR } from '../../game/characters/index.js'
import { BUTTONS } from '../../../shared/protocol.js'

const STEPS = ['امسح الرمز الصغير للاتصال بشبكة الواي فاي', 'أوقف بيانات الهاتف (Mobile Data)', 'امسح الرمز الكبير لتحصل على يد التحكم', 'أدر هاتفك بالعرض']

const BUTTON_LABEL = { left: '←', right: '→', up: '↑', down: '↓', punch: 'لكمة', kick: 'ركلة', block: 'صدّ', special: 'خاصة' }

/** Fight lobby: QR codes, instructions, player slots and a live button tester. */
export default function FightLobby({ controllerUrl, room, serverOk, heldButtons, showPing, screenPing }) {
  const p1 = room?.slots?.p1
  const p1Ready = p1?.type === 'human' && p1.connected

  return (
    <div className="mx-auto grid h-full max-w-[1800px] grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 px-10 py-6">
      {/* start side: title, steps, players */}
      <section className="flex min-h-0 flex-col">
        <h1 className="font-display text-6xl leading-tight font-extrabold text-navy">
          مقاتلو <span className="text-saffron-deep">الهند</span>
        </h1>
        <p className="text-2xl text-muted">قاتل بهاتفك، بدون تطبيق!</p>

        <ol className="mt-4 grid grid-cols-2 gap-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 shadow-sm ring-1 ring-ink/5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy font-display text-xl font-extrabold text-white">
                {i + 1}
              </span>
              <span className="text-lg leading-snug font-bold">{s}</span>
            </li>
          ))}
        </ol>

        {/* players */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {['p1', 'p2'].map((slot) => (
            <SlotCard key={slot} slot={slot} info={room?.slots?.[slot]} showPing={showPing} />
          ))}
        </div>

        {/* live button tester */}
        <div className="mt-4 rounded-2xl bg-paper px-4 py-3 shadow-sm ring-1 ring-ink/5">
          <p className="text-base font-bold text-muted">اختبار الأزرار: اضغط على هاتفك وسترى الزر يضيء هنا</p>
          <div className="mt-2 flex flex-wrap gap-2" dir="ltr">
            {BUTTONS.map((b) => (
              <span
                key={b}
                className={`min-w-14 rounded-xl px-3 py-1.5 text-center text-lg font-bold transition-colors duration-75 ${
                  heldButtons[b] ? 'bg-saffron text-white' : 'bg-ink/5 text-ink/50'
                }`}
              >
                {BUTTON_LABEL[b]}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <motion.p
          className={`rounded-full px-6 py-3 text-center font-display text-3xl font-extrabold ${p1Ready ? 'bg-green text-white' : 'bg-ink/5 text-ink/40'}`}
          animate={p1Ready ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {p1Ready ? 'اضغط أي زر في هاتفك لبدء القتال!' : 'بانتظار اللاعب 1…'}
        </motion.p>
        <p className="mt-2 text-center text-sm text-muted" dir="ltr">
          Keyboard test: A/D/W/S + J/K/L/I · P = ping · M = sound
        </p>
      </section>

      {/* end side: QR codes */}
      <section className="flex min-h-0 flex-col items-center justify-center gap-4 rounded-[2.5rem] bg-paper p-6 shadow-sm ring-1 ring-ink/5">
        {serverOk === false ? (
          <div className="max-w-md text-center">
            <p className="text-3xl font-bold text-accent">الخادم غير متصل</p>
            <p className="mt-2 text-xl text-muted">
              شغّل الخادم بالأمر <code dir="ltr">npm start</code> (أو <code dir="ltr">npm run dev</code>) ثم أعد تحميل الصفحة.
            </p>
          </div>
        ) : (
          <>
            <p className="font-display text-3xl font-extrabold text-navy">امسح لتحصل على يد التحكم</p>
            {controllerUrl ? <QrCode text={controllerUrl} size={300} /> : <div className="h-[300px] w-[300px] animate-pulse rounded-2xl bg-ink/5" />}
            <p className="rounded-full bg-navy/5 px-4 py-1 font-mono text-xl font-bold text-navy" dir="ltr">
              {controllerUrl ?? '…'}
            </p>
            <div className="mt-2 flex items-center gap-5 rounded-3xl bg-green-soft p-4">
              <QrCode text={wifiQrText(boothConfig.wifi)} size={130} dark="#0d5c06" />
              <div>
                <p className="text-xl font-extrabold text-green">اتصل بالواي فاي أولًا</p>
                <p className="mt-1 text-lg" dir="ltr">
                  <b>{boothConfig.wifi.ssid}</b>
                </p>
                <p className="text-lg text-muted" dir="ltr">
                  {boothConfig.wifi.password}
                </p>
              </div>
            </div>
            {showPing && (
              <p className="font-mono text-sm text-muted" dir="ltr">
                screen↔server {screenPing == null ? '–' : `${Math.round(screenPing)} ms`}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function SlotCard({ slot, info, showPing }) {
  const char = SLOT_CHARACTER[slot]
  const isCpu = info?.type === 'cpu'
  const connected = info?.type === 'human' && info.connected
  const reserved = info?.type === 'human' && !info.connected
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 shadow-sm ring-2" style={{ '--tw-ring-color': `${SLOT_COLOR[slot]}66` }}>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-2xl font-extrabold text-white" style={{ backgroundColor: char.colors.main }}>
        {char.nameAr}
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-extrabold">{SLOT_LABEL_AR[slot]}</span>
        <span className="block text-lg font-bold">
          {isCpu ? (
            <span className="text-navy">🤖 الكمبيوتر</span>
          ) : connected ? (
            <span className="text-green">✅ متصل</span>
          ) : reserved ? (
            <span className="text-accent">⏳ انقطع الاتصال…</span>
          ) : (
            <span className="text-muted">بانتظار…</span>
          )}
          {showPing && info?.ping != null && (
            <span className="ms-2 font-mono text-sm text-muted" dir="ltr">
              {info.ping} ms
            </span>
          )}
        </span>
      </span>
    </div>
  )
}
