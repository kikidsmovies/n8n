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
  float line = 1.0 - smoothstep(0.03, 0.07, min(g.x, g.y));
  float pulse = 0.5 + 0.5 * sin(uTime * 0.6 + vUv.x * 6.0 + vUv.y * 6.0);
  vec3 baseColor = vec3(0.04, 0.04, 0.10);
  vec3 gridColor = vec3(0.10, 0.14, 0.45);
  gl_FragColor = vec4(mix(baseColor, gridColor, line * (0.5 + 0.5 * pulse)), 1.0);
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

export function buildMaze(scene: THREE.Scene, maze: MazeData): { group: THREE.Group; floorMat: THREE.ShaderMaterial; ceilMat: THREE.ShaderMaterial } {
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
  const floorGeo = new THREE.PlaneGeometry(maze.width * CELL_SIZE, maze.height * CELL_SIZE)
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set((maze.width * CELL_SIZE) / 2, 0, (maze.height * CELL_SIZE) / 2)
  floor.receiveShadow = true
  group.add(floor)

  // ---- Ceiling ----
  const ceilMat = new THREE.ShaderMaterial({
    vertexShader: floorVertexShader,
    fragmentShader: ceilFragmentShader,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
  })
  const ceilGeo = new THREE.PlaneGeometry(maze.width * CELL_SIZE, maze.height * CELL_SIZE)
  const ceil = new THREE.Mesh(ceilGeo, ceilMat)
  ceil.rotation.x = -Math.PI / 2
  ceil.position.set((maze.width * CELL_SIZE) / 2, WALL_HEIGHT, (maze.height * CELL_SIZE) / 2)
  group.add(ceil)

  // ---- Walls ----
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0d1040,
    emissive: 0x1a2080,
    emissiveIntensity: 0.6,
    metalness: 0.85,
    roughness: 0.15,
  })

  // Neon trim material (emissive strip at top of walls)
  const trimMat = new THREE.MeshBasicMaterial({
    color: 0x4466ff,
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

  // ---- Ambient corridor lights ----
  const roomLightColors = [0x4400ff, 0x00ffaa, 0xff6600, 0x00aaff]
  for (let i = 0; i < 6; i++) {
    const lx = (1 + Math.floor(Math.random() * (maze.width - 2))) * CELL_SIZE + CELL_SIZE / 2
    const lz = (1 + Math.floor(Math.random() * (maze.height - 2))) * CELL_SIZE + CELL_SIZE / 2
    const light = new THREE.PointLight(roomLightColors[i % roomLightColors.length], 0.8, 10)
    light.position.set(lx, 2, lz)
    group.add(light)
  }

  scene.add(group)
  return { group, floorMat, ceilMat }
}

function buildExitPortal(group: THREE.Group, maze: MazeData): void {
  const exitX = (maze.width - 1) * CELL_SIZE + CELL_SIZE / 2
  const exitZ = (maze.height - 1) * CELL_SIZE + CELL_SIZE / 2

  // Glowing floor disc
  const discGeo = new THREE.CircleGeometry(1.1, 32)
  const discMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = -Math.PI / 2
  disc.position.set(exitX, 0.02, exitZ)
  group.add(disc)

  // Three rotating torus rings
  const ringColors = [0x00ff88, 0x44ffaa, 0x88ffcc]
  const rings: THREE.Mesh[] = []
  ringColors.forEach((color, i) => {
    const rGeo = new THREE.TorusGeometry(0.85 + i * 0.15, 0.04, 8, 32)
    const rMat = new THREE.MeshBasicMaterial({ color, toneMapped: false })
    const ring = new THREE.Mesh(rGeo, rMat)
    ring.position.set(exitX, 0.5 + i * 0.55, exitZ)
    group.add(ring)
    rings.push(ring)
  })

  // Strong exit spotlight
  const spot = new THREE.PointLight(0x00ff88, 5, 12)
  spot.position.set(exitX, 3, exitZ)
  group.add(spot)

  // Animate rings
  const animate = () => {
    const t = Date.now() * 0.001
    rings.forEach((r, i) => {
      r.rotation.x = t * (0.8 + i * 0.3)
      r.rotation.z = t * (0.5 + i * 0.2) * (i % 2 ? -1 : 1)
    })
    disc.material.opacity = 0.2 + Math.sin(t * 2) * 0.1
    spot.intensity = 4 + Math.sin(t * 3) * 1.5
    requestAnimationFrame(animate)
  }
  animate()
}
