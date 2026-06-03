import * as THREE from 'three'
import { ParticleSystem } from './particle.system'

const WEAPON_COLORS: Record<string, number> = {
  blaster: 0x00aaff,
  shotgun: 0xff8800,
  rocket: 0xff4400,
  frost_ray: 0x88ddff,
}

export class WeaponEffects {
  private scene: THREE.Scene
  private particles: ParticleSystem

  // Active trails: projectile id → trail positions ring buffer
  private trails = new Map<string, { line: THREE.Line; positions: THREE.Vector3[]; mat: THREE.LineBasicMaterial }>()

  constructor(scene: THREE.Scene, particles: ParticleSystem) {
    this.scene = scene
    this.particles = particles
  }

  muzzleFlash(position: THREE.Vector3, direction: THREE.Vector3, weaponId: string): void {
    const color = WEAPON_COLORS[weaponId] ?? 0xffffff
    // Bright burst
    this.particles.emit(position.clone(), color, 12, 2.5, false)
    this.particles.emit(position.clone(), 0xffffff, 4, 1.5, false)

    // Temporary flash light
    const light = new THREE.PointLight(color, 8, 4)
    light.position.copy(position)
    this.scene.add(light)
    setTimeout(() => this.scene.remove(light), 60)
  }

  hitSpark(position: THREE.Vector3, weaponId: string): void {
    const color = WEAPON_COLORS[weaponId] ?? 0xffffff
    this.particles.emit(position, color, 10, 3)
    this.particles.emit(position, 0xffffff, 4, 2)
  }

  addTrail(projectileId: string, position: THREE.Vector3, weaponId: string): void {
    const color = WEAPON_COLORS[weaponId] ?? 0xffffff
    const maxPoints = 10
    const positions = Array.from({ length: maxPoints }, () => position.clone())

    const geo = new THREE.BufferGeometry()
    const arr = new Float32Array(maxPoints * 3)
    for (let i = 0; i < maxPoints; i++) {
      arr[i * 3] = position.x
      arr[i * 3 + 1] = position.y
      arr[i * 3 + 2] = position.z
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))

    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      linewidth: 2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const line = new THREE.Line(geo, mat)
    this.scene.add(line)
    this.trails.set(projectileId, { line, positions, mat })
  }

  updateTrail(projectileId: string, position: THREE.Vector3): void {
    const trail = this.trails.get(projectileId)
    if (!trail) return
    trail.positions.shift()
    trail.positions.push(position.clone())

    const arr = trail.line.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < trail.positions.length; i++) {
      arr[i * 3] = trail.positions[i].x
      arr[i * 3 + 1] = trail.positions[i].y
      arr[i * 3 + 2] = trail.positions[i].z
    }
    trail.line.geometry.attributes.position.needsUpdate = true
  }

  removeTrail(projectileId: string, hitPosition?: THREE.Vector3, weaponId?: string): void {
    const trail = this.trails.get(projectileId)
    if (!trail) return
    this.scene.remove(trail.line)
    trail.line.geometry.dispose()
    trail.mat.dispose()
    this.trails.delete(projectileId)

    if (hitPosition && weaponId) {
      this.hitSpark(hitPosition, weaponId)
    }
  }

  removeAllTrails(): void {
    for (const [id] of this.trails) {
      this.removeTrail(id)
    }
  }
}
