import {
  ICertificate,
  CertificateStatus,
  CertificateType,
  ICertificateFilter,
  IDashboardStats,
} from '@cert-ecosystem/shared-types';
import { getDatabase, saveDatabase } from '../connection';
import { queryAll, queryOne, executeSQL } from '../db-helpers';

export class CertificateRepository {
  /**
   * Calcula o status do certificado com base na data de expiração.
   * > 30 dias → VALID | ≤ 30 dias → EXPIRING_SOON | expirado → EXPIRED
   */
  private computeStatus(validTo: string): CertificateStatus {
    const expiry = new Date(validTo);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return CertificateStatus.EXPIRED;
    if (diffDays <= 30) return CertificateStatus.EXPIRING_SOON;
    return CertificateStatus.VALID;
  }

  /** Converte linha do banco para interface ICertificate com status computado. */
  private mapRow(row: any): ICertificate {
    return {
      id: row.id,
      name: row.name,
      document: row.document,
      type: row.type as CertificateType,
      serialNumber: row.serial_number,
      issuer: row.issuer,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      status: this.computeStatus(row.valid_to),
      pfxPath: row.pfx_path,
      pfxPassword: row.pfx_password,
      thumbprint: row.thumbprint,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Lista certificados com filtros opcionais (tipo, busca, status). */
  findAll(filter?: ICertificateFilter): ICertificate[] {
    const db = getDatabase();
    let query = 'SELECT * FROM certificates WHERE 1=1';
    const params: any[] = [];

    if (filter?.type) {
      query += ' AND type = ?';
      params.push(filter.type);
    }
    if (filter?.search) {
      query += ' AND (name LIKE ? OR document LIKE ?)';
      const term = `%${filter.search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY valid_to ASC';

    const rows = queryAll(db, query, params);
    let certs = rows.map((row) => this.mapRow(row));

    // Filtro por status é feito em memória (status é computado, não armazenado)
    if (filter?.status) {
      certs = certs.filter((c) => c.status === filter.status);
    }

    return certs;
  }

  /** Busca certificado por ID. */
  findById(id: number): ICertificate | null {
    const db = getDatabase();
    const row = queryOne(db, 'SELECT * FROM certificates WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }

  /** Busca certificado por thumbprint (SHA-1). */
  findByThumbprint(thumbprint: string): ICertificate | null {
    const db = getDatabase();
    const row = queryOne(db, 'SELECT * FROM certificates WHERE thumbprint = ?', [thumbprint]);
    return row ? this.mapRow(row) : null;
  }

  /** Cria um novo certificado no banco. Impede duplicados por thumbprint. Salva no disco automaticamente. */
  create(cert: ICertificate): ICertificate {
    // Trava de duplicidade: se já existir certificado com o mesmo thumbprint (hash único), rejeita ou retorna erro amigável
    const existing = this.findByThumbprint(cert.thumbprint);
    if (existing) {
      throw new Error(`Este certificado digital já está cadastrado no sistema (Nome: "${existing.name}", Vencimento: ${existing.validTo.split('T')[0]}).`);
    }

    const db = getDatabase();
    const result = executeSQL(
      db,
      `INSERT INTO certificates
        (name, document, type, serial_number, issuer, valid_from, valid_to, pfx_path, pfx_password, thumbprint)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cert.name,
        cert.document,
        cert.type,
        cert.serialNumber,
        cert.issuer,
        cert.validFrom,
        cert.validTo,
        cert.pfxPath,
        cert.pfxPassword,
        cert.thumbprint,
      ]
    );
    saveDatabase();
    return this.findById(result.lastInsertRowid)!;
  }

  /** Atualiza campos do certificado. Salva no disco automaticamente. */
  update(id: number, cert: Partial<ICertificate>): ICertificate | null {
    const db = getDatabase();
    const updates: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      document: 'document',
      type: 'type',
      serialNumber: 'serial_number',
      issuer: 'issuer',
      validFrom: 'valid_from',
      validTo: 'valid_to',
      pfxPath: 'pfx_path',
      pfxPassword: 'pfx_password',
      thumbprint: 'thumbprint',
    };

    for (const [key, value] of Object.entries(cert)) {
      if (fieldMap[key] !== undefined) {
        updates.push(`${fieldMap[key]} = ?`);
        params.push(value);
      }
    }

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    executeSQL(db, `UPDATE certificates SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDatabase();
    return this.findById(id);
  }

  /** Remove certificado pelo ID. Salva no disco automaticamente. */
  delete(id: number): boolean {
    const db = getDatabase();
    const result = executeSQL(db, 'DELETE FROM certificates WHERE id = ?', [id]);
    saveDatabase();
    return result.changes > 0;
  }

  /** Retorna estatísticas do dashboard (contagens por status e tipo). */
  getStats(): IDashboardStats {
    const all = this.findAll();
    return {
      total: all.length,
      valid: all.filter((c) => c.status === CertificateStatus.VALID).length,
      expiringSoon: all.filter((c) => c.status === CertificateStatus.EXPIRING_SOON).length,
      expired: all.filter((c) => c.status === CertificateStatus.EXPIRED).length,
      totalPF: all.filter((c) => c.type === CertificateType.PF).length,
      totalPJ: all.filter((c) => c.type === CertificateType.PJ).length,
    };
  }
}
