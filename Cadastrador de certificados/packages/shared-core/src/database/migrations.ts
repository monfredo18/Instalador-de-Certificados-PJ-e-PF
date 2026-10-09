import { Database } from 'sql.js';

/**
 * Cria as tabelas e índices do banco de dados (idempotente).
 * Executado apenas no modo ADMIN durante initDatabase().
 */
export function runMigrations(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      document TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('PF', 'PJ')),
      serial_number TEXT NOT NULL,
      issuer TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      pfx_path TEXT NOT NULL,
      pfx_password TEXT NOT NULL DEFAULT '',
      thumbprint TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS network_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      path TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_certificates_document ON certificates(document)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_certificates_valid_to ON certificates(valid_to)`);
}
