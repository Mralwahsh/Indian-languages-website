import { TOUR } from '../config.js'
import { OfflineTourProvider } from './OfflineTourProvider.js'
import { GoogleStreetViewProvider } from './GoogleStreetViewProvider.js'

/**
 * Create and mount the configured provider. 'auto' tries Google Street View (key + internet)
 * and falls back to the offline 360° photos if anything goes wrong.
 */
export async function createTourProvider(el, place) {
  const wantGoogle = TOUR.provider === 'google' || (TOUR.provider === 'auto' && TOUR.googleApiKey && navigator.onLine)
  if (wantGoogle && place.lat != null) {
    const g = new GoogleStreetViewProvider()
    try {
      await g.mount(el, place)
      return g
    } catch (e) {
      console.warn('[tour] Google Street View unavailable, using offline tours:', e.message)
      g.destroy()
      el.innerHTML = ''
    }
  }
  const o = new OfflineTourProvider()
  await o.mount(el, place)
  return o
}
