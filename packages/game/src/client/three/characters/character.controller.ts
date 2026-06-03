import * as THREE from 'three'
import { ShieldEffect } from '../effects/shield.effect'

const PLAYER_COLORS = [0x00aaff, 0xff4444, 0x44ff44, 0xffaa00, 0xff00ff, 0x00ffff]

function makeToonGradient(): THREE.DataTexture {
  const data = new Uint8Array([80, 160, 255])
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat)
  tex.needsUpdate = true
  return tex
}

const sharedGradientMap = makeToonGradient()

function addOutline(parent: THREE.Group, geo: THREE.BufferGeometry, scale: number): void {
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.setScalar(scale)
  parent.add(mesh)
}

export class CharacterController {
  readonly group: THREE.Group
  private body: THREE.Mesh
  private head: THREE.Mesh
  private hat: THREE.Mesh
  private arm: THREE.Mesh
  private light: THREE.PointLight
  private nameLabel: THREE.Sprite
  private groundGlow: THREE.Mesh
  private groundRing: THREE.Mesh
  private prevX = 0
  private prevZ = 0
  private walkPhase = 0
  readonly shield: ShieldEffect
  readonly playerId: string

  constructor(playerId: string, username: string, _skinId: string, colorIndex: number) {
    this.playerId = playerId
    this.group = new THREE.Group()
    this.group.scale.setScalar(1.4)  // scale up for better visibility from top-down

    const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]
    const skinColor = 0xffddaa

    // ---- Body (toon) ----
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.75, 6, 12)
    const bodyMat = new THREE.MeshToonMaterial({ color, gradientMap: sharedGradientMap })
    this.body = new THREE.Mesh(bodyGeo, bodyMat)
    this.body.position.y = 0.88
    this.body.castShadow = true
    this.group.add(this.body)
    addOutline(this.body, bodyGeo, 1.09)

    // ---- Head (big cartoon proportion) ----
    const headGeo = new THREE.SphereGeometry(0.32, 12, 10)
    const headMat = new THREE.MeshToonMaterial({ color: skinColor, gradientMap: sharedGradientMap })
    this.head = new THREE.Mesh(headGeo, headMat)
    this.head.position.y = 1.70
    this.head.castShadow = true
    this.group.add(this.head)
    addOutline(this.head, headGeo, 1.08)

    // ---- Eyes (simple dots) ----
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 })
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
    eyeL.position.set(-0.13, 1.74, 0.28)
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
    eyeR.position.set(0.13, 1.74, 0.28)
    this.group.add(eyeL, eyeR)

    // ---- Hat (player color) ----
    const hatGeo = new THREE.ConeGeometry(0.24, 0.32, 8)
    const hatMat = new THREE.MeshToonMaterial({ color, gradientMap: sharedGradientMap, emissive: new THREE.Color(color).multiplyScalar(0.3) })
    this.hat = new THREE.Mesh(hatGeo, hatMat)
    this.hat.position.y = 2.08
    this.group.add(this.hat)
    addOutline(this.hat, hatGeo, 1.1)

    // ---- Weapon arm ----
    const armGeo = new THREE.CapsuleGeometry(0.055, 0.42, 4, 6)
    const armMat = new THREE.MeshToonMaterial({ color: 0x666666, gradientMap: sharedGradientMap })
    this.arm = new THREE.Mesh(armGeo, armMat)
    this.arm.position.set(0.42, 1.0, 0.18)
    this.arm.rotation.x = -Math.PI / 4
    this.group.add(this.arm)

    // ---- Weapon tip glow ----
    const tipGeo = new THREE.SphereGeometry(0.06, 6, 6)
    const tipMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    const tip = new THREE.Mesh(tipGeo, tipMat)
    tip.position.set(0.42, 0.72, 0.40)
    this.group.add(tip)

    // ---- Player dynamic light ----
    this.light = new THREE.PointLight(color, 3.5, 8)
    this.light.position.set(0, 1.8, 0)
    this.group.add(this.light)

    // ---- Name label ----
    this.nameLabel = this.createNameSprite(username)
    this.nameLabel.position.y = 2.55
    this.group.add(this.nameLabel)

    // ---- Ground glow disc (soft bloom-ready halo) ----
    const glowGeo = new THREE.CircleGeometry(0.88, 24)
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    this.groundGlow = new THREE.Mesh(glowGeo, glowMat)
    this.groundGlow.rotation.x = -Math.PI / 2
    this.groundGlow.position.y = 0.01
    this.group.add(this.groundGlow)

    // ---- Ground ring (crisp emissive ring) ----
    const ringGeo = new THREE.RingGeometry(0.48, 0.72, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    this.groundRing = new THREE.Mesh(ringGeo, ringMat)
    this.groundRing.rotation.x = -Math.PI / 2
    this.groundRing.position.y = 0.015
    this.group.add(this.groundRing)

    // ---- Shield (hidden by default) ----
    this.shield = new ShieldEffect()
    this.group.add(this.shield.group)
    this.shield.group.position.y = 1.0
  }

  private createNameSprite(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 56
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.beginPath()
    ctx.roundRect(0, 0, 256, 56, 10)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name.slice(0, 14), 128, 28)
    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(2.2, 0.5, 1)
    return sprite
  }

  update(dt: number, isMoving: boolean, isDead: boolean, hasShield: boolean, time: number): void {
    if (isDead) {
      this.group.visible = false
      return
    }
    this.group.visible = true

    // Walk animation
    if (isMoving) {
      this.walkPhase += dt * 8
      this.body.position.y = 0.88 + Math.abs(Math.sin(this.walkPhase)) * 0.06
      this.body.rotation.z = Math.sin(this.walkPhase) * 0.06
      this.arm.rotation.z = Math.sin(this.walkPhase * 1.1) * 0.2
    } else {
      this.walkPhase = 0
      this.body.position.y = 0.88 + Math.sin(time * 1.5) * 0.015
      this.body.rotation.z *= 0.85
      this.arm.rotation.z *= 0.85
    }

    // Pulse light
    this.light.intensity = 2.0 + Math.sin(time * 3) * 0.4

    // Ground glow ring — pulse + scale when moving
    const ringOpacity = isMoving ? 0.65 + Math.sin(time * 10) * 0.2 : 0.35 + Math.sin(time * 2) * 0.15
    const ringScale = isMoving ? 1.35 : 1.0
    ;(this.groundRing.material as THREE.MeshBasicMaterial).opacity = ringOpacity
    ;(this.groundGlow.material as THREE.MeshBasicMaterial).opacity = ringOpacity * 0.35
    this.groundRing.scale.setScalar(ringScale)
    this.groundGlow.scale.setScalar(ringScale * 1.2)

    // Shield
    if (hasShield) {
      this.shield.show()
      this.shield.update(time)
    } else {
      this.shield.hide()
    }
  }

  flashHit(): void {
    // Brief white tint on body mesh
    const mat = this.body.material as THREE.MeshToonMaterial
    const orig = mat.color.clone()
    mat.color.setHex(0xffffff)
    this.shield.flicker()
    setTimeout(() => mat.color.copy(orig), 90)
  }

  setPosition(x: number, z: number): void {
    this.prevX = this.group.position.x
    this.prevZ = this.group.position.z
    this.group.position.set(x, 0, z)
  }

  setRotation(rot: number): void {
    this.group.rotation.y = rot
  }

  isMovingNow(): boolean {
    const dx = this.group.position.x - this.prevX
    const dz = this.group.position.z - this.prevZ
    return dx * dx + dz * dz > 0.0001
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
        else obj.material.dispose()
      }
    })
  }
}
