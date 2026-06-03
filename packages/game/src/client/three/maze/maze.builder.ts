import * as THREE from 'three'
import type { MazeData } from '../../types/game.types'

const CELL_SIZE = 2.0
const WALL_HEIGHT = 3.0
const WALL_THICKNESS = 0.15

interface ParsedCell {
  north: boolean; south: boolean; east: boolean; west: boolean
}

function parseCell(val: number): ParsedCell {
  return {
    north: !!(val & 1),
    south: !!(val & 2),
    east:  !!(val & 4),
    west:  !!(val & 8),
  }
}

export function buildMaze(scene: THREE.Scene, maze: MazeData): THREE.Group {
  const group = new THREE.Group()

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x3344aa,
    roughness: 0.8,
    metalness: 0.1,
    emissive: 0x112244,
    emissiveIntensity: 0.3,
  })

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.9,
    metalness: 0.05,
  })

  const exitMat = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  })

  // Floor
  const floorGeo = new THREE.PlaneGeometry(maze.width * CELL_SIZE, maze.height * CELL_SIZE)
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set((maze.width * CELL_SIZE) / 2, 0, (maze.height * CELL_SIZE) / 2)
  floor.receiveShadow = true
  group.add(floor)

  // Exit marker
  const exitX = (maze.width - 1) * CELL_SIZE + CELL_SIZE / 2
  const exitZ = (maze.height - 1) * CELL_SIZE + CELL_SIZE / 2
  const exitGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.05, 16)
  const exitMesh = new THREE.Mesh(exitGeo, exitMat)
  exitMesh.position.set(exitX, 0.03, exitZ)
  group.add(exitMesh)

  // Pulsing exit light
  const exitLight = new THREE.PointLight(0x00ff88, 3, 8)
  exitLight.position.set(exitX, 1.5, exitZ)
  group.add(exitLight)

  // Animate exit light
  let exitPulse = 0
  const animateExit = () => {
    exitPulse += 0.05
    exitLight.intensity = 2 + Math.sin(exitPulse) * 1
    requestAnimationFrame(animateExit)
  }
  animateExit()

  // Collect all walls and use InstancedMesh
  interface WallInstance { px: number; pz: number; rotY: number; sx: number; sz: number }
  const wallInstances: WallInstance[] = []

  for (let z = 0; z < maze.height; z++) {
    for (let x = 0; x < maze.width; x++) {
      const cell = parseCell(maze.cells[z * maze.width + x])
      const cx = x * CELL_SIZE + CELL_SIZE / 2
      const cz = z * CELL_SIZE + CELL_SIZE / 2

      if (cell.north && z === 0) {
        wallInstances.push({ px: cx, pz: z * CELL_SIZE, rotY: 0, sx: CELL_SIZE + WALL_THICKNESS, sz: WALL_THICKNESS })
      }
      if (cell.south) {
        wallInstances.push({ px: cx, pz: (z + 1) * CELL_SIZE, rotY: 0, sx: CELL_SIZE + WALL_THICKNESS, sz: WALL_THICKNESS })
      }
      if (cell.west && x === 0) {
        wallInstances.push({ px: x * CELL_SIZE, pz: cz, rotY: Math.PI / 2, sx: CELL_SIZE + WALL_THICKNESS, sz: WALL_THICKNESS })
      }
      if (cell.east) {
        wallInstances.push({ px: (x + 1) * CELL_SIZE, pz: cz, rotY: Math.PI / 2, sx: CELL_SIZE + WALL_THICKNESS, sz: WALL_THICKNESS })
      }
    }
  }

  const wallGeo = new THREE.BoxGeometry(1, WALL_HEIGHT, 1)
  const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallInstances.length)
  wallMesh.castShadow = true
  wallMesh.receiveShadow = true

  const dummy = new THREE.Object3D()
  wallInstances.forEach((w, i) => {
    dummy.position.set(w.px, WALL_HEIGHT / 2, w.pz)
    dummy.rotation.y = w.rotY
    dummy.scale.set(w.sx, 1, w.sz)
    dummy.updateMatrix()
    wallMesh.setMatrixAt(i, dummy.matrix)
  })
  wallMesh.instanceMatrix.needsUpdate = true
  group.add(wallMesh)

  scene.add(group)
  return group
}
