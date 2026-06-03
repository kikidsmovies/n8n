import { Cell, MazeGrid } from './maze.types'

interface PathNode {
  x: number
  z: number
  g: number
  h: number
  f: number
  parent: PathNode | null
}

function heuristic(ax: number, az: number, bx: number, bz: number): number {
  return Math.abs(ax - bx) + Math.abs(az - bz)
}

function canMove(grid: MazeGrid, fromX: number, fromZ: number, toX: number, toZ: number): boolean {
  const cell = grid.cells[fromZ][fromX]
  const dx = toX - fromX
  const dz = toZ - fromZ
  if (dx === 1 && !cell.walls.east) return true
  if (dx === -1 && !cell.walls.west) return true
  if (dz === 1 && !cell.walls.south) return true
  if (dz === -1 && !cell.walls.north) return true
  return false
}

export function findPath(
  grid: MazeGrid,
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number,
): Array<{ x: number; z: number }> | null {
  const open: PathNode[] = []
  const closed = new Set<string>()
  const key = (x: number, z: number) => `${x},${z}`

  open.push({ x: startX, z: startZ, g: 0, h: heuristic(startX, startZ, goalX, goalZ), f: 0, parent: null })

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()!

    if (current.x === goalX && current.z === goalZ) {
      const path: Array<{ x: number; z: number }> = []
      let node: PathNode | null = current
      while (node) {
        path.unshift({ x: node.x, z: node.z })
        node = node.parent
      }
      return path
    }

    closed.add(key(current.x, current.z))

    const neighbors = [
      { x: current.x + 1, z: current.z },
      { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 },
      { x: current.x, z: current.z - 1 },
    ]

    for (const nb of neighbors) {
      if (nb.x < 0 || nb.z < 0 || nb.x >= grid.width || nb.z >= grid.height) continue
      if (closed.has(key(nb.x, nb.z))) continue
      if (!canMove(grid, current.x, current.z, nb.x, nb.z)) continue

      const g = current.g + 1
      const h = heuristic(nb.x, nb.z, goalX, goalZ)
      open.push({ x: nb.x, z: nb.z, g, h, f: g + h, parent: current })
    }
  }
  return null
}

export function computeDistances(grid: MazeGrid, startX: number, startZ: number): void {
  const queue: Array<{ x: number; z: number; dist: number }> = [{ x: startX, z: startZ, dist: 0 }]
  const visited = new Set<string>()
  const key = (x: number, z: number) => `${x},${z}`

  grid.cells[startZ][startX].distanceFromStart = 0
  visited.add(key(startX, startZ))

  while (queue.length > 0) {
    const { x, z, dist } = queue.shift()!
    for (const nb of [
      { nx: x + 1, nz: z },
      { nx: x - 1, nz: z },
      { nx: x, nz: z + 1 },
      { nx: x, nz: z - 1 },
    ]) {
      if (nb.nx < 0 || nb.nz < 0 || nb.nx >= grid.width || nb.nz >= grid.height) continue
      if (visited.has(key(nb.nx, nb.nz))) continue
      if (!canMove(grid, x, z, nb.nx, nb.nz)) continue
      grid.cells[nb.nz][nb.nx].distanceFromStart = dist + 1
      visited.add(key(nb.nx, nb.nz))
      queue.push({ x: nb.nx, z: nb.nz, dist: dist + 1 })
    }
  }
}
