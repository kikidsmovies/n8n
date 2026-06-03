import { v4 as uuidv4 } from 'uuid'
import { ProjectileState, PlayerState, Vec3 } from '../game.state'
import { MazeGrid } from '../maze/maze.types'
import { checkProjectileWallHit, distance2D } from './collision'
import { WeaponDefinition } from '../weapons/weapon.types'

export interface HitResult {
  projectileId: string
  ownerId: string
  targetId: string
  damage: number
  isAoe: boolean
  position: { x: number; z: number }
  slowPercent: number
  slowDurationMs: number
}

export function createProjectiles(
  ownerId: string,
  weapon: WeaponDefinition,
  position: { x: number; z: number },
  direction: Vec3,
): ProjectileState[] {
  const projectiles: ProjectileState[] = []
  const baseAngle = Math.atan2(direction.x, direction.z)

  for (let i = 0; i < weapon.projectileCount; i++) {
    const spreadRad = (weapon.spreadDeg * Math.PI) / 180
    const angleOffset = weapon.projectileCount > 1
      ? spreadRad * ((i / (weapon.projectileCount - 1)) - 0.5)
      : 0
    const angle = baseAngle + angleOffset

    projectiles.push({
      id: uuidv4(),
      ownerId,
      weaponId: weapon.id,
      position: { x: position.x, y: 1.0, z: position.z },
      direction: { x: Math.sin(angle), y: 0, z: Math.cos(angle) },
      speed: weapon.projectileSpeed,
      range: weapon.range,
      distanceTraveled: 0,
      damage: weapon.damage,
      aoeRadius: weapon.aoeRadius,
      slowPercent: weapon.slowPercent,
      slowDurationMs: weapon.slowDurationMs,
      createdAt: Date.now(),
    })
  }
  return projectiles
}

export function tickProjectiles(
  projectiles: ProjectileState[],
  players: Map<string, PlayerState>,
  grid: MazeGrid,
  dtSec: number,
): { remaining: ProjectileState[]; hits: HitResult[] } {
  const remaining: ProjectileState[] = []
  const hits: HitResult[] = []

  for (const proj of projectiles) {
    const travel = proj.speed * dtSec
    proj.position.x += proj.direction.x * travel
    proj.position.z += proj.direction.z * travel
    proj.distanceTraveled += travel

    // Check wall collision
    if (proj.distanceTraveled > proj.range || checkProjectileWallHit({ x: proj.position.x, z: proj.position.z }, grid)) {
      // AOE check on wall hit
      if (proj.aoeRadius > 0) {
        for (const [, player] of players) {
          if (player.id === proj.ownerId || player.isDead) continue
          const dist = distance2D({ x: proj.position.x, z: proj.position.z }, player.position)
          if (dist <= proj.aoeRadius) {
            hits.push({
              projectileId: proj.id,
              ownerId: proj.ownerId,
              targetId: player.id,
              damage: proj.damage * (1 - dist / proj.aoeRadius),
              isAoe: true,
              position: { x: proj.position.x, z: proj.position.z },
              slowPercent: proj.slowPercent,
              slowDurationMs: proj.slowDurationMs,
            })
          }
        }
      }
      continue
    }

    // Player hit check
    let hit = false
    for (const [, player] of players) {
      if (player.id === proj.ownerId || player.isDead) continue
      const dist = distance2D({ x: proj.position.x, z: proj.position.z }, player.position)
      if (dist < 0.6) {
        hits.push({
          projectileId: proj.id,
          ownerId: proj.ownerId,
          targetId: player.id,
          damage: proj.damage,
          isAoe: false,
          position: { x: proj.position.x, z: proj.position.z },
          slowPercent: proj.slowPercent,
          slowDurationMs: proj.slowDurationMs,
        })
        hit = true
        break
      }
    }

    if (!hit) remaining.push(proj)
  }

  return { remaining, hits }
}
