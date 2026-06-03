import * as THREE from 'three'
import type { ProjectileState } from '../../types/game.types'

const WEAPON_COLORS: Record<string, number> = {
  blaster: 0x00aaff,
  shotgun: 0xff8800,
  rocket: 0xff4400,
  frost_ray: 0x88ddff,
}

export class ProjectileMesh {
  readonly group: THREE.Group
  private mesh: THREE.Mesh
  private light: THREE.PointLight
  private trailLine: THREE.Line
  private trailPositions: THREE.Vector3[]
  readonly projectileId: string

  constructor(state: ProjectileState) {
    this.projectileId = state.id
    this.group = new THREE.Group()

    const color = WEAPON_COLORS[state.weaponId] ?? 0xffffff
    const threeColor = new THREE.Color(color)

    // ---- Main projectile geometry ----
    let geo: THREE.BufferGeometry
    if (state.weaponId === 'rocket') {
      geo = new THREE.CylinderGeometry(0.07, 0.13, 0.45, 8)
    } else if (state.weaponId === 'frost_ray') {
      geo = new THREE.IcosahedronGeometry(0.09, 0)
    } else if (state.weaponId === 'shotgun') {
      geo = new THREE.SphereGeometry(0.09, 6, 6)
    } else {
      geo = new THREE.SphereGeometry(0.1, 8, 8)
    }

    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false })
    this.mesh = new THREE.Mesh(geo, mat)
    this.group.add(this.mesh)

    // ---- Outer glow sphere ----
    const glowGeo = new THREE.SphereGeometry(0.22, 6, 6)
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.group.add(new THREE.Mesh(glowGeo, glowMat))

    // ---- Trail line ----
    const TRAIL_LEN = 12
    this.trailPositions = Array.from({ length: TRAIL_LEN }, () =>
      new THREE.Vector3(state.position.x, state.position.y, state.position.z),
    )
    const trailGeo = new THREE.BufferGeometry()
    const arr = new Float32Array(TRAIL_LEN * 3)
    for (let i = 0; i < TRAIL_LEN; i++) {
      arr[i * 3] = state.position.x
      arr[i * 3 + 1] = state.position.y
      arr[i * 3 + 2] = state.position.z
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    const trailMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.trailLine = new THREE.Line(trailGeo, trailMat)
    this.group.add(this.trailLine)

    // ---- Point light ----
    this.light = new THREE.PointLight(color, 2.5, 3.5)
    this.group.add(this.light)

    this.group.position.set(state.position.x, state.position.y, state.position.z)
  }

  update(state: ProjectileState): void {
    const pos = new THREE.Vector3(state.position.x, state.position.y, state.position.z)
    this.group.position.copy(pos)

    // Spin ice crystal
    if (state.weaponId === 'frost_ray') this.mesh.rotation.x += 0.2

    // Rocket spin
    if (state.weaponId === 'rocket') {
      this.mesh.rotation.x += 0.05
      if (state.direction.x !== 0 || state.direction.z !== 0) {
        this.group.rotation.y = Math.atan2(state.direction.x, state.direction.z)
      }
    }

    // Update trail
    this.trailPositions.shift()
    this.trailPositions.push(pos.clone())
    const arr = this.trailLine.geometry.attributes.position.array as Float32Array
    this.trailPositions.forEach((p, i) => {
      arr[i * 3] = p.x - this.group.position.x
      arr[i * 3 + 1] = p.y - this.group.position.y
      arr[i * 3 + 2] = p.z - this.group.position.z
    })
    this.trailLine.geometry.attributes.position.needsUpdate = true
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose()
        if (!Array.isArray(obj.material)) obj.material.dispose()
      }
    })
  }
}
