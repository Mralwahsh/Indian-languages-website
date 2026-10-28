import { Viewer } from '@photo-sphere-viewer/core'
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/virtual-tour-plugin/index.css'
import { ZOOM } from '../config.js'
import { TourProvider } from './TourProvider.js'

const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

/** fov = { h, v, y? }: degrees covered horizontally / vertically, y = vertical offset of the photo's centre. */
const partialPanoData = (fov) => (image) => {
  const fullWidth = Math.round((image.width * 360) / fov.h)
  const fullHeight = Math.round(fullWidth / 2)
  const croppedHeight = Math.min(image.height, fullHeight)
  return {
    fullWidth,
    fullHeight,
    croppedWidth: image.width,
    croppedHeight,
    croppedX: Math.round((fullWidth - image.width) / 2),
    croppedY: Math.round(fullHeight / 2 - croppedHeight / 2 - ((fov.y ?? 0) / 180) * fullHeight),
  }
}

/**
 * Offline tours: local 360° photos (public/tours/*.jpg) shown with Photo Sphere Viewer.
 * Each place is a small graph of viewpoints ("nodes") connected by links you can walk along.
 */
export class OfflineTourProvider extends TourProvider {
  get kind() {
    return 'offline'
  }

  nodesFor(place) {
    const byId = new Map(place.offline.nodes.map((n) => [n.id, n]))
    // on arrival, face away from the way back (i.e. keep walking in the same direction)
    const arriveYaw = (from, l) => {
      if (l.arriveYaw != null) return l.arriveYaw
      // a photo that doesn't go all the way round: arrive looking at its start direction
      const to = byId.get(l.to)
      if (to?.fov && to.fov.h < 360) return to.startYaw ?? 0
      const back = byId.get(l.to)?.links?.find((b) => b.to === from.id)
      return back ? back.yaw + 180 : undefined
    }
    return place.offline.nodes.map((n) => ({
      id: `${place.id}:${n.id}`,
      panorama: `${import.meta.env.BASE_URL}tours/${n.file}`,
      name: n.nameAr,
      sphereCorrection: n.correction ? { pan: rad(n.correction) } : undefined,
      // a photo that covers only part of the sphere (e.g. a wide 200° panorama): place it around the horizon
      panoData: n.fov ? partialPanoData(n.fov) : undefined,
      links: (n.links ?? []).map((l) => ({
        nodeId: `${place.id}:${l.to}`,
        position: { yaw: rad(l.yaw), pitch: rad(l.pitch ?? -12) },
        data: { arriveYaw: arriveYaw(n, l), yaw: l.yaw },
      })),
      data: { nameAr: n.nameAr, startYaw: n.startYaw ?? 0, fov: n.fov ?? null },
    }))
  }

  async mount(el, place) {
    this.place = place
    const start = `${place.id}:${place.offline.start}`
    this.viewer = new Viewer({
      container: el,
      navbar: false,
      loadingTxt: '',
      defaultZoomLvl: ZOOM.start,
      moveInertia: false,
      mousewheel: true,
      touchmoveTwoFingers: false,
      defaultYaw: rad(place.offline.nodes.find((n) => n.id === place.offline.start)?.startYaw ?? 0),
      plugins: [
        [
          VirtualTourPlugin,
          {
            positionMode: 'manual',
            renderMode: '3d',
            nodes: this.nodesFor(place),
            startNodeId: start,
            preload: true,
            showLinkTooltip: false,
            transitionOptions: { showLoader: true, speed: '30rpm', effect: 'fade', rotation: true },
            arrowStyle: { color: 0xffffff, hoverColor: 0xff9933, outlineColor: 0x000080, scale: [0.6, 2.2] },
          },
        ],
      ],
    })
    this.tourPlugin = this.viewer.getPlugin(VirtualTourPlugin)
    // the first node loads asynchronously after the viewer itself is ready
    await Promise.all([
      new Promise((resolve) => this.viewer.addEventListener('ready', resolve, { once: true })),
      new Promise((resolve) => this.tourPlugin.addEventListener('node-changed', resolve, { once: true })),
    ])
    this.startLoop()
  }

  async loadPlace(place) {
    this.place = place
    const start = `${place.id}:${place.offline.start}`
    const done = new Promise((resolve) => this.tourPlugin.addEventListener('node-changed', resolve, { once: true }))
    this.tourPlugin.setNodes(this.nodesFor(place), start)
    await done
    this.setZoom(ZOOM.start) // each photo starts at the normal zoom (wide photos zoom in by themselves)
    this.setView({ yaw: place.offline.nodes.find((n) => n.id === place.offline.start)?.startYaw ?? 0, pitch: 0 })
  }

  getView() {
    const p = this.viewer.getPosition()
    return { yaw: deg(p.yaw), pitch: deg(p.pitch) }
  }

  setView({ yaw, pitch }) {
    this.viewer.rotate({ yaw: rad(yaw), pitch: rad(pitch) })
  }

  getZoom() {
    return this.viewer.getZoomLevel()
  }

  setZoom(level) {
    this.viewer.zoom(level)
  }

  getLinks() {
    const node = this.tourPlugin.getCurrentNode()
    return (node?.links ?? []).map((l) => ({ id: l.nodeId, yaw: l.data?.yaw ?? deg(l.position?.yaw ?? 0), arriveYaw: l.data?.arriveYaw }))
  }

  async goTo(link) {
    const ok = await this.tourPlugin.setCurrentNode(link.id)
    if (ok !== false) this.setZoom(ZOOM.start)
    if (ok !== false && link.arriveYaw != null) this.setView({ yaw: link.arriveYaw, pitch: 0 })
    return ok !== false
  }

  viewLimits() {
    const fov = this.tourPlugin.getCurrentNode()?.data?.fov
    if (!fov) return null
    // zoom in far enough that the photo fills the screen…
    const { aspect, vFov, hFov } = this.viewer.state
    const { minFov, maxFov } = this.viewer.config
    let fitV = fov.v * 0.97
    if (fov.h < 360) fitV = Math.min(fitV, deg(2 * Math.atan(Math.tan(rad((fov.h * 0.97) / 2)) / aspect)))
    const minZoom = Math.min(100, Math.max(0, ((maxFov - fitV) / (maxFov - minFov)) * 100))
    // …and keep half the screen's field of view as margin so the black edge never shows
    const yawRoom = fov.h >= 360 ? Infinity : Math.max(0, fov.h / 2 - hFov / 2)
    const pitchRoom = Math.max(0, fov.v / 2 - vFov / 2)
    const y = fov.y ?? 0
    return { minYaw: -yawRoom, maxYaw: yawRoom, minPitch: y - pitchRoom, maxPitch: y + pitchRoom, minZoom }
  }

  viewpointName() {
    return this.tourPlugin.getCurrentNode()?.data?.nameAr ?? null
  }

  destroyViewer() {
    this.viewer?.destroy()
  }
}
