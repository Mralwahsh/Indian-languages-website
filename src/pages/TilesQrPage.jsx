import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QrCode from '../components/football/QrCode.jsx'
import Rangoli from '../components/tiles/Rangoli.jsx'
import { getConnectionInfo } from '../game/net/socket.js'

/**
 * /tiles-qr: the laptop only shows where to play Raga Tiles. The game itself runs on each
 * visitor's phone (/tiles), so nothing else is on this screen. Esc goes back to the site.
 */
export default function TilesQrPage() {
  const navigate = useNavigate()
  const [info, setInfo] = useState(undefined) // undefined = loading, null = server not running
  const [qrSize, setQrSize] = useState(() => qrFor(window))

  useEffect(() => {
    getConnectionInfo().then(setInfo)
    const onResize = () => setQrSize(qrFor(window))
    const onKey = (e) => e.key === 'Escape' && navigate('/')
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
    }
  }, [navigate])

  const url = info ? `http://${info.ip}:${window.location.port || 80}/tiles` : null

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-[#2a1240] text-white" dir="rtl">
      <Rangoli size="125vh" className="pointer-events-none absolute -end-[38vh] -top-[30vh] opacity-90" />
      <Rangoli size="95vh" className="pointer-events-none absolute -start-[34vh] -bottom-[36vh] opacity-90" />

      <main className="relative flex flex-col items-center">
        <h1 className="font-display text-[min(5.6vw,8.5vh)] leading-tight text-[#fff4e0] drop-shadow-[0_4px_0_#1b0a2c]">
          امسح الرمز والعب <bdi dir="ltr">Raga Tiles</bdi> 🎹
        </h1>
        <div className="mt-[3vh] rounded-[2.2rem] bg-[#fff4e0] p-[2.2vh] shadow-[0_24px_60px_-10px_rgba(0,0,0,0.6)] ring-8 ring-[#ffb000]">
          {url ? (
            <QrCode text={url} size={qrSize} dark="#2a1240" light="#fff4e0" />
          ) : (
            <div className="grid place-items-center p-8 text-center text-[#2a1240]" style={{ width: qrSize, height: qrSize }}>
              <p className="text-3xl font-bold">{info === null ? 'الخادم غير متصل: شغّل npm start' : '…'}</p>
            </div>
          )}
        </div>
        <p className="mt-[2.4vh] font-mono text-[min(1.6vw,2.6vh)] text-white/75" dir="ltr">
          {url ?? ' '}
        </p>
      </main>
    </div>
  )
}

const qrFor = (w) => Math.round(Math.min(w.innerHeight * 0.56, w.innerWidth * 0.42))
