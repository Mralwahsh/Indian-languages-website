import { TOUR, ZOOM } from '../config.js'
import { TourProvider } from './TourProvider.js'

/* global google */
let loading = null
const AUTH_EVENT = 'gmaps-auth-failure'
const AUTH_MESSAGE = 'Google rejected the API key (wrong key, Maps JavaScript API not enabled, billing off, or this address is not allowed for the key)'

/**
 * Called by Google when the key is wrong, not allowed for this address, or the API isn't enabled.
 * Note: Google still finds panoramas with a bad key; the failure only comes when one is drawn.
 * Kept on window (not in this module) so it survives hot reloads.
 */
const failWith = (message) => {
  if (window.__gmapsAuthFailed) return
  window.__gmapsAuthFailed = message
  window.dispatchEvent(new Event(AUTH_EVENT))
}
window.gm_authFailure = () => failWith(AUTH_MESSAGE)

// Some problems (billing off, API not enabled, address not allowed) are only reported as console errors,
// while Google shows "For development purposes only" instead of the imagery. Catch those and explain them.
const GOOGLE_PROBLEMS = [
  [/enable Billing|BillingNotEnabledMapError/i, 'Billing is not enabled on the Google Cloud project (console.cloud.google.com → Billing → link a billing account)'],
  [/ApiNotActivatedMapError/i, 'Maps JavaScript API is not enabled in the Google Cloud project of this key'],
  [/RefererNotAllowedMapError/i, `This address (${location.origin}) is not allowed for the key: add it under the key's "Websites" restrictions`],
  [/InvalidKeyMapError|InvalidKey/i, 'The API key is not valid (check it was copied fully)'],
  [/ExpiredKeyMapError/i, 'The API key has expired or was deleted'],
  [/ApiTargetBlockedMapError/i, 'The key is restricted to other APIs: allow Maps JavaScript API in its "API restrictions"'],
]
if (!window.__gmapsConsoleWatch) {
  window.__gmapsConsoleWatch = true
  const original = console.error
  console.error = (...args) => {
    const text = args.map(String).join(' ')
    const hit = GOOGLE_PROBLEMS.find(([re]) => re.test(text))
    if (hit) failWith(hit[1])
    original(...args)
  }
}

/** Subscribe to key/authorisation failures (they arrive after the script has loaded). Returns unsubscribe. */
export function onGoogleAuthFailure(fn) {
  const handler = () => fn(new Error(window.__gmapsAuthFailed || AUTH_MESSAGE))
  window.addEventListener(AUTH_EVENT, handler)
  if (window.__gmapsAuthFailed) handler()
  return () => window.removeEventListener(AUTH_EVENT, handler)
}

/** Resolves false if Google rejects the key within `ms` of drawing a panorama, true otherwise. */
function keyAccepted(ms) {
  if (window.__gmapsAuthFailed) return Promise.resolve(false)
  return new Promise((resolve) => {
    const off = onGoogleAuthFailure(() => {
      clearTimeout(timer)
      off()
      resolve(false)
    })
    const timer = setTimeout(() => {
      off()
      resolve(true)
    }, ms)
  })
}

/** Loads the Google Maps JavaScript API (needs internet + an API key with "Maps JavaScript API" enabled). */
export function loadGoogleMaps(key = TOUR.googleApiKey) {
  if (window.google?.maps?.StreetViewPanorama) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    if (!key) return reject(new Error('No Google Maps API key (set VITE_GOOGLE_MAPS_API_KEY in .env.local)'))
    if (!navigator.onLine) return reject(new Error('Offline'))
    const cb = `__gmapsReady${Date.now()}`
    const timer = setTimeout(() => reject(new Error('Google Maps did not load in time')), TOUR.googleLoadTimeoutMs)
    window[cb] = () => {
      clearTimeout(timer)
      resolve()
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&language=ar&loading=async&callback=${cb}`
    s.async = true
    s.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Google Maps failed to load'))
    }
    document.head.appendChild(s)
  }).catch((e) => {
    loading = null
    throw e
  })
  return loading
}

/**
 * Finds the nearest Street View panorama to a point.
 * outdoor: only Google's own outdoor imagery; otherwise visitors' photo spheres count too.
 * @returns {Promise<google.maps.StreetViewPanoramaData>}
 */
export function findPanorama({ lat, lng, radius = 100, outdoor = false }) {
  const service = new google.maps.StreetViewService()
  return service
    .getPanorama({
      location: { lat, lng },
      radius,
      preference: google.maps.StreetViewPreference.NEAREST,
      sources: [outdoor ? google.maps.StreetViewSource.OUTDOOR : google.maps.StreetViewSource.DEFAULT],
    })
    .then((r) => r.data)
}

/** Street View zoom 0..4 ↔ our 0..100 */
const toGoogleZoom = (z) => (z / 100) * 3.5
const fromGoogleZoom = (z) => (z / 3.5) * 100

/**
 * Google Street View tours. Same interface as the offline provider, so the controller,
 * keyboard and page don't care which one is active.
 * Per place: google = { heading?, radius?, panoId?, outdoor? } (panoId wins over lat/lng).
 */
export class GoogleStreetViewProvider extends TourProvider {
  get kind() {
    return 'google'
  }

  async mount(el, place) {
    await loadGoogleMaps(TOUR.googleApiKey)
    if (window.__gmapsAuthFailed) throw new Error(window.__gmapsAuthFailed)
    this.offAuth = onGoogleAuthFailure((e) => this.onError?.(e))
    this.sv = new google.maps.StreetViewPanorama(el, {
      zoom: toGoogleZoom(ZOOM.start),
      disableDefaultUI: true,
      linksControl: true, // arrows on the ground, like the offline tours
      clickToGo: true,
      showRoadLabels: false,
      motionTracking: false,
      motionTrackingControl: false,
      addressControl: false,
      enableCloseButton: false,
    })
    await this.loadPlace(place, { strict: true })
    // a bad key only shows up once the panorama is drawn: give Google a moment to object,
    // so the tour can still fall back to the offline photos
    if (!(await keyAccepted(TOUR.googleKeyCheckMs))) throw new Error(window.__gmapsAuthFailed || AUTH_MESSAGE)
    this.startLoop()
  }

  waitForPano() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Street View did not answer in time')), 8000)
      const h = this.sv.addListener('status_changed', () => {
        const status = this.sv.getStatus()
        if (!status) return
        clearTimeout(timer)
        h.remove()
        if (status === 'OK') resolve()
        else reject(new Error(`Street View status ${status}`))
      })
    })
  }

  async loadPlace(place, { strict = false } = {}) {
    this.place = place
    const g = place.google ?? {}
    try {
      const panoId = g.panoId ?? (await findPanorama({ lat: place.lat, lng: place.lng, radius: g.radius, outdoor: g.outdoor })).location.pano
      const shown = this.waitForPano()
      this.sv.setPano(panoId)
      this.sv.setPov({ heading: g.heading ?? 0, pitch: 0 })
      await shown
    } catch (e) {
      if (strict) throw new Error(`No Street View near ${place.name ?? place.id}: ${e.message}`)
      console.warn('[tour] Street View:', e.message)
    }
  }

  getView() {
    const p = this.sv.getPov()
    return { yaw: p.heading, pitch: p.pitch }
  }

  setView({ yaw, pitch }) {
    this.sv.setPov({ heading: ((yaw % 360) + 360) % 360, pitch })
  }

  getZoom() {
    return fromGoogleZoom(this.sv.getZoom() ?? 1)
  }

  setZoom(level) {
    this.sv.setZoom(toGoogleZoom(level))
  }

  getLinks() {
    return (this.sv.getLinks() ?? []).map((l) => ({ id: l.pano, yaw: l.heading }))
  }

  goTo(link) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(true), 2500)
      const h = this.sv.addListener('pano_changed', () => {
        clearTimeout(timer)
        h.remove()
        resolve(true)
      })
      this.sv.setPano(link.id)
    })
  }

  viewpointName() {
    return this.sv.getLocation()?.description ?? null
  }

  destroyViewer() {
    this.offAuth?.()
    this.sv?.setVisible(false)
    this.sv = null
  }
}
