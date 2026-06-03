import * as THREE from 'three'

const vertexShader = `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const fragmentShader = `
varying vec3 vNormal;
varying vec3 vViewDir;
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;

void main() {
  float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 2.0);
  float pulse = 0.6 + 0.4 * sin(uTime * 4.0);
  float alpha = fresnel * pulse * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
`

export class ShieldEffect {
  readonly group: THREE.Group
  private mesh: THREE.Mesh
  private flickerUntil = 0

  constructor() {
    this.group = new THREE.Group()
    this.group.visible = false

    const geo = new THREE.IcosahedronGeometry(0.72, 2)
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uColor: { value: new THREE.Color(0x44aaff) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    })

    this.mesh = new THREE.Mesh(geo, mat)
    this.group.add(this.mesh)

    // Wireframe layer
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    })
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.76, 2), wireMat)
    this.group.add(wire)
  }

  show(): void { this.group.visible = true }
  hide(): void { this.group.visible = false }

  flicker(): void {
    this.flickerUntil = Date.now() + 350
  }

  update(time: number): void {
    if (!this.group.visible) return
    const uniforms = (this.mesh.material as THREE.ShaderMaterial).uniforms
    uniforms.uTime.value = time

    if (Date.now() < this.flickerUntil) {
      uniforms.uOpacity.value = 0.3 + Math.random() * 0.8
    } else {
      uniforms.uOpacity.value = 1.0
    }
  }
}
