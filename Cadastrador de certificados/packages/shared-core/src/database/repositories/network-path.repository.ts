import { INetworkPath } from '@cert-ecosystem/shared-types';
import { getDatabase, saveDatabase } from '../connection';
import { queryAll, queryOne, executeSQL } from '../db-helpers';

export class NetworkPathRepository {
  private mapRow(row: any): INetworkPath {
    return {
      id: row.id,
      label: row.label,
      path: row.path,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Lista todos os caminhos de rede ordenados por rótulo. */
  findAll(): INetworkPath[] {
    const db = getDatabase();
    return queryAll(db, 'SELECT * FROM network_paths ORDER BY label').map((r) =>
      this.mapRow(r)
    );
  }

  /** Busca caminho por ID. */
  findById(id: number): INetworkPath | null {
    const db = getDatabase();
    const row = queryOne(db, 'SELECT * FROM network_paths WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }

  /** Lista apenas caminhos ativos. */
  findActive(): INetworkPath[] {
    const db = getDatabase();
    return queryAll(
      db,
      'SELECT * FROM network_paths WHERE is_active = 1 ORDER BY label'
    ).map((r) => this.mapRow(r));
  }

  /** Cria um novo caminho de rede. Salva no disco automaticamente. */
  create(data: Omit<INetworkPath, 'id' | 'createdAt' | 'updatedAt'>): INetworkPath {
    const db = getDatabase();
    const result = executeSQL(
      db,
      'INSERT INTO network_paths (label, path, is_active) VALUES (?, ?, ?)',
      [data.label, data.path, data.isActive ? 1 : 0]
    );
    saveDatabase();
    return this.findById(result.lastInsertRowid)!;
  }

  /** Atualiza campos do caminho de rede. Salva no disco automaticamente. */
  update(id: number, data: Partial<INetworkPath>): INetworkPath | null {
    const db = getDatabase();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.label !== undefined) {
      updates.push('label = ?');
      params.push(data.label);
    }
    if (data.path !== undefined) {
      updates.push('path = ?');
      params.push(data.path);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    executeSQL(db, `UPDATE network_paths SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDatabase();
    return this.findById(id);
  }

  /** Remove caminho pelo ID. Salva no disco automaticamente. */
  delete(id: number): boolean {
    const db = getDatabase();
    const result = executeSQL(db, 'DELETE FROM network_paths WHERE id = ?', [id]);
    saveDatabase();
    return result.changes > 0;
  }
}
