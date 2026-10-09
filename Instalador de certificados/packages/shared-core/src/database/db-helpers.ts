import { Database } from 'sql.js';

/**
 * Executa SELECT e retorna todos os resultados como array de objetos.
 * Substitui o padrão better-sqlite3: db.prepare(sql).all(...params)
 */
export function queryAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Executa SELECT e retorna apenas a primeira linha, ou null.
 * Substitui o padrão better-sqlite3: db.prepare(sql).get(...params)
 */
export function queryOne(db: Database, sql: string, params: any[] = []): any | null {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let row: any = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

/**
 * Executa INSERT/UPDATE/DELETE e retorna lastInsertRowid e changes.
 * Substitui o padrão better-sqlite3: db.prepare(sql).run(...params)
 */
export function executeSQL(
  db: Database,
  sql: string,
  params: any[] = []
): { lastInsertRowid: number; changes: number } {
  db.run(sql, params);
  const meta = queryOne(db, 'SELECT last_insert_rowid() as rowid, changes() as c');
  return {
    lastInsertRowid: Number(meta?.rowid ?? 0),
    changes: Number(meta?.c ?? 0),
  };
}
