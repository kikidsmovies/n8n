import * as THREE from 'three'

const PLAYER_COLORS = [0x00aaff, 0xff4444, 0x44ff44, 0xffaa00, 0xff00ff, 0x00ffff]

export class CharacterController {
  readonly group: THREE.Group
  private mesh: THREE.Mesh
  private light: THREE.PointLight
  private nameLabel: THREE.Sprite
  readonly playerId: string

  constructor(playerId: string, username: string, skinId: string, colorIndex: number) {
    this.playerId = playerId
    this.group = new THREE.Group()

    const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 4, 8)
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 })
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat)
    this.mesh.position.y = 0.9
    this.mesh.castShadow = true
    this.group.add(this.mesh)

    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 8, 8)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffddaa, roughness: 0.5 })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 1.65
    head.castShadow = true
    this.group.add(head)

    // Weapon indicator arm
    const armGeo = new THREE.BoxGeometry(0.08, 0.08, 0.5)
    const armMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 })
    const arm = new THREE.Mesh(armGeo, armMat)
    arm.position.set(0.35, 1.0, 0.25)
    this.group.add(arm)

    // Player point light
    this.light = new THREE.PointLight(color, 1.5, 5)
    this.light.position.set(0, 2, 0)
    this.group.add(this.light)

    // Name label (sprite)
    this.nameLabel = this.createNameSprite(username)
    this.nameLabel.position.y = 2.3
    this.group.add(this.nameLabel)
  }

  private createNameSprite(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.roundRect(0, 0, 256, 64, 8)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(name, 128, 42)

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(2, 0.5, 1)
    return sprite
  }

  update(dt: number, isMoving: boolean, isDead: boolean): void {
    if (isDead) {
      this.group.visible = false
      return
    }
    this.group.visible = true

    // Bob animation when moving
    if (isMoving) {
      this.mesh.position.y = 0.9 + Math.sin(Date.now() * 0.01) * 0.05
    }

    // Pulse light
    this.light.intensity = 1.5 + Math.sin(Date.now() * 0.003) * 0.3
  }

  setPosition(x: number, z: number): void {
    this.group.position.set(x, 0, z)
  }

  setRotation(rot: number): void {
    this.group.rotation.y = rot
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
  }
}
