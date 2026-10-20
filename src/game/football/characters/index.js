import kabir from './kabir.js'
import meera from './meera.js'
import arjun from './arjun.js'
import tara from './tara.js'

/** All characters, in the order shown in character select. */
export const CHARACTER_LIST = [kabir, meera, arjun, tara]
export const CHARACTERS = Object.fromEntries(CHARACTER_LIST.map((c) => [c.id, c]))

/** Slot colours used on the lobby, HUD and phone (P1 saffron, P2 green). */
export const SLOT_COLOR = { p1: '#ff9933', p2: '#138808' }
export const SLOT_LABEL_AR = { p1: 'اللاعب 1', p2: 'اللاعب 2' }
