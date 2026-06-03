import * as THREE from 'three'

// True isometric top-down camera — similar to Brawl Stars.
// Camera sits high above and slightly behind the player at a fixed world angle.
// Does NOT rotate with the player, giving stable orientation.
const CAM_HEIGHT = 20      // units above player
const CAM_BACK  = -6       // units behind player (negative = behind, facing +Z)
const CAM_SIDE  = 0        // lateral offset
const LOOK_FWD  = 8        // look this many units ahead of player
const SPRING    = 6

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private initialized = false

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
  }

  update(playerPos: THREE.Vector3, _playerRotation: number, dt: number): void {
    // Fixed-world offset: camera is above and slightly behind
    const camTarget = new THREE.Vector3(
      playerPos.x + CAM_SIDE,
      playerPos.y + CAM_HEIGHT,
      playerPos.z + CAM_BACK,
    )

    if (!this.initialized) {
      this.camera.position.copy(camTarget)
      this.initialized = true
    } else {
      this.camera.position.lerp(camTarget, Math.min(1, SPRING * dt))
    }

    // Look ahead of player so the maze fills the top portion of the screen
    this.camera.lookAt(
      playerPos.x + CAM_SIDE,
      playerPos.y,
      playerPos.z + LOOK_FWD,
    )
  }
}
