import veer from './veer.js'
import tara from './tara.js'

export const CHARACTERS = { veer, tara }

/** Default fighter per slot (character select can come later). */
export const SLOT_CHARACTER = { p1: veer, p2: tara }

/** Slot colours used on the lobby and the phone (P1 saffron, P2 green). */
export const SLOT_COLOR = { p1: '#ff9933', p2: '#138808' }
export const SLOT_LABEL_AR = { p1: 'اللاعب 1', p2: 'اللاعب 2' }
