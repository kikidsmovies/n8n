import * as THREE from 'three'
import type { ItemBoxState } from '../../types/game.types'

const ITEM_COLORS: Record<string, number> = {
  speed: 0x00ffcc,
  shield: 0x4488ff,
  teleport: 0xaa44ff,
  health: 0x44ff44,
  diamond: 0x88eeff,
}

export class ItemBoxMesh {
  readonly group: THREE.Group
  private mesh: THREE.Mesh
  private light: THREE.PointLight
  private state: ItemBoxState
  private baseY: number

  constructor(state: ItemBoxState) {
    this.state = state
    this.group = new THREE.Group()
    this.baseY = 0.6

    const color = ITEM_COLORS[state.type] ?? 0xffffff

    // Box mesh
    const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7)
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.5,
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
    this.group.add(this.mesh)

    // Glow wireframe
    const wireGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85)
    const wireMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.4 })
    const wire = new THREE.Mesh(wireGeo, wireMat)
    this.group.add(wire)

    // Light
    this.light = new THREE.PointLight(color, 1.5, 3.5)
    this.light.position.y = 0.5
    this.group.add(this.light)

    this.group.position.set(state.worldX, this.baseY, state.worldZ)
  }

  update(time: number): void {
    if (!this.state.isActive) {
      this.group.visible = false
      return
    }
    this.group.visible = true
    this.mesh.position.y = Math.sin(time * 2) * 0.15
    this.mesh.rotation.y = time * 1.2
    this.light.intensity = 1.2 + Math.sin(time * 3) * 0.5
  }

  setActive(active: boolean): void {
    this.state.isActive = active
    this.group.visible = active
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
