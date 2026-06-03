import * as THREE from 'three'

export class ScreenEffects {
  private camera: THREE.PerspectiveCamera
  private scene: THREE.Scene

  private shakeIntensity = 0
  private shakeDuration = 0
  private shakeElapsed = 0
  private basePosition = new THREE.Vector3()
  private trackingBase = false

  private flashMesh: THREE.Mesh
  private flashDuration = 0
  private flashElapsed = 0

  private targetFov = 75
  private currentFov = 75
  readonly baseFov = 75

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera
    this.scene = scene

    // Fullscreen flash quad — sits just in front of camera
    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      side: THREE.FrontSide,
    })
    this.flashMesh = new THREE.Mesh(geo, mat)
    this.flashMesh.renderOrder = 999
    // Attach to camera so it follows
    this.camera.add(this.flashMesh)
    this.flashMesh.position.z = -0.5
    this.flashMesh.scale.set(2, 2, 1)
  }

  shake(intensity: number, durationMs: number): void {
    this.shakeIntensity = intensity
    this.shakeDuration = durationMs / 1000
    this.shakeElapsed = 0
    if (!this.trackingBase) {
      this.basePosition.copy(this.camera.position)
      this.trackingBase = true
    }
  }

  hitFlash(color = 0xff2200, durationMs = 120): void {
    const mat = this.flashMesh.material as THREE.MeshBasicMaterial
    mat.color.setHex(color)
    mat.opacity = 0.35
    this.flashDuration = durationMs / 1000
    this.flashElapsed = 0
  }

  setTargetFov(fov: number): void {
    this.targetFov = fov
  }

  update(dt: number): void {
    // Screen shake
    if (this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += dt
      const t = this.shakeElapsed / this.shakeDuration
      const decay = Math.exp(-4 * t)
      const ox = Math.sin(this.shakeElapsed * 60) * this.shakeIntensity * decay
      const oy = Math.cos(this.shakeElapsed * 45) * this.shakeIntensity * decay * 0.6
      this.camera.position.x += ox
      this.camera.position.y += oy
    }

    // Hit flash fade
    if (this.flashElapsed < this.flashDuration) {
      this.flashElapsed += dt
      const t = this.flashElapsed / this.flashDuration
      ;(this.flashMesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - t)
    } else {
      ;(this.flashMesh.material as THREE.MeshBasicMaterial).opacity = 0
    }

    // FOV lerp
    const fovDiff = this.targetFov - this.currentFov
    this.currentFov += fovDiff * Math.min(1, 5 * dt)
    if (Math.abs(fovDiff) > 0.1) {
      this.camera.fov = this.currentFov
      this.camera.updateProjectionMatrix()
    }
  }
}
