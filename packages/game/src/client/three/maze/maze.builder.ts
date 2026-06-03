import * as THREE from 'three'
import type { MazeData } from '../../types/game.types'

export const CELL_SIZE = 2.0
const WALL_HEIGHT = 3.2

interface ParsedCell { north: boolean; south: boolean; east: boolean; west: boolean }
function parseCell(val: number): ParsedCell {
  return { north: !!(val & 1), south: !!(val & 2), east: !!(val & 4), west: !!(val & 8) }
}

// --- Floor grid shader ---
const floorVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const floorFragmentShader = `
varying vec2 vUv;
uniform vec2 uSize;
uniform float uTime;
void main() {
  vec2 uv = vUv * uSize;
  vec2 g = abs(fract(uv) - 0.5);
  float lineW = min(g.x, g.y);
  float line = 1.0 - smoothstep(0.02, 0.05, lineW);
  float bigLine = 1.0 - smoothstep(0.015, 0.04, min(abs(fract(uv * 0.2) - 0.5).x, abs(fract(uv * 0.2) - 0.5).y));
  float wave = 0.5 + 0.5 * sin(uTime * 0.5 - (vUv.x + vUv.y) * 8.0);
  vec3 baseColor = vec3(0.02, 0.02, 0.08);
  vec3 gridColor = mix(vec3(0.08, 0.22, 0.55), vec3(0.20, 0.05, 0.40), wave);
  vec3 bigColor = vec3(0.15, 0.35, 0.80);
  vec3 col = mix(baseColor, gridColor, line * 0.85);
  col = mix(col, bigColor, bigLine * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
`

// --- Ceiling hex pattern ---
const ceilFragmentShader = `
varying vec2 vUv;
uniform float uTime;
void main() {
  vec2 uv = vUv * 12.0;
  float hex = sin(uv.x * 1.732 + uTime * 0.3) + sin(uv.y + uTime * 0.2) + sin((uv.x + uv.y) * 0.5);
  hex = smoothstep(2.4, 2.7, hex);
  vec3 c = mix(vec3(0.02, 0.02, 0.06), vec3(0.12, 0.08, 0.30), hex);
  gl_FragColor = vec4(c, 1.0);
}
`

// Ambient dust particle shader
const dustVertShader = `
attribute float aPhase;
uniform float uTime;
varying float vAlpha;
void main() {
  vec3 pos = position;
  pos.y += sin(uTime * 0.4 + aPhase) * 0.25 + uTime * 0.03;
  pos.y = mod(pos.y, 3.2);  // wrap at ceiling
  pos.x += sin(uTime * 0.3 + aPhase * 1.7) * 0.15;
  pos.z += cos(uTime * 0.25 + aPhase * 2.1) * 0.15;
  vAlpha = 0.3 + 0.5 * sin(uTime * 0.8 + aPhase);
  gl_PointSize = 2.0 + sin(uTime + aPhase) * 0.8;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`
const dustFragShader = `
varying float vAlpha;
uniform vec3 uColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d) * vAlpha;
  gl_FragColor = vec4(uColor, a * 0.55);
}
`

export function buildMaze(scene: THREE.Scene, maze: MazeData): { group: THREE.Group; floorMat: THREE.ShaderMaterial; ceilMat: THREE.ShaderMaterial; dustMat: THREE.ShaderMaterial } {
  const group = new THREE.Group()

  // ---- Floor ----
  const floorMat = new THREE.ShaderMaterial({
    vertexShader: floorVertexShader,
    fragmentShader: floorFragmentShader,
    uniforms: {
      uSize: { value: new THREE.Vector2(maze.width, maze.height) },
      uTime: { value: 0 },
    },
  })
  const mazeW = maze.width * CELL_SIZE
  const mazeH = maze.height * CELL_SIZE
  const EXT = 80  // extra floor border beyond maze

  const floorGeo = new THREE.PlaneGeometry(mazeW + EXT * 2, mazeH + EXT * 2)
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(mazeW / 2, 0, mazeH / 2)
  floor.receiveShadow = true
  group.add(floor)

  // ---- Ceiling ----
  const ceilMat = new THREE.ShaderMaterial({
    vertexShader: floorVertexShader,
    fragmentShader: ceilFragmentShader,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
  })
  const ceilGeo = new THREE.PlaneGeometry(mazeW + EXT * 2, mazeH + EXT * 2)
  const ceil = new THREE.Mesh(ceilGeo, ceilMat)
  ceil.rotation.x = -Math.PI / 2
  ceil.position.set(mazeW / 2, WALL_HEIGHT, mazeH / 2)
  group.add(ceil)

  // ---- Walls ----
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0d1040,
    emissive: 0x2233cc,
    emissiveIntensity: 1.2,
    metalness: 0.9,
    roughness: 0.08,
  })

  // Neon trim material — bright electric blue, blooms in postprocessing
  const trimMat = new THREE.MeshBasicMaterial({
    color: 0x5588ff,
    toneMapped: false,
  })

  interface WallInst { px: number; pz: number; rotY: number; sx: number; sz: number }
  const wallInstances: WallInst[] = []

  for (let z = 0; z < maze.height; z++) {
    for (let x = 0; x < maze.width; x++) {
      const cell = parseCell(maze.cells[z * maze.width + x])
      const cx = x * CELL_SIZE + CELL_SIZE / 2
      const cz = z * CELL_SIZE + CELL_SIZE / 2

      if (cell.north && z === 0) wallInstances.push({ px: cx, pz: z * CELL_SIZE, rotY: 0, sx: CELL_SIZE + 0.15, sz: 0.15 })
      if (cell.south)            wallInstances.push({ px: cx, pz: (z + 1) * CELL_SIZE, rotY: 0, sx: CELL_SIZE + 0.15, sz: 0.15 })
      if (cell.west && x === 0)  wallInstances.push({ px: x * CELL_SIZE, pz: cz, rotY: Math.PI / 2, sx: CELL_SIZE + 0.15, sz: 0.15 })
      if (cell.east)             wallInstances.push({ px: (x + 1) * CELL_SIZE, pz: cz, rotY: Math.PI / 2, sx: CELL_SIZE + 0.15, sz: 0.15 })
    }
  }

  const wallGeo = new THREE.BoxGeometry(1, WALL_HEIGHT, 1)
  const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallInstances.length)
  wallMesh.castShadow = true
  wallMesh.receiveShadow = true

  // Neon trim strip (thin emissive box at wall top)
  const trimGeo = new THREE.BoxGeometry(1, 0.08, 1)
  const trimMesh = new THREE.InstancedMesh(trimGeo, trimMat, wallInstances.length)

  const dummy = new THREE.Object3D()
  wallInstances.forEach((w, i) => {
    dummy.position.set(w.px, WALL_HEIGHT / 2, w.pz)
    dummy.rotation.y = w.rotY
    dummy.scale.set(w.sx, 1, w.sz)
    dummy.updateMatrix()
    wallMesh.setMatrixAt(i, dummy.matrix)

    // Trim at top
    dummy.position.set(w.px, WALL_HEIGHT + 0.04, w.pz)
    dummy.scale.set(w.sx, 1, w.sz)
    dummy.updateMatrix()
    trimMesh.setMatrixAt(i, dummy.matrix)
  })
  wallMesh.instanceMatrix.needsUpdate = true
  trimMesh.instanceMatrix.needsUpdate = true
  group.add(wallMesh, trimMesh)

  // ---- Exit portal ----
  buildExitPortal(group, maze)

  // ---- Ambient corridor lights — 4-zone color scheme ----
  // Top-left: blue/purple | Top-right: orange/red | Bottom-left: cyan/teal | Bottom-right: green (exit zone)
  const midX = maze.width / 2
  const midZ = maze.height / 2
  const zoneLights: Array<{ quadrant: number; x: number; z: number }> = []
  // Deterministic placement: every N cells, one light
  const step = 4
  for (let gz = 1; gz < maze.height - 1; gz += step) {
    for (let gx = 1; gx < maze.width - 1; gx += step) {
      const qx = gx > midX ? 1 : 0
      const qz = gz > midZ ? 1 : 0
      zoneLights.push({ quadrant: qz * 2 + qx, x: gx, z: gz })
    }
  }
  const zoneColors = [
    0x4444ff,  // quadrant 0 (top-left): deep blue
    0xff6600,  // quadrant 1 (top-right): orange
    0x00ccff,  // quadrant 2 (bottom-left): cyan
    0x00ff88,  // quadrant 3 (bottom-right): green (exit zone)
  ]
  zoneLights.forEach(({ quadrant, x, z }) => {
    const lx = x * CELL_SIZE + CELL_SIZE / 2
    const lz = z * CELL_SIZE + CELL_SIZE / 2
    const light = new THREE.PointLight(zoneColors[quadrant], 1.2, 12)
    light.position.set(lx, 2.5, lz)
    group.add(light)
  })

  // ---- Ambient corridor dust particles ----
  const DUST_COUNT = 500
  const mazeWd = maze.width * CELL_SIZE
  const mazeHd = maze.height * CELL_SIZE
  const dustPositions = new Float32Array(DUST_COUNT * 3)
  const dustPhases = new Float32Array(DUST_COUNT)
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPositions[i * 3]     = Math.random() * mazeWd
    dustPositions[i * 3 + 1] = Math.random() * WALL_HEIGHT
    dustPositions[i * 3 + 2] = Math.random() * mazeHd
    dustPhases[i] = Math.random() * Math.PI * 2
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dustPhases, 1))
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: dustVertShader,
    fragmentShader: dustFragShader,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x4488ff) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const dustPoints = new THREE.Points(dustGeo, dustMat)
  group.add(dustPoints)

  scene.add(group)
  return { group, floorMat, ceilMat, dustMat }
}

// Vertical beam shader for the exit portal
const exitBeamVert = `
varying float vY;
void main() {
  vY = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const exitBeamFrag = `
varying float vY;
uniform float uTime;
void main() {
  float alpha = (1.0 - vY / 18.0) * (0.4 + 0.2 * sin(uTime * 3.0 + vY * 0.8));
  alpha = clamp(alpha, 0.0, 1.0);
  vec3 col = mix(vec3(0.0, 1.0, 0.53), vec3(0.5, 1.0, 0.8), vY / 18.0);
  gl_FragColor = vec4(col, alpha * 0.6);
}
`

function buildExitPortal(group: THREE.Group, maze: MazeData): void {
  const exitX = (maze.width - 1) * CELL_SIZE + CELL_SIZE / 2
  const exitZ = (maze.height - 1) * CELL_SIZE + CELL_SIZE / 2

  // Large glowing floor disc
  const discGeo = new THREE.CircleGeometry(1.6, 48)
  const discMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = -Math.PI / 2
  disc.position.set(exitX, 0.02, exitZ)
  group.add(disc)

  // Outer ring on floor
  const floorRingGeo = new THREE.RingGeometry(1.55, 1.9, 48)
  const floorRingMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat)
  floorRing.rotation.x = -Math.PI / 2
  floorRing.position.set(exitX, 0.025, exitZ)
  group.add(floorRing)

  // Tall vertical beam (beacon visible from across the maze)
  const beamGeo = new THREE.CylinderGeometry(0.12, 0.85, 18, 12, 1, true)
  const beamMat = new THREE.ShaderMaterial({
    vertexShader: exitBeamVert,
    fragmentShader: exitBeamFrag,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  const beam = new THREE.Mesh(beamGeo, beamMat)
  beam.position.set(exitX, 9, exitZ)
  beam.renderOrder = 2
  group.add(beam)

  // Five rotating torus rings stacked
  const ringColors = [0x00ff88, 0x22ffaa, 0x44ffcc, 0x66ffdd, 0x88ffee]
  const rings: THREE.Mesh[] = []
  ringColors.forEach((color, i) => {
    const rGeo = new THREE.TorusGeometry(1.0 + i * 0.12, 0.055, 8, 40)
    const rMat = new THREE.MeshBasicMaterial({ color, toneMapped: false })
    const ring = new THREE.Mesh(rGeo, rMat)
    ring.position.set(exitX, 0.4 + i * 0.5, exitZ)
    group.add(ring)
    rings.push(ring)
  })

  // Strong exit lights (two for better radius coverage)
  const spot1 = new THREE.PointLight(0x00ff88, 8, 16)
  spot1.position.set(exitX, 3, exitZ)
  group.add(spot1)
  const spot2 = new THREE.PointLight(0x44ffaa, 3, 8)
  spot2.position.set(exitX, 0.5, exitZ)
  group.add(spot2)

  // Animate
  const animate = () => {
    const t = Date.now() * 0.001
    rings.forEach((r, i) => {
      r.rotation.x = t * (0.7 + i * 0.25)
      r.rotation.z = t * (0.4 + i * 0.18) * (i % 2 ? -1 : 1)
    })
    disc.material.opacity = 0.25 + Math.sin(t * 2.5) * 0.12
    floorRing.material.opacity = 0.55 + Math.sin(t * 1.8 + 1.2) * 0.2
    spot1.intensity = 7 + Math.sin(t * 3) * 2
    beamMat.uniforms.uTime.value = t
    requestAnimationFrame(animate)
  }
  animate()
}
