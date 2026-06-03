import * as THREE from 'three'
import { ParticleSystem } from './particle.system'

export class TeleportEffect {
  private particles: ParticleSystem
  private active = false
  private phase: 'in' | 'out' | 'none' = 'none'
  private elapsed = 0
  private phaseMs = 300

  constructor(particles: ParticleSystem) {
    this.particles = particles
  }

  startTeleport(fromPos: THREE.Vector3, toPos: THREE.Vector3, onMidpoint: () => void): void {
    if (this.active) return
    this.active = true
    this.phase = 'in'
    this.elapsed = 0

    // Spiral inward particles
    this.emitSpiral(fromPos, 40, 'in')

    setTimeout(() => {
      onMidpoint()
      this.phase = 'out'
      this.emitSpiral(toPos, 40, 'out')
      setTimeout(() => {
        this.active = false
        this.phase = 'none'
      }, this.phaseMs)
    }, this.phaseMs)
  }

  private emitSpiral(center: THREE.Vector3, count: number, direction: 'in' | 'out'): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 6
      const radius = 1.5
      const x = center.x + Math.cos(angle) * radius * (direction === 'in' ? 1 : 0)
      const z = center.z + Math.sin(angle) * radius * (direction === 'in' ? 1 : 0)
      const spawnPos = new THREE.Vector3(x, center.y + 0.5, z)

      const targetX = direction === 'in' ? center.x - x : center.x + Math.cos(angle) * radius
      const targetZ = direction === 'in' ? center.z - z : center.z + Math.sin(angle) * radius

      this.particles.emit(
        spawnPos,
        0xaa44ff,
        1,
        direction === 'in' ? 3 : 4,
        direction === 'out',
      )
    }
  }
}
