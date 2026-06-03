import * as THREE from 'three'
import type { ProjectileState } from '../../types/game.types'

const WEAPON_COLORS: Record<string, number> = {
  blaster: 0x00aaff,
  shotgun: 0xff8800,
  rocket: 0xff3300,
  frost_ray: 0x88ddff,
}

export class ProjectileMesh {
  readonly group: THREE.Group
  private mesh: THREE.Mesh
  readonly projectileId: string

  constructor(state: ProjectileState) {
    this.projectileId = state.id
    this.group = new THREE.Group()

    const color = WEAPON_COLORS[state.weaponId] ?? 0xffffff

    const geo = state.weaponId === 'rocket'
      ? new THREE.CylinderGeometry(0.08, 0.12, 0.4, 6)
      : new THREE.SphereGeometry(0.1, 6, 6)

    const mat = new THREE.MeshBasicMaterial({ color })
    this.mesh = new THREE.Mesh(geo, mat)
    this.group.add(this.mesh)

    // Trail glow
    const light = new THREE.PointLight(color, 1.5, 2.5)
    this.group.add(light)

    this.group.position.set(state.position.x, state.position.y, state.position.z)
  }

  update(state: ProjectileState): void {
    this.group.position.set(state.position.x, state.position.y, state.position.z)
    // Orient along direction
    if (state.direction.x !== 0 || state.direction.z !== 0) {
      this.group.rotation.y = Math.atan2(state.direction.x, state.direction.z)
    }
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (!Array.isArray(obj.material)) obj.material.dispose()
      }
    })
  }
}
