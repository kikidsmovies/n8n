import * as THREE from 'three'
import type { ItemBoxState } from '../../types/game.types'

const ITEM_COLORS: Record<string, number> = {
  speed: 0x00ffcc,
  shield: 0x4488ff,
  teleport: 0xaa44ff,
  health: 0x44ff44,
  diamond: 0x88eeff,
}

const beamVertexShader = `
varying float vAlpha;
void main() {
  vAlpha = 1.0 - position.y / 3.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const beamFragmentShader = `
varying float vAlpha;
uniform vec3 uColor;
void main() {
  gl_FragColor = vec4(uColor, vAlpha * 0.4);
}
`

export class ItemBoxMesh {
  readonly group: THREE.Group
  private outerBox: THREE.Mesh
  private innerCrystal: THREE.Mesh
  private wireframe: THREE.Mesh
  private beam: THREE.Mesh
  private light: THREE.PointLight
  private state: ItemBoxState

  constructor(state: ItemBoxState) {
    this.state = state
    this.group = new THREE.Group()

    const color = ITEM_COLORS[state.type] ?? 0xffffff
    const threeColor = new THREE.Color(color)

    // ---- Outer box shell ----
    const boxGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72)
    const boxMat = new THREE.MeshStandardMaterial({
      color: threeColor.clone().multiplyScalar(0.3),
      emissive: threeColor,
      emissiveIntensity: 0.45,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    })
    this.outerBox = new THREE.Mesh(boxGeo, boxMat)
    this.outerBox.castShadow = true
    this.group.add(this.outerBox)

    // ---- Wireframe overlay ----
    const wireGeo = new THREE.BoxGeometry(0.86, 0.86, 0.86)
    const wireMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.35 })
    this.wireframe = new THREE.Mesh(wireGeo, wireMat)
    this.group.add(this.wireframe)

    // ---- Inner rotating crystal ----
    const crystalGeo = new THREE.OctahedronGeometry(0.22, 0)
    const crystalMat = new THREE.MeshBasicMaterial({
      color,
      wireframe: false,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.innerCrystal = new THREE.Mesh(crystalGeo, crystalMat)
    this.group.add(this.innerCrystal)

    // ---- Light beam upward ----
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.35, 3.5, 8, 1, true)
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: beamVertexShader,
      fragmentShader: beamFragmentShader,
      uniforms: { uColor: { value: threeColor } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    this.beam = new THREE.Mesh(beamGeo, beamMat)
    this.beam.position.y = 1.75
    this.beam.renderOrder = 1
    this.group.add(this.beam)

    // ---- Glow light ----
    this.light = new THREE.PointLight(color, 2.0, 5)
    this.light.position.y = 0.5
    this.group.add(this.light)

    this.group.position.set(state.worldX, 0.55, state.worldZ)
  }

  update(time: number): void {
    if (!this.state.isActive) {
      this.group.visible = false
      return
    }
    this.group.visible = true

    this.outerBox.position.y = Math.sin(time * 1.8) * 0.12
    this.outerBox.rotation.y = time * 0.9
    this.wireframe.rotation.y = -time * 0.7
    this.wireframe.rotation.x = time * 0.3

    // Crystal counter-rotates
    this.innerCrystal.rotation.x = time * 2.5
    this.innerCrystal.rotation.z = time * 1.7
    this.innerCrystal.position.y = Math.sin(time * 1.8) * 0.12

    // Beam billboard (always vertical — no rotation needed)
    this.beam.rotation.y = time * 0.4

    // Light pulse
    this.light.intensity = 1.8 + Math.sin(time * 4) * 0.7
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
