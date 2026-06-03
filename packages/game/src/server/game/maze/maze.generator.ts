import { MazeGrid, Cell, ItemBoxPlacement } from './maze.types'
import { computeDistances, findPath } from './maze.pathfinder'
import { v4 as uuidv4 } from 'uuid'

export const CELL_SIZE = 2.0

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeGrid(width: number, height: number): Cell[][] {
  const cells: Cell[][] = []
  for (let z = 0; z < height; z++) {
    cells.push([])
    for (let x = 0; x < width; x++) {
      cells[z].push({
        x,
        z,
        walls: { north: true, south: true, east: true, west: true },
        visited: false,
      })
    }
  }
  return cells
}

function removeWall(a: Cell, b: Cell): void {
  const dx = b.x - a.x
  const dz = b.z - a.z
  if (dx === 1) { a.walls.east = false; b.walls.west = false }
  if (dx === -1) { a.walls.west = false; b.walls.east = false }
  if (dz === 1) { a.walls.south = false; b.walls.north = false }
  if (dz === -1) { a.walls.north = false; b.walls.south = false }
}

function recursiveBacktracker(cells: Cell[][], width: number, height: number, rng: () => number): void {
  const stack: Cell[] = [cells[0][0]]
  cells[0][0].visited = true

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const neighbors: Cell[] = []
    const dirs = [
      { dx: 0, dz: -1 },
      { dx: 0, dz: 1 },
      { dx: -1, dz: 0 },
      { dx: 1, dz: 0 },
    ]
    for (const { dx, dz } of dirs) {
      const nx = current.x + dx
      const nz = current.z + dz
      if (nx >= 0 && nz >= 0 && nx < width && nz < height && !cells[nz][nx].visited) {
        neighbors.push(cells[nz][nx])
      }
    }
    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(rng() * neighbors.length)]
      removeWall(current, next)
      next.visited = true
      stack.push(next)
    } else {
      stack.pop()
    }
  }
}

function carveRooms(cells: Cell[][], width: number, height: number, rng: () => number): void {
  const numRooms = 4 + Math.floor(rng() * 3)
  for (let r = 0; r < numRooms; r++) {
    const roomW = 2 + Math.floor(rng() * 2)
    const roomH = 2 + Math.floor(rng() * 2)
    const startX = 1 + Math.floor(rng() * (width - roomW - 2))
    const startZ = 1 + Math.floor(rng() * (height - roomH - 2))

    for (let z = startZ; z < startZ + roomH; z++) {
      for (let x = startX; x < startX + roomW; x++) {
        if (x < width - 1 && z < height - 1) {
          const cell = cells[z][x]
          cell.isRoom = true
          removeWall(cell, cells[z][x + 1])
          removeWall(cell, cells[z + 1][x])
        }
      }
    }
  }
}

const ITEM_TYPES: ItemBoxPlacement['type'][] = ['speed', 'shield', 'teleport', 'health', 'diamond']

export function generateMaze(width: number, height: number, seed: number): { grid: MazeGrid; itemBoxes: ItemBoxPlacement[] } {
  const rng = mulberry32(seed)
  const cells = makeGrid(width, height)

  recursiveBacktracker(cells, width, height, rng)
  carveRooms(cells, width, height, rng)

  const exitX = width - 1
  const exitZ = height - 1

  // Compute distances for item placement
  computeDistances({ cells, width, height, seed, exitX, exitZ, spawnPositions: [] }, 0, 0)

  let maxDist = 0
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      maxDist = Math.max(maxDist, cells[z][x].distanceFromStart ?? 0)
    }
  }

  // Spawn positions at corners
  const spawnPositions = [
    { x: 0 * CELL_SIZE + CELL_SIZE / 2, z: 0 * CELL_SIZE + CELL_SIZE / 2 },
    { x: (width - 1) * CELL_SIZE + CELL_SIZE / 2, z: 0 * CELL_SIZE + CELL_SIZE / 2 },
    { x: 0 * CELL_SIZE + CELL_SIZE / 2, z: (height - 1) * CELL_SIZE + CELL_SIZE / 2 },
    { x: Math.floor(width / 2) * CELL_SIZE + CELL_SIZE / 2, z: 0 * CELL_SIZE + CELL_SIZE / 2 },
    { x: 0 * CELL_SIZE + CELL_SIZE / 2, z: Math.floor(height / 2) * CELL_SIZE + CELL_SIZE / 2 },
    { x: Math.floor(width / 2) * CELL_SIZE + CELL_SIZE / 2, z: Math.floor(height / 2) * CELL_SIZE + CELL_SIZE / 2 },
  ]

  const grid: MazeGrid = { cells, width, height, seed, exitX, exitZ, spawnPositions }

  // Place item boxes in cells with distance >= 60% of max
  const itemBoxes: ItemBoxPlacement[] = []
  const threshold = maxDist * 0.3

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[z][x]
      const dist = cell.distanceFromStart ?? 0
      if (dist >= threshold && rng() < 0.12) {
        itemBoxes.push({
          id: uuidv4(),
          cellX: x,
          cellZ: z,
          worldX: x * CELL_SIZE + CELL_SIZE / 2,
          worldZ: z * CELL_SIZE + CELL_SIZE / 2,
          type: ITEM_TYPES[Math.floor(rng() * ITEM_TYPES.length)],
        })
      }
    }
  }

  return { grid, itemBoxes }
}

export { mulberry32 }
