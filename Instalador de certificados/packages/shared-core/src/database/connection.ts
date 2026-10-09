import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseMode, IConnectionConfig } from '@cert-ecosystem/shared-types';
import { runMigrations } from './migrations';

let db: Database | null = null;
let dbFilePath: string = '';
let currentMode: DatabaseMode = DatabaseMode.CLIENT;

/**
 * Inicializa a conexão com o banco de dados SQLite via sql.js (WASM puro).
 *
 * - Modo ADMIN: carrega do disco (ou cria novo), roda migrations, salva.
 * - Modo CLIENT: carrega do disco como somente leitura (não salva alterações).
 *
 * @returns Promise<Database> — a instância do banco sql.js
 */
export async function initDatabase(config: IConnectionConfig): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  dbFilePath = config.dbPath;
  currentMode = config.mode;

  // Carrega arquivo existente ou cria banco vazio
  try {
    if (fs.existsSync(config.dbPath)) {
      const fileBuffer = fs.readFileSync(config.dbPath);
      db = new SQL.Database(new Uint8Array(fileBuffer));
    } else {
      db = new SQL.Database();
    }
  } catch {
    db = new SQL.Database();
  }

  // Apenas ADMIN roda migrations e salva no disco
  if (config.mode === DatabaseMode.ADMIN) {
    runMigrations(db);
    saveDatabase();
  }

  return db;
}

/**
 * Retorna a instância atual do banco. Lança erro se não inicializado.
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database não inicializado. Chame initDatabase() primeiro.');
  }
  return db;
}

/**
 * Persiste o banco na disco (apenas no modo ADMIN).
 * Chamado automaticamente após cada operação de escrita nos repositórios.
 */
export function saveDatabase(): void {
  if (db && currentMode === DatabaseMode.ADMIN && dbFilePath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbFilePath, buffer);
  }
}

/**
 * Salva (se ADMIN) e fecha a conexão com o banco.
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

/**
 * Retorna true se o banco está aberto em modo ADMIN (leitura/escrita).
 */
export function isAdminMode(): boolean {
  return currentMode === DatabaseMode.ADMIN;
}
