import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { cleanNickname } from '../shared/nicknames.js'

/**
 * "Today's top solvers" for the chess Puzzle Challenge.
 *   GET    /api/chess/scores   → { date, top: [{ nickname, level, time }] }   (top 10)
 *   POST   /api/chess/scores   { nickname, level, time, runId }  (a finished run, from any phone or the laptop)
 *   DELETE /api/chess/scores   clears today's list: only from the laptop itself (Shift+R ×3 on /chess)
 * Ranking: most levels completed, then the fastest total time. A name appears once (its best run);
 * guests each count separately. The list lives in data/chess-leaderboard.json and starts fresh every day.
 */
export function setupChess(app, root) {
  const file = path.join(root, 'data', 'chess-leaderboard.json')
  const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, laptop's time zone
  let state = { date: today(), entries: [] }
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (saved?.date && Array.isArray(saved.entries)) state = saved
  } catch {
    /* first run */
  }

  const fresh = () => {
    if (state.date !== today()) state = { date: today(), entries: [] }
  }
  const save = () => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify(state, null, 1))
    } catch (e) {
      console.warn('[chess] could not save the leaderboard:', e.message)
    }
  }
  const top = () => {
    const best = new Map()
    for (const e of state.entries) {
      const key = e.nickname ? `n:${e.nickname.toLowerCase()}` : `g:${e.runId}`
      const old = best.get(key)
      if (!old || e.level > old.level || (e.level === old.level && e.time < old.time)) best.set(key, e)
    }
    return [...best.values()]
      .sort((a, b) => b.level - a.level || a.time - b.time || a.at - b.at)
      .slice(0, 10)
      .map(({ nickname, level, time }) => ({ nickname, level, time }))
  }

  const json = express.json({ limit: '2kb' })

  app.get('/api/chess/scores', (_req, res) => {
    fresh()
    res.set('Cache-Control', 'no-store').json({ date: state.date, top: top() })
  })

  app.post('/api/chess/scores', json, (req, res) => {
    fresh()
    const { nickname, level, time, runId } = req.body ?? {}
    const lvl = Number(level)
    const secs = Number(time)
    if (!Number.isInteger(lvl) || lvl < 0 || lvl > 15 || !Number.isFinite(secs) || secs < 1 || secs > 6 * 3600 || typeof runId !== 'string' || runId.length > 40) {
      return res.status(400).json({ ok: false, error: 'bad score' })
    }
    if (!state.entries.some((e) => e.runId === runId)) {
      // a name that isn't allowed is kept as a guest
      state.entries.push({ nickname: nickname ? cleanNickname(nickname) : null, level: lvl, time: Math.round(secs), runId, at: Date.now() })
      if (state.entries.length > 2000) state.entries = state.entries.slice(-2000)
      save()
    }
    res.json({ ok: true, top: top() })
  })

  app.delete('/api/chess/scores', (req, res) => {
    const ip = req.socket.remoteAddress ?? ''
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) return res.status(403).json({ ok: false, error: 'only on the laptop' })
    state = { date: today(), entries: [] }
    save()
    console.log('  [chess] leaderboard cleared')
    res.json({ ok: true, top: [] })
  })
}
