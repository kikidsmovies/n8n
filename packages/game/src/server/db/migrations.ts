import Database from 'better-sqlite3'

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        diamonds INTEGER NOT NULL DEFAULT 0,
        total_wins INTEGER NOT NULL DEFAULT 0,
        total_kills INTEGER NOT NULL DEFAULT 0,
        total_games INTEGER NOT NULL DEFAULT 0,
        active_skin_id TEXT NOT NULL DEFAULT 'default',
        active_weapon_id TEXT NOT NULL DEFAULT 'blaster',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS player_inventory (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id),
        item_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        obtained_at INTEGER NOT NULL DEFAULT (unixepoch()),
        UNIQUE(player_id, item_id)
      );
      CREATE INDEX IF NOT EXISTS idx_inventory_player ON player_inventory(player_id);
    `,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS diamond_transactions (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id),
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_player ON diamond_transactions(player_id);
    `,
  },
]

export function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`)
  const row = db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null }
  const current = row?.v ?? 0

  for (const m of MIGRATIONS.filter((m) => m.version > current)) {
    db.exec(m.sql)
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(m.version)
    console.log(`[DB] Migration ${m.version} applied`)
  }
}
