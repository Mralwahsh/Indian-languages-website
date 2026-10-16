// Single entry point for all content. Today it reads bundled JSON;
// later each function can fetch from the Node backend / Supabase
// (keep the async signatures so the UI doesn't change).
import languagesData from '../data/languages.json'
import statesData from '../data/states.json'
import arabicWordsData from '../data/arabicWords.json'
import gameData from '../data/gameRounds.json'

export async function getLanguages() {
  return languagesData.languages
}

export async function getLanguageFamilies() {
  return languagesData._meta.families
}

export async function getStates() {
  return statesData.states
}

export async function getArabicWords() {
  return arabicWordsData.words
}

export async function getGameData() {
  return {
    languages: gameData.languages,
    words: gameData.words,
    roundsPerGame: gameData._meta.roundsPerGame,
    secondsPerRound: gameData._meta.secondsPerRound,
  }
}

// Static, served from /public so it isn't bundled into JS.
export async function getIndiaTopology() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/india_states.topojson`)
  if (!res.ok) throw new Error(`Map data missing (HTTP ${res.status}). Expected public/data/india_states.topojson`)
  return res.json()
}

// Neighbouring countries (Natural Earth, India point-of-view borders), drawn in gray.
export async function getNeighborsTopology() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/neighbors.topojson`)
  if (!res.ok) throw new Error(`Neighbour map data missing (HTTP ${res.status})`)
  return res.json()
}
