import * as THREE from 'three'

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private targetPos = new THREE.Vector3()
  private offset = new THREE.Vector3(0, 8, -7)
  private springStiffness = 8

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
  }

  update(playerPos: THREE.Vector3, playerRotation: number, dt: number): void {
    const rotatedOffset = this.offset.clone()
    rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation)

    this.targetPos.copy(playerPos).add(rotatedOffset)

    this.camera.position.lerp(this.targetPos, Math.min(1, this.springStiffness * dt))
    this.camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z)
  }
}
