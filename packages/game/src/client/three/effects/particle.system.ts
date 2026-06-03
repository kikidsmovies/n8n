import * as THREE from 'three'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: THREE.Color
}

export class ParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private maxParticles: number

  constructor(scene: THREE.Scene, maxParticles = 500) {
    this.maxParticles = maxParticles

    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(maxParticles * 3)
    const colors = new Float32Array(maxParticles * 3)
    const sizes = new Float32Array(maxParticles)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    scene.add(this.points)
  }

  emit(position: THREE.Vector3, color: number, count: number, spread = 3, upward = false): void {
    const c = new THREE.Color(color)
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          Math.random() * 0.2,
          (Math.random() - 0.5) * 0.4,
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          upward ? Math.random() * spread : (Math.random() - 0.5) * spread * 0.5,
          (Math.random() - 0.5) * spread,
        ),
        life: 1.0,
        maxLife: 0.5 + Math.random() * 0.8,
        size: 0.1 + Math.random() * 0.2,
        color: c.clone(),
      })
    }
  }

  emitExplosion(position: THREE.Vector3, color: number): void {
    this.emit(position, color, 60, 6)
    // Shockwave ring effect
    this.emit(position, 0xffffff, 20, 4)
  }

  update(dt: number): void {
    const alive: Particle[] = []
    for (const p of this.particles) {
      p.life -= dt / p.maxLife
      if (p.life <= 0) continue
      p.velocity.y -= 5 * dt
      p.position.addScaledVector(p.velocity, dt)
      alive.push(p)
    }
    this.particles = alive

    const positions = this.geometry.attributes.position.array as Float32Array
    const colors = this.geometry.attributes.color.array as Float32Array
    const sizes = this.geometry.attributes.size.array as Float32Array

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i]
        positions[i * 3] = p.position.x
        positions[i * 3 + 1] = p.position.y
        positions[i * 3 + 2] = p.position.z
        colors[i * 3] = p.color.r * p.life
        colors[i * 3 + 1] = p.color.g * p.life
        colors[i * 3 + 2] = p.color.b * p.life
        sizes[i] = p.size * p.life
      } else {
        positions[i * 3 + 1] = -9999
      }
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
