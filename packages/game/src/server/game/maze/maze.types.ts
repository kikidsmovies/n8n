export interface Cell {
  x: number
  z: number
  walls: {
    north: boolean
    south: boolean
    east: boolean
    west: boolean
  }
  visited: boolean
  distanceFromStart?: number
  isRoom?: boolean
}

export interface MazeGrid {
  cells: Cell[][]
  width: number
  height: number
  seed: number
  exitX: number
  exitZ: number
  spawnPositions: Array<{ x: number; z: number }>
}

export interface ItemBoxPlacement {
  id: string
  cellX: number
  cellZ: number
  worldX: number
  worldZ: number
  type: 'speed' | 'shield' | 'teleport' | 'health' | 'diamond'
}
