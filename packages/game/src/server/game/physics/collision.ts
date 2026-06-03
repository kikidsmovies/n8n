import { MazeGrid } from '../maze/maze.types'
import { CELL_SIZE } from '../maze/maze.generator'
import { Vec2, PLAYER_RADIUS } from '../game.state'

export function resolveMovement(position: Vec2, newPos: Vec2, grid: MazeGrid): Vec2 {
  let { x, z } = newPos

  const cellX = Math.floor(x / CELL_SIZE)
  const cellZ = Math.floor(z / CELL_SIZE)

  if (cellX < 0 || cellZ < 0 || cellX >= grid.width || cellZ >= grid.height) {
    return position
  }

  const cell = grid.cells[cellZ][cellX]
  const cellLeft = cellX * CELL_SIZE
  const cellRight = (cellX + 1) * CELL_SIZE
  const cellTop = cellZ * CELL_SIZE
  const cellBottom = (cellZ + 1) * CELL_SIZE

  const wallThickness = 0.1

  // Push player away from walls
  if (cell.walls.west && x - PLAYER_RADIUS < cellLeft + wallThickness) {
    x = cellLeft + wallThickness + PLAYER_RADIUS
  }
  if (cell.walls.east && x + PLAYER_RADIUS > cellRight - wallThickness) {
    x = cellRight - wallThickness - PLAYER_RADIUS
  }
  if (cell.walls.north && z - PLAYER_RADIUS < cellTop + wallThickness) {
    z = cellTop + wallThickness + PLAYER_RADIUS
  }
  if (cell.walls.south && z + PLAYER_RADIUS > cellBottom - wallThickness) {
    z = cellBottom - wallThickness - PLAYER_RADIUS
  }

  return { x, z }
}

export function checkProjectileWallHit(
  pos: Vec2,
  grid: MazeGrid,
): boolean {
  const cellX = Math.floor(pos.x / CELL_SIZE)
  const cellZ = Math.floor(pos.z / CELL_SIZE)

  if (cellX < 0 || cellZ < 0 || cellX >= grid.width || cellZ >= grid.height) {
    return true
  }

  const cell = grid.cells[cellZ][cellX]
  const cellLeft = cellX * CELL_SIZE
  const cellRight = (cellX + 1) * CELL_SIZE
  const cellTop = cellZ * CELL_SIZE
  const cellBottom = (cellZ + 1) * CELL_SIZE
  const margin = 0.15

  if (cell.walls.west && pos.x < cellLeft + margin) return true
  if (cell.walls.east && pos.x > cellRight - margin) return true
  if (cell.walls.north && pos.z < cellTop + margin) return true
  if (cell.walls.south && pos.z > cellBottom - margin) return true

  return false
}

export function distance2D(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}
